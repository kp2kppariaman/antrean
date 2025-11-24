

    // 🔥 Konfigurasi Firebase (punyamu)
    const firebaseConfig = {
      apiKey: "AIzaSyA8w0vnMjwN5A2l50P4OEyj0Rp7vII2k6A",
      authDomain: "pajak-pariaman.firebaseapp.com",
      databaseURL: "https://pajak-pariaman-default-rtdb.asia-southeast1.firebasedatabase.app",
      projectId: "pajak-pariaman",
      storageBucket: "pajak-pariaman.firebasestorage.app",
      messagingSenderId: "184955908956",
      appId: "1:184955908956:web:d0aa561e027a773372c799",
      measurementId: "G-T4B27DFC7G"
    };

    const SECURITY_KEY = "mySuperSecretKey123";

    function secureFetch(url, options) {
      if (!url.includes("?key=")) {
        url += (url.includes("?") ? "&" : "?") + "key=" + SECURITY_KEY;
      }
      return secureFetch(url, options);
    }


    firebase.initializeApp(firebaseConfig);

    window.addEventListener('load', () => {
      updateDashboardView();
      const overlay = document.getElementById("loadingOverlay");
      const form = document.getElementById("formAntrean");
      const btnAmbil = document.getElementById("btnAmbil");
      const hasil = document.getElementById("hasil");
      const dashboard = document.getElementById("dashboard-content");
      const selectKeperluan = document.getElementById("keperluan");
      const keperluanLainnyaContainer = document.getElementById("keperluanLainnyaContainer");
      // 🔹 Tampilkan/ sembunyikan kolom "Keperluan Lainnya"
      selectKeperluan.addEventListener("change", () => {
        if (selectKeperluan.value === "lainnya") {
          keperluanLainnyaContainer.classList.remove("hidden");
        } else {
          keperluanLainnyaContainer.classList.add("hidden");
          keperluanLainnya.value = ""; // reset nilai kalau ganti ke selain "lainnya"
        }
      });
      const keperluanLainnya = document.getElementById("keperluanLainnya");
      const btnLoginPetugas = document.getElementById("btnLoginPetugas");
      // --- FUNGSI UTAMA ---
      const showLoading = (show) => {
        if (show) overlay.classList.remove('opacity-0', 'pointer-events-none');
        else overlay.classList.add('opacity-0', 'pointer-events-none');
      };
      const renderTicket = (data, noAntrean) => {
        // Hapus modal sebelumnya kalau masih ada
        const oldModal = document.getElementById("ticketModal");
        if (oldModal) oldModal.remove();
        // Buat overlay modal
        const modal = document.createElement("div");
        modal.id = "ticketModal";
        modal.className = `
          fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in
        `;
          modal.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-[90%] p-6 relative animate-fade-in-up">
              <button id="closeModal"
                class="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-lg transition">
                <i class="fa-solid fa-xmark"></i>
              </button>
              <div class="text-center pt-2">
                <i class="fa-solid fa-circle-check text-5xl text-green-500"></i>
                <h2 class="text-2xl font-bold mt-4">Kartu Antrean</h2>
                <p class="text-slate-500 mt-1">Simpan/Screenshoot Kartu Antrean ini, dan silahkan tunggu giliran Anda akan dipanggil oleh Petugas.</p>
              </div>
              <div class="my-6 text-center bg-slate-100 py-4 rounded-xl">
                <p class="text-sm text-slate-600">NOMOR ANTREAN</p>
                <p id="noAntreanText" class="text-5xl font-extrabold text-blue-600 tracking-wider">${noAntrean}</p>
              </div>
              <div class="border-t border-slate-200 pt-4 space-y-2 text-sm">
                <div class="flex justify-between"><strong class="text-slate-500">Nama:</strong> 
                  <span class="font-semibold text-right">${data.nama || '-'}</span></div>
                <div class="flex justify-between"><strong class="text-slate-500">Keperluan:</strong> 
                  <span class="font-semibold text-right">${data.keperluan || '-'}</span></div>
                <div class="flex justify-between"><strong class="text-slate-500">Waktu Ambil:</strong> 
                  <span class="font-semibold text-right">${new Date().toLocaleString('id-ID', {
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                    day: '2-digit', month: 'short', year: 'numeric'
                  })}</span></div>
              </div>
              <div class="pt-6 flex justify-center">
                <button id="btnResetAntrean" class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md">Tutup Kartu</button>
              </div>
            </div>
          `;
        document.body.appendChild(modal);
        // Tutup modal
        const closeModal = () => {
          modal.classList.add("opacity-0");
          setTimeout(() => modal.remove(), 200);
        };
        document.getElementById("btnResetAntrean").addEventListener("click", closeModal);
        document.getElementById("closeModal").addEventListener("click", closeModal);
        modal.addEventListener("click", (e) => {
          if (e.target === modal) closeModal();
        });
      };
      window.renderTicket = renderTicket; // 🔹 tambahkan ini di bawahnya

      
      function updateDashboardView() {
        try {
          const dbRef = firebase.database().ref("data_antrean");

          // 🔥 Listener realtime — update otomatis setiap kali ada perubahan
          dbRef.on("value", (snapshot) => {
            const data = snapshot.val() || {};

            const today = new Date();
            const todayStr = today.toLocaleDateString("id-ID");

            // Filter hanya data hari ini
            const antreanHariIni = Object.values(data).filter(function (item) {
              return item.Tanggal_Antrean === todayStr;
            });

            const total = antreanHariIni.length;
            const dipanggil = antreanHariIni.filter(a => a.Status === "Dipanggil").length;
            const menunggu = antreanHariIni.filter(a => a.Status === "Belum Dipanggil");

            const container = document.getElementById("dashboard-content");

            // === Susun daftar menunggu (tanpa scroll) ===
            var daftarMenungguHTML = "";
            if (menunggu.length > 0) {
              daftarMenungguHTML += '<ul class="space-y-3">';
              menunggu.forEach(function (a) {
                var noKey = a.No_Antrean.replace(/\//g, "_");
                daftarMenungguHTML +=
                  '<li class="flex items-center justify-between text-sm bg-slate-50 p-3 rounded-lg shadow-sm hover:bg-blue-50 cursor-pointer transition" ' +
                  'onclick="showAntreanCard(\'' + noKey + '\')">' +
                  '<span class="font-semibold text-slate-700">' + a.Nama + '</span>' +
                  '<span class="font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">' + a.No_Antrean + '</span>' +
                  '</li>';
              });
              daftarMenungguHTML += "</ul>";
            } else {
              daftarMenungguHTML =
                '<p class="text-sm text-center text-slate-500 italic">Tidak ada antrean menunggu.</p>';
            }

            // === Dashboard Layout ===
            var html = '';

            // Baris 1: Total + Sudah Dipanggil (2 kolom sejajar)
            html +=
              '<div class="grid grid-cols-2 gap-4 mb-6">' +
                '<div class="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center">' +
                  '<h3 class="text-slate-500 text-sm font-medium">Total Antrean</h3>' +
                  '<p class="text-3xl font-extrabold text-slate-800 mt-2">' + total + '</p>' +
                '</div>' +
                '<div class="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center">' +
                  '<h3 class="text-slate-500 text-sm font-medium">Sudah Dipanggil</h3>' +
                  '<p class="text-3xl font-extrabold text-green-600 mt-2">' + dipanggil + '</p>' +
                '</div>' +
              '</div>';

            // Baris 2: Sisa Antrean di bawah
            html +=
              '<div class="bg-white rounded-xl shadow-md p-5 flex flex-col items-center justify-center mb-6">' +
                '<h3 class="text-slate-500 text-sm font-medium">Sisa Antrean</h3>' +
                '<p class="text-3xl font-extrabold text-blue-600 mt-2">' + menunggu.length + '</p>' +
              '</div>';

            // Baris 3: Daftar Menunggu (tanpa scroll)
            html +=
              '<div class="bg-white p-6 rounded-xl shadow-md">' +
                '<h3 class="text-slate-800 text-lg font-semibold mb-3">Daftar Menunggu (' + menunggu.length + ')</h3>' +
                '<div class="space-y-3 mt-3">' + daftarMenungguHTML + '</div>' +
              '</div>';

            container.innerHTML = html;

            // Hilangkan overlay loading
            document.getElementById("loadingOverlay").style.display = "none";
          });

        } catch (err) {
          console.error("updateDashboardView error:", err);
          alert("Gagal memuat data dashboard: " + err.message);
        }
      }

      



      function showAntreanCard(noKey) {
        const dbRef = firebase.database().ref("data_antrean/" + noKey);
        dbRef.once("value").then(snapshot => {
          const data = snapshot.val();
          if (!data) return alert("Data antrean tidak ditemukan.");

          // 🔹 Siapkan data untuk kartu
          const antreanData = {
            nama: data.Nama || "-",
            keperluan: data.Keperluan || "-",
          };

          // 🔹 Panggil kartu pop-up yang sama seperti saat pertama kali ambil
          renderTicket(antreanData, data.No_Antrean);
        }).catch(err => {
          console.error("Gagal ambil data antrean:", err);
          alert("Terjadi kesalahan saat memuat kartu antrean.");
        });
      }

      // Update dashboard pertama kali
      updateDashboardView();

      // Form submit
      form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 🔒 Cek dulu apakah antrean masih buka
        const masihBuka = await validasiSebelumAmbilNomor();
        if (!masihBuka) return; // langsung keluar kalau tutup

        // Ambil semua nilai input
        const nama = document.getElementById('nama').value.trim();
        const nik = document.getElementById('nik').value.trim();
        const hp = document.getElementById('hp').value.trim();
        const email = document.getElementById('email').value.trim();
        const keperluanValue = selectKeperluan.value;
        const keperluanLain = keperluanLainnya.value.trim();
        // Reset error text
        document.querySelectorAll('#namaError, #nikError, #hpError, #emailError, #lainnyaError').forEach(el => el.classList.add('hidden'));
        // === VALIDASI ===
        let valid = true;
        // Nama wajib diisi
        if (!nama || nama === "") {
          document.getElementById('namaError').textContent = "Nama wajib diisi.";
          document.getElementById('namaError').classList.remove('hidden');
          valid = false;
        }
        // NIK/NPWP wajib 15–16 digit angka
        if (!/^\d{15,16}$/.test(nik)) {
          document.getElementById('nikError').textContent = "NIK/NPWP harus 15–16 digit angka.";
          document.getElementById('nikError').classList.remove('hidden');
          valid = false;
        }
        // Nomor HP wajib format 08XXXX...
        if (!/^08\d{8,13}$/.test(hp)) {
          document.getElementById('hpError').textContent = "Nomor HP harus dimulai dengan 08 dan diikuti 8–13 digit angka.";
          document.getElementById('hpError').classList.remove('hidden');
          valid = false;
        }
        // Email wajib format valid
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
          document.getElementById('emailError').textContent = "Format email tidak valid.";
          document.getElementById('emailError').classList.remove('hidden');
          valid = false;
        }
        // Keperluan wajib diisi
        if (!keperluanValue) {
          alert("Pilih keperluan terlebih dahulu!");
          valid = false;
        }
        // Jika pilih 'lainnya', wajib isi kolom tambahan
        if (keperluanValue === "lainnya") {
          if (!keperluanLain) {
            document.getElementById('lainnyaError').textContent = "Keperluan lainnya wajib diisi.";
            document.getElementById('lainnyaError').classList.remove('hidden');
            valid = false;
          }
        }
        // Jika tidak valid, hentikan submit
        if (!valid) return;
        // === Kalau semua valid ===
        const data = {
          nama: nama.toUpperCase(),
          nik: "" + nik,
          hp: "" + hp,
          email: email,
          keperluan: keperluanValue === 'lainnya'
            ? keperluanLain.toUpperCase()
            : keperluanValue.toUpperCase(),
        };
        showLoading(true);
        btnAmbil.disabled = true;
        btnAmbil.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memproses...';
        
        // === SIMPAN LANGSUNG KE FIREBASE (versi counter global) ===
        const db = firebase.database();
        const now = new Date();
        const tanggalDisplay = now.toLocaleDateString("id-ID");
        const waktuDisplay = now.toLocaleTimeString("id-ID", { hour12: false });
        const fullTimestamp = `${tanggalDisplay} ${waktuDisplay}`;
        const tanggalKey = tanggalDisplay.replace(/\//g, "_");

        // 🔹 Ambil counter harian dari Firebase
        const counterRef = db.ref("counter_antrean/" + tanggalKey);

        try {
          // Gunakan transaksi agar aman dari duplikat nomor
          const result = await counterRef.transaction((current) => (current || 0) + 1);
          const nextNo = result.snapshot.val() || 1;
          const formattedNo = nextNo.toString().padStart(3, "0");
          const noAntrean = `${formattedNo}-${tanggalKey}`;

          const payload = {
            Timestamps: fullTimestamp,
            No_Antrean: noAntrean.replace(/_/g, "/"),
            Nama: data.nama,
            NIK_NPWP: data.nik,
            No_HP_WA: data.hp,
            Email: data.email,
            Keperluan: data.keperluan,
            Status: "Belum Dipanggil",
            Petugas: "-",
            Tanggal_Antrean: tanggalDisplay
          };

          const keySafe = noAntrean.replace(/\//g, "_");

          // 🔹 Simpan data antrean baru
          await db.ref("data_antrean/" + keySafe).set(payload);

          showLoading(false);
          btnAmbil.disabled = false;
          btnAmbil.innerHTML = '<i class="fa-solid fa-ticket mr-2"></i>Ambil Nomor';
          renderTicket(data, noAntrean.replace(/_/g, "/"));
          form.reset();
          updateDashboardView();
        } catch (err) {
          console.error("Gagal menyimpan antrean:", err);
          showLoading(false);
          btnAmbil.disabled = false;
          btnAmbil.innerHTML = '<i class="fa-solid fa-ticket mr-2"></i>Ambil Nomor';
          alert("Gagal menyimpan antrean: " + err.message);
        };
      });

      
      btnLoginPetugas.addEventListener("click", () => {
        const petugasUrl = "/petugas.html";
        window.location.href = petugasUrl;
      });

      
      setTimeout(() => showLoading(false), 600);
    });

    // === Fungsi global agar bisa dipanggil dari onclick di HTML ===
      function showAntreanCard(noKey) {
        const dbRef = firebase.database().ref("data_antrean/" + noKey);
        dbRef.once("value").then(snapshot => {
          const data = snapshot.val();
          if (!data) return alert("Data antrean tidak ditemukan.");

          // Pastikan fungsi renderTicket() tersedia
          if (typeof window.renderTicket === "function") {
            const antreanData = {
              nama: data.Nama || "-",
              keperluan: data.Keperluan || "-",
            };
            window.renderTicket(antreanData, data.No_Antrean);
          } else {
            alert("Fungsi renderTicket tidak ditemukan.");
          }
        }).catch(err => {
          console.error("Gagal ambil data antrean:", err);
          alert("Terjadi kesalahan saat memuat kartu antrean.");
        });
      }

      // === 🔒 ATURAN BUKA/TUTUP ANTREAN ===
      async function cekStatusAntrean() {
        const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
        const tanggalHariIni = new Date().toLocaleDateString('id-ID');
        // 🔹 Cek apakah tanggal hari ini termasuk dalam daftar tanggal_tutup_khusus (Firebase)
        const tanggalTutupRef = firebase.database().ref("tanggal_tutup_khusus");
        const tanggalTutupSnap = await tanggalTutupRef.get();
        const daftarTutup = tanggalTutupSnap.val() || [];

        if (Array.isArray(daftarTutup)) {
          // Normalisasi format agar 05/11/2025 == 5/11/2025
          const normalToday = tanggalHariIni.replace(/^0/, "").replace(/\/0/g, "/");
          const daftarNormal = daftarTutup.map(t => t.replace(/^0/, "").replace(/\/0/g, "/"));
          if (daftarNormal.includes(normalToday)) {
            tampilkanTutup(`🚫 Antrean tutup khusus tanggal ${tanggalHariIni}.`);
            return;
          }
        }


        const dbRef = firebase.database().ref("setting_antrean/" + hariIni);
        const snapshot = await dbRef.get();

        if (!snapshot.exists()) {
          console.warn("❌ Pengaturan hari ini tidak ditemukan di Firebase.");
          tampilkanTutup("Antrean sedang tidak tersedia (pengaturan tidak ditemukan).");
          return;
        }

        const data = snapshot.val();
        const jamBuka = data["Jam Buka"];
        const jamTutup = data["Jam Tutup"];
        const maksimal = parseInt(data["Maksimal"]) || 0;
        const status = (data["Status"] || "").toUpperCase();
        const tanggalTutupKhusus = (data["Tanggal Tutup Khusus"] || "").trim();

        // 1️⃣ Cek jika status hari ini TUTUP
        if (status === "TUTUP") {
          tampilkanTutup(`Antrean tutup setiap hari ${hariIni}.`);
          return;
        }

        // 2️⃣ Cek tanggal tutup khusus
        if (tanggalTutupKhusus === tanggalHariIni) {
          tampilkanTutup(`Antrean tutup khusus tanggal ${tanggalHariIni}.`);
          return;
        }

        // 3️⃣ Cek jam buka & tutup
        const now = new Date();
        const [jamBukaH, jamBukaM] = jamBuka.split(":").map(Number);
        const [jamTutupH, jamTutupM] = jamTutup.split(":").map(Number);

        const waktuBuka = new Date();
        waktuBuka.setHours(jamBukaH, jamBukaM, 0);

        const waktuTutup = new Date();
        waktuTutup.setHours(jamTutupH, jamTutupM, 0);

        if (now < waktuBuka) {
          tampilkanTutup(`Antrean akan dibuka pukul ${jamBuka} WIB.`);
          return;
        }

        if (now > waktuTutup) {
          tampilkanTutup(`Antrean sudah ditutup pukul ${jamTutup} WIB.`);
          return;
        }

        // 4️⃣ Cek jumlah antrean hari ini (kuota maksimal)
        const dataAntreanSnap = await firebase.database().ref("data_antrean").get();
        const dataAntrean = dataAntreanSnap.val() || {};
        const antreanHariIni = Object.values(dataAntrean).filter(a => a.Tanggal_Antrean === tanggalHariIni);

        if (maksimal > 0 && antreanHariIni.length >= maksimal) {
          tampilkanTutup(`Kuota antrean hari ini (${maksimal}) sudah penuh.`);
          return;
        }

        // Jika semua lolos -> buka form
        tampilkanBuka();
      }


      // === 🔁 CEK STATUS ANTREAN SAAT SUBMIT FORM ===
      async function validasiSebelumAmbilNomor() {
        const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
        const tanggalHariIni = new Date().toLocaleDateString('id-ID');
        // 🔹 Cek apakah tanggal hari ini termasuk tanggal_tutup_khusus di Firebase
        const tanggalTutupRef = firebase.database().ref("tanggal_tutup_khusus");
        const tanggalTutupSnap = await tanggalTutupRef.get();
        const daftarTutup = tanggalTutupSnap.val() || [];

        if (Array.isArray(daftarTutup)) {
          const normalToday = tanggalHariIni.replace(/^0/, "").replace(/\/0/g, "/");
          const daftarNormal = daftarTutup.map(t => t.replace(/^0/, "").replace(/\/0/g, "/"));
          if (daftarNormal.includes(normalToday)) {
            alert(`🚫 Antrean tutup khusus tanggal ${tanggalHariIni}.`);
            location.reload();
            return false;
          }
        }


        const dbRef = firebase.database().ref("setting_antrean/" + hariIni);
        const snapshot = await dbRef.get();

        if (!snapshot.exists()) {
          alert("❌ Pengaturan antrean tidak ditemukan. Silakan coba lagi nanti.");
          location.reload();
          return false;
        }

        const data = snapshot.val();
        const jamBuka = data["Jam Buka"];
        const jamTutup = data["Jam Tutup"];
        const maksimal = parseInt(data["Maksimal"]) || 0;
        const status = (data["Status"] || "").toUpperCase();
        const tanggalTutupKhusus = (data["Tanggal Tutup Khusus"] || "").trim();

        // Cek status tutup
        if (status === "TUTUP") {
          alert(`🚫 Antrean tutup hari ${hariIni}.`);
          location.reload();
          return false;
        }

        // Cek tanggal tutup khusus
        if (tanggalTutupKhusus === tanggalHariIni) {
          alert(`🚫 Antrean tutup khusus tanggal ${tanggalHariIni}.`);
          location.reload();
          return false;
        }

        // Cek jam buka/tutup
        const now = new Date();
        const [jamBukaH, jamBukaM] = jamBuka.split(":").map(Number);
        const [jamTutupH, jamTutupM] = jamTutup.split(":").map(Number);
        const waktuBuka = new Date(); waktuBuka.setHours(jamBukaH, jamBukaM, 0);
        const waktuTutup = new Date(); waktuTutup.setHours(jamTutupH, jamTutupM, 0);

        if (now < waktuBuka) {
          alert(`🚫 Antrean belum dibuka. Buka pukul ${jamBuka} WIB.`);
          location.reload();
          return false;
        }

        if (now > waktuTutup) {
          alert(`🚫 Antrean sudah ditutup pukul ${jamTutup} WIB.`);
          location.reload();
          return false;
        }

        // Cek kuota maksimal
        const dataAntreanSnap = await firebase.database().ref("data_antrean").get();
        const dataAntrean = dataAntreanSnap.val() || {};
        const antreanHariIni = Object.values(dataAntrean).filter(a => a.Tanggal_Antrean === tanggalHariIni);

        if (maksimal > 0 && antreanHariIni.length >= maksimal) {
          alert(`🚫 Kuota antrean hari ini (${maksimal}) sudah penuh.`);
          location.reload();
          return false;
        }

        // ✅ Masih buka, lanjutkan
        return true;
      }


      function tampilkanTutup(pesan) {
        document.getElementById("form-container").classList.add("hidden");
        document.getElementById("bannerTutup").classList.remove("hidden");
        document.getElementById("bannerTutupText").textContent = pesan;
      }

      function tampilkanBuka() {
        document.getElementById("form-container").classList.remove("hidden");
        document.getElementById("bannerTutup").classList.add("hidden");
      }

      // Jalankan saat halaman selesai load
      window.addEventListener("load", () => {
        cekStatusAntrean(); // cek pertama kali

        // === 🔁 Listener realtime untuk perubahan setting_antrean ===
        const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
        const dbRef = firebase.database().ref("setting_antrean/" + hariIni);

        dbRef.on("value", () => {
          console.log("🔁 Deteksi perubahan pengaturan hari ini — cek ulang status antrean...");
          cekStatusAntrean();
        });
      });
      



    