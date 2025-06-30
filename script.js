class Database {
    constructor() {
        this.dbName = 'isyeriHekimligiDB';
        this.version = 3;
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
                
                let employeeStore;
                if (!db.objectStoreNames.contains('employees')) {
                    employeeStore = db.createObjectStore('employees', { keyPath: 'id' });
                } else {
                    employeeStore = event.target.transaction.objectStore('employees');
                }
                
                if (!employeeStore.indexNames.contains('workplaceId')) {
                    employeeStore.createIndex('workplaceId', 'workplaceId', { unique: false });
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

    async addEmployee(employee) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            store.add(employee).onsuccess = () => resolve();
        });
    }

    async updateEmployee(employee) {
        return new Promise((resolve) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            store.put(employee).onsuccess = () => resolve();
        });
    }
}

const appState = {
    db: new Database(),
    currentUser: null,
    currentWorkplace: null,
    currentEmployees: []
};

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
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
        li.setAttribute('data-id', workplace.id);
        li.textContent = workplace.name;
        li.ondblclick = async () => {
            appState.currentWorkplace = workplace;
            document.getElementById('selectedWorkplace').textContent = workplace.name;
            document.getElementById('workplaceActions').style.display = 'block';
            await loadEmployees(workplace.id);
        };
        listElement.appendChild(li);
    });
}

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
    const container = document.getElementById('employeeList');
    container.innerHTML = `
        <table class="employee-table">
            <thead>
                <tr>
                    <th>S.No</th>
                    <th>Ad Soyad</th>
                    <th>TCKN</th>
                    <th>Muayene Tarihi</th>
                    <th>Sonraki Muayene</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
                ${employees.map((emp, index) => `
                <tr>
                    <td>${index+1}</td>
                    <td>${emp.name || ''}</td>
                    <td>${emp.tckn || ''}</td>
                    <td>${emp.examDate || ''}</td>
                    <td>${emp.nextExamDate || ''}</td>
                    <td>
                        <button onclick="generateEk2(${index})" class="action-btn">Ek-2</button>
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="excel-buttons">
            <button onclick="exportToExcel()" class="excel-export-btn">Excel'e Aktar</button>
            <button onclick="importFromExcel()" class="excel-import-btn">Excel'den Al</button>
        </div>
    `;
}

function initModal() {
    const modal = document.getElementById('workplaceModal');
    const span = document.querySelector('.close');
    
    document.getElementById('addWorkplaceBtn').addEventListener('click', () => {
        currentModalMode = 'add';
        document.getElementById('modalTitle').textContent = 'İşyeri Ekle';
        document.getElementById('workplaceName').value = '';
        document.getElementById('workplaceAddress').value = '';
        modal.style.display = 'block';
    });

    document.getElementById('editWorkplaceBtn').addEventListener('click', () => {
        if (!appState.currentWorkplace) {
            alert('Önce bir işyeri seçin!');
            return;
        }
        currentModalMode = 'edit';
        currentEditingId = appState.currentWorkplace.id;
        document.getElementById('modalTitle').textContent = 'İşyeri Düzenle';
        document.getElementById('workplaceName').value = appState.currentWorkplace.name;
        document.getElementById('workplaceAddress').value = appState.currentWorkplace.address || '';
        modal.style.display = 'block';
    });

    span.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };

    document.getElementById('saveWorkplaceBtn').addEventListener('click', saveWorkplace);
    document.getElementById('deleteWorkplaceBtn').addEventListener('click', deleteCurrentWorkplace);
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

function generateEk2(index) {
    const employee = appState.currentEmployees[index];
    const today = new Date();
    const examDate = employee.examDate ? reverseDateFormat(employee.examDate) : formatDateInput(today);
    const nextExamDate = employee.nextExamDate || calculateNextExamDate(examDate);

    const ek2Modal = document.getElementById('ek2Modal');
    ek2Modal.innerHTML = `
        <div class="modal-content ek2-content">
            <span class="close" onclick="closeEk2Modal()">&times;</span>
            <h2>Çalışan Sağlık Formu (Ek-2)</h2>
            
            <div class="ek2-form">
                <!-- İşyeri Bilgileri -->
                <div class="form-section">
                    <h3>İŞYERİNİN</h3>
                    <div class="form-group">
                        <label>Ünvanı</label>
                        <input type="text" id="workplaceTitle" value="${appState.currentWorkplace?.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>SGK Sicil No.</label>
                        <input type="text" id="sgkNumber">
                    </div>
                    <div class="form-group">
                        <label>Adresi</label>
                        <input type="text" id="workplaceAddress" value="${appState.currentWorkplace?.address || ''}">
                    </div>
                    <div class="form-group">
                        <label>Tel ve Faks No</label>
                        <input type="text" id="workplacePhone">
                    </div>
                    <div class="form-group">
                        <label>E-Posta</label>
                        <input type="email" id="workplaceEmail">
                    </div>
                </div>

                <!-- Çalışan Bilgileri -->
                <div class="form-section">
                    <h3>ÇALIŞANIN</h3>
                    <div class="form-group">
                        <label>Adı ve soyadı</label>
                        <input type="text" id="employeeName" value="${employee.name || ''}">
                    </div>
                    <div class="form-group">
                        <label>T.C. Kimlik No</label>
                        <input type="text" id="employeeTc" value="${employee.tckn || ''}">
                    </div>
                    <div class="form-group">
                        <label>Doğum Yeri ve Tarihi</label>
                        <input type="text" id="employeeBirth">
                    </div>
                    <div class="form-group">
                        <label>Cinsiyeti</label>
                        <select id="employeeGender">
                            <option value="">Seçiniz</option>
                            <option value="Erkek">Erkek</option>
                            <option value="Kadın">Kadın</option>
                        </select>
                    </div>
                    <!-- Diğer çalışan bilgileri... -->
                </div>

                <!-- Tarih Bilgileri -->
                <div class="form-group date-group">
                    <label>Muayene Tarihi:</label>
                    <input type="date" id="examDateInput" value="${examDate}" onchange="updateNextExamDate()">
                </div>
                <div class="form-group date-group">
                    <label>Sonraki Muayene Tarihi:</label>
                    <input type="text" id="nextExamDateInput" value="${nextExamDate}" readonly>
                </div>

                <!-- Form İçeriği -->
                <div class="form-section">
                    <p>İşe giriş/periyodik muayene olmayı kabul ettiğimi ve muayene sırasında verdiğim bilgilerin doğru ve eksiksiz olduğunu beyan ederim.</p>
                    <div style="text-align: right; margin-top: 50px;">
                        <p>Çalışanın Adı Soyadı</p>
                        <p>İMZA</p>
                    </div>
                </div>

                <div class="form-actions">
                    <button class="save-btn" onclick="saveEk2Form(${index})">Kaydet</button>
                    <button class="print-btn" onclick="printEk2Form()">Yazdır</button>
                </div>
            </div>
        </div>
    `;
    ek2Modal.style.display = 'block';
}

function reverseDateFormat(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('.');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
}

function formatDateInput(date) {
    if (typeof date === 'string') return date;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateNextExamDate(examDate) {
    const date = new Date(examDate);
    date.setFullYear(date.getFullYear() + 5);
    return formatDateDisplay(date);
}

function formatDateDisplay(date) {
    if (typeof date === 'string') {
        // Eğer tarih zaten formatlıysa
        if (date.includes('.')) return date;
        // ISO formatından çevir
        const [year, month, day] = date.split('-');
        return `${day}.${month}.${year}`;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}

function updateNextExamDate() {
    const examDate = document.getElementById('examDateInput').value;
    const nextExamDate = calculateNextExamDate(examDate);
    document.getElementById('nextExamDateInput').value = nextExamDate;
}

async function saveEk2Form(index) {
    const examDate = document.getElementById('examDateInput').value;
    const nextExamDate = document.getElementById('nextExamDateInput').value;
    
    // Çalışanın bilgilerini güncelle
    const employee = appState.currentEmployees[index];
    employee.examDate = formatDateDisplay(examDate);
    employee.nextExamDate = nextExamDate;
    
    // Diğer form alanlarını güncelle
    employee.name = document.getElementById('employeeName').value;
    employee.tckn = document.getElementById('employeeTc').value;
    
    // Veritabanını güncelle
    try {
        await appState.db.updateEmployee(employee);
        
        // Listeyi yenile
        appState.currentEmployees[index] = employee;
        renderEmployees(appState.currentEmployees);
        
        // Modalı kapat
        closeEk2Modal();
    } catch (error) {
        console.error('Çalışan güncellenirken hata:', error);
        alert('Güncelleme işlemi başarısız oldu!');
    }
}

function printEk2Form() {
    window.print();
}

function closeEk2Modal() {
    document.getElementById('ek2Modal').style.display = 'none';
}

function exportToExcel() {
    let csv = 'S.No,Ad Soyad,TCKN,Muayene Tarihi,Sonraki Muayene\n';
    appState.currentEmployees.forEach((emp, index) => {
        csv += `${index+1},${emp.name || ''},${emp.tckn || ''},${emp.examDate || ''},${emp.nextExamDate || ''}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'calisan_listesi.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importFromExcel() {
    alert("Excel'den veri alma özelliği aktif değil. Proje geliştirme aşamasında.");
}

async function addDemoData() {
    const workplaces = [
        { id: 1, name: 'A Şirketi', address: 'İstanbul' },
        { id: 2, name: 'B Fabrikası', address: 'Ankara' }
    ];

    const employees = [
        { 
            id: 1, 
            workplaceId: 1, 
            name: 'Ahmet Yılmaz', 
            tckn: '11111111111', 
            position: 'Mühendis', 
            examDate: '01.01.2023', 
            nextExamDate: '01.01.2028' 
        },
        { 
            id: 2, 
            workplaceId: 1, 
            name: 'Mehmet Demir', 
            tckn: '22222222222', 
            position: 'Teknisyen', 
            examDate: '15.03.2023', 
            nextExamDate: '15.03.2028' 
        },
        { 
            id: 3, 
            workplaceId: 2, 
            name: 'Ayşe Kaya', 
            tckn: '33333333333', 
            position: 'Yönetici', 
            examDate: '20.05.2023', 
            nextExamDate: '20.05.2028' 
        }
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

// Global fonksiyonlar
window.generateEk2 = generateEk2;
window.saveEk2Form = saveEk2Form;
window.printEk2Form = printEk2Form;
window.closeEk2Modal = closeEk2Modal;
window.updateNextExamDate = updateNextExamDate;
window.exportToExcel = exportToExcel;
window.importFromExcel = importFromExcel;
