const API_URL = "https://script.google.com/macros/s/AKfycbyEMpVUuHQUj4saj1YYez3DXwrnxsh8ncHiUqI6rA-AxY5viHcKmemSsHySWukg80Z-0Q/exec";

document.getElementById("formAntrean").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    nama: document.getElementById("nama").value.trim(),
    nik: document.getElementById("nik").value.trim(),
    hp: document.getElementById("hp").value.trim(),
    email: document.getElementById("email").value.trim(),
    keperluan: document.getElementById("keperluan").value.trim(),
  };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
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
      alert("Gagal menyimpan: " + (result.error || "Coba lagi nanti"));
    }
  } catch (err) {
    alert("Terjadi kesalahan: " + err.message);
  }
});
