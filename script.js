// Veritabanı Sınıfı
class Database {
    constructor() {
        this.dbName = 'isyeriHekimligiDB';
        this.version = 5;
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

    async updateWorkplace(workplace) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            const request = store.put(workplace);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async deleteWorkplace(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['workplaces'], 'readwrite');
            const store = transaction.objectStore('workplaces');
            const request = store.delete(id);

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

    async updateEmployee(employee) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            const request = store.put(employee);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async deleteEmployee(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['employees'], 'readwrite');
            const store = transaction.objectStore('employees');
            const request = store.delete(id);

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
    currentEmployeeIndex: null,
    currentFileUploadIndex: null,
    isEditingWorkplace: false
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
        showError('Uygulama başlatılırken bir hata oluştu: ' + error.message);
    }
});

// Giriş İşlemleri
function initLogin() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    }
    
    document.getElementById('password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            login();
        }
    });
}

async function login() {
    try {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const errorElement = document.getElementById('loginError');

        errorElement.textContent = '';
        
        if (!username || !password) {
            throw new Error('Kullanıcı adı ve şifre gereklidir');
        }

        if (username === 'hekim' && password === 'Sifre123!') {
            localStorage.setItem('authToken', 'demo-token');
            appState.currentUser = { username, role: 'doctor' };
            showMainView();
            await loadWorkplaces();
        } else {
            throw new Error('Geçersiz kullanıcı adı veya şifre!');
        }
    } catch (error) {
        console.error('Giriş hatası:', error);
        showError(error.message);
    }
}

function showError(message) {
    const errorElement = document.getElementById('loginError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    } else {
        alert(message);
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
    // Bootstrap modal yapısı kullanıldığı için ekstra init gerekmiyor
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
        showError('İşyerleri yüklenirken hata oluştu');
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
        li.className = 'workplace-item';
        li.innerHTML = `
            <div class="workplace-info">
                <h4>${workplace.name}</h4>
                <p>${workplace.address || 'Adres bilgisi yok'}</p>
            </div>
            <div class="workplace-actions">
                <button class="btn btn-sm btn-warning edit-workplace" data-id="${workplace.id}">Düzenle</button>
                <button class="btn btn-sm btn-danger delete-workplace" data-id="${workplace.id}">Sil</button>
            </div>
        `;
        
        li.querySelector('.workplace-info').addEventListener('dblclick', async () => {
            appState.currentWorkplace = workplace;
            await showWorkplaceDetails(workplace);
        });
        
        listElement.appendChild(li);
    });

    document.querySelectorAll('.edit-workplace').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const workplaceId = e.target.getAttribute('data-id');
            const workplace = workplaces.find(w => w.id === workplaceId);
            if (workplace) {
                appState.isEditingWorkplace = true;
                appState.currentWorkplace = workplace;
                document.getElementById('modalTitle').textContent = 'İşyeri Düzenle';
                document.getElementById('workplaceNameInput').value = workplace.name;
                document.getElementById('workplaceAddressInput').value = workplace.address || '';
                const workplaceModal = new bootstrap.Modal(document.getElementById('workplaceModal'));
                workplaceModal.show();
            }
        });
    });

    document.querySelectorAll('.delete-workplace').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const workplaceId = e.target.getAttribute('data-id');
            const workplace = workplaces.find(w => w.id === workplaceId);
            if (workplace && confirm(`${workplace.name} işyerini silmek istediğinize emin misiniz?`)) {
                try {
                    const employees = await appState.db.getEmployees(workplaceId);
                    for (const employee of employees) {
                        await appState.db.deleteEmployee(employee.id);
                    }
                    
                    await appState.db.deleteWorkplace(workplaceId);
                    await loadWorkplaces();
                } catch (error) {
                    console.error('İşyeri silme hatası:', error);
                    showError('İşyeri silinirken hata oluştu');
                }
            }
        });
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
            appState.currentWorkplace = null;
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
        showError('Çalışanlar yüklenirken hata oluştu');
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
            <td>${emp.examDate ? formatDate(emp.examDate) : ''}</td>
            <td>${emp.nextExamDate ? formatDate(emp.nextExamDate) : ''}</td>
            <td>
                <div class="employee-actions">
                    <button class="btn btn-sm btn-primary ek2-btn">EK-2</button>
                    <button class="btn btn-sm btn-secondary upload-btn">EK-2 Yükle</button>
                </div>
            </td>
        `;
        
        tr.querySelector('.ek2-btn').addEventListener('click', () => {
            showEk2Modal(index);
        });
        
        tr.querySelector('.upload-btn').addEventListener('click', () => {
            showFileUploadModal(index);
        });
        
        tbody.appendChild(tr);
    });
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

// EK-2 Formu
function showEk2Modal(employeeIndex) {
    const employee = appState.currentEmployees[employeeIndex];
    appState.currentEmployeeIndex = employeeIndex;
    
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0];
    
    const nextExamDate = new Date();
    nextExamDate.setFullYear(nextExamDate.getFullYear() + 5);
    const formattedNextExamDate = nextExamDate.toISOString().split('T')[0];
    
    const ek2Content = document.getElementById('ek2FormContent');
    ek2Content.innerHTML = `
        <h4>EK-2 İŞE GİRİŞ/PERİYODİK MUAYENE FORMU</h4>
        <div class="row mb-3">
            <div class="col-md-6">
                <label class="form-label">Adı Soyadı</label>
                <input type="text" class="form-control" id="ek2Name" value="${employee.name || ''}">
            </div>
            <div class="col-md-6">
                <label class="form-label">TC Kimlik No</label>
                <input type="text" class="form-control" id="ek2Tckn" value="${employee.tckn || ''}">
            </div>
        </div>
        <div class="row mb-3">
            <div class="col-md-6">
                <label class="form-label">Muayene Tarihi</label>
                <input type="date" class="form-control" id="ek2ExamDate" value="${formattedToday}">
            </div>
            <div class="col-md-6">
                <label class="form-label">Sonraki Muayene Tarihi</label>
                <input type="date" class="form-control" id="ek2NextExamDate" value="${formattedNextExamDate}" readonly>
            </div>
        </div>
        <!-- Diğer form alanları buraya eklenecek -->
    `;
    
    const ek2Modal = new bootstrap.Modal(document.getElementById('ek2Modal'));
    ek2Modal.show();
    
    document.getElementById('ek2ExamDate').addEventListener('change', function() {
        const examDate = new Date(this.value);
        const nextExamDate = new Date(examDate);
        nextExamDate.setFullYear(nextExamDate.getFullYear() + 5);
        document.getElementById('ek2NextExamDate').value = nextExamDate.toISOString().split('T')[0];
    });
}

// Dosya Yükleme Modalı
function showFileUploadModal(employeeIndex) {
    appState.currentFileUploadIndex = employeeIndex;
    document.getElementById('fileInput').value = '';
    const fileUploadModal = new bootstrap.Modal(document.getElementById('fileUploadModal'));
    fileUploadModal.show();
}

// İşyeri ve Çalışan Eylemlerini Başlatma
function initWorkplaceActions() {
    const addWorkplaceBtn = document.getElementById('addWorkplaceBtn');
    if (addWorkplaceBtn) {
        addWorkplaceBtn.addEventListener('click', () => {
            appState.isEditingWorkplace = false;
            document.getElementById('modalTitle').textContent = 'Yeni İşyeri';
            document.getElementById('workplaceNameInput').value = '';
            document.getElementById('workplaceAddressInput').value = '';
            const workplaceModal = new bootstrap.Modal(document.getElementById('workplaceModal'));
            workplaceModal.show();
        });
    }

    const editWorkplaceBtn = document.getElementById('editWorkplaceBtn');
    if (editWorkplaceBtn) {
        editWorkplaceBtn.addEventListener('click', () => {
            if (!appState.currentWorkplace) return;
            
            appState.isEditingWorkplace = true;
            document.getElementById('modalTitle').textContent = 'İşyeri Düzenle';
            document.getElementById('workplaceNameInput').value = appState.currentWorkplace.name;
            document.getElementById('workplaceAddressInput').value = appState.currentWorkplace.address || '';
            const workplaceModal = new bootstrap.Modal(document.getElementById('workplaceModal'));
            workplaceModal.show();
        });
    }

    const deleteWorkplaceBtn = document.getElementById('deleteWorkplaceBtn');
    if (deleteWorkplaceBtn) {
        deleteWorkplaceBtn.addEventListener('click', async () => {
            if (!appState.currentWorkplace) return;
            
            if (confirm(`${appState.currentWorkplace.name} işyerini silmek istediğinize emin misiniz?`)) {
                try {
                    const employees = await appState.db.getEmployees(appState.currentWorkplace.id);
                    for (const employee of employees) {
                        await appState.db.deleteEmployee(employee.id);
                    }
                    
                    await appState.db.deleteWorkplace(appState.currentWorkplace.id);
                    
                    document.getElementById('employeeSection').style.display = 'none';
                    document.getElementById('workplaceSection').style.display = 'block';
                    await loadWorkplaces();
                    appState.currentWorkplace = null;
                } catch (error) {
                    console.error('İşyeri silme hatası:', error);
                    showError('İşyeri silinirken hata oluştu');
                }
            }
        });
    }

    const saveWorkplaceBtn = document.getElementById('saveWorkplaceBtn');
    if (saveWorkplaceBtn) {
        saveWorkplaceBtn.addEventListener('click', async () => {
            const name = document.getElementById('workplaceNameInput').value.trim();
            const address = document.getElementById('workplaceAddressInput').value.trim();

            if (!name) {
                showError('İşyeri adı gereklidir');
                return;
            }

            try {
                if (appState.isEditingWorkplace && appState.currentWorkplace) {
                    const workplace = {
                        ...appState.currentWorkplace,
                        name,
                        address
                    };
                    await appState.db.updateWorkplace(workplace);
                } else {
                    const workplace = {
                        id: Date.now().toString(),
                        name,
                        address,
                        createdAt: new Date().toISOString()
                    };
                    await appState.db.addWorkplace(workplace);
                }
                
                await loadWorkplaces();
                bootstrap.Modal.getInstance(document.getElementById('workplaceModal')).hide();
            } catch (error) {
                console.error('İşyeri ekleme/düzenleme hatası:', error);
                showError('İşyeri işlemi sırasında hata oluştu');
            }
        });
    }

    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', () => {
            if (!appState.currentWorkplace) {
                showError('Önce bir işyeri seçmelisiniz');
                return;
            }
            
            document.getElementById('employeeNameInput').value = '';
            document.getElementById('employeeTcknInput').value = '';
            document.getElementById('employeeExamDateInput').value = '';
            
            const employeeModal = new bootstrap.Modal(document.getElementById('employeeModal'));
            employeeModal.show();
        });
    }

    const saveEmployeeBtn = document.getElementById('saveEmployeeBtn');
    if (saveEmployeeBtn) {
        saveEmployeeBtn.addEventListener('click', async () => {
            const name = document.getElementById('employeeNameInput').value.trim();
            const tckn = document.getElementById('employeeTcknInput').value.trim();
            const examDate = document.getElementById('employeeExamDateInput').value;

            if (!name || !tckn) {
                showError('Ad soyad ve TCKN gereklidir');
                return;
            }

            try {
                let nextExamDate = '';
                if (examDate) {
                    const nextDate = new Date(examDate);
                    nextDate.setFullYear(nextDate.getFullYear() + 5);
                    nextExamDate = nextDate.toISOString();
                }

                const employee = {
                    id: Date.now().toString(),
                    workplaceId: appState.currentWorkplace.id,
                    name,
                    tckn,
                    examDate: examDate ? new Date(examDate).toISOString() : '',
                    nextExamDate,
                    createdAt: new Date().toISOString()
                };

                await appState.db.addEmployee(employee);
                await loadEmployees(appState.currentWorkplace.id);
                bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
            } catch (error) {
                console.error('Çalışan ekleme hatası:', error);
                showError('Çalışan eklenirken hata oluştu');
            }
        });
    }

    const saveEk2Btn = document.getElementById('saveEk2Btn');
    if (saveEk2Btn) {
        saveEk2Btn.addEventListener('click', async () => {
            const employeeIndex = appState.currentEmployeeIndex;
            if (employeeIndex === null || !appState.currentEmployees[employeeIndex]) return;

            const name = document.getElementById('ek2Name').value.trim();
            const tckn = document.getElementById('ek2Tckn').value.trim();
            const examDate = document.getElementById('ek2ExamDate').value;
            const nextExamDate = document.getElementById('ek2NextExamDate').value;

            try {
                const employee = {
                    ...appState.currentEmployees[employeeIndex],
                    name,
                    tckn,
                    examDate: examDate ? new Date(examDate).toISOString() : '',
                    nextExamDate: nextExamDate ? new Date(nextExamDate).toISOString() : ''
                };

                await appState.db.updateEmployee(employee);
                await loadEmployees(appState.currentWorkplace.id);
                bootstrap.Modal.getInstance(document.getElementById('ek2Modal')).hide();
            } catch (error) {
                console.error('EK-2 kaydetme hatası:', error);
                showError('EK-2 kaydedilirken hata oluştu');
            }
        });
    }

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

    const printEk2Btn = document.getElementById('printEk2Btn');
    if (printEk2Btn) {
        printEk2Btn.addEventListener('click', () => {
            window.print();
        });
    }
}

// Excel İşlemleri
function exportToExcel() {
    try {
        if (!appState.currentWorkplace || !appState.currentEmployees.length) {
            alert('Dışa aktarılacak veri bulunamadı');
            return;
        }

        const data = [
            ['S.No', 'Ad Soyad', 'TCKN', 'Muayene Tarihi', 'Sonraki Muayene Tarihi'],
            ...appState.currentEmployees.map((emp, index) => [
                index + 1,
                emp.name || '',
                emp.tckn || '',
                emp.examDate ? formatDate(emp.examDate) : '',
                emp.nextExamDate ? formatDate(emp.nextExamDate) : ''
            ])
        ];

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, 'Çalışan Listesi');

        XLSX.writeFile(wb, `${appState.currentWorkplace.name}_Çalışan_Listesi.xlsx`);
    } catch (error) {
        console.error('Excel export hatası:', error);
        alert('Excel dosyası oluşturulurken hata oluştu');
    }
}

async function importFromExcel() {
    try {
        if (!appState.currentWorkplace) {
            alert('Lütfen önce bir işyeri seçin');
            return;
        }

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.xlsx,.xls,.csv';
        
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    if (!jsonData.length) {
                        alert('Excel dosyasında veri bulunamadı');
                        return;
                    }
                    
                    let importedCount = 0;
                    const errors = [];
                    
                    for (const [i, row] of jsonData.entries()) {
                        try {
                            const name = row['Ad Soyad'] || row['Adı Soyadı'] || row['Ad Soyadı'] || '';
                            const tckn = String(row['TCKN'] || row['TC Kimlik No'] || row['T.C. Kimlik No'] || '');
                            
                            if (!name || !tckn) {
                                errors.push(`Satır ${i+1}: Ad soyad veya TCKN eksik`);
                                continue;
                            }
                            
                            if (tckn.length !== 11 || isNaN(tckn)) {
                                errors.push(`Satır ${i+1}: Geçersiz TCKN (${tckn})`);
                                continue;
                            }
                            
                            let examDate = '';
                            if (row['Muayene Tarihi']) {
                                const date = new Date(row['Muayene Tarihi']);
                                if (!isNaN(date.getTime())) {
                                    examDate = date.toISOString();
                                }
                            }
                            
                            let nextExamDate = '';
                            if (examDate) {
                                const nextDate = new Date(examDate);
                                nextDate.setFullYear(nextDate.getFullYear() + 5);
                                nextExamDate = nextDate.toISOString();
                            }
                            
                            const employee = {
                                id: Date.now().toString(),
                                workplaceId: appState.currentWorkplace.id,
                                name,
                                tckn,
                                examDate,
                                nextExamDate,
                                createdAt: new Date().toISOString()
                            };
                            
                            await appState.db.addEmployee(employee);
                            importedCount++;
                        } catch (error) {
                            errors.push(`Satır ${i+1}: ${error.message}`);
                        }
                    }
                    
                    await loadEmployees(appState.currentWorkplace.id);
                    
                    let resultMessage = `${importedCount} çalışan başarıyla eklendi`;
                    if (errors.length > 0) {
                        resultMessage += `\n\nHatalar:\n${errors.join('\n')}`;
                    }
                    alert(resultMessage);
                } catch (error) {
                    console.error('Excel import hatası:', error);
                    alert('Excel dosyası okunurken hata oluştu: ' + error.message);
                }
            };
            
            reader.readAsArrayBuffer(file);
        };
        
        fileInput.click();
    } catch (error) {
        console.error('Excel import hatası:', error);
        alert('Excel import işlemi sırasında hata oluştu: ' + error.message);
    }
}

// Dosya Yükleme
function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    if (fileInput.files.length === 0) {
        showError('Lütfen bir dosya seçin');
        return;
    }

    const file = fileInput.files[0];
    const employee = appState.currentEmployees[appState.currentFileUploadIndex];
    
    alert(`${employee.name} için ${file.name} dosyası yüklenecek`);
    
    bootstrap.Modal.getInstance(document.getElementById('fileUploadModal')).hide();
}

// Global fonksiyonlar
window.showEk2Modal = showEk2Modal;
window.showFileUploadModal = showFileUploadModal;
