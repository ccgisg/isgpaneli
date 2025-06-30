console.log("İşyeri Hekimliği Uygulaması Başlatılıyor...");

class Database {
  constructor() {
    this.dbName = 'isyeriHekimligiDB_final';
    this.version = 1;
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
        console.log("Veritabanı başarıyla başlatıldı");
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Veritabanı hatası:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  // Diğer veritabanı metodları...
  async getWorkplaces() {
    const tx = this.db.transaction('workplaces', 'readonly');
    const store = tx.objectStore('workplaces');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
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
}

const appState = {
  db: new Database(),
  currentUser: null,
  currentWorkplace: null,
  selectedEmployee: null
};

// İşyeri Yönetim Fonksiyonları
async function loadWorkplaces() {
  try {
    console.log("İşyerleri yükleniyor...");
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
    
    console.log(`${workplaces.length} işyeri yüklendi`);
  } catch (error) {
    console.error('İşyerleri yüklenirken hata:', error);
    showError('İşyerleri yüklenirken bir hata oluştu');
  }
}

async function loadDashboard() {
  try {
    console.log("Dashboard yükleniyor...");
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
          const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
          
          if (diffDays <= 30 && diffDays >= 0) upcomingExams++;
          else if (diffDays < 0) overdueExams++;
        }
      }
    }
    
    document.getElementById('totalEmployees').textContent = totalEmployees;
    document.getElementById('upcomingExams').textContent = upcomingExams;
    document.getElementById('overdueExams').textContent = overdueExams;
    
    console.log("Dashboard verileri güncellendi");
  } catch (error) {
    console.error('Dashboard yüklenirken hata:', error);
  }
}

// Diğer fonksiyonlar (login, showError, setupTestLogin vb.) önceki gibi kalacak...

// Uygulama başlatma
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM yüklendi");
  
  document.getElementById('loginButton').addEventListener('click', login);
  setupTestLogin();
  
  checkAuth();
});

// Eksik fonksiyonlar için placeholder'lar
function editWorkplace(id) {
  console.log("Düzenleme işlevi geliştirme aşamasında, ID:", id);
  alert("Bu özellik şu anda geliştirme aşamasındadır");
}

function deleteWorkplace(id) {
  console.log("Silme işlevi geliştirme aşamasında, ID:", id);
  alert("Bu özellik şu anda geliştirme aşamasındadır");
}

function openWorkplace(id) {
  console.log("İşyeri açma işlevi geliştirme aşamasında, ID:", id);
  alert("Bu özellik şu anda geliştirme aşamasındadır");
}
