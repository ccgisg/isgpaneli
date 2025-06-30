class Database {
    constructor() {
        this.dbName = 'isyeriHekimligiDB';
        this.version = 2;
        this.db = null;
        this.initDB();
    }

    initDB() {
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
                if (!db.objectStoreNames.contains('employees')) {
                    const store = db.createObjectStore('employees', { keyPath: 'id' });
                    store.createIndex('workplaceId', 'workplaceId', { unique: false });
                }
            };
        });
    }

    async getWorkplaces() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workplaces'], 'readonly');
            const store = transaction.objectStore('workplaces');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async getEmployees(workplaceId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readonly');
            const store = transaction.objectStore('employees');
            const index = store.index('workplaceId');
            const request = index.getAll(workplaceId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async addWorkplace(workplace) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            store.add(workplace).onsuccess = () => resolve();
        });
    }

    async updateWorkplace(workplace) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            store.put(workplace).onsuccess = () => resolve();
        });
    }

    async deleteWorkplace(id) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            store.delete(id).onsuccess = () => resolve();
        });
    }
}

const appState = {
    db: new Database(),
    currentUser: null,
    currentWorkplace: null
};

// Modal değişkenleri
let currentModalMode = 'add';
let currentEditingId = null;

// DOM Yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initTestLogin();
    checkAuth();
    initModal();
    initLogout();
});

function initLogin() {
    const loginButton = document.getElementById('loginButton');
    if (loginButton) {
        loginButton.addEventListener('click', login);
    }
}

function initTestLogin() {
    const testButton = document.getElementById('testLogin');
    if (testButton) {
        testButton.addEventListener('click', () => {
            document.getElementById('username').value = 'hekim';
            document.getElementById('password').value = 'Sifre123!';
            login();
        });
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
    document.getElementById('loginArea').style.display = 'none';
    document.getElementById('mainView').style.display = 'block';
    document.getElementById('welcomeMessage').textContent = `Hoş geldiniz, ${appState.currentUser.username}`;
}

function initLogout() {
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('authToken');
            location.reload();
        });
    }
}

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

function renderWorkplaces(workplaces) {
    const listElement = document.getElementById('workplaceList');
    listElement.innerHTML = '';

    workplaces.forEach(workplace => {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.textContent = workplace.name;
        button.onclick = () => selectWorkplace(workplace);
        li.appendChild(button);
        listElement.appendChild(li);
    });
}

async function selectWorkplace(workplace) {
    appState.currentWorkplace = workplace;
    document.getElementById('selectedWorkplace').textContent = workplace.name;
    document.getElementById('workplaceActions').style.display = 'block';
    await loadEmployees(workplace.id);
}

async function loadEmployees(workplaceId) {
    try {
        const employees = await appState.db.getEmployees(workplaceId);
        renderEmployees(employees);
    } catch (error) {
        console.error('Çalışanlar yüklenirken hata:', error);
    }
}

function renderEmployees(employees) {
    const container = document.getElementById('employeeList');
    container.innerHTML = '';

    employees.forEach(employee => {
        const card = document.createElement('div');
        card.className = 'employee-card';
        card.innerHTML = `
            <h4>${employee.name}</h4>
            <p>TCKN: ${employee.tckn}</p>
            <p>Pozisyon: ${employee.position}</p>
        `;
        container.appendChild(card);
    });
}

// Modal fonksiyonları
function initModal() {
    const modal = document.getElementById('workplaceModal');
    const span = document.querySelector('.close');
    
    document.getElementById('addWorkplaceBtn').onclick = () => {
        currentModalMode = 'add';
        document.getElementById('modalTitle').textContent = 'İşyeri Ekle';
        document.getElementById('workplaceName').value = '';
        document.getElementById('workplaceAddress').value = '';
        modal.style.display = 'block';
    };

    document.getElementById('editWorkplaceBtn').onclick = () => {
        if (!appState.currentWorkplace) return;
        currentModalMode = 'edit';
        currentEditingId = appState.currentWorkplace.id;
        document.getElementById('modalTitle').textContent = 'İşyeri Düzenle';
        document.getElementById('workplaceName').value = appState.currentWorkplace.name;
        document.getElementById('workplaceAddress').value = appState.currentWorkplace.address || '';
        modal.style.display = 'block';
    };

    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };

    document.getElementById('saveWorkplaceBtn').onclick = saveWorkplace;
    document.getElementById('deleteWorkplaceBtn').onclick = deleteCurrentWorkplace;
}

async function saveWorkplace() {
    const name = document.getElementById('workplaceName').value.trim();
    const address = document.getElementById('workplaceAddress').value.trim();

    if (!name) {
        alert('İşyeri adı boş olamaz!');
        return;
    }

    const workplace = { name, address };

    try {
        if (currentModalMode === 'add') {
            workplace.id = Date.now();
            await appState.db.addWorkplace(workplace);
        } else {
            workplace.id = currentEditingId;
            await appState.db.updateWorkplace(workplace);
        }

        document.getElementById('workplaceModal').style.display = 'none';
        await loadWorkplaces();
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Kayıt işlemi başarısız oldu!');
    }
}

async function deleteCurrentWorkplace() {
    if (!appState.currentWorkplace || !confirm('Bu işyerini silmek istediğinize emin misiniz?')) {
        return;
    }

    try {
        await appState.db.deleteWorkplace(appState.currentWorkplace.id);
        appState.currentWorkplace = null;
        document.getElementById('selectedWorkplace').textContent = '';
        document.getElementById('employeeList').innerHTML = '';
        document.getElementById('workplaceActions').style.display = 'none';
        await loadWorkplaces();
    } catch (error) {
        console.error('Silme hatası:', error);
        alert('Silme işlemi başarısız oldu!');
    }
}

// Demo veri ekleme fonksiyonu
async function addDemoData() {
    const workplaces = [
        { id: 1, name: 'A Şirketi', address: 'İstanbul' },
        { id: 2, name: 'B Fabrikası', address: 'Ankara' }
    ];

    const employees = [
        { id: 1, workplaceId: 1, name: 'Ahmet Yılmaz', tckn: '11111111111', position: 'Mühendis' },
        { id: 2, workplaceId: 1, name: 'Mehmet Demir', tckn: '22222222222', position: 'Teknisyen' },
        { id: 3, workplaceId: 2, name: 'Ayşe Kaya', tckn: '33333333333', position: 'Yönetici' }
    ];

    for (const wp of workplaces) {
        await new Promise((resolve) => {
            const transaction = appState.db.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            store.add(wp).onsuccess = resolve;
        });
    }

    for (const emp of employees) {
        await new Promise((resolve) => {
            const transaction = appState.db.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            store.add(emp).onsuccess = resolve;
        });
    }
}
