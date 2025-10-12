// Digitalisasi Buku Induk - Application JavaScript

// Dummy user login
const USERNAME = "admin";
const PASSWORD = "123";

// Dummy data siswa
let dataSiswa = [];
let dataPrestasi = [];
let currentStudent = null; // Store current student for prestasi

let currentResults = [];

// Function to build Indonesian address format
function buildIndonesianAddress(obj) {
  const addressParts = [];
  
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
  return result;
}

// Load data from Excel
async function loadData() {
  try {
    const response = await fetch('student_data.xlsx');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });

    const sheetName = workbook.SheetNames.includes('Data') ? 'Data' : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    
    // Load prestasi data
    try {
      const prestasiResponse = await fetch('prestasi_data.xlsx');
      if (prestasiResponse.ok) {
        const prestasiData = await prestasiResponse.arrayBuffer();
        const prestasiWorkbook = XLSX.read(prestasiData, { type: 'array' });
        const prestasiSheetName = prestasiWorkbook.SheetNames[0];
        const prestasiSheet = prestasiWorkbook.Sheets[prestasiSheetName];
        const prestasiRawData = XLSX.utils.sheet_to_json(prestasiSheet, { defval: '' });
        
        // Normalize prestasi data keys
        dataPrestasi = prestasiRawData.map(row => {
          const obj = {};
          Object.keys(row).forEach(k => {
            const nk = String(k).trim()
              .replace(/\s+/g, '_')
              .replace(/[^\w_]/g, '_')
              .replace(/__+/g, '_')
              .replace(/^_+|_+$/g, '')
              .toLowerCase();
            obj[nk] = row[k];
          });
          return obj;
        });
      }
    } catch (prestasiError) {
      console.error('Error loading prestasi data:', prestasiError);
    }
    
    const dataToProcess = rawData;

    // Helper: normalize header to underscore_case
    function normalizeKey(k) {
      return String(k).trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w_]/g, '_')
        .replace(/__+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toLowerCase();
    }

    dataSiswa = dataToProcess.map((row, index) => {
      const obj = {};
      
      // Manual mapping based on column positions (since headers are numeric)
      if (typeof Object.keys(row)[0] === 'string' && Object.keys(row)[0].match(/^\d+$/)) {
        // Numeric column names - use position-based mapping
        const keys = Object.keys(row).sort((a, b) => parseInt(a) - parseInt(b));
        obj.no = row[keys[0]];
        obj.no_induk = row[keys[1]];
        obj.nisn = row[keys[2]];
        obj.nama_lengkap = row[keys[3]];
        obj.nama_panggilan = row[keys[4]];
        obj.jenis_kelamin = row[keys[5]];
        obj.tempat_lahir = row[keys[6]];
        obj.tanggal_lahir = row[keys[7]];
      } else {
        // Normal column names - use standard normalization
        Object.keys(row).forEach(k => {
          const nk = normalizeKey(k);
          obj[nk] = row[k];
        });
      }

      // Convenience fields
      obj.foto = obj.foto || 'profil.png';
      obj.nis = obj.no_induk || obj.nisn || obj.nis || obj.no || '';
      obj.nama = obj.nama_lengkap || obj.nama_panggilan || obj.nama || '';
      
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
    
    // Filter out records without names
    dataSiswa = dataSiswa.filter(s => s.nama);
  } catch (e) {
    console.error('Error loading data:', e);
    // Fallback data
    dataSiswa = [
      { nis: "12345", nama: "Budi Santoso", kelas: "XII IPA 1", foto: "https://via.placeholder.com/120", ttl: "Jakarta, 1 Jan 2005", alamat: "Jl. Sudirman No.1" },
      { nis: "67890", nama: "Ani Lestari", kelas: "XI IPS 2", foto: "https://via.placeholder.com/120", ttl: "Bandung, 2 Feb 2006", alamat: "Jl. Thamrin No.2" },
      { nis: "11223", nama: "Citra Dewi", kelas: "X IPA 3", foto: "https://via.placeholder.com/120", ttl: "Surabaya, 3 Mar 2007", alamat: "Jl. Diponegoro No.3" }
    ];
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

  currentResults = dataSiswa.filter(s =>
    (s.nama && String(s.nama).toLowerCase().includes(keyword)) ||
    (s.nis && String(s.nis).toLowerCase().includes(keyword))
  );

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
  currentStudent = s; // Store current student for prestasi access
  document.getElementById("searchPage").classList.add("hidden");
  document.getElementById("detailPage").classList.remove("hidden");

  // Format date to Indonesian format
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[date.getDay()];
    const monthName = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${monthName} ${year}`;
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
              <td colspan="4">A. KETERANGAN ANAK DIDIK</td>
            </tr>
            
            <!-- 1. Nama Murid -->
            <tr>
              <td class="numbering" rowspan="2">1.</td>
              <td class="label" rowspan="2">Nama Murid</td>
              <td class="sub-label">a. Lengkap</td>
              <td class="value">: ${s.nama_lengkap || s.nama || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Panggilan</td>
              <td class="value">: ${s.nama_panggilan || '—'}</td>
            </tr>
            
            <!-- 2. Jenis Kelamin -->
            <tr>
              <td class="numbering">2.</td>
              <td class="label">Jenis Kelamin</td>
              <td class="sub-label"></td>
              <td class="value">: ${s.jenis_kelamin || '—'}</td>
            </tr>
            
            <!-- 3. Kelahiran -->
            <tr>
              <td class="numbering" rowspan="2">3.</td>
              <td class="label" rowspan="2">Kelahiran</td>
              <td class="sub-label">a. Tanggal</td>
              <td class="value">: ${formatDate(s.tanggal_lahir) || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Tempat</td>
              <td class="value">: ${s.tempat_lahir || '—'}</td>
            </tr>
            
            <!-- 4. Agama -->
            <tr>
              <td class="numbering">4.</td>
              <td class="label">Agama</td>
              <td class="sub-label"></td>
              <td class="value">: ${s.agama || '—'}</td>
            </tr>
            
            <!-- 5. Kewarganegaraan -->
            <tr>
              <td class="numbering">5.</td>
              <td class="label">Kewarganegaraan</td>
              <td class="sub-label"></td>
              <td class="value">: ${s.kewarganegaraan || '—'}</td>
            </tr>
            
            <!-- 6. Anak Ke -->
            <tr>
              <td class="numbering">6.</td>
              <td class="label">Anak Ke</td>
              <td class="sub-label"></td>
              <td class="value">: ${s.anak_ke || '—'}</td>
            </tr>
            
            <!-- 7. Jumlah Saudara -->
            <tr>
              <td class="numbering" rowspan="3">7.</td>
              <td class="label" rowspan="3">Jumlah Saudara</td>
              <td class="sub-label">a. Kandung</td>
              <td class="value">: ${s.jumlah_saudara_kandung || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Tiri</td>
              <td class="value">: ${s.jumlah_saudara_tiri || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">c. Angkat</td>
              <td class="value">: ${s.jumlah_saudara_angkat || '—'}</td>
            </tr>
            
            <!-- 8. Bahasa Sehari-hari Keluarga -->
            <tr>
              <td class="numbering">8.</td>
              <td class="label">Bahasa Sehari-hari Keluarga</td>
              <td class="sub-label"></td>
              <td class="value">: ${s.keadaan_jasmani_bahasa_sehari_hari || '—'}</td>
            </tr>
            
            <!-- 9. Keadaan Jasmani -->
            <tr>
              <td class="numbering" rowspan="5">9.</td>
              <td class="label" rowspan="5">Keadaan Jasmani</td>
              <td class="sub-label">a. Berat Badan</td>
              <td class="value">: ${s.keadaan_jasmani_berat_badan || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Tinggi Badan</td>
              <td class="value">: ${s.keadaan_jasmani_tinggi_badan || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">c. Golongan Darah</td>
              <td class="value">: ${s.keadaan_jasmani_golongan_darah || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">d. Penyakit yang pernah diderita</td>
              <td class="value">: ${s.penyakit_yang_pernah_diderita || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">e. Imunisasi yang pernah diterima</td>
              <td class="value">: ${s.imuninasi_yang_pernah_di_terima || '—'}</td>
            </tr>
            
            <!-- 10. Alamat Rumah -->
            <tr>
              <td class="numbering">10.</td>
              <td class="label" colspan="2">Alamat Rumah (Jl, RT, RW, KEL, KEC, KODE POS)</td>
              <td class="value">: ${buildIndonesianAddress(s) || '—'}</td>
            </tr>
            
            <!-- 11. Bertempat Tinggal Pada -->
            <tr>
              <td class="numbering">11.</td>
              <td class="label" colspan="2">Bertempat Tinggal Pada</td>
              <td class="value">: ${s.bertempat_tinggal_pada || '—'}</td>
            </tr>
            
            <!-- 12. Jarak Tempat Tinggal ke Sekolah -->
            <tr>
              <td class="numbering">12.</td>
              <td class="label" colspan="2">Jarak Tempat Tinggal ke Sekolah</td>
              <td class="value">: ${s.jarak_tempat_tinggal || '—'}</td>
            </tr>

            <!-- Section B Header -->
            <tr class="section-header">
              <td colspan="4">B. KETERANGAN ORANG TUA / WALI ANAK DIDIK</td>
            </tr>
            <tr>
              <td colspan="4" class="subsection-header"><strong>Nama Orangtua Kandung</strong></td>
            </tr>
            
            <!-- 1. Nama (Ayah dan Ibu) -->
            <tr>
              <td class="numbering" rowspan="4">1.</td>
              <td class="label" rowspan="4">Nama</td>
              <td class="sub-label">a. Ayah</td>
              <td class="value">: ${s.ayah_kandung_nama || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;Tempat / tanggal lahir</td>
              <td class="value">: ${s.ayah_kandung_tmp_lahir || '—'}${s.ayah_kandung_tgl_lahir ? ', ' + formatDate(s.ayah_kandung_tgl_lahir) : ''}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Ibu</td>
              <td class="value">: ${s.ibu_kandung_nama || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;Tempat / tanggal lahir</td>
              <td class="value">: ${s.ibu_kandung_tmp_lahir || '—'}${s.ibu_kandung_tgl_lahir ? ', ' + formatDate(s.ibu_kandung_tgl_lahir) : ''}</td>
            </tr>
            
            <!-- 2. Pendidikan Tertinggi -->
            <tr>
              <td class="numbering" rowspan="2">2.</td>
              <td class="label" rowspan="2">Pendidikan Tertinggi</td>
              <td class="sub-label">a. Ayah</td>
              <td class="value">: ${s.ayah_kandung_pendidikan_tertinggi || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Ibu</td>
              <td class="value">: ${s.ibu_kandung_pendidikan_tertinggi || '—'}</td>
            </tr>
            
            <!-- 3. Pekerjaan / Jabatan -->
            <tr>
              <td class="numbering" rowspan="2">3.</td>
              <td class="label" rowspan="2">Pekerjaan / Jabatan</td>
              <td class="sub-label">a. Ayah</td>
              <td class="value">: ${s.ayah_kandung_pekerjaan || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Ibu</td>
              <td class="value">: ${s.ibu_kandung_pekerjaan || '—'}</td>
            </tr>
            
            <!-- 4. Alamat -->
            <tr>
              <td class="numbering" rowspan="2">4.</td>
              <td class="label" rowspan="2">Alamat</td>
              <td class="sub-label">a. Rumah dan No. Telepon</td>
              <td class="value">: ${s.ayah_kandung_alamat_rumah || '—'}${s.ayah_kandung_no_telepon ? ', ' + s.ayah_kandung_no_telepon : ''}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Kantor dan No. Telepon</td>
              <td class="value">: ${s.ibu_kandung_alamat_rumah || '—'}${s.ibu_kandung_no_telepon ? ', ' + s.ibu_kandung_no_telepon : ''}</td>
            </tr>
            
            <!-- 5. Kewarganegaraan -->
            <tr>
              <td class="numbering" rowspan="2">5.</td>
              <td class="label" rowspan="2">Kewarganegaraan</td>
              <td class="sub-label">a. Ayah</td>
              <td class="value">: ${s.ayah_kandung_kewarganegaraan || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Ibu</td>
              <td class="value">: ${s.ibu_kandung_kewarganegaraan || '—'}</td>
            </tr>
            
            <!-- 6. Wali Murid -->
            <tr>
              <td class="numbering" rowspan="4">6.</td>
              <td class="label" rowspan="4">Wali Murid (Jika Mempunyai)</td>
              <td class="sub-label">a. Nama</td>
              <td class="value">: ${s.wali_murid_nama || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Hubungan Keluarga</td>
              <td class="value">: ${s.wali_murid_hubungan_keluarga || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">c. Pendidikan Tertinggi</td>
              <td class="value">: ${s.wali_murid_pendidikan_tertinggi || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">d. Pekerjaan / Jabatan</td>
              <td class="value">: ${s.wali_murid_pekerjaan || '—'}</td>
            </tr>

            <!-- Section C Header -->
            <tr class="section-header">
              <td colspan="4">C. PERKEMBANGAN MURID</td>
            </tr>
            
            <!-- 1. Pendidikan Sebelumnya -->
            <tr>
              <td class="numbering" rowspan="9">1.</td>
              <td class="label" rowspan="9">Pendidikan Sebelumnya</td>
              <td class="sub-label" colspan="2"><strong>1.1. Masuk Menjadi Murid Baru Kelas :</strong></td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;a. Asal Murid</td>
              <td class="value">: ${s.masuk_menjadi_murid_baru_asal_murid || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;b. Nama TK</td>
              <td class="value">: ${s.masuk_menjadi_murid_baru_nama_tk || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;c. Alamat Sekolah</td>
              <td class="value">: ${s.masuk_menjadi_murid_baru_alamat_sekolah || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;d. Tanggal dan No. STTB TK</td>
              <td class="value">: ${formatDate(s.masuk_menjadi_murid_baru_tgl_sttb) || '—'}${s.masuk_menjadi_murid_baru_nomor_sttb ? ', ' + s.masuk_menjadi_murid_baru_nomor_sttb : ''}</td>
            </tr>
            <tr>
              <td class="sub-label" colspan="2"><strong>1.2. Pindahan dari sekolah lain</strong></td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;a. Nama Sekolah Asal</td>
              <td class="value">: ${s.pindahan_dari_sekolah_lain_nama_sekolah_asal || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;b. Dari Kelas</td>
              <td class="value">: ${s.pindahan_dari_sekolah_lain_dari_kelas || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;c. Diterima Tanggal</td>
              <td class="value">: ${formatDate(s.pindahan_dari_sekolah_lain_diterima_tanggal) || '—'}</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="label"></td>
              <td class="sub-label">&nbsp;&nbsp;&nbsp;&nbsp;d. Di Kelas</td>
              <td class="value">: ${s.pindahan_dari_sekolah_lain_di_kelas || '—'}</td>
            </tr>
            
            <!-- 2. Keadaan Jasmani -->
            <tr>
              <td class="numbering" rowspan="5">2.</td>
              <td class="label" rowspan="5">Keadaan Jasmani</td>
              <td class="sub-label">a. TAHUN</td>
              <td class="value">: ${s.keadaan_jasmani_tahun || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. BERAT BADAN</td>
              <td class="value">: ${s.keadaan_jasmani_berat_badan || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">c. TINGGI BADAN</td>
              <td class="value">: ${s.keadaan_jasmani_tinggi_badan || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">d. PENYAKIT</td>
              <td class="value">: ${s.penyakit_yang_pernah_diderita || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">e. KELAINAN JASMANI</td>
              <td class="value">: ${s.keadaan_jasmani_kelainan_jasmani || '—'}</td>
            </tr>

            <!-- Section D Header -->
            <tr class="section-header">
              <td colspan="4">D. BEA SISWA</td>
            </tr>
            <tr>
              <td class="numbering"></td>
              <td class="label" colspan="2">a. Jenis Bea Siswa</td>
              <td class="value">: ${s.jenis_bea_siswa || '—'}</td>
            </tr>

            <!-- Section E Header -->
            <tr class="section-header">
              <td colspan="4">E. MENINGGALKAN SEKOLAH</td>
            </tr>
            
            <!-- 1. Tamat Belajar -->
            <tr>
              <td class="numbering" rowspan="2">1.</td>
              <td class="label" rowspan="2">Tamat Belajar</td>
              <td class="sub-label">a. Tahun Tamat</td>
              <td class="value">: ${s.tamat_belajar_tahun || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Melanjutkan ke Sekolah</td>
              <td class="value">: ${s.tamat_belajar_melanjutkan_ke_sekolah || '—'}</td>
            </tr>
            
            <!-- 2. Pindah Ke Sekolah -->
            <tr>
              <td class="numbering" rowspan="4">2.</td>
              <td class="label" rowspan="4">Pindah Ke Sekolah</td>
              <td class="sub-label">a. Dari Kelas</td>
              <td class="value">: ${s.pindah_sekolah_dari_kelas || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Ke Sekolah</td>
              <td class="value">: ${s.pindah_sekolah_ke_sekolah || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">c. Ke Kelas</td>
              <td class="value">: ${s.pindah_sekolah_kelas || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">d. Tanggal</td>
              <td class="value">: ${formatDate(s.pindah_sekolah_tanggal) || '—'}</td>
            </tr>
            
            <!-- 3. Keluar Sekolah -->
            <tr>
              <td class="numbering" rowspan="2">3.</td>
              <td class="label" rowspan="2">Keluar Sekolah</td>
              <td class="sub-label">a. Tanggal</td>
              <td class="value">: ${formatDate(s.keluar_sekolah_tanggal) || '—'}</td>
            </tr>
            <tr>
              <td class="sub-label">b. Alasan</td>
              <td class="value">: ${s.keluar_sekolah_alasan || '—'}</td>
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
  
  // Hide prestasi section when showing new detail
  document.getElementById("prestasiContent").style.display = 'none';
  const toggleBtn = document.getElementById('togglePrestasiBtn');
  if (toggleBtn) {
    toggleBtn.textContent = '📊 Tampilkan Prestasi';
    toggleBtn.style.background = '#28a745';
  }
}

// Toggle Prestasi Section
function togglePrestasi() {
  if (!currentStudent) {
    alert('Tidak ada data siswa yang dipilih');
    return;
  }
  
  const prestasiSection = document.getElementById('prestasiContent');
  const toggleBtn = document.getElementById('togglePrestasiBtn');
  
  if (prestasiSection.style.display === 'none') {
    // Show prestasi
    const prestasi = dataPrestasi.find(p => p.nama === currentStudent.nama);
    
    if (!prestasi) {
      prestasiSection.innerHTML = `
        <div class="buku-induk-page" style="padding: 40px; text-align: center;">
          <h3 style="color: #666;">Data prestasi untuk ${currentStudent.nama} tidak ditemukan</h3>
        </div>
      `;
    } else {
      // Build prestasi HTML
      prestasiSection.innerHTML = buildPrestasiHTML(prestasi, currentStudent.nama);
    }
    
    prestasiSection.style.display = 'block';
    toggleBtn.textContent = '📊 Sembunyikan Prestasi';
    toggleBtn.style.background = '#6c757d';
    
    // Scroll to prestasi
    prestasiSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    // Hide prestasi
    prestasiSection.style.display = 'none';
    toggleBtn.textContent = '📊 Tampilkan Prestasi';
    toggleBtn.style.background = '#28a745';
  }
}

// Build Prestasi HTML
function buildPrestasiHTML(prestasi, studentName) {
  return `
    <div class="buku-induk-page">
      <div class="page-header">
        <div class="title-section">
          <h2>BUKU INDUK SISWA - PRESTASI</h2>
        </div>
        <div class="header-info">
          <div class="nis-box">
            <span>Nama Siswa:</span>
            <span class="number-box">${studentName}</span>
          </div>
        </div>
      </div>
      
      <div class="main-content">
        <div class="table-with-photos">
          <table class="buku-induk-table">
            <!-- Section F Header -->
            <tr class="section-header">
              <td colspan="4">F. PRESTASI</td>
            </tr>
          
          <!-- Sikap -->
          <tr>
            <td class="numbering" rowspan="2">1.</td>
            <td class="label" rowspan="2">Penilaian Sikap</td>
            <td class="sub-label">a. Sikap Spiritual</td>
            <td class="value">: ${prestasi.nilai_sikap_spriritual || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">b. Sikap Sosial</td>
            <td class="value">: ${prestasi.nilai_sikap_sosial || '—'}</td>
          </tr>
          
          <!-- Nilai Akademik Header -->
          <tr>
            <td class="numbering">2.</td>
            <td class="label" colspan="3">Nilai Akademik</td>
          </tr>
          
          ${buildSubjectRows(prestasi)}
          
          <!-- Ekstrakurikuler -->
          <tr>
            <td class="numbering" rowspan="4">3.</td>
            <td class="label" rowspan="4">Ekstrakurikuler</td>
            <td class="sub-label">a. Pramuka</td>
            <td class="value">: ${prestasi.ekstrakurikuler_pramuka_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">b. Bahasa Inggris</td>
            <td class="value">: ${prestasi.ekstrakurikuler_bahasa_inggris_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">c. Komputer</td>
            <td class="value">: ${prestasi.ekstrakurikuler_komputer_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">d. Hadroh</td>
            <td class="value">: ${prestasi.ekstrakurikuler_hadroh_deskripsi || '—'}</td>
          </tr>
          
          <!-- Prestasi -->
          <tr>
            <td class="numbering" rowspan="2">4.</td>
            <td class="label" rowspan="2">Prestasi</td>
            <td class="sub-label">a. Kesenian</td>
            <td class="value">: ${prestasi.prestasi_kesenian_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">b. Olahraga</td>
            <td class="value">: ${prestasi.prestasi_olahraga_deskripsi || '—'}</td>
          </tr>
          
          <!-- Kesehatan -->
          <tr>
            <td class="numbering" rowspan="4">5.</td>
            <td class="label" rowspan="4">Kesehatan</td>
            <td class="sub-label">a. Pendengaran</td>
            <td class="value">: ${prestasi.kesehatan_pendengaran_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">b. Penglihatan</td>
            <td class="value">: ${prestasi.kesehatan_pengelihatan_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">c. Gigi</td>
            <td class="value">: ${prestasi.kesehatan_gigi_deskripsi || '—'}</td>
          </tr>
          <tr>
            <td class="sub-label">d. Lainnya</td>
            <td class="value">: ${prestasi.kesehatan_lainya_deskripsi || '—'}</td>
          </tr>
          
          <!-- Ketidakhadiran -->
          <tr>
            <td class="numbering" rowspan="3">6.</td>
            <td class="label" rowspan="3">Ketidakhadiran</td>
            <td class="sub-label">a. Sakit</td>
            <td class="value">: ${prestasi.ketidakhadiran_sakit_deskripsi || '—'} hari</td>
          </tr>
          <tr>
            <td class="sub-label">b. Izin</td>
            <td class="value">: ${prestasi.ketidakhadiran_izin_deskripsi || '—'} hari</td>
          </tr>
          <tr>
            <td class="sub-label">c. Tanpa Keterangan</td>
            <td class="value">: ${prestasi.ketidakhadiran_tanpa_keterangan_deskripsi || '—'} hari</td>
          </tr>
        </table>
        </div>
      </div>
    </div>
  `;
}

// Helper function to build subject rows
function buildSubjectRows(prestasi) {
  const subjects = [
    { name: 'Pendidikan Agama', key: 'pendidikan_agama' },
    { name: 'PKn', key: 'pkn' },
    { name: 'Bahasa Indonesia', key: 'bahasa_indonesia' },
    { name: 'Matematika', key: 'matemaika' },
    { name: 'IPA', key: 'ipa' },
    { name: 'IPS', key: 'ips' },
    { name: 'SBK', key: 'sbk' },
    { name: 'PJOK', key: 'pjok' },
    { name: 'Mulok Bahasa Jawa', key: 'mulok_bahasa_jawa' },
    { name: 'Mulok', key: 'mulok' }
  ];
  
  let html = '';
  
  subjects.forEach(subject => {
    const pengetahuanNilai = prestasi[`${subject.key}_pengetahuan_nilai`];
    const pengetahuanPredikat = prestasi[`${subject.key}_pengetahuan_predikat`];
    const keterampilanNilai = prestasi[`${subject.key}_keterampilan_nilai`];
    const keterampilanPredikat = prestasi[`${subject.key}_keterampilan_predikat`];
    
    // Only show if there's data
    if (pengetahuanNilai || keterampilanNilai) {
      html += `
        <tr>
          <td class="numbering"></td>
          <td class="label">${subject.name}</td>
          <td class="sub-label">Pengetahuan: ${pengetahuanNilai || '—'} (${pengetahuanPredikat || '—'})</td>
          <td class="value">Keterampilan: ${keterampilanNilai || '—'} (${keterampilanPredikat || '—'})</td>
        </tr>
      `;
    }
  });
  
  return html;
}