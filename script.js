// Veritabanı Sınıfı
class Database {
    constructor() {
        this.dbName = 'isyeriHekimligiDB';
        this.version = 4;
        this.db = null;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = (event) => {
                console.error("Veritabanı hatası:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('workplaces')) {
                    db.createObjectStore('workplaces', { keyPath: 'id' });
                }
                
                let employeeStore;
                if (!db.objectStoreNames.contains('employees')) {
                    employeeStore = db.createObjectStore('employees', { keyPath: 'id' });
                } else {
                    employeeStore = event.target.transaction.objectStore('employees');
                }
                
                if (!employeeStore.indexNames.contains('workplaceId')) {
                    employeeStore.createIndex('workplaceId', 'workplaceId', { unique: false });
                }

                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files', { keyPath: 'id' });
                }
            };
        });
    }

    async getWorkplaces() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workplaces'], 'readonly');
            const store = transaction.objectStore('workplaces');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async addWorkplace(workplace) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            const request = store.add(workplace);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getEmployees(workplaceId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const index = store.index('workplaceId');
            const request = index.getAll(workplaceId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async addEmployee(employee) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            const request = store.add(employee);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async addFile(file) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['files'], 'readwrite');
            const store = transaction.objectStore('files');
            const request = store.add(file);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }
}

// Uygulama State'i
const appState = {
    db: new Database(),
    currentUser: null,
    currentWorkplace: null,
    currentEmployees: [],
    currentFileUploadIndex: null
};

// Sayfa Yüklendiğinde
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await appState.db.initDB();
        initLogin();
        checkAuth();
        initModals();
        initWorkplaceActions();
        initEmployeeActions();
    } catch (error) {
        console.error('Başlatma hatası:', error);
        alert('Uygulama başlatılırken bir hata oluştu: ' + error.message);
    }
});

// Giriş İşlemleri
function initLogin() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
}

async function login() {
    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (!username || !password) {
            throw new Error('Kullanıcı adı ve şifre gereklidir');
        }

        if (username === 'hekim' && password === 'Sifre123!') {
            localStorage.setItem('authToken', 'demo-token');
            appState.currentUser = { username, role: 'doctor' };
            showMainView();
            await loadWorkplaces();
        } else {
            alert('Geçersiz kullanıcı adı veya şifre!');
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        alert(`Giriş hatası: ${error.message}`);
    }
}

function checkAuth() {
    if (localStorage.getItem('authToken')) {
        appState.currentUser = { username: 'hekim', role: 'doctor' };
        showMainView();
        loadWorkplaces();
    }
}

function showMainView() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('welcomeText').textContent = `Hoş geldiniz, ${appState.currentUser.username}`;
}

// Çıkış İşlemi
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            location.reload();
        });
    }
}

// Modal İşlemleri
function initModals() {
    // Modal kapatma butonları
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.modal').style.display = 'none';
        });
    });

    // Dışarı tıklayarak kapatma
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });

    // İşyeri ekleme modalı
    const addWorkplaceBtn = document.getElementById('addWorkplaceBtn');
    if (addWorkplaceBtn) {
        addWorkplaceBtn.addEventListener('click', () => {
            document.getElementById('modalTitle').textContent = 'Yeni İşyeri';
            document.getElementById('workplaceNameInput').value = '';
            document.getElementById('workplaceAddressInput').value = '';
            document.getElementById('workplaceModal').style.display = 'block';
        });
    }

    // İşyeri kaydetme butonu
    const saveWorkplaceBtn = document.getElementById('saveWorkplaceBtn');
    if (saveWorkplaceBtn) {
        saveWorkplaceBtn.addEventListener('click', async () => {
            const name = document.getElementById('workplaceNameInput').value;
            const address = document.getElementById('workplaceAddressInput').value;

            if (!name) {
                alert('İşyeri adı gereklidir');
                return;
            }

            try {
                const workplace = {
                    id: Date.now().toString(),
                    name,
                    address,
                    createdAt: new Date().toISOString()
                };

                await appState.db.addWorkplace(workplace);
                await loadWorkplaces();
                document.getElementById('workplaceModal').style.display = 'none';
            } catch (error) {
                console.error('İşyeri ekleme hatası:', error);
                alert('İşyeri eklenirken hata oluştu');
            }
        });
    }
}

// İşyeri İşlemleri
async function loadWorkplaces() {
    try {
        const workplaces = await appState.db.getWorkplaces();
        
        if (workplaces.length === 0) {
            await addDemoData();
            return loadWorkplaces();
        }

        renderWorkplaces(workplaces);
    } catch (error) {
        console.error('İşyerleri yüklenirken hata:', error);
    }
}

async function addDemoData() {
    const demoWorkplaces = [
        { id: '1', name: 'Örnek İşyeri 1', address: 'Örnek Adres 1', createdAt: new Date().toISOString() },
        { id: '2', name: 'Örnek İşyeri 2', address: 'Örnek Adres 2', createdAt: new Date().toISOString() }
    ];

    for (const workplace of demoWorkplaces) {
        await appState.db.addWorkplace(workplace);
    }
}

function renderWorkplaces(workplaces) {
    const listElement = document.getElementById('workplaceList');
    listElement.innerHTML = '';

    workplaces.forEach(workplace => {
        const li = document.createElement('li');
        li.textContent = workplace.name;
        li.addEventListener('click', async () => {
            appState.currentWorkplace = workplace;
            await showWorkplaceDetails(workplace);
        });
        listElement.appendChild(li);
    });
}

async function showWorkplaceDetails(workplace) {
    document.getElementById('workplaceSection').style.display = 'none';
    document.getElementById('employeeSection').style.display = 'block';
    document.getElementById('currentWorkplaceTitle').textContent = workplace.name;
    await loadEmployees(workplace.id);
}

// Geri Butonu
function initBackButton() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            document.getElementById('employeeSection').style.display = 'none';
            document.getElementById('workplaceSection').style.display = 'block';
            document.getElementById('employeeTable').querySelector('tbody').innerHTML = '';
        });
    }
}

// Çalışan İşlemleri
async function loadEmployees(workplaceId) {
    try {
        const employees = await appState.db.getEmployees(workplaceId);
        appState.currentEmployees = employees;
        renderEmployees(employees);
    } catch (error) {
        console.error('Çalışanlar yüklenirken hata:', error);
    }
}

function renderEmployees(employees) {
    const tbody = document.getElementById('employeeTable').querySelector('tbody');
    tbody.innerHTML = '';

    if (employees.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="6" style="text-align: center;">Henüz çalışan eklenmemiş</td>';
        tbody.appendChild(tr);
        return;
    }

    employees.forEach((emp, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${emp.name || ''}</td>
            <td>${emp.tckn || ''}</td>
            <td>${emp.examDate || ''}</td>
            <td>${emp.nextExamDate || ''}</td>
            <td>
                <button class="btn-primary" onclick="showEk2Modal(${index})">EK-2</button>
                <button class="btn-secondary" onclick="showFileUploadModal(${index})">Dosya Yükle</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// EK-2 Formu
function showEk2Modal(employeeIndex) {
    const employee = appState.currentEmployees[employeeIndex];
    
    // EK-2 form içeriğini oluştur
    const ek2Content = document.getElementById('ek2FormContent');
    ek2Content.innerHTML = `
        <h3>EK-2 İŞE GİRİŞ/PERİYODİK MUAYENE FORMU</h3>
        <div class="form-group">
            <label>Adı Soyadı</label>
            <input type="text" value="${employee.name || ''}">
        </div>
        <div class="form-group">
            <label>TC Kimlik No</label>
            <input type="text" value="${employee.tckn || ''}">
        </div>
        <!-- Diğer form alanları buraya eklenecek -->
    `;
    
    document.getElementById('ek2Modal').style.display = 'block';
}

// Dosya Yükleme Modalı
function showFileUploadModal(employeeIndex) {
    appState.currentFileUploadIndex = employeeIndex;
    document.getElementById('fileInput').value = '';
    document.getElementById('fileUploadModal').style.display = 'block';
}

// İşyeri ve Çalışan Eylemlerini Başlatma
function initWorkplaceActions() {
    initBackButton();
    initLogout();
}

function initEmployeeActions() {
    const importExcelBtn = document.getElementById('importExcelBtn');
    if (importExcelBtn) {
        importExcelBtn.addEventListener('click', importFromExcel);
    }

    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', exportToExcel);
    }

    const uploadFileBtn = document.getElementById('uploadFileBtn');
    if (uploadFileBtn) {
        uploadFileBtn.addEventListener('click', uploadFile);
    }
}

// Excel İşlemleri
function exportToExcel() {
    alert('Excel export işlemi henüz implemente edilmedi');
}

function importFromExcel() {
    alert('Excel import işlemi henüz implemente edilmedi');
}

// Dosya Yükleme
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        alert('Lütfen bir dosya seçin');
        return;
    }

    const file = fileInput.files[0];
    const employee = appState.currentEmployees[appState.currentFileUploadIndex];
    
    alert(`${employee.name} için ${file.name} dosyası yüklenecek`);
    document.getElementById('fileUploadModal').style.display = 'none';
}

// Global fonksiyonlar
window.showEk2Modal = showEk2Modal;
window.showFileUploadModal = showFileUploadModal;
