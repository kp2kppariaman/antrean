const API_URL = "https://script.google.com/macros/s/AKfycbyEMpVUuHQUj4saj1YYez3DXwrnxsh8ncHiUqI6rA-AxY5viHcKmemSsHySWukg80Z-0Q/exec"; // dari deployment Apps Script

document.getElementById("formAntrean").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    nama: document.getElementById("nama").value,
    nik: document.getElementById("nik").value,
    hp: document.getElementById("hp").value,
    email: document.getElementById("email").value,
    keperluan: document.getElementById("keperluan").value,
  };

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
  });

  const result = await res.json();
  if (result.success) {
    document.getElementById("hasil").innerHTML = `
      <h2>Nomor Antrean Anda</h2>
      <p><strong>${result.noAntrean}</strong></p>
      <p>Harap tunjukkan nomor ini kepada petugas saat datang ke kantor.</p>
    `;
    document.getElementById("formAntrean").reset();
    document.getElementById("hasil").classList.remove("hidden");
  } else {
    alert("Gagal mengambil antrean. Coba lagi nanti.");
  }
});
