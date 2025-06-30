
// Giriş
function login() {
  const password = document.getElementById("password").value;
  if (password === "hekim2025") {
    document.getElementById("loginArea").style.display = "none";
    document.getElementById("mainView").style.display = "block";
    loadWorkplaces();
  } else {
    alert("Şifre yanlış!");
  }
}

function logout() {
  location.reload();
}

// Veri
let workplaces = JSON.parse(localStorage.getItem("workplaces") || "[]");
let currentWorkplace = null;

function saveData() {
  localStorage.setItem("workplaces", JSON.stringify(workplaces));
}

function loadWorkplaces() {
  const list = document.getElementById("workplaceList");
  list.innerHTML = "";
  workplaces.forEach((wp, index) => {
    const li = document.createElement("li");
    li.textContent = wp.name;
    li.style.cursor = "pointer";
    li.ondblclick = () => openWorkplace(index);
    list.appendChild(li);
  });
}

function addWorkplace() {
  const name = prompt("Yeni işyeri adı:");
  if (name) {
    workplaces.push({ name, employees: [] });
    saveData();
    loadWorkplaces();
  }
}

function editWorkplace() {
  const oldName = prompt("Düzenlemek istediğiniz işyeri adı:");
  const wp = workplaces.find(w => w.name === oldName);
  if (!wp) return alert("İşyeri bulunamadı");
  const newName = prompt("Yeni isim:", wp.name);
  if (newName) {
    wp.name = newName;
    saveData();
    loadWorkplaces();
  }
}

function openWorkplace(index) {
  currentWorkplace = index;
  document.getElementById("mainView").style.display = "none";
  document.getElementById("workplaceView").style.display = "block";
  document.getElementById("currentWorkplaceTitle").innerText = workplaces[index].name;
  loadEmployees();
}

function goBack() {
  document.getElementById("mainView").style.display = "block";
  document.getElementById("workplaceView").style.display = "none";
}

// Doktor bilgisi
function saveDoctorInfo() {
  const docName = document.getElementById("docName").value;
  const docDiploma = document.getElementById("docDiploma").value;
  localStorage.setItem("doctorInfo", JSON.stringify({ docName, docDiploma }));
  alert("Doktor bilgisi kaydedildi.");
}

// Çalışan işlemleri
function loadEmployees() {
  const tbody = document.querySelector("#employeeTable tbody");
  tbody.innerHTML = "";
  const employees = workplaces[currentWorkplace].employees;
  employees.forEach((emp, idx) => {
    const row = tbody.insertRow();
    row.insertCell().innerText = idx + 1;
    row.insertCell().innerText = emp.name;
    row.insertCell().innerText = emp.tc;
    row.insertCell().innerText = emp.sonMuayene || "";
    row.insertCell().innerText = emp.sonrakiMuayene || "";

    const ek2Cell = row.insertCell();
    const ek2Btn = document.createElement("button");
    ek2Btn.textContent = "EK-2";
    ek2Btn.onclick = () => openEK2(idx);
    ek2Cell.appendChild(ek2Btn);

    const editCell = row.insertCell();
    const editBtn = document.createElement("button");
    editBtn.textContent = "Düzenle";
    editBtn.onclick = () => editEmployee(idx);
    editCell.appendChild(editBtn);

    const delCell = row.insertCell();
    const delBtn = document.createElement("button");
    delBtn.textContent = "Sil";
    delBtn.onclick = () => {
      if (confirm("Silinsin mi?")) {
        employees.splice(idx, 1);
        saveData();
        loadEmployees();
      }
    };
    delCell.appendChild(delBtn);

    row.ondblclick = () => alert("EK-2 geçmişi görüntüleme geliştiriliyor.");
    row.style.cursor = "pointer";
  });
}

function addEmployee() {
  const name = prompt("Ad Soyad:");
  const tc = prompt("TC Kimlik No:");
  if (name && tc) {
    workplaces[currentWorkplace].employees.push({
      name,
      tc,
      sonMuayene: "",
      sonrakiMuayene: ""
    });
    saveData();
    loadEmployees();
  }
}

function editEmployee(index) {
  const emp = workplaces[currentWorkplace].employees[index];
  const name = prompt("Ad Soyad:", emp.name);
  const tc = prompt("TC Kimlik No:", emp.tc);
  if (name && tc) {
    emp.name = name;
    emp.tc = tc;
    saveData();
    loadEmployees();
  }
}

// EK-2
let selectedEmployeeIndex = null;

function openEK2(index) {
  selectedEmployeeIndex = index;
  document.getElementById("muayeneTarihi").value = "";
  document.getElementById("ek2Modal").style.display = "flex";
}

function closeEK2() {
  document.getElementById("ek2Modal").style.display = "none";
}

function saveEK2() {
  const tarih = document.getElementById("muayeneTarihi").value;
  const valid = /^\d{2}\.\d{2}\.\d{4}$/.test(tarih);
  if (!valid) return alert("Tarih formatı yanlış (gg.aa.yyyy)");

  const emp = workplaces[currentWorkplace].employees[selectedEmployeeIndex];
  emp.sonMuayene = tarih;

  const parts = tarih.split(".");
  const date = new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
  date.setFullYear(date.getFullYear() + 5);
  emp.sonrakiMuayene = String(date.getDate()).padStart(2, '0') + "." +
                       String(date.getMonth() + 1).padStart(2, '0') + "." +
                       date.getFullYear();

  saveData();
  loadEmployees();
  closeEK2();
}

// Tarih girerken otomatik nokta ekle
document.addEventListener("input", e => {
  if (e.target.id === "muayeneTarihi") {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length >= 2) v = v.slice(0, 2) + "." + v.slice(2);
    if (v.length >= 5) v = v.slice(0, 5) + "." + v.slice(5);
    e.target.value = v;
  }
});
