// Digitalisasi Buku Induk - Application JavaScript

// Dummy user login
const USERNAME = "admin";
const PASSWORD = "123";

// Dummy data siswa
let dataSiswa = [];

let currentResults = [];

// Function to build Indonesian address format
function buildIndonesianAddress(obj) {
  const addressParts = [];
  
  console.log('Building address for:', obj.nama || 'Unknown');
  console.log('Address fields available:', {
    jalan: obj.alamat_rumah_jalan,
    rt: obj.alamat_rumah_rt,
    rw: obj.alamat_rumah_rw,
    kelurahan: obj.alamat_rumah_kelurahan,
    kecamatan: obj.alamat_rumah_kecamatan,
    kabupaten: obj.alamat_rumah_kabupaten,
    provinsi: obj.alamat_rumah_provinsi,
    kode_pos: obj.alamat_rumah_kode_pos
  });
  
  // 1. Jalan / alamat utama
  if (obj.alamat_rumah_jalan && obj.alamat_rumah_jalan.trim()) {
    addressParts.push(obj.alamat_rumah_jalan.trim());
  }
  
  // 2. RT dan RW
  const rt = obj.alamat_rumah_rt || obj.rt || '';
  const rw = obj.alamat_rumah_rw || obj.rw || '';
  if (rt || rw) {
    let rtRw = '';
    if (rt && rt.toString().trim()) {
      rtRw += `RT ${rt.toString().trim().padStart(2, '0')}`;
    }
    if (rw && rw.toString().trim()) {
      rtRw += `${rt ? ' ' : ''}RW ${rw.toString().trim().padStart(2, '0')}`;
    }
    if (rtRw) addressParts.push(rtRw);
  }
  
  // 3. Kelurahan
  if (obj.alamat_rumah_kelurahan && obj.alamat_rumah_kelurahan.trim()) {
    const kelurahan = obj.alamat_rumah_kelurahan.trim();
    const kelType = kelurahan.toLowerCase().includes('kelurahan') || 
                   kelurahan.toLowerCase().includes('desa') ? '' : 'Kelurahan ';
    addressParts.push(`${kelType}${kelurahan}`);
  }
  
  // 4. Kecamatan
  if (obj.alamat_rumah_kecamatan && obj.alamat_rumah_kecamatan.trim()) {
    const kecamatan = obj.alamat_rumah_kecamatan.trim();
    const kecType = kecamatan.toLowerCase().includes('kecamatan') ? '' : 'Kecamatan ';
    addressParts.push(`${kecType}${kecamatan}`);
  }
  
  // 5. Kabupaten/Kota
  if (obj.alamat_rumah_kabupaten && obj.alamat_rumah_kabupaten.trim()) {
    const kabupaten = obj.alamat_rumah_kabupaten.trim();
    let kotaFormatted = kabupaten;
    
    if (!kabupaten.toLowerCase().includes('kota') && 
        !kabupaten.toLowerCase().includes('kabupaten') && 
        !kabupaten.toLowerCase().includes('kab.')) {
      // Auto-detect city vs regency
      const cities = ['jakarta', 'surabaya', 'bandung', 'medan', 'semarang', 'makassar', 
                     'palembang', 'tangerang', 'bekasi', 'depok', 'yogyakarta', 'malang'];
      const isCity = cities.some(city => kabupaten.toLowerCase().includes(city));
      kotaFormatted = isCity ? `Kota ${kabupaten}` : `Kab. ${kabupaten}`;
    }
    addressParts.push(kotaFormatted);
  }
  
  // 6. Provinsi
  if (obj.alamat_rumah_provinsi && obj.alamat_rumah_provinsi.trim()) {
    addressParts.push(obj.alamat_rumah_provinsi.trim());
  }
  
  // 7. Kode Pos
  if (obj.alamat_rumah_kode_pos && obj.alamat_rumah_kode_pos.toString().trim()) {
    addressParts.push(obj.alamat_rumah_kode_pos.toString().trim());
  }
  
  const result = addressParts.length > 0 ? addressParts.join(', ') : '';
  console.log('Built complete address:', result);
  return result;
}

// Load data from Excel
async function loadData() {
  try {
    // pastiin filename sesuai file yang disajikan di server
    console.log('Attempting to fetch Excel file...');
    const response = await fetch('student_data.xlsx');
    console.log('Fetch response status:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.arrayBuffer();
    console.log('Excel file loaded, size:', data.byteLength, 'bytes');
    const workbook = XLSX.read(data, { type: 'array' });

    // pakai sheet 'Data' kalau ada, kalo engga ambil sheet pertama
    const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Try to read headers first to understand the structure
    const headersRaw = XLSX.utils.sheet_to_json(sheet, { range: 0, header: 1 });
    console.log('Headers from row 0:', headersRaw[0] ? Object.keys(headersRaw[0]) : 'No headers');
    
    // Read from row 1 to get actual data with proper headers
    const rawData = XLSX.utils.sheet_to_json(sheet, { range: 0, defval: '' });
    console.log('Raw data from Excel:', rawData.length, 'rows');
    console.log('Sample raw data:', rawData.slice(0, 2));
    
    // Skip first row if it doesn't contain actual student data
    const dataToProcess = rawData.slice(1); // Skip header row
    console.log('Data after skipping header:', dataToProcess.length, 'rows');

    // helper: normalisasi header jadi underscore_case
    function normalizeKey(k) {
      return String(k).trim()
        .replace(/\s+/g, '_')       // spasi -> _
        .replace(/[^\w_]/g, '_')    // non-word -> _
        .replace(/__+/g, '_')       // collapse __
        .replace(/^_+|_+$/g, '')    // trim leading/trailing _
        .toLowerCase();             // convert to lowercase
    }

    dataSiswa = dataToProcess.map((row, index) => {
      const obj = {};
      
      // Manual mapping based on column positions (since headers are numeric)
      if (typeof Object.keys(row)[0] === 'string' && Object.keys(row)[0].match(/^\d+$/)) {
        // Numeric column names - use position-based mapping
        const keys = Object.keys(row).sort((a, b) => parseInt(a) - parseInt(b));
        obj.no = row[keys[0]];           // Column 1: No
        obj.no_induk = row[keys[1]];     // Column 2: No_Induk  
        obj.nisn = row[keys[2]];         // Column 3: NISN
        obj.nama_lengkap = row[keys[3]]; // Column 4: Nama_Lengkap
        obj.nama_panggilan = row[keys[4]]; // Column 5: Nama_Panggilan
        obj.jenis_kelamin = row[keys[5]]; // Column 6: Jenis_Kelamin
        obj.tempat_lahir = row[keys[6]];  // Column 7: Tempat_Lahir
        obj.tanggal_lahir = row[keys[7]]; // Column 8: Tanggal_Lahir
        // Add more mappings as needed for other fields
        
        if (index < 2) {
          console.log(`Row ${index} position-based mapping:`, {
            no: obj.no,
            no_induk: obj.no_induk,
            nisn: obj.nisn,
            nama_lengkap: obj.nama_lengkap,
            nama_panggilan: obj.nama_panggilan
          });
        }
      } else {
        // Normal column names - use standard normalization
        Object.keys(row).forEach(k => {
          const nk = normalizeKey(k);
          obj[nk] = row[k];
        });
      }

      // convenience fields
      obj.foto = obj.foto || 'profil.png';
      obj.nis = obj.no_induk || obj.nisn || obj.nis || obj.no || '';
      obj.nama = obj.nama_lengkap || obj.nama_panggilan || obj.nama || '';
      
      if (index < 2) {
        console.log(`Row ${index} after field mapping:`, {
          nis: obj.nis,
          nama: obj.nama,
          no_induk: obj.no_induk,
          nama_lengkap: obj.nama_lengkap,
          nama_panggilan: obj.nama_panggilan
        });
      }
      
      if (!obj.ttl) {
        if (obj.tempat_lahir || obj.tanggal_lahir) {
          obj.ttl = `${obj.tempat_lahir || ''}${obj.tanggal_lahir ? ', ' + obj.tanggal_lahir : ''}`.replace(/^, /,'');
        } else {
          obj.ttl = '';
        }
      }

      // Consolidate Indonesian address format
      obj.alamat = buildIndonesianAddress(obj);
      obj.kelas = obj.kelas || '';

      return obj;
    });

    console.log('Before filtering - total processed rows:', dataSiswa.length);
    console.log('Sample before filtering:', dataSiswa.slice(0, 3).map(s => ({ nama: s.nama, nis: s.nis })));
    
    // Filter out records without names
    dataSiswa = dataSiswa.filter(s => s.nama);
    
    // debug quick check (bisa dihapus)
    console.log('Total loaded records after filtering:', dataSiswa.length);
    console.log('Loaded columns example:', dataSiswa[0] || {});
    console.log('Sample names:', dataSiswa.slice(0, 5).map(s => s.nama));
    console.log('First student name:', dataSiswa[0]?.nama);
    console.log('Address fields check:', Object.keys(dataSiswa[0] || {}).filter(key => 
      key.toLowerCase().includes('alamat') || 
      key.toLowerCase().includes('jalan') || 
      key.toLowerCase().includes('rt') || 
      key.toLowerCase().includes('rw') ||
      key.toLowerCase().includes('kelurahan') ||
      key.toLowerCase().includes('kecamatan') ||
      key.toLowerCase().includes('kota') ||
      key.toLowerCase().includes('provinsi')
    ));
    console.log('Sample address data:', dataSiswa[0] ? {
      original_address: dataSiswa[0].alamat,
      available_fields: Object.keys(dataSiswa[0]).filter(key => 
        key.toLowerCase().includes('alamat') || 
        key.toLowerCase().includes('jalan') || 
        key.toLowerCase().includes('rt') || 
        key.toLowerCase().includes('rw')
      ).map(key => ({ [key]: dataSiswa[0][key] }))
    } : 'No data');
  } catch (e) {
    console.error('Error loading data:', e);
    console.error('Using fallback data...');
    // fallback dengan field names yang konsisten
    dataSiswa = [
      { nis: "12345", nama: "Budi Santoso", kelas: "XII IPA 1", foto: "https://via.placeholder.com/120", ttl: "Jakarta, 1 Jan 2005", alamat: "Jl. Sudirman No.1" },
      { nis: "67890", nama: "Ani Lestari", kelas: "XI IPS 2", foto: "https://via.placeholder.com/120", ttl: "Bandung, 2 Feb 2006", alamat: "Jl. Thamrin No.2" },
      { nis: "11223", nama: "Citra Dewi", kelas: "X IPA 3", foto: "https://via.placeholder.com/120", ttl: "Surabaya, 3 Mar 2007", alamat: "Jl. Diponegoro No.3" }
    ];
    console.log('Fallback data loaded:', dataSiswa.length, 'records');
  }
}

// Login function
async function login() {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  if (u === USERNAME && p === PASSWORD) {
    await loadData();
    document.getElementById("loginPage").classList.add("hidden");
    document.getElementById("searchPage").classList.remove("hidden");
  } else {
    document.getElementById("loginError").textContent = "Username atau password salah!";
  }
}

// Logout function
function logout() {
  document.getElementById("loginPage").classList.remove("hidden");
  document.getElementById("searchPage").classList.add("hidden");
  document.getElementById("detailPage").classList.add("hidden");
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  document.getElementById("searchInput").value = "";
  document.getElementById("resultList").innerHTML = "";
}

// Back to results function
function backToResults() {
  document.getElementById("detailPage").classList.add("hidden");
  document.getElementById("searchPage").classList.remove("hidden");
}

// Tab switching function
function switchTab(tabName) {
  // Hide all tab contents
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach(tab => tab.classList.remove('active'));
  
  // Remove active class from all tab buttons
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => btn.classList.remove('active'));
  
  // Show selected tab content
  document.getElementById(`tab-${tabName}`).classList.add('active');
  
  // Add active class to clicked button
  event.target.classList.add('active');
}

// Search siswa
function searchSiswa() {
  const keyword = document.getElementById("searchInput").value.toLowerCase();
  if (!keyword) {
    document.getElementById("resultList").innerHTML = "";
    return;
  }

  // Debug logging
  console.log('Searching for:', keyword);
  console.log('Total dataSiswa:', dataSiswa.length);
  console.log('Sample data:', dataSiswa.slice(0, 2));

  currentResults = dataSiswa.filter(s =>
    (s.nama && String(s.nama).toLowerCase().includes(keyword)) ||
    (s.nis && String(s.nis).toLowerCase().includes(keyword))
  );

  console.log('Search results:', currentResults.length);

  if (currentResults.length === 0) {
    document.getElementById("resultList").innerHTML = "<p>Data tidak ditemukan.</p>";
    return;
  }

  let html = "";
  currentResults.forEach((s, i) => {
    html += `<div class="result-item">
      <span>${s.nama}</span>
      <button class="btn" onclick="showDetail(${i})">View</button>
    </div>`;
  });
  document.getElementById("resultList").innerHTML = html;
}

// Show detail siswa
function showDetail(index) {
  const s = currentResults[index];
  document.getElementById("searchPage").classList.add("hidden");
  document.getElementById("detailPage").classList.remove("hidden");

  // Format date to Indonesian format
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${monthName} ${day}, ${year}`;
  }
  
  // Create full-page Buku Induk format matching traditional Indonesian format
  let detailHTML = `
    <div class="buku-induk-page">
      <!-- Header with title and NIS/NISN -->
      <div class="page-header">
        <div class="title-section">
          <h2>BUKU INDUK SISWA</h2>
        </div>
        <div class="header-info">
          <div class="nis-box">
            <span>NIS :</span>
            <span class="number-box">${s.nis || s.no_induk || ''}</span>
          </div>
          <div class="nisn-box">
            <span>NISN :</span>
            <span class="number-box">${s.nisn || ''}</span>
          </div>
        </div>
      </div>

      <!-- Main content table with photo boxes -->
      <div class="main-content">
        <div class="table-with-photos">
          <table class="buku-induk-table">
            
            <!-- Section A Header -->
            <tr class="section-header">
              <td colspan="3">A. KETERANGAN ANAK DIDIK</td>
            </tr>
            
            <!-- 1. Nama Murid -->
            <tr>
              <td class="numbering">1.</td>
              <td class="label">Nama Murid</td>
              <td class="value"></td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">a. Lengkap</td>
              <td class="value">: ${s.nama_lengkap || s.nama || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">b. Panggilan</td>
              <td class="value">: ${s.nama_panggilan || '—'}</td>
            </tr>
            
            <!-- 2. Jenis Kelamin -->
            <tr>
              <td class="numbering">2.</td>
              <td class="label">Jenis Kelamin</td>
              <td class="value">: ${s.jenis_kelamin === 'L' ? 'Laki-laki' : (s.jenis_kelamin === 'P' ? 'Perempuan' : '—')}</td>
            </tr>
            
            <!-- 3. Kelahiran -->
            <tr>
              <td class="numbering">3.</td>
              <td class="label">Kelahiran</td>
              <td class="value"></td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">a. Tanggal</td>
              <td class="value">: ${formatDate(s.tanggal_lahir) || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">b. Tempat</td>
              <td class="value">: ${s.tempat_lahir || '—'}</td>
            </tr>
            
            <!-- 4. Agama -->
            <tr>
              <td class="numbering">4.</td>
              <td class="label">Agama</td>
              <td class="value">: ${s.agama || '—'}</td>
            </tr>
            <!-- 5. Kewarganegaraan -->
            <tr>
              <td class="numbering">5.</td>
              <td class="label">Kewarganegaraan</td>
              <td class="value">: ${s.kewarganegaraan || '—'}</td>
            </tr>
            
            <!-- 6. Anak Ke -->
            <tr>
              <td class="numbering">6.</td>
              <td class="label">Anak Ke</td>
              <td class="value">: ${s.anak_ke || '—'}</td>
            </tr>
            
            <!-- 7. Jumlah Saudara -->
            <tr>
              <td class="numbering">7.</td>
              <td class="label">Jumlah Saudara</td>
              <td class="value"></td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">a. Kandung</td>
              <td class="value">: ${s.jumlah_saudara_kandung || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">b. Tiri</td>
              <td class="value">: ${s.jumlah_saudara_tiri || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">c. Angkat</td>
              <td class="value">: ${s.jumlah_saudara_angkat || '—'}</td>
            </tr>
            
            <!-- 8. Bahasa Sehari-hari -->
            <tr>
              <td class="numbering">8.</td>
              <td class="label">Bahasa Sehari-hari</td>
              <td class="value">: ${s['keadaan_jasmani_bahasa_sehari-hari'] || '—'}</td>
            </tr>
            
            <!-- 9. Keadaan Jasmani -->
            <tr>
              <td class="numbering">9.</td>
              <td class="label">Keadaan Jasmani</td>
              <td class="value"></td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">a. Berat Badan</td>
              <td class="value">: ${s.keadaan_jasmani_berat_badan || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">b. Tinggi Badan</td>
              <td class="value">: ${s.keadaan_jasmani_tinggi_badan || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">c. Golongan Darah</td>
              <td class="value">: ${s.keadaan_jasmani_golongan_darah || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">d. Penyakit yang pernah diderita</td>
              <td class="value">: ${s.penyakit_yang_pernah_diderita || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="sub-label">e. Imunisasi yang pernah diterima</td>
              <td class="value">: ${s.imuninasi_yang_pernah_di_terima || '—'}</td>
            </tr>
            
            <!-- 10. Alamat Rumah -->
            <tr>
              <td class="numbering">10.</td>
              <td class="label">Alamat Rumah</td>
              <td class="value">: ${s.alamat || '—'}</td>
            </tr>
            
            <!-- 11. Bertempat Tinggal -->
            <tr>
              <td class="numbering">11.</td>
              <td class="label">Bertempat Tinggal Pada</td>
              <td class="value">: ${s.bertempat_tinggal_pada || '—'}</td>
            </tr>
            
            <!-- 12. Jarak ke Sekolah -->
            <tr>
              <td class="numbering">12.</td>
              <td class="label">Jarak Tempat Tinggal ke Sekolah</td>
              <td class="value">: ${s.jarak_tempat_tinggal || '—'}</td>
            </tr>

            <tr class="section-header">
              <td colspan="3"><strong>B. KETERANGAN ORANG TUA / WALI ANAK DIDIK</strong></td>
            </tr>
            <tr>
              <td colspan="3"><strong>Nama Orangtua Kandung :</strong></td>
            </tr>
            <tr>
              <td class="numbering">1.</td>
              <td class="label">Nama</td>
              <td class="value">
                a. Ayah : ${s.ayah_kandung_nama || '—'}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;Tempat / tanggal lahir : ${s['ayah_kandung_tmp._lahir'] || '—'}, ${formatDate(s['ayah_kandung_tgl._lahir']) || '—'}<br>
                b. Ibu : ${s.ibu_kandung_nama || '—'}<br>
                &nbsp;&nbsp;&nbsp;&nbsp;Tempat / tanggal lahir : ${s['ibu_kandung_tmp._lahir'] || '—'}, ${formatDate(s['ibu_kandung_tgl._lahir']) || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">2.</td>
              <td class="label">Pendidikan Tertinggi</td>
              <td class="value">
                a. Ayah : ${s.ayah_kandung_pendidikan_tertinggi || '—'}<br>
                b. Ibu : ${s.ibu_kandung_pendidikan_tertinggi || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">3.</td>
              <td class="label">Pekerjaan / Jabatan</td>
              <td class="value">
                a. Ayah : ${s.ayah_kandung_pekerjaan || '—'}<br>
                b. Ibu : ${s.ibu_kandung_pekerjaan || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">4.</td>
              <td class="label">Alamat</td>
              <td class="value">
                a. Rumah dan No. Telepon : ${s.ayah_kandung_alamat_rumah || '—'}, ${s.ayah_kandung_no_telepon || '—'}<br>
                b. Kantor dan No. Telepon : ${s.ibu_kandung_alamat_rumah || '—'}, ${s.ibu_kandung_no_telepon || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">5.</td>
              <td class="label">Kewarganegaraan</td>
              <td class="value">
                a. Ayah : ${s.ayah_kandung_kewarganegaraan || '—'}<br>
                b. Ibu : ${s.ibu_kandung_kewarganegaraan || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">6.</td>
              <td class="label">Wali Murid</td>
              <td class="value">
                a. Nama : ${s.wali_murid_nama || '—'}<br>
                b. Hubungan Keluarga : ${s.wali_murid_hubungan_keluarga || '—'}<br>
                c. Pendidikan Tertinggi : ${s.wali_murid_pendidikan_tertinggi || '—'}<br>
                d. Pekerjaan / Jabatan : ${s.wali_murid_pekerjaan || '—'}
              </td>
            </tr>

            <tr class="section-header">
              <td colspan="3"><strong>C. PERKEMBANGAN MURID</strong></td>
            </tr>
            <tr>
              <td class="numbering">1.</td>
              <td class="label">Pendidikan Sebelumnya</td>
              <td class="value"></td>
            </tr>
            <tr>
              <td></td>
              <td class="sub-label">1.1. Masuk Menjadi Murid Baru Kelas :</td>
              <td class="value">
                a. Asal Murid : ${s.masuk_menjadi_murid_baru_asal_murid || '—'}<br>
                b. Nama TK : ${s.masuk_menjadi_murid_baru_nama_tk || '—'}<br>
                c. Alamat Sekolah : ${s.masuk_menjadi_murid_baru_alamat_sekolah || '—'}<br>
                d. Tanggal dan No. STTB TK : ${formatDate(s.masuk_menjadi_murid_baru_tgl_sttb) || '—'}, ${s.masuk_menjadi_murid_baru_nomor_sttb || '—'}
              </td>
            </tr>
            <tr>
              <td></td>
              <td class="sub-label">1.2. Pindahan dari sekolah lain</td>
              <td class="value">
                a. Nama Sekolah Asal : ${s.pindahan_dari_sekolah_lain_nama_sekolah_asal || '—'}<br>
                b. Dari Kelas : ${s.pindahan_dari_sekolah_lain_dari_kelas || '—'}<br>
                c. Diterima Tanggal : ${formatDate(s.pindahan_dari_sekolah_lain_diterima_tanggal) || '—'}<br>
                d. Di Kelas : ${s.pindahan_dari_sekolah_lain_di_kelas || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">2.</td>
              <td class="label">Keadaan Jasmani</td>
              <td class="value">
                a. TAHUN<br>
                b. BERAT BADAN<br>
                c. TINGGI BADAN<br>
                d. PENYAKIT -<br>
                e. KELAINAN JASMANI
              </td>
            </tr>

            <tr class="section-header">
              <td colspan="3"><strong>D. BEA SISWA</strong></td>
            </tr>
            <tr>
              <td></td>
              <td class="label">a. Jenis Bea Siswa</td>
              <td class="value">: ${s.jenis_bea_siswa || '—'}</td>
            </tr>

            <tr class="section-header">
              <td colspan="3"><strong>E. MENINGGALKAN SEKOLAH</strong></td>
            </tr>
            <tr>
              <td class="numbering">1.</td>
              <td class="label">Tamat Belajar</td>
              <td class="value">
                a. Tahun Tamat : ${s.tamat_belajar_tahun || '—'}<br>
                b. Melanjutkan ke Sekolah : ${s.tamat_belajar_melanjutkan_ke_sekolah || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">2.</td>
              <td class="label">Pindah Ke Sekolah</td>
              <td class="value">
                a. Dari Kelas : ${s.pindah_sekolah_dari_kelas || '—'}<br>
                b. Ke Sekolah : ${s.pindah_sekolah_ke_sekolah || '—'}<br>
                c. Ke Kelas : ${s.pindah_sekolah_kelas || '—'}<br>
                d. Tanggal : ${formatDate(s.pindah_sekolah_tanggal) || '—'}
              </td>
            </tr>
            <tr>
              <td class="numbering">3.</td>
              <td class="label">Keluar Sekolah</td>
              <td class="value">
                a. Tanggal : ${formatDate(s.keluar_sekolah_tanggal) || '—'}<br>
                b. Alasan : ${s.keluar_sekolah_alasan || '—'}
              </td>
            </tr>
          </table>
          
          <!-- Single photo box with 3x4 aspect ratio -->
          <div class="photo-box">
            <img src="${s.foto || 'profil.png'}" alt="Foto ${s.nama}" class="student-photo">
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("detailContent").innerHTML = detailHTML;
}