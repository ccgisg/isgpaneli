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
                    db.createObjectStore('employees', { keyPath: 'id' });
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
}

const appState = {
    db: new Database(),
    currentUser: null,
    currentWorkplace: null
};

// DOM Yüklendiğinde çalışacak fonksiyonlar
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    initTestLogin();
    checkAuth();
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

        // Demo giriş kontrolü
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
        
        // Demo veri yoksa ekle
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

    // İşyerlerini ekle
    for (const wp of workplaces) {
        await new Promise((resolve) => {
            const transaction = appState.db.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            store.add(wp).onsuccess = resolve;
        });
    }

    // Çalışanları ekle
    for (const emp of employees) {
        await new Promise((resolve) => {
            const transaction = appState.db.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            store.add(emp).onsuccess = resolve;
        });
    }
}

// Sayfa yüklendiğinde logout butonunu başlat
initLogout();
