const API_URL = "https://script.google.com/macros/s/AKfycbyEMpVUuHQUj4saj1YYez3DXwrnxsh8ncHiUqI6rA-AxY5viHcKmemSsHySWukg80Z-0Q/exec";

document.getElementById("btnLogin").addEventListener("click", async () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await google.script.run.withSuccessHandler((isValid) => {
    if (isValid) {
      document.getElementById("loginSection").classList.add("hidden");
      document.getElementById("dashboardSection").classList.remove("hidden");
      loadData();
    } else {
      document.getElementById("loginError").style.display = "block";
    }
  }).loginPetugas(username, password);
});

document.getElementById("btnLogout").addEventListener("click", () => {
  document.getElementById("dashboardSection").classList.add("hidden");
  document.getElementById("loginSection").classList.remove("hidden");
});

async function loadData() {
  const response = await fetch(`${API_URL}?action=getAllAntrean`);
  const data = await response.json();

  const tbody = document.querySelector("#tabelAntrean tbody");
  tbody.innerHTML = "";

  let total = 0, sudah = 0, belum = 0;

  data.forEach((row) => {
    total++;
    if (row.status === "Belum Dipanggil") belum++;
    else sudah++;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.no}</td>
      <td>${row.nama}</td>
      <td>${row.hp}</td>
      <td>${row.email}</td>
      <td>${row.keperluan}</td>
      <td>${row.status}</td>
      <td><input type="text" value="${row.ket || ""}" data-no="${row.no}" class="ketInput" /></td>
      <td>
        <button onclick="toggleStatus('${row.no}','${row.status}')">
          ${row.status === "Belum Dipanggil" ? "Panggil" : "Batal"}
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("totalAntrean").textContent = total;
  document.getElementById("belumDipanggil").textContent = belum;
  document.getElementById("sudahDipanggil").textContent = sudah;

  document.querySelectorAll(".ketInput").forEach((input) => {
    input.addEventListener("change", (e) => {
      const no = e.target.getAttribute("data-no");
      const ket = e.target.value;
      updateKeterangan(no, ket);
    });
  });
}

async function toggleStatus(noAntrean, currentStatus) {
  const newStatus = currentStatus === "Belum Dipanggil" ? "Sudah Dipanggil" : "Belum Dipanggil";
  await fetch(`${API_URL}?action=updateStatus&no=${noAntrean}&status=${newStatus}`);
  loadData();
}

async function updateKeterangan(noAntrean, ket) {
  await fetch(`${API_URL}?action=updateKeterangan&no=${noAntrean}&ket=${ket}`);
}
