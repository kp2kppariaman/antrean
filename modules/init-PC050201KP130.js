/* ===========================================================
   🔥 1. LOAD DASAR (Firebase + Utils)
=========================================================== */
import { db } from "./firebase.js";
import "./utils.js";

/* ===========================================================
   🔐 2. SESSION MODULE
=========================================================== */
import { initSessionModule } from "./session.js";

/* ===========================================================
   📌 3. FITUR-FITUR MODUL
=========================================================== */
import "./auth.js";
import "./dashboard.js";
import "./antrean.js";
import "./mpp.js";
import "./tindaklanjut.js";
import "./pengaturan.js";
import "./pengumuman.js";
import "./chat.js";

/* ===========================================================
   🔄 4. IMPORT LISTENER-SPECIFIC (Dari Firebase.js)
=========================================================== */
import { 
    listenAntreanRealtime,
    listenMPPRealtime,
    listenDashboardAntreanRealtime
} from "./firebase.js";

/* ===========================================================
   📊 5. IMPORT FUNCTION DASHBOARD
=========================================================== */
import { loadDashboardStats } from "./dashboard.js";

/* ===========================================================
   🚀 6. MAIN INITIALIZER (DOM Loaded)
=========================================================== */
document.addEventListener("DOMContentLoaded", () => {

    console.log("🔵 DOMContentLoaded — Inisialisasi modul…");

    // Session System
    initSessionModule();

    // Dashboard pertama kali
    loadDashboardStats();

    // Realtime dashboard update
    listenDashboardAntreanRealtime();

    console.log("🟢 Semua modul dimuat...");
});

/* ===========================================================
   ⚡ 7. UI + REALTIME INITIALIZER (Window Loaded)
=========================================================== */
window.addEventListener("load", () => {

    console.log("🟣 Window Loaded — Menjalankan realtime listener…");

    listenAntreanRealtime();
    listenMPPRealtime();

    // Sembunyikan Data MPP jika belum login
    if (!localStorage.getItem("username")) {
        const contentMPP = document.getElementById("dataMPPContent");
        if (contentMPP) contentMPP.classList.add("hidden");
    }

    // Hilangkan loading overlay (jika ada)
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
        setTimeout(() => loadingOverlay.classList.add("hidden"), 300);
    }

    console.log("🟢 Aplikasi siap digunakan.");
});
