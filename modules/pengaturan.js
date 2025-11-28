/* ===========================================================
   SET HARI INI TUTUP
=========================================================== */
function setHariIniTutup() {
    const today = new Date().toISOString().split("T")[0];
    const ref = db.ref("pengaturan_antrean/tutup/" + today);

    ref.set(true)
        .then(() => {
            document.getElementById("statusBukaTutup").textContent = "Tutup";
            document.getElementById("statusBukaTutup").classList.remove("text-green-600");
            document.getElementById("statusBukaTutup").classList.add("text-red-600");
            alert("Status hari ini di-set menjadi TUTUP.");
        })
        .catch((err) => console.error("Gagal set tutup:", err));
}

/* ===========================================================
   SET HARI INI BUKA
=========================================================== */
function setHariIniBuka() {
    const today = new Date().toISOString().split("T")[0];
    const ref = db.ref("pengaturan_antrean/tutup/" + today);

    ref.remove()
        .then(() => {
            document.getElementById("statusBukaTutup").textContent = "Buka";
            document.getElementById("statusBukaTutup").classList.remove("text-red-600");
            document.getElementById("statusBukaTutup").classList.add("text-green-600");
            alert("Status hari ini di-set menjadi BUKA.");
        })
        .catch((err) => console.error("Gagal set buka:", err));
}

/* ===========================================================
   SIMPAN WAKTU TUTUP
=========================================================== */
function simpanWaktuTutup() {
    const waktuTutup = getLocalTimeString();
    lastClosedRef.set(waktuTutup);
}

/* ===========================================================
   AUTO REFRESH TOGGLE
=========================================================== */
const autoRefreshToggle = document.getElementById("autoRefresh");

if (autoRefreshToggle) {
    autoRefreshToggle.addEventListener("change", () => {
        const aktif = autoRefreshToggle.checked;
        localStorage.setItem("autoRefreshAktif", aktif ? "1" : "0");

        if (aktif) {
            mulaiAutoRefresh();
        } else {
            hentikanAutoRefresh();
        }
    });
}

/* ===========================================================
   PILIH TANGGAL
=========================================================== */
const tanggalPilih = document.getElementById("tanggalPilih");

if (tanggalPilih) {
    tanggalPilih.addEventListener("change", () => {
        const val = tanggalPilih.value;
        if (!val) return;

        const t = new Date(val);
        const tanggal = t.toLocaleDateString("id-ID");

        document.getElementById("tanggalDipilihLabel").textContent = tanggal;

        // load data berdasarkan tanggal
        loadDataTanggal(tanggal);
    });
}
