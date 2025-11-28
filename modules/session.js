// ======================================
// 🔐 SESSION MODULE — diambil dari petugas.js
// ======================================

// --- secureFetch (ASLI)
export function secureFetch(url, options = {}) {
  const SECURITY_KEY = "mySuperSecretKey123";
  if (!url.includes("?key=")) {
    url += (url.includes("?") ? "&" : "?") + "key=" + SECURITY_KEY;
  }
  return fetch(url, options);
}

// --- ensureUserIdentity (ASLI)
export function ensureUserIdentity() {
  let username = localStorage.getItem("username");
  let namaPetugas = localStorage.getItem("namaPetugas");

  if (!username || !namaPetugas || username === "-" || namaPetugas === "-") {
    console.warn("⚠️ Tidak ada data user aktif. Menunggu login...");
    return;
  }

  window.username = username;
  window.namaPetugas = namaPetugas;
  console.log("✅ User aktif:", username, "| Nama:", namaPetugas);
}

// --- updateChatUserIdentity (ASLI)
export function updateChatUserIdentity() {
  const chatHeader = document.querySelector("#chatPopup h3");
  const sendBtn = document.getElementById("sendChat");
  const chatInput = document.getElementById("chatInput");

  const username = localStorage.getItem("username");
  const namaPetugas = localStorage.getItem("namaPetugas");

  if (username && namaPetugas) {
    window.username = username;
    window.namaPetugas = namaPetugas;

    if (chatHeader) chatHeader.textContent = `Chat Petugas — ${namaPetugas}`;
    if (sendBtn) sendBtn.disabled = false;
    if (chatInput) {
      chatInput.disabled = false;
      chatInput.placeholder = "Ketik pesan...";
    }
  } else {
    window.username = null;
    window.namaPetugas = null;
    if (chatHeader) chatHeader.textContent = "Chat Petugas (Belum Login)";
    if (sendBtn) sendBtn.disabled = true;
    if (chatInput) {
      chatInput.disabled = true;
      chatInput.placeholder = "Login dulu untuk kirim pesan...";
    }
  }
}

// --- checkSession (ASLI)
export function checkSession() {
  console.log("✅ checkSession() dipanggil — sementara di-skip (belum ada login system).");
}

// --- toggleChatVisibilityLocal (ASLI)
export function toggleChatVisibilityLocal() {
  const chatBtn = document.getElementById("chatButton");
  const chatPopup = document.getElementById("chatPopup");
  const loginSection = document.getElementById("loginSection");
  const appSection = document.getElementById("appSection");

  if (!loginSection || !appSection || !chatBtn || !chatPopup) return;

  const sedangLogin = !loginSection.classList.contains("hidden");

  if (sedangLogin) {
    chatBtn.classList.add("hidden");
    chatPopup.classList.add("hidden");
  } else {
    chatBtn.classList.remove("hidden");
  }
}

// ==============================================================
// 🔐 SESSION TIMEOUT SYSTEM (ASLI dari petugas.js)
// ==============================================================

const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 jam

function logoutToLogin() {
  localStorage.removeItem("username");
  localStorage.removeItem("namaPetugas");
  localStorage.removeItem("role");
  localStorage.removeItem("sessionExpiry");
  localStorage.removeItem("lastActivity");

  sessionStorage.clear();

  document.getElementById("appSection").classList.add("hidden");
  document.getElementById("loginSection").classList.remove("hidden");
  alert("Sesi Anda telah berakhir. Silakan login kembali.");
}

function resetSessionTimer() {
  const now = Date.now();
  localStorage.setItem("lastActivity", now.toString());
  const newExpiry = now + SESSION_TIMEOUT;
  localStorage.setItem("sessionExpiry", newExpiry.toString());
}

function enforceSession() {
  const username =
    sessionStorage.getItem("username") || localStorage.getItem("username");
  if (!username) return;

  const expiryStr =
    sessionStorage.getItem("sessionExpiry") || localStorage.getItem("sessionExpiry");
  const lastStr =
    sessionStorage.getItem("lastActivity") || localStorage.getItem("lastActivity");
  const now = Date.now();

  if (expiryStr && parseInt(expiryStr) < now) {
    logoutToLogin();
    return;
  }

  if (lastStr && now - parseInt(lastStr) > SESSION_TIMEOUT) {
    logoutToLogin();
    return;
  }
}

// Auto-extend session on activity
["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((evt) => {
  window.addEventListener(evt, resetSessionTimer);
});

// Periodic check
setInterval(enforceSession, 60000);
window.addEventListener("load", enforceSession);

// ==============================================================
// 🧠 Browser/Tab Close Cleaner (ASLI)
// ==============================================================
(function () {
  sessionStorage.setItem("pageActive", "true");

  window.addEventListener("pagehide", () => {
    sessionStorage.setItem("pageActive", "false");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      setTimeout(() => {
        const stillActive = sessionStorage.getItem("pageActive");
        if (stillActive !== "true") {
          localStorage.removeItem("username");
          localStorage.removeItem("namaPetugas");
          localStorage.removeItem("role");
          localStorage.removeItem("sessionExpiry");
          localStorage.removeItem("lastActivity");
          sessionStorage.clear();
        }
      }, 300);
    }
  });
})();

// ==============================================================
// AUTO INIT (ASLI)
// ==============================================================
export function initSessionModule() {
  ensureUserIdentity();
  updateChatUserIdentity();
  checkSession();
}
