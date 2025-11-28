// DOMCONTENTLOADED BLOCK

document.addEventListener('DOMContentLoaded', () => {
          loadDashboardStats();
          listenDashboardAntreanRealtime(); // 🟢 realtime update
        })

// WINDOW LOAD BLOCK

window.addEventListener("load", () => {
            listenAntreanRealtime();
            listenMPPRealtime();
            if (!localStorage.getItem("username")) {
                document.getElementById("dataMPPContent").classList.add("hidden");
            }
            // --- ELEMEN UTAMA ---
            const loadingOverlay = document.getElementById("loadingOverlay");
            const loginSection = document.getElementById("loginSection");
            const appSection = document.getElementById("appSection");
            // --- ELEMEN SIDEBAR ---
            const sidebar = document.getElementById("sidebar");
            const sidebarToggle = document.getElementById("sidebarToggle");
            const sidebarToggleIcon = document.getElementById("sidebarToggleIcon");
            const sidebarTexts = document.querySelectorAll(".sidebar-text");
            const sidebarBrandText = document.getElementById("sidebarBrandText");
            // --- ELEMEN LOGIN ---
            const btnLogin = document.getElementById("btnLogin");
            const loginError = document.getElementById("loginError");
            const usernameEl = document.getElementById("username");
            const passwordEl = document.getElementById("password");
            const btnLogout = document.getElementById("btnLogout");
            const profilModal = document.getElementById("profilModal");
            const profilNama = document.getElementById("profilNama");
            const profilUsername = document.getElementById("profilUsername");
            const profilPassword = document.getElementById("profilPassword");
            const btnSimpanProfil = document.getElementById("btnSimpanProfil");
            const btnTutupProfil = document.getElementById("btnTutupProfil");
            const btnLogoutProfil = document.getElementById("btnLogoutProfil");
            // --- ELEMEN NAVIGASI & KONTEN ---
            const menuItems = {
                dashboard: document.getElementById("menuDashboard"),
                dataAntrean: document.getElementById("menuDataAntrean"),
                dataMPP: document.getElementById("menuDataMPP"), // ✅ tambahkan baris ini
                tindakLanjut: document.getElementById("menuTindakLanjut"),
                pengumuman: document.getElementById("menuPengumuman"), // ✅ Tambahan
                pengaturan: document.getElementById("menuPengaturan"),
                //chatRoom: document.getElementById("menuChatRoom"),
            };
            const contentSections = {
                dashboard: document.getElementById("dashboardContent"),
                dataAntrean: document.getElementById("dataAntreanContent"),
                dataMPP: document.getElementById("dataMPPContent"), // ✅ tambahkan baris ini
                tindakLanjut: document.getElementById("tindakLanjutContent"),
                pengumuman: document.getElementById("pengumumanContent"), // ✅ Tambahan
                pengaturan: document.getElementById("pengaturanContent"),
                //chatRoom: document.getElementById("chatRoomContent"),
            };

            // === 🟡 Tombol Tutup Notifikasi Pesan Baru ===
            const bannerPesanBaru = document.getElementById("bannerPesanBaru");
            const btnTutupPesan = document.getElementById("btnTutupPesan");
            if (btnTutupPesan && bannerPesanBaru) {
              btnTutupPesan.addEventListener("click", () => {
                bannerPesanBaru.classList.add("opacity-0", "translate-y-[-10px]");
                setTimeout(() => {
                  bannerPesanBaru.classList.add("hidden");
                  bannerPesanBaru.classList.remove("opacity-0", "translate-y-[-10px]");
                }, 300);
              })

// WRAPPER FUNCTION

function __petugas_init_wrapper(){
  try {
    if (typeof listenAntreanRealtime === 'function') { listenAntreanRealtime(); }