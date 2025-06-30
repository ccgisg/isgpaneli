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

  // ... (Diğer veritabanı metodları aynı) ...
}

const appState = {
  db: new Database(),
  currentUser: null,
  currentWorkplace: null,
  selectedEmployee: null
};

// GİRİŞ İŞLEMLERİ
async function login() {
  try {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    console.log(`Giriş denemesi - Kullanıcı: ${username}, Şifre: ${password}`);
    
    if (!username || !password) {
      throw new Error('Lütfen kullanıcı adı ve şifre giriniz');
    }

    if (username === 'hekim' && password === 'Sifre123!') {
      console.log('Giriş bilgileri doğru');
      
      localStorage.setItem('authToken', 'demo-token-' + Date.now());
      console.log('Token oluşturuldu');
      
      await appState.db.initializeDB();
      
      document.getElementById('loginArea').style.display = 'none';
      document.getElementById('mainView').style.display = 'block';
      console.log('Arayüz güncellendi');
      
      await loadWorkplaces();
      await loadDashboard();
      
      console.log('Giriş başarılı!');
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
  
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

function setupTestLogin() {
  const testButton = document.getElementById('testLogin');
  testButton.addEventListener('click', () => {
    console.log('Test girişi tetiklendi');
    document.getElementById('username').value = 'hekim';
    document.getElementById('password').value = 'Sifre123!';
    login();
  });
}

function checkAuth() {
  const token = localStorage.getItem('authToken');
  if (token) {
    console.log('Oturum açık, ana sayfaya yönlendiriliyor');
    showMainView();
    loadWorkplaces();
    loadDashboard();
  }
}

function logout() {
  localStorage.removeItem('authToken');
  location.reload();
}

// ARAYÜZ FONKSİYONLARI
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

// ... (Diğer fonksiyonlar aynı) ...

// UYGULAMA BAŞLATMA
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM yüklendi");
  
  document.getElementById('loginButton').addEventListener('click', login);
  setupTestLogin();
  
  checkAuth();
});
