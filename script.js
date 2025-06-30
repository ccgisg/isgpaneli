console.log("Uygulama başlatılıyor...");

// Veritabanı Yönetimi
class Database {
  constructor() {
    this.dbName = 'isyeriHekimligiDB_v3';
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
        console.error('IndexedDB hatası:', event.target.error);
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

  async updateWorkplace(id, updateData) {
    const tx = this.db.transaction('workplaces', 'readwrite');
    const store = tx.objectStore('workplaces');
    return new Promise(async (resolve, reject) => {
      const workplace = await this.getWorkplace(id);
      if (!workplace) {
        reject(new Error('İşyeri bulunamadı'));
        return;
      }
      
      const request = store.put({
        ...workplace,
        ...updateData,
        updatedAt: new Date()
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteWorkplace(id) {
    const tx = this.db.transaction('workplaces', 'readwrite');
    const store = tx.objectStore('workplaces');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
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
      const employee = await this.getEmployee(id);
      if (!employee) {
        reject(new Error('Çalışan bulunamadı'));
        return;
      }
      
      const request = store.put({
        ...employee,
        ...updateData,
        updatedAt: new Date()
      });
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteEmployee(id) {
    const tx = this.db.transaction('employees', 'readwrite');
    const store = tx.objectStore('employees');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
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

  async deleteExamination(id) {
    const tx = this.db.transaction('examinations', 'readwrite');
    const store = tx.objectStore('examinations');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
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
  console.log("DOM yüklendi");
  
  // Event listener'ları kur
  document.getElementById('loginButton').addEventListener('click', login);
  document.getElementById('testLogin').addEventListener('click', () => {
    document.getElementById('username').value = 'hekim';
    document.getElementById('password').value = 'Sifre123!';
    login();
  });

  // Auth kontrolü
  await checkAuth();
});

async function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (token) {
    console.log("Oturum açık, ana sayfaya yönlendiriliyor");
    try {
      await appState.db.initializeDB();
      showMainView();
      await loadWorkplaces();
      await loadDashboard();
    } catch (error) {
      console.error('Oturum açma hatası:', error);
      showLoginView();
    }
  } else {
    showLoginView();
  }
}

async function login() {
  try {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    console.log(`Giriş denemesi: ${username} / ${password}`);
    
    if (!username || !password) {
      throw new Error('Kullanıcı adı ve şifre gereklidir');
    }

    if (username === 'hekim' && password === 'Sifre123!') {
      localStorage.setItem('authToken', 'demo-token-'+Date.now());
      
      await appState.db.initializeDB();
      showMainView();
      await loadWorkplaces();
      await loadDashboard();
      
      console.log('Giriş başarılı! Ana sayfa yüklendi.');
    } else {
      throw new Error('Geçersiz kullanıcı adı veya şifre');
    }
  } catch (error) {
    console.error('Giriş hatası:', error);
    showError(error.message);
  }
}

function showError(message) {
  const errorElement = document.getElementById('loginError');
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  setTimeout(() => errorElement.style.display = 'none', 5000);
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
         
