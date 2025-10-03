// Digitalisasi Buku Induk - Application JavaScript

// Dummy user login
const USERNAME = "admin";
const PASSWORD = "123";

// Dummy data siswa
let dataSiswa = [];

let currentResults = [];

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
      obj.alamat = obj.alamat_rumah_jalan || obj.alamat_rumah || obj.alamat || '';
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
    console.log('Contains nama siswa 1?', dataSiswa.some(s => s.nama && s.nama.includes('nama siswa 1')));
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

  // kategori (prefix matching case-insensitive)
  const categories = {
    "jumlah_saudara": "Jumlah Saudara",
    "alamat_rumah": "Alamat Rumah",
    "ayah_kandung": "Data Ayah Kandung",
    "ibu_kandung": "Data Ibu Kandung", 
    "wali_murid": "Data Wali Murid",
    "keadaan_jasmani": "Keadaan Jasmani",
    "masuk_menjadi_murid_baru": "Data Masuk Sekolah",
    "pindahan_dari_sekolah_lain": "Riwayat Pindahan",
    "pindah_sekolah": "Riwayat Pindah Sekolah",
    "keluar_sekolah": "Riwayat Keluar"
  };
  
  function prettifyLabel(k, categoryPrefix = '') {
    let label = k.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    
    // Remove repetitive prefixes when we're in a grouped category
    if (categoryPrefix) {
      const prefixesToRemove = [
        'Ayah Kandung ',
        'Ibu Kandung ',
        'Wali Murid ',
        'Alamat Rumah ',
        'Keadaan Jasmani ',
        'Masuk Menjadi Murid Baru ',
        'Pindahan Dari Sekolah Lain ',
        'Pindah Sekolah ',
        'Keluar Sekolah ',
        'Jumlah Saudara '
      ];
      
      for (let prefix of prefixesToRemove) {
        if (label.startsWith(prefix)) {
          label = label.substring(prefix.length);
          break;
        }
      }
    }
    
    return label;
  }

  let grouped = {};
  let singles = {};

  Object.keys(s).forEach(key => {
    if (key === 'foto') return; // foto ditampilkan sendiri
    let matched = false;
    const low = key.toLowerCase();
    for (let prefix in categories) {
      if (low.startsWith(prefix)) {
        if (!grouped[prefix]) grouped[prefix] = [];
        grouped[prefix].push({ 
          label: prettifyLabel(key, prefix), 
          value: s[key] 
        });
        matched = true;
        break;
      }
    }
    if (!matched) {
      singles[key] = s[key];
    }
  });

  // render UI with compact responsive design
  let detailHTML = `
    <div class="student-profile">
      <!-- Compact Header Section -->
      <div class="profile-header">
        <div class="profile-image">
          <img src="${s.foto}" alt="Foto ${s.nama}" class="student-photo">
        </div>
        <div class="profile-info">
          <h1 class="student-name">${s.nama || '—'}</h1>
          <div class="basic-info">
            ${s.nis ? `<span class="info-item"><strong>NIS:</strong> ${s.nis}</span>` : ''}
            ${s.kelas ? `<span class="info-item"><strong>Kelas:</strong> ${s.kelas}</span>` : ''}
            ${s.ttl ? `<span class="info-item"><strong>TTL:</strong> ${s.ttl}</span>` : ''}
            ${s.jenis_kelamin ? `<span class="info-item"><strong>JK:</strong> ${s.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>` : ''}
          </div>
        </div>
      </div>

      <!-- Tabbed Content for Better Organization -->
      <div class="tab-container">
        <div class="tab-nav">
          <button class="tab-btn active" onclick="switchTab('general')">📋 Umum</button>
          <button class="tab-btn" onclick="switchTab('family')">👨‍👩‍👧‍👦 Keluarga</button>
          <button class="tab-btn" onclick="switchTab('school')">🎓 Sekolah</button>
          <button class="tab-btn" onclick="switchTab('health')">🏥 Kesehatan</button>
        </div>

        <!-- General Tab -->
        <div id="tab-general" class="tab-content active">
          <div class="info-grid">
  `;

  // Organize data into tabs
  const generalInfo = {};
  const familyInfo = {};
  const schoolInfo = {};
  const healthInfo = {};

  // Categorize singles
  Object.keys(singles).forEach(key => {
    if (!['nis', 'kelas', 'ttl', 'alamat', 'jenis_kelamin'].includes(key)) {
      if (key.includes('agama') || key.includes('kewarganegaraan') || key.includes('anak_ke')) {
        generalInfo[key] = singles[key];
      } else {
        generalInfo[key] = singles[key];
      }
    }
  });

  // Categorize grouped data
  Object.keys(grouped).forEach(prefix => {
    if (prefix.includes('ayah') || prefix.includes('ibu') || prefix.includes('wali') || prefix.includes('saudara')) {
      familyInfo[prefix] = grouped[prefix];
    } else if (prefix.includes('masuk') || prefix.includes('pindah') || prefix.includes('keluar') || prefix.includes('sekolah')) {
      schoolInfo[prefix] = grouped[prefix];
    } else if (prefix.includes('jasmani') || prefix.includes('kesehatan')) {
      healthInfo[prefix] = grouped[prefix];
    } else {
      generalInfo['grouped_' + prefix] = grouped[prefix];
    }
  });

  // Add address to general if exists
  if (s.alamat) {
    detailHTML += `<div class="info-item-grid"><strong>Alamat:</strong><span>${s.alamat}</span></div>`;
  }

  // General tab content
  Object.keys(generalInfo).forEach(key => {
    if (key.startsWith('grouped_')) {
      const groupData = generalInfo[key];
      groupData.forEach(f => {
        if (f.value) {
          detailHTML += `<div class="info-item-grid"><strong>${f.label}:</strong><span>${f.value}</span></div>`;
        }
      });
    } else if (generalInfo[key]) {
      detailHTML += `<div class="info-item-grid"><strong>${prettifyLabel(key)}:</strong><span>${generalInfo[key]}</span></div>`;
    }
  });

  detailHTML += `
          </div>
        </div>

        <!-- Family Tab -->
        <div id="tab-family" class="tab-content">
          <div class="family-grid">
  `;

  // Family sections
  Object.keys(familyInfo).forEach(prefix => {
    const categoryName = categories[prefix] || prettifyLabel(prefix);
    const familyData = familyInfo[prefix];
    
    detailHTML += `
      <div class="family-section">
        <h4 class="family-title">${categoryName}</h4>
        <div class="family-details">
    `;
    
    familyData.forEach(f => {
      if (f.value) {
        detailHTML += `
          <div class="family-item">
            <span class="family-label">${f.label}</span>
            <span class="family-value">${f.value}</span>
          </div>
        `;
      }
    });
    
    detailHTML += `</div></div>`;
  });

  detailHTML += `
          </div>
        </div>

        <!-- School Tab -->
        <div id="tab-school" class="tab-content">
          <div class="school-grid">
  `;

  // School sections
  Object.keys(schoolInfo).forEach(prefix => {
    const categoryName = categories[prefix] || prettifyLabel(prefix);
    const schoolData = schoolInfo[prefix];
    
    detailHTML += `
      <div class="school-section">
        <h4 class="school-title">${categoryName}</h4>
        <div class="school-details">
    `;
    
    schoolData.forEach(f => {
      if (f.value) {
        detailHTML += `
          <div class="school-item">
            <span class="school-label">${f.label}</span>
            <span class="school-value">${f.value}</span>
          </div>
        `;
      }
    });
    
    detailHTML += `</div></div>`;
  });

  detailHTML += `
          </div>
        </div>

        <!-- Health Tab -->
        <div id="tab-health" class="tab-content">
          <div class="health-grid">
  `;

  // Health sections
  Object.keys(healthInfo).forEach(prefix => {
    const categoryName = categories[prefix] || prettifyLabel(prefix);
    const healthData = healthInfo[prefix];
    
    detailHTML += `
      <div class="health-section">
        <h4 class="health-title">${categoryName}</h4>
        <div class="health-details">
    `;
    
    healthData.forEach(f => {
      if (f.value) {
        detailHTML += `
          <div class="health-item">
            <span class="health-label">${f.label}</span>
            <span class="health-value">${f.value}</span>
          </div>
        `;
      }
    });
    
    detailHTML += `</div></div>`;
  });

  detailHTML += `
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById("detailContent").innerHTML = detailHTML;
}