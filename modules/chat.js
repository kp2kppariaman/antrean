/* ===========================================================
   AUTO BUKA CHAT
=========================================================== */
function cekAutoBukaChat() {
  const chatBtn = document.getElementById("chatButton");
  const chatPopup = document.getElementById("chatPopup");

  if (!chatBtn || !chatPopup) return;

  const auto = localStorage.getItem("autoOpenChat");
  if (auto === "1") {
    chatPopup.classList.remove("hidden");
  }
}

/* ===========================================================
   KIRIM PESAN CHAT (SEND MESSAGE)
=========================================================== */
function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const sender = localStorage.getItem("namaPetugas") || "Petugas";
  const waktu = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // hash warna sender
  const warna = "#" + intToRGB(hashCode(sender));

  db.ref("chat_messages").push({
    sender,
    text,
    time: waktu,
    color: warna,
  });

  input.value = "";
}

/* ===========================================================
   TAMPILKAN / SEMBUNYIKAN CHAT
=========================================================== */
function toggleChatVisibility() {
  const chatBtn = document.getElementById("chatButton");
  const chatPopup = document.getElementById("chatPopup");
  const loginSection = document.getElementById("loginSection");
  const appSection = document.getElementById("appSection");

  if (!chatBtn || !chatPopup || !loginSection || !appSection) return;

  const sedangLogin = !loginSection.classList.contains("hidden");

  if (sedangLogin) {
    chatBtn.classList.add("hidden");
    chatPopup.classList.add("hidden");
  } else {
    chatBtn.classList.remove("hidden");
  }
}

/* ===========================================================
   LOCAL CHAT VISIBILITY (ASLI)
=========================================================== */
function toggleChatVisibilityLocal() {
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

/* ===========================================================
   UPDATE IDENTITAS CHAT (ASLI)
=========================================================== */
function updateChatUserIdentity() {
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

/* ===========================================================
   AUTO SCROLL CHAT
=========================================================== */
function autoScroll() {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  setTimeout(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 100);
}

/* ===========================================================
   REALTIME CHAT LISTENER (ASLI)
=========================================================== */
db.ref("chat_messages").on("value", (snapshot) => {
  const data = snapshot.val() || {};
  const chatMessages = document.getElementById("chatMessages");

  chatMessages.innerHTML = "";

  Object.entries(data).forEach(([key, msg]) => {
    const currentPetugas = localStorage.getItem("namaPetugas") || "Petugas";
    const isSelf = msg.sender === currentPetugas;
    const warnaUnik = "#" + intToRGB(hashCode(msg.sender));

    const bubble = document.createElement("div");
    bubble.className = `flex ${isSelf ? "justify-end" : "justify-start"} animate-fade-in`;
    bubble.setAttribute("data-key", key);

    bubble.innerHTML = `
      <div class="relative max-w-[70%] p-2 rounded-xl shadow text-sm"
        style="background-color:${warnaUnik}; color: white">
        <div class="font-semibold text-xs opacity-90 mb-1">${msg.sender}</div>
        <div>${msg.text}</div>
        <div class="text-[0.65rem] mt-1 opacity-75 text-right">${msg.time}</div>
        ${
          isSelf
            ? `<button class="delete-chat-btn absolute top-1 right-1" title="Hapus pesan" onclick="hapusPesan('${key}')">✖</button>`
            : ""
        }
      </div>
    `;

    chatMessages.appendChild(bubble);
  });

  autoScroll();
});

/* ===========================================================
   HAPUS PESAN (ASLI)
=========================================================== */
function hapusPesan(key) {
  if (!confirm("Hapus pesan ini?")) return;
  db.ref("chat_messages/" + key).remove();
}
