/* ===========================================================
 1️⃣ FUNCTION LOGIN — (DITAMBAHKAN, ASLI DARI petugas.js)
=========================================================== */
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const loginError = document.getElementById("loginError");

    if (!username || !password) {
        loginError.textContent = "Username dan password wajib diisi!";
        loginError.classList.remove("hidden");
        return;
    }

    try {
        const userRef = db.ref("petugas");
        userRef.child(username).once("value", (snapshot) => {
            const userData = snapshot.val();

            if (!userData) {
                loginError.textContent = "Akun tidak ditemukan.";
                loginError.classList.remove("hidden");
                return;
            }

            if (userData.password !== password) {
                loginError.textContent = "Password salah.";
                loginError.classList.remove("hidden");
                return;
            }

            // simpan session
            localStorage.setItem("username", username);
            localStorage.setItem("namaPetugas", userData.nama || username);
            localStorage.setItem("role", userData.role || "petugas");
            localStorage.setItem("sessionExpiry", Date.now() + 6 * 60 * 60 * 1000); // 6 jam

            // redirect ke dashboard petugas
            window.location.href = "petugas.html";
        });

    } catch (error) {
        console.error("Gagal login:", error);
        loginError.textContent = "Terjadi kesalahan server.";
        loginError.classList.remove("hidden");
    }
}

/* ===========================================================
 2️⃣ EVENT LISTENER LOGIN + ELEMEN DOM (ASLI DARI auth.js kamu)
=========================================================== */

// ========== AUTH EVENT LISTENER ==========

document.getElementById("btnLogin").addEventListener("click", handleLogin);

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
    dataMPP: document.getElementById("menuDataMPP"), // tambahan
    tindakLanjut: document.getElementById("menuTindakLanjut"),
    pengumuman: document.getElementById("menuPengumuman"), // tambahan
    pengaturan: document.getElementById("menuPengaturan"),
};

const contentSections = {
    dashboard: document.getElementById("dashboardContent"),
    dataAntrean: document.getElementById("dataAntreanContent"),
    dataMPP: document.getElementById("dataMPPContent"),
    tindakLanjut: document.getElementById("tindakLanjutContent"),
    pengumuman: document.getElementById("pengumumanContent"),
    pengaturan: document.getElementById("pengaturanContent"),
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
        }, 200);
    });
}
