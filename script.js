// Veritabanı Yönetimi
class Database {
  constructor() {
    this.dbName = 'isyeriHekimligiDB';
    this.version = 2;
    this.db = null;
  }

  initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('workplaces')) {
          const store = db.createObjectStore('workplaces', { keyPath: 'id', autoIncrement: true });
          store.createIndex('name', 'name', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('employees')) {
          const store = db.createObjectStore('employees', { keyPath: 'id', autoIncrement: true });
          store.createIndex('workplaceId', 'workplaceId', { unique: false });
          store.createIndex('tc', 'tc', { unique: true });
        }
        
        if (!db.objectStoreNames.contains('examinations')) {
          const store = db.createObjectStore('examinations', { keyPath: 'id', autoIncrement: true });
          store.createIndex('employeeId', 'employeeId', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async addWorkplace(name) {
    const tx = this.db.transaction('workplaces', 'readwrite');
    const store = tx.objectStore('workplaces');
    return new Promise((resolve, reject) => {
      const request = store.add({ 
        name, 
        createdAt: new Date(),
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getWorkplaces() {
    const tx = this.db.transaction('workplaces', 'readonly');
    const store = tx.objectStore('workplaces');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getWorkplace(id) {
    const tx = this.db.transaction('workplaces', 'readonly');
    const store = tx.objectStore('workplaces');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async addEmployee(employeeData) {
    const tx = this.db.transaction('employees', 'readwrite');
    const store = tx.objectStore('employees');
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...employeeData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getEmployeesByWorkplace(workplaceId) {
    const tx = this.db.transaction('employees', 'readonly');
    const store = tx.objectStore('employees');
    const index = store.index('workplaceId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(workplaceId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getEmployee(id) {
    const tx = this.db.transaction('employees', 'readonly');
    const store = tx.objectStore('employees');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async updateEmployee(id, updateData) {
    const tx = this.db.transaction('employees', 'readwrite');
    const store = tx.objectStore('employees');
    return new Promise(async (resolve, reject) => {
      // Önce mevcut veriyi al
      const employee = await this.getEmployee(id);
      if (!employee) {
        reject(new Error('Çalışan bulunamadı'));
        return;
      }
      
      // Güncelleme isteği
      const request = store.put({
        ...employee,
        ...updateData,
        updatedAt: new Date()
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async addExamination(examData) {
    const tx = this.db.transaction('examinations', 'readwrite');
    const store = tx.objectStore('examinations');
    return new Promise((resolve, reject) => {
      const request = store.add({
        ...examData,
        createdAt: new Date()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getExaminationsByEmployee(employeeId) {
    const tx = this.db.transaction('examinations', 'readonly');
    const store = tx.objectStore('examinations');
    const index = store.index('employeeId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(employeeId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async updateSetting(key, value) {
    const tx = this.db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async getSetting(key) {
    const tx = this.db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

// Uygulama State'i
const appState = {
  db: new Database(),
  currentUser: null,
  currentWorkplace: null,
  selectedEmployee: null
};

// DOM yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
  await appState.db.initializeDB();
  checkAuth();
  setupEventListeners();
});

function setupEventListeners() {
  // EK-2 form sonuç radyo butonları
  document.addEventListener('change', function(e) {
    if (e.target.name === 'sonuc') {
      document.getElementById('sartAciklama').disabled = e.target.value !== 'sartli';
    }
  });
}

// Kimlik doğrulama
function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (token) {
    showMainView();
    loadWorkplaces();
    loadDashboard();
  } else {
    showLoginView();
  }
}

function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  // Basit bir doğrulama (gerçek uygulamada sunucu tarafında doğrulama yapılmalı)
  if (username === 'hekim' && password === 'Sifre123!') {
    localStorage.setItem('authToken', 'demo-token');
    showMainView();
    loadWorkplaces();
    loadDashboard();
  } else {
    alert('Kullanıcı adı veya şifre hatalı!');
  }
}

function logout() {
  localStorage.removeItem('authToken');
  location.reload();
}

function showLoginView() {
  document.getElementById('loginArea').style.display = 'flex';
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('workplaceView').style.display = 'none';
}

function showMainView() {
  document.getElementById('loginArea').style.display = 'none';
  document.getElementById('mainView').style.display = 'block';
  document.getElementById('workplaceView').style.display = 'none';
}

function showWorkplaceView() {
  document.getElementById('loginArea').style.display = 'none';
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('workplaceView').style.display = 'block';
}

// Dashboard yükleme
async function loadDashboard() {
  try {
    const workplaces = await appState.db.getWorkplaces();
    let totalEmployees = 0;
    let upcomingExams = 0;
    let overdueExams = 0;
    
    for (const wp of workplaces) {
      const employees = await appState.db.getEmployeesByWorkplace(wp.id);
      totalEmployees += employees.length;
      
      for (const emp of employees) {
        if (emp.nextExamDate) {
          const examDate = new Date(emp.nextExamDate);
          const today = new Date();
          const diffTime = examDate - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 30 && diffDays >= 0) {
            upcomingExams++;
          } else if (diffDays < 0) {
            overdueExams++;
          }
        }
      }
    }
    
    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('upcomingExams').textContent = upcomingExams;
    document.getElementById('overdueExams').textContent = overdueExams;
  } catch (error) {
    console.error('Dashboard yüklenirken hata:', error);
  }
}

// İşyeri işlemleri
async function loadWorkplaces() {
  try {
    const workplaces = await appState.db.getWorkplaces();
    const list = document.getElementById('workplaceList');
    list.innerHTML = '';
    
    workplaces.forEach(wp => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.innerHTML = `
        ${wp.name}
        <div>
          <button class="btn btn-sm btn-outline-primary" onclick="editWorkplace(${wp.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteWorkplace(${wp.id})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      li.addEventListener('click', () => openWorkplace(wp.id));
      list.appendChild(li);
    });
  } catch (error) {
    console.error('İşyerleri yüklenirken hata:', error);
    alert('İşyerleri yüklenirken bir hata oluştu');
  }
}

async function addWorkplace() {
  const name = prompt('Yeni işyeri adı:');
  if (name) {
    try {
      await appState.db.addWorkplace(name);
      loadWorkplaces();
      loadDashboard();
    } catch (error) {
      console.error('İşyeri eklenirken hata:', error);
      alert('Bu isimde bir işyeri zaten var!');
    }
  }
}

async function editWorkplace(id) {
  const workplace = await appState.db.getWorkplace(id);
  if (!workplace) return;
  
  const newName = prompt('Yeni işyeri adı:', workplace.name);
  if (newName) {
    try {
      await appState.db.updateWorkplace(id, { name: newName });
      loadWorkplaces();
      if (appState.currentWorkplace === id) {
        document.getElementById('currentWorkplaceTitle').textContent = newName;
      }
    } catch (error) {
      console.error('İşyeri güncellenirken hata:', error);
      alert('Güncelleme sırasında bir hata oluştu');
    }
  }
}

async function deleteWorkplace(id) {
  if (!confirm('Bu işyerini ve tüm çalışanlarını silmek istediğinize emin misiniz?')) return;
  
  try {
    // İşyerine ait çalışanları sil
    const employees = await appState.db.getEmployeesByWorkplace(id);
    for (const emp of employees) {
      await appState.db.deleteEmployee(emp.id);
    }
    
    // İşyerini sil
    await appState.db.deleteWorkplace(id);
    
    loadWorkplaces();
    loadDashboard();
    if (appState.currentWorkplace === id) {
      goBack();
    }
  } catch (error) {
    console.error('İşyeri silinirken hata:', error);
    alert('Silme işlemi sırasında bir hata oluştu');
  }
}

async function openWorkplace(id) {
  appState.currentWorkplace = id;
  const workplace = await appState.db.getWorkplace(id);
  document.getElementById('currentWorkplaceTitle').textContent = workplace.name;
  showWorkplaceView();
  loadEmployees(id);
}

function goBack() {
  appState.currentWorkplace = null;
  showMainView();
}

// Çalışan işlemleri
async function loadEmployees(workplaceId) {
  try {
    const employees = await appState.db.getEmployeesByWorkplace(workplaceId);
    const tbody = document.querySelector('#employeeTable tbody');
    tbody.innerHTML = '';
    
    employees.forEach((emp, index) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${emp.name}</td>
        <td>${emp.tc}</td>
        <td>${emp.lastExamDate ? formatDate(emp.lastExamDate) : '-'}</td>
        <td>${emp.nextExamDate ? formatDate(emp.nextExamDate) : '-'}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openEK2Form(${emp.id})">
            <i class="fas fa-file-medical"></i> EK-2
          </button>
          <button class="btn btn-sm btn-warning" onclick="editEmployee(${emp.id})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteEmployee(${emp.id})">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
    });
  } catch (error) {
    console.error('Çalışanlar yüklenirken hata:', error);
  }
}

async function addEmployee() {
  const name = prompt('Ad Soyad:');
  if (!name) return;
  
  const tc = prompt('TC Kimlik No:');
  if (!tc || !/^\d{11}$/.test(tc)) {
    alert('Geçerli bir TC Kimlik No giriniz (11 haneli)');
    return;
  }
  
  try {
    await appState.db.addEmployee({
      workplaceId: appState.currentWorkplace,
      name,
      tc,
      lastExamDate: null,
      nextExamDate: null
    });
    loadEmployees(appState.currentWorkplace);
  } catch (error) {
    console.error('Çalışan eklenirken hata:', error);
    alert('Bu TCKN ile kayıtlı bir çalışan zaten var!');
  }
}

async function editEmployee(id) {
  const employee = await appState.db.getEmployee(id);
  if (!employee) return;
  
  const name = prompt('Ad Soyad:', employee.name);
  if (!name) return;
  
  const tc = prompt('TC Kimlik No:', employee.tc);
  if (!tc || !/^\d{11}$/.test(tc)) {
    alert('Geçerli bir TC Kimlik No giriniz (11 haneli)');
    return;
  }
  
  try {
    await appState.db.updateEmployee(id, { name, tc });
    loadEmployees(appState.currentWorkplace);
  } catch (error) {
    console.error('Çalışan güncellenirken hata:', error);
    alert('Güncelleme sırasında bir hata oluştu');
  }
}

async function deleteEmployee(id) {
  if (!confirm('Bu çalışanı ve tüm muayene kayıtlarını silmek istediğinize emin misiniz?')) return;
  
  try {
    // Çalışana ait muayeneleri sil
    const exams = await appState.db.getExaminationsByEmployee(id);
    for (const exam of exams) {
      await appState.db.deleteExamination(exam.id);
    }
    
    // Çalışanı sil
    await appState.db.deleteEmployee(id);
    
    loadEmployees(appState.currentWorkplace);
  } catch (error) {
    console.error('Çalışan silinirken hata:', error);
    alert('Silme işlemi sırasında bir hata oluştu');
  }
}

// EK-2 Form İşlemleri
async function openEK2Form(employeeId) {
  try {
    appState.selectedEmployee = employeeId;
    
    // Verileri yükle
    const employee = await appState.db.getEmployee(employeeId);
    const workplace = await appState.db.getWorkplace(appState.currentWorkplace);
    const doctorInfo = await appState.db.getSetting('doctorInfo');
    
    // EK-2 form şablonunu oluştur
    const ek2FormHTML = `
      <div class="ek2-form-container">
        <div class="ek2-section">
          <h4 class="ek2-section-title">İŞYERİNİN</h4>
          <div class="row">
            <div class="col-md-6">
              <div class="ek2-form-group">
                <label class="ek2-label">Ünvanı</label>
                <div class="ek2-value">${workplace.name}</div>
              </div>
              <div class="ek2-form-group">
                <label class="ek2-label">SGK Sicil No.</label>
                <input type="text" class="ek2-input" id="sgkSicilNo">
              </div>
            </div>
            <div class="col-md-6">
              <div class="ek2-form-group">
                <label class="ek2-label">Adresi</label>
                <input type="text" class="ek2-input" id="isyeriAdres">
              </div>
              <div class="ek2-form-group">
                <label class="ek2-label">Tel ve Faks No</label>
                <input type="text" class="ek2-input" id="isyeriTelefon">
              </div>
            </div>
          </div>
        </div>

        <div class="ek2-section">
          <h4 class="ek2-section-title">ÇALIŞANIN</h4>
          <div class="row">
            <div class="col-md-4">
              <div class="ek2-form-group">
                <label class="ek2-label">Adı ve soyadı</label>
                <div class="ek2-value">${employee.name}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="ek2-form-group">
                <label class="ek2-label">T.C. Kimlik No</label>
                <div class="ek2-value">${employee.tc}</div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="ek2-form-group">
                <label class="ek2-label">Doğum Yeri ve Tarihi</label>
                <input type="text" class="ek2-input" id="dogumYeriTarihi">
              </div>
            </div>
          </div>
          
          <!-- Diğer form alanları... -->
        </div>

        <div class="ek2-section">
          <h4 class="ek2-section-title">KANAAT VE SONUÇ</h4>
          <div class="ek2-form-group">
            <div class="form-check">
              <input class="form-check-input" type="radio" name="sonuc" id="sonuc1" value="elverisli" checked>
              <label class="form-check-label" for="sonuc1">
                İşinde bedenen ve ruhen çalışmaya elverişlidir.
              </label>
            </div>
            <div class="form-check">
              <input class="form-check-input" type="radio" name="sonuc" id="sonuc2" value="sartli">
              <label class="form-check-label" for="sonuc2">
                Şartı ile çalışmaya elverişlidir:
              </label>
              <input type="text" class="ek2-input mt-2" id="sartAciklama" disabled>
            </div>
          </div>
        </div>

        <div class="ek2-section">
          <div class="row">
            <div class="col-md-6">
              <div class="ek2-form-group">
                <label class="ek2-label">İşyeri Hekimi Adı Soyadı</label>
                <div class="ek2-value">${doctorInfo?.docName || ''}</div>
              </div>
            </div>
            <div class="col-md-6 text-end">
              <div class="ek2-form-group">
                <label class="ek2-label">Tarih</label>
                <div class="ek2-value">${formatDate(new Date())}</div>
              </div>
            </div>
          </div>
          <div class="ek2-signature-box">
            <p>İmza</p>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('ek2FormContent').innerHTML = ek2FormHTML;
    
    // Modalı göster
    const modal = new bootstrap.Modal(document.getElementById('ek2Modal'));
    modal.show();
    
  } catch (error) {
    console.error('EK-2 formu açılırken hata:', error);
    alert('Form yüklenirken bir hata oluştu');
  }
}

async function saveEK2() {
  try {
    // Form verilerini topla
    const formData = {
      muayeneTarihi: document.getElementById('muayeneTarihi')?.value || formatDate(new Date()),
      sgkSicilNo: document.getElementById('sgkSicilNo')?.value || '',
      isyeriAdres: document.getElementById('isyeriAdres')?.value || '',
      isyeriTelefon: document.getElementById('isyeriTelefon')?.value || '',
      dogumYeriTarihi: document.getElementById('dogumYeriTarihi')?.value || '',
      sonuc: document.querySelector('input[name="sonuc"]:checked')?.value || 'elverisli',
      sartAciklama: document.getElementById('sartAciklama')?.value || '',
      // Diğer form alanları...
    };
    
    // Veritabanına kaydet
    await appState.db.addExamination({
      employeeId: appState.selectedEmployee,
      date: new Date(),
      type: 'periodic',
      formData: formData,
      doctorNotes: document.getElementById('doctorNotes')?.value || ''
    });
    
    // Sonraki muayene tarihini hesapla (5 yıl sonra)
    const nextExamDate = new Date();
    nextExamDate.setFullYear(nextExamDate.getFullYear() + 5);
    
    // Çalışan bilgisini güncelle
    await appState.db.updateEmployee(appState.selectedEmployee, {
      lastExamDate: new Date(),
      nextExamDate: nextExamDate
    });
    
    // Başarı mesajı ve modalı kapat
    alert('Muayene kaydı başarıyla oluşturuldu');
    const modal = bootstrap.Modal.getInstance(document.getElementById('ek2Modal'));
    modal.hide();
    
    // Çalışan listesini yenile
    loadEmployees(appState.currentWorkplace);
    
  } catch (error) {
    console.error('EK-2 kaydedilirken hata:', error);
    alert('Kayıt sırasında bir hata oluştu: ' + error.message);
  }
}

function printEK2() {
  // PDF oluşturma işlemi (jsPDF kütüphanesi ile)
  alert('PDF oluşturma özelliği aktifleştirilecek');
}

// Doktor bilgileri
async function saveDoctorInfo() {
  const docName = document.getElementById('docName').value;
  const docDiploma = document.getElementById('docDiploma').value;
  
  try {
    await appState.db.updateSetting('doctorInfo', { docName, docDiploma });
    alert('Doktor bilgisi kaydedildi.');
  } catch (error) {
    console.error('Doktor bilgisi kaydedilirken hata:', error);
    alert('Kayıt sırasında bir hata oluştu');
  }
}

// Raporlama İşlemleri
function generateEK2Report() {
  // PDF oluşturma işlemleri
  alert('EK-2 PDF raporu oluşturulacak (entegrasyon devam ediyor)');
}

async function exportToExcel() {
  try {
    const
