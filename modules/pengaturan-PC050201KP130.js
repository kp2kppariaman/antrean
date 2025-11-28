/* ===========================================================
   IMPORT FIREBASE TOOLS (Modular)
=========================================================== */
import { db } from "./firebase.js";
import { ref, set, remove } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* ===========================================================
   SET HARI INI TUTUP
=========================================================== */
function setHariIniTutup() {
    const today = new Date().toISOString().split("T")[0];
    const path = ref(db, "pengaturan_antrean/tutup/" + today);

    set(path, true)
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
    const path = ref(db, "pengaturan_antrean/tutup/" + today);

    remove(path)
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

    // LAST CLOSED REF HARUS SUDAH ADA DI FILE LAIN
    // misalnya di firebase.js → export const lastClosedRef = ref(db, "path")
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

/* ===========================================================
   GLOBAL EXPORT (WAJIB UNTUK onclick="...")
=========================================================== */
window.setHariIniTutup = setHariIniTutup;
window.setHariIniBuka = setHariIniBuka;
window.simpanWaktuTutup = simpanWaktuTutup;
