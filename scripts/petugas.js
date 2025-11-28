// === Inisialisasi Firebase ===
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

        function secureFetch(url, options = {}) {
          if (!url.includes("?key=")) {
            url += (url.includes("?") ? "&" : "?") + "key=" + SECURITY_KEY;
          }
          return fetch(url, options);
        }


        // Pastikan Firebase hanya diinisialisasi sekali
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        window.db = firebase.database();
        window.firebaseReady = true; // ✅ tambahkan baris ini

        // === 🕒 SESSION TIMEOUT LOGIN PETUGAS (versi aman + cek saat reload) ===
        const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 menit (1 jam)

        // === 🧩 SETUP USERNAME & NAMA PETUGAS ===
        function ensureUserIdentity() {
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
            // Jika belum login → nonaktifkan input chat
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


        ensureUserIdentity();


        // 🔧 Normalisasi tanggal agar 09/10/2025 == 9/10/2025
        function normalizeDateString(tglStr) {
          if (!tglStr) return "";
          const parts = tglStr.split("/");
          if (parts.length !== 3) return tglStr;
          const [d, m, y] = parts;
          return `${parseInt(d)}/${parseInt(m)}/${y}`;
        }

        // 🧩 FUNGSI GLOBAL — ubah string tanggal menjadi objek Date (support format "09/09/2025" & "9/9/2025")
        function parseTanggalFlexible(tglStr) {
          if (!tglStr) return null;
          const datePart = tglStr.toString().split(" ")[0]; // handle "09/09/2025 10:00:00"
          const norm = normalizeDateString(datePart);
          const [d, m, y] = norm.split("/").map(Number);
          if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
          return new Date(y, m - 1, d);
        }

        // 🧩 FUNGSI GLOBAL — cek apakah dua tanggal sama (tanpa jam)
        function isSameDate(a, b) {
          if (!a || !b) return false;
          return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
          );
        }


        const db = firebase.database();

        

        <!-- PASTE / REPLACE: fungsi loadDashboardStats lama dengan blok ini -->
        async function loadDashboardStats() {
          const dashboard = document.getElementById('dashboardStats');
          dashboard.innerHTML = `<div class="text-center text-slate-500"><i class="fa fa-spinner fa-spin"></i> Memuat statistik...</div>`;

          function parseTanggalFirebase(tstr) {
            return parseTanggalFlexible(tstr);
          }

          function getStartOfWeek(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = (day === 0) ? -6 : (1 - day);
            d.setDate(d.getDate() + diff);
            d.setHours(0,0,0,0);
            return d;
          }

          const [snapAntrean, snapMPP] = await Promise.all([
            db.ref('data_antrean').once('value'),
            db.ref('data_mpp').once('value')
          ]);
          const dataAntrean = snapAntrean.val() || {};
          const dataMPP = snapMPP.val() || {};
          const listAntrean = Object.values(dataAntrean);
          const listMPP = Object.values(dataMPP);

          const today = new Date();
          const todayStr = today.toLocaleDateString('id-ID');

          // --- Total yang sudah dilayani (gabungan antrean + mpp)
          const sudahDilayaniTotal =
            [...listAntrean, ...listMPP].filter(x => 
              (x.Status || '').toLowerCase().includes('dipanggil') ||
              (x.Status || '').toLowerCase().includes('selesai')
            ).length;

          // ---------- REPLACE THIS PART (hitung hari ini & belum dipanggil) ----------
          /*
            Ganti blok lama yang melakukan:
              const hariIniAntrean = listAntrean.filter(x => (x.Tanggal_Antrean || x.Tanggal) === todayStr);
              const hariIniMPP = listMPP.filter(x => (x.Tanggal_Antrean || x.Tanggal) === todayStr);
              const belumDipanggilHariIni = listAntrean
                .filter(x => (x.Tanggal_Antrean || x.Tanggal) === todayStr)
                .filter(x => !(x.Status || '').toLowerCase().includes('dipanggil'))
                ...
          */

          // 🟢 CARI TANGGAL DATA PALING LAMA (Antrean + MPP)
          function ambilTanggal(item) {
            const raw = item.Tanggal_Antrean || item.Tanggal || item.Timestamps || null;
            if (!raw) return null;
            const part = raw.toString().split(" ")[0]; 
            return parseTanggalFlexible(part);
          }

          const semuaTanggal = [
            ...listAntrean.map(ambilTanggal),
            ...listMPP.map(ambilTanggal)
          ].filter(x => x instanceof Date && !isNaN(x));

          let tanggalTerlama = "-";
          if (semuaTanggal.length > 0) {
            const minDate = new Date(Math.min(...semuaTanggal.map(t => t.getTime())));
            tanggalTerlama = minDate.toLocaleDateString("id-ID");
          }


          function parseAnyDateField(raw) {
            if (!raw) return null;
            // ambil bagian tanggal pertama (handle "05/11/2025 10:12:00")
            const datePart = raw.toString().split(' ')[0].trim();
            return parseTanggalFirebase(datePart); // gunakan fungsi parseTanggalFirebase yang sudah ada
          }

          // pastikan 'today' di-set sebelumnya (ada di kode lama)
          const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

          // filter antrean hari ini dengan parsing tanggal yang robust
          const hariIniAntrean = listAntrean.filter(item => {
            const d = parseAnyDateField(item.Tanggal_Antrean || item.Tanggal || item.Timestamps || '');
            return d && isSameDate(d, todayDateOnly);
          });

          const hariIniMPP = listMPP.filter(item => {
            const d = parseAnyDateField(item.Tanggal_Antrean || item.Tanggal || item.Timestamps || '');
            return d && isSameDate(d, todayDateOnly);
          });

          // daftar belum dipanggil — normalisasi status dan bandingkan tanggal via Date
          const belumDipanggilHariIni = listAntrean
            .filter(item => {
              const d = parseAnyDateField(item.Tanggal_Antrean || item.Tanggal || item.Timestamps || '');
              return d && isSameDate(d, todayDateOnly);
            })
            .filter(item => {
              const st = (item.Status || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();
              // anggap belum dipanggil kalau kosong, 'belum dipanggil' atau tidak mengandung 'dipanggil'
              return st === '' || st === 'belum dipanggil' || !st.includes('dipanggil');
            })
            .sort((a, b) => {
              const na = parseInt((a.No_Antrean || '0').replace(/\D/g, '')) || 0;
              const nb = parseInt((b.No_Antrean || '0').replace(/\D/g, '')) || 0;
              return na - nb;
            });
          // ---------- END REPLACE ----------


          // render struktur HTML utama + kontrol filter
          dashboard.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div class="bg-white rounded-xl shadow-md p-5 text-center border border-slate-200">
                <h3 class="text-slate-500 text-sm font-medium">Antrean Hari Ini (Antrean)</h3>
                <p class="text-3xl font-extrabold text-blue-600 mt-2">${hariIniAntrean.length}</p>
                <p class="text-xs text-slate-500 mt-1">Belum dipanggil: ${belumDipanggilHariIni.length}</p>
              </div>
              <div class="bg-white rounded-xl shadow-md p-5 text-center border border-slate-200">
                <h3 class="text-slate-500 text-sm font-medium">Antrean Hari Ini (MPP)</h3>
                <p class="text-3xl font-extrabold text-green-600 mt-2">${hariIniMPP.length}</p>
                <!-- 🟢 Hilangkan total MPP di sini -->
              </div>
              <div class="bg-white rounded-xl shadow-md p-5 text-center border border-slate-200">
                <h3 class="text-slate-500 text-sm font-medium">Sudah Dilayani (Antrean + MPP)</h3>
                <p class="text-3xl font-extrabold text-purple-600 mt-2">${sudahDilayaniTotal}</p>

                <p class="text-xs text-slate-500 mt-1">
                  Total Antrean: ${listAntrean.length} &nbsp;|&nbsp; Total MPP: ${listMPP.length}
                </p>

                <!-- 🟢 Tambahan: Tanggal data terlama -->
                <p class="text-xs text-slate-500 mt-1">
                  Data Sejak: ${tanggalTerlama}
                </p>
            </div>
            </div>


            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <div class="col-span-1 bg-white rounded-xl shadow-md p-4 border border-slate-200">
                <h4 class="font-semibold text-slate-800 mb-3">Daftar Belum Dipanggil (Antrean Hari Ini)</h4>
                <div class="max-h-56 overflow-auto">
                  <ul id="listBelumDipanggil" class="divide-y divide-slate-100 text-sm"></ul>
                </div>
              </div>

              <div class="col-span-2 bg-white rounded-xl shadow-md p-4 border border-slate-200">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div>
                    <h4 class="font-semibold text-slate-800">Detail Antrean per Bulan</h4>
                    <div class="flex gap-2 mt-2 sm:mt-0">
                      <select id="bulanHarian" class="border rounded-md text-sm p-1"></select>
                      <select id="tahunHarian" class="border rounded-md text-sm p-1"></select>
                    </div>
                  </div>
                </div>
                <canvas id="chartWeek" height="110"></canvas>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              <div class="bg-white rounded-xl shadow-md p-4 border border-slate-200">
                <div class="flex items-center justify-between mb-3">
                  <h4 class="font-semibold text-slate-800">Detail Antrean per Tahun</h4>
                  <select id="yearSelect" class="border rounded-md text-sm p-1"></select>
                </div>
                <canvas id="chartMonth" height="120"></canvas>
              </div>
              <div class="bg-white rounded-xl shadow-md p-4 border border-slate-200">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                  <h4 class="font-semibold text-slate-800">Jumlah Antrean per Keperluan</h4>
                  <div class="flex items-center gap-2 mt-2 sm:mt-0">
                    <input id="startRange" type="date" class="border rounded-md text-sm p-1" />
                    <input id="endRange" type="date" class="border rounded-md text-sm p-1" />
                  </div>
                </div>
                <canvas id="chartKeperluan" height="160"></canvas>
              </div>
              <!-- 🥧 Tambahan: Diagram Lingkaran Antrean per Keperluan -->
              <div class="bg-white rounded-xl shadow-md p-4 border border-slate-200 mt-4">
                <h4 class="font-semibold text-slate-800 mb-3">Diagram Lingkaran — Antrean per Keperluan</h4>
                <canvas id="chartPieKeperluan" height="180"></canvas>
              </div>
            </div>

            
                      `;


          // daftar belum dipanggil
          const ul = document.getElementById('listBelumDipanggil');
          ul.innerHTML = belumDipanggilHariIni.length ? 
            belumDipanggilHariIni.map(it=>`
              <li class="py-2 px-2 flex justify-between">
                <div>
                  <div class="font-semibold text-slate-700">${it.Nama||'-'}</div>
                  <div class="text-xs text-slate-500">${it.No_Antrean||'-'}</div>
                </div>
                <div class="text-xs text-slate-500">${it.Keperluan||'-'}</div>
              </li>`).join('') :
            `<li class="py-3 text-center text-slate-500">Tidak ada antrean belum dipanggil hari ini.</li>`;

          // ====== GANTI / PASTE menggantikan buildWeeklyChart ======
          function buildDailyChart(bulan, tahun) {
            // fallback aman
            const now = new Date();
            const safeBulan = Number.isInteger(bulan) ? bulan : now.getMonth();
            const safeTahun = Number.isInteger(tahun) ? tahun : now.getFullYear();

            // pastikan dalam range
            const bulanClamped = Math.min(Math.max(safeBulan, 0), 11);
            const tahunClamped = (safeTahun >= 1970 && safeTahun <= 2100) ? safeTahun : now.getFullYear();

            // hitung jumlah hari di bulan tersebut (1..28/29/30/31)
            const daysInMonth = new Date(tahunClamped, bulanClamped + 1, 0).getDate();
            if (!Number.isFinite(daysInMonth) || daysInMonth <= 0) {
              console.warn("buildDailyChart: daysInMonth invalid, fallback ke 30");
            }
            const safeDays = (Number.isFinite(daysInMonth) && daysInMonth > 0) ? daysInMonth : 30;

            // labels: '1','2',... safeDays
            const labels = Array.from({ length: safeDays }, (_, i) => String(i + 1));

            // hitung data dengan parseTanggalFlexible (ada di file)
            const antrean = labels.map(dayStr => {
              const dayNum = parseInt(dayStr, 10);
              return listAntrean.filter(it => {
                const d = parseTanggalFlexible(it.Tanggal_Antrean || it.Tanggal || it.Timestamps || "");
                return d && d.getFullYear() === tahunClamped && d.getMonth() === bulanClamped && d.getDate() === dayNum;
              }).length;
            });

            const mpp = labels.map(dayStr => {
              const dayNum = parseInt(dayStr, 10);
              return listMPP.filter(it => {
                const d = parseTanggalFlexible(it.Tanggal_Antrean || it.Tanggal || it.Timestamps || "");
                return d && d.getFullYear() === tahunClamped && d.getMonth() === bulanClamped && d.getDate() === dayNum;
              }).length;
            });

            // render chart ke canvas (tetap gunakan id chartWeek agar integrasi minimal)
            const canvas = document.getElementById("chartWeek");
            if (!canvas) {
              console.warn("buildDailyChart: canvas #chartWeek tidak ditemukan.");
              return;
            }
            const ctx = canvas.getContext("2d");
            if (window._chartWeek) window._chartWeek.destroy();

            window._chartWeek = new Chart(ctx, {
              type: "bar",
              data: { labels, datasets: [
                { label: "Antrean", data: antrean },
                { label: "MPP", data: mpp }
              ]},
              options: {
                responsive: true,
                plugins: {
                  legend: { position: "bottom" },
                  datalabels: {
                    anchor: "end", align: "end", font: { weight: "bold" },
                    formatter: (val) => (val > 0 ? val : "")
                  }
                },
                scales: { 
                  y: { 
                    beginAtZero: true,
                    grace: '20%'   // ➜ Tambahkan ruang 20% di atas grafik
                  }
                }
              },
              plugins: [ChartDataLabels]
            });
          }



          function buildMonthlyChart(year) {
            const labels = [];
            const a = [];
            const m = [];

            for (let i = 0; i < 12; i++) {
              labels.push(
                new Date(year, i, 1).toLocaleString("id-ID", { month: "short", year: "numeric" })
              );

              const countA = listAntrean.filter(it => {
                const t = parseTanggalFlexible(it.Tanggal_Antrean || it.Tanggal || "");
                return t && t.getFullYear() === year && t.getMonth() === i;
              }).length;

              const countM = listMPP.filter(it => {
                const t = parseTanggalFlexible(it.Tanggal_Antrean || it.Tanggal || "");
                return t && t.getFullYear() === year && t.getMonth() === i;
              }).length;

              a.push(countA);
              m.push(countM);
            }

            const ctx = document.getElementById("chartMonth").getContext("2d");
            if (window._chartMonth) window._chartMonth.destroy();

            window._chartMonth = new Chart(ctx, {
              type: "bar",
              data: {
                labels,
                datasets: [
                  { label: "Antrean", data: a },
                  { label: "MPP", data: m },
                ],
              },
              options: {
                responsive: true,
                plugins: {
                  legend: { position: "bottom" },
                  datalabels: {
                    anchor: "end",
                    align: "end",
                    font: { weight: "bold" },
                    formatter: (val) => (val > 0 ? val : ""),
                  },
                },
                scales: { 
                  y: { 
                    beginAtZero: true,
                    grace: '20%'   // ➜ Tambahkan ruang 20% di atas grafik
                  }
                },
              },
              plugins: [ChartDataLabels],
            });
          }



          function buildKeperluanChart(start=null,end=null){
            const perKeperluan={};
            const keperluanUtama=[
              "DAFTAR NPWP",
              "KARTU NPWP (DIGITAL)",
              "AKTIVASI AKUN CORETAX DJP",
              "PEMADANAN NIK-NPWP",
              "LAPOR SPT MASA (BULANAN)",
              "LAPOR SPT TAHUNAN",
              "KONSULTASI CORETAX",
              "INSTANSI PEMERINTAH (DINAS) KONSULTASI CORETAX",
              "PERUBAHAN DATA (NO HP, EMAIL, ALAMAT, DLL.)",
              "BUAT FAKTUR PAJAK",
              "PEMBUATAN BILLING PPH PHTB",
              "VALIDASI PPH PHTB",
              "PERMOHONAN PKP",
              "AKTIVASI/PERMINTAAN ULANG EFIN"
            ];

            const all=[...listAntrean,...listMPP];
            all.forEach(it=>{
              const t=parseTanggalFlexible(it.Tanggal_Antrean||it.Tanggal);
              if(start&&t&&t<start) return;
              if(end&&t&&t>end) return;
              const raw=(it.Keperluan||it.Keterangan||"LAINNYA").toString().toUpperCase().trim();

              // Cek apakah masuk ke salah satu kategori utama
              const kategori = keperluanUtama.includes(raw) ? raw : "LAINNYA";
              perKeperluan[kategori]=(perKeperluan[kategori]||0)+1;
            });

            const entries=Object.entries(perKeperluan).sort((a,b)=>b[1]-a[1]);
            const labels=entries.map(e=>e[0]);
            const values=entries.map(e=>e[1]);
            const ctx=document.getElementById('chartKeperluan').getContext('2d');
            if(window._chartKeperluan) window._chartKeperluan.destroy();
            window._chartKeperluan=new Chart(ctx,{
              type:'bar',
              data:{labels,datasets:[{label:'Jumlah',data:values, backgroundColor:'#3b82f6'}]},
              options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}
            });

            buildKeperluanPie(perKeperluan);
            buildLainnyaChart(all, keperluanUtama, start, end);
          }

          // === 🥧 Diagram Lingkaran ===
          function buildKeperluanPie(perKeperluan){
            const ctx=document.getElementById('chartPieKeperluan').getContext('2d');
            if(window._chartPieKeperluan) window._chartPieKeperluan.destroy();
            const sorted=Object.entries(perKeperluan).sort((a,b)=>b[1]-a[1]);
            const labels=sorted.map(e=>e[0]);
            const values=sorted.map(e=>e[1]);
            window._chartPieKeperluan=new Chart(ctx,{
              type:'pie',
              data:{
                labels:labels,
                datasets:[{
                  data:values,
                  backgroundColor:labels.map((_,i)=>`hsl(${(i*360/labels.length)},70%,60%)`)
                }]
              },
              options:{
                responsive:true,
                plugins:{
                  legend:{position:'bottom'},
                  datalabels:{
                    color:'#fff',
                    formatter:(val,ctx)=>{
                      const total=ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
                      const percent=((val/total)*100).toFixed(1);
                      return percent>3?`${percent}%`:'';
                    }
                  }
                }
              },
              plugins:[ChartDataLabels]
            });
          }

          // === 📊 Grafik Khusus Keperluan Lainnya ===
          function buildLainnyaChart(all, keperluanUtama, start, end){
            const dataLainnya={};
            all.forEach(it=>{
              const t=parseTanggalFlexible(it.Tanggal_Antrean||it.Tanggal);
              if(start&&t&&t<start) return;
              if(end&&t&&t>end) return;
              const raw=(it.Keperluan||it.Keterangan||"LAINNYA").toString().toUpperCase().trim();
              if(!keperluanUtama.includes(raw)){
                dataLainnya[raw]=(dataLainnya[raw]||0)+1;
              }
            });
            const entries=Object.entries(dataLainnya).sort((a,b)=>b[1]-a[1]);
            const labels=entries.map(e=>e[0]);
            const values=entries.map(e=>e[1]);
            const container=document.querySelector("#chartPieKeperluan").closest("div");
            const chartDiv=document.createElement("div");
            chartDiv.className="bg-white rounded-xl shadow-md p-4 border border-slate-200 mt-4";
            chartDiv.innerHTML=`<h4 class="font-semibold text-slate-800 mb-3">📊 Rincian Keperluan Lainnya</h4><canvas id="chartLainnya" height="180"></canvas>`;
            container.after(chartDiv);

            const ctx=document.getElementById('chartLainnya').getContext('2d');
            if(window._chartLainnya) window._chartLainnya.destroy();
            window._chartLainnya=new Chart(ctx,{
              type:'bar',
              data:{labels,datasets:[{label:'Jumlah',data:values, backgroundColor:'#f97316'}]},
              options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true}}}
            });
          }



          // --- isi kontrol filter default ---
          //const weekInput=document.getElementById('weekStart');
          const bulanHarian = document.getElementById("bulanHarian");
          const tahunHarian = document.getElementById("tahunHarian");
          
          // isi bulan 1–12
          const namaBulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
          namaBulan.forEach((n,i)=>{
              const opt = document.createElement("option");
              opt.value = i;
              opt.textContent = n;
              if (i === today.getMonth()) opt.selected = true;
              bulanHarian.appendChild(opt);
          });

          // isi tahun ±2 tahun
          //const curYear = today.getFullYear();
          //for (let y = curYear - 2; y <= curYear + 2; y++) {
              //const opt = document.createElement("option");
              //opt.value = y;
              //opt.textContent = y;
              //if (y === curYear) opt.selected = true;
              //tahunHarian.appendChild(opt);
          //}

          // ====== helper untuk memanggil buildDailyChart dengan safety checks ======
          function refreshDailyChart() {
            const bulanEl = document.getElementById("bulanHarian");
            const tahunEl = document.getElementById("tahunHarian");
            const now = new Date();

            let bulan = (bulanEl && bulanEl.value !== undefined) ? parseInt(bulanEl.value, 10) : now.getMonth();
            let tahun = (tahunEl && tahunEl.value !== undefined) ? parseInt(tahunEl.value, 10) : now.getFullYear();

            if (!Number.isFinite(bulan)) bulan = now.getMonth();
            if (!Number.isFinite(tahun)) tahun = now.getFullYear();

            // safety: clamp bulan/tahun
            if (bulan < 0 || bulan > 11) bulan = now.getMonth();
            if (tahun < 1970 || tahun > 2100) tahun = now.getFullYear();

            buildDailyChart(bulan, tahun);
          }


          const yearSel=document.getElementById('yearSelect');
          const startRange=document.getElementById('startRange');
          const endRange=document.getElementById('endRange');

          // week default = hari ini
          //weekInput.valueAsDate=getStartOfWeek(today);
          //weekInput.addEventListener('change',()=>buildWeeklyChart(new Date(weekInput.value)));

          bulanHarian.addEventListener("change", refreshDailyChart);
          tahunHarian.addEventListener("change", refreshDailyChart);


          // isi dropdown tahun ±5 range
          const curYear=today.getFullYear();
          for(let y=curYear-2;y<=curYear+2;y++){
            const opt=document.createElement('option');
            opt.value=y; opt.textContent=y;
            if(y===curYear) opt.selected=true;
            tahunHarian.appendChild(opt);
            
            // buat option baru untuk yearSel
            const opt2 = document.createElement('option');
            opt2.value = y;
            opt2.textContent = y;
            if (y === curYear) opt2.selected = true;
            yearSel.appendChild(opt2);
          }
          yearSel.addEventListener('change',()=>buildMonthlyChart(parseInt(yearSel.value)));

          // rentang tanggal keperluan
          startRange.addEventListener('change',()=>buildKeperluanChart(startRange.valueAsDate,endRange.valueAsDate));
          endRange.addEventListener('change',()=>buildKeperluanChart(startRange.valueAsDate,endRange.valueAsDate));

          // render awal
          //buildWeeklyChart(today);
          refreshDailyChart();
          buildMonthlyChart(curYear);
          buildKeperluanChart();


          // 🔎=== FITUR PENCARIAN WAJIB PAJAK ===
          const searchInput = document.getElementById('searchInputDashboard');
          const searchBtn = document.getElementById('searchButtonDashboard');
          const resultTable = document.getElementById('searchResultDashboard');
          const resultBody = document.getElementById('searchResultBody');
          const emptyMsg = document.getElementById('searchEmptyDashboard');

          // 🧩 Perbaikan: Pencarian ambil data realtime langsung dari Firebase
          async function tampilkanHasilPencarian(keyword) {
            const resultBody = document.getElementById('searchResultBody');
            const resultTable = document.getElementById('searchResultDashboard');
            const emptyMsg = document.getElementById('searchEmptyDashboard');
            
            resultBody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-slate-500"><i class="fa fa-spinner fa-spin"></i> Memuat data terbaru...</td></tr>`;
            resultTable.classList.remove('hidden');
            emptyMsg.classList.add('hidden');

            try {
              // Ambil data terbaru dari Firebase (realtime)
              const [snapAntrean, snapMPP] = await Promise.all([
                db.ref('data_antrean').get(),
                db.ref('data_mpp').get()
              ]);

              const dataAntrean = snapAntrean.val() || {};
              const dataMPP = snapMPP.val() || {};
              const allData = [...Object.values(dataAntrean), ...Object.values(dataMPP)];
              const lower = keyword.toLowerCase();

              // Filter data sesuai keyword
              const hasil = allData.filter(it => {
                const txt = JSON.stringify(it).toLowerCase();
                return txt.includes(lower);
              });

              // Urutkan berdasarkan tanggal terbaru
              // Urutkan berdasarkan tanggal terbaru (dari terbaru → terlama)
              hasil.sort((a, b) => {
                const parseDate = (val) => {
                  if (!val) return 0;
                  // ambil bagian tanggal aja (kalau ada waktu di belakang)
                  const datePart = val.toString().split(' ')[0];
                  const [dd, mm, yyyy] = datePart.split(/[\/\-]/);
                  return new Date(`${yyyy}-${mm}-${dd}`).getTime() || 0;
                };
                return parseDate(b.Tanggal_Antrean || b.Tanggal || b.Timestamps) - parseDate(a.Tanggal_Antrean || a.Tanggal || a.Timestamps);
              });


              // Render hasil
              if (hasil.length === 0) {
                resultTable.classList.add('hidden');
                emptyMsg.classList.remove('hidden');
                return;
              }

              resultBody.innerHTML = hasil.map(it => `
                <tr class="hover:bg-slate-50">
                  <td class="border px-3 py-2">${it.Nama || '-'}</td>
                  <td class="border px-3 py-2">${it.NIK_NPWP || '-'}</td>
                  <td class="border px-3 py-2">${it.Keperluan || it.Keterangan || '-'}</td>
                  <td class="border px-3 py-2">${it.Tanggal_Antrean || it.Tanggal || '-'}</td>
                  <td class="border px-3 py-2 text-center">
                    <button class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
                      onclick="bukaInfoDariPencarian('${it.No_Antrean || ''}')">
                      <i class="fa-solid fa-circle-info"></i> Info
                    </button>
                  </td>
                </tr>
              `).join('');

            } catch (err) {
              console.error("❌ Gagal ambil data realtime:", err);
              resultBody.innerHTML = `<tr><td colspan="5" class="text-center text-red-500 py-3">Gagal memuat data dari Firebase.</td></tr>`;
            }
          }


          // event: klik tombol cari
          searchBtn.addEventListener('click', () => {
            const q = searchInput.value.trim();
            if (!q) return;
            tampilkanHasilPencarian(q);
          });

          // event: tekan Enter di input
          searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const q = searchInput.value.trim();
              if (!q) return;
              tampilkanHasilPencarian(q);
            }
          });

          // 🆕 Tombol Reset Pencarian
          const resetBtn = document.getElementById('resetSearchDashboard');
          resetBtn.addEventListener('click', () => {
            searchInput.value = '';
            resultTable.classList.add('hidden');
            emptyMsg.classList.add('hidden');
          });


          // Fungsi tampilkan detail data (popup modal cantik)
          window.lihatDetail = function (data) {
            // Urutan field sesuai keinginanmu (sudah termasuk Keterangan)
            const urutanKunci = [
              "No_Antrean",
              "Nama",
              "Keperluan",
              "NIK_NPWP",
              "No_HP_WA",
              "Email",
              "Status",
              "Keterangan", // 👈 tambahan baru di sini
              "Petugas",
              "Tanggal_Antrean",
              "Timestamps"
            ];

            // Buat tabel sesuai urutan di atas
            const detail = urutanKunci
              .filter(k => data[k] !== undefined && data[k] !== "") // tampilkan hanya yg ada nilainya
              .map((k) => {
                let label = k.replace(/_/g, " "); // ubah underscore jadi spasi
                return `
                  <tr class="border-b border-slate-100">
                    <td class="font-semibold text-slate-700 py-2 pr-3 w-1/3">${label}</td>
                    <td class="text-slate-800 py-2 break-words">${data[k]}</td>
                  </tr>`;
              })
              .join("");

            // HTML modal-nya
            const modalHtml = `
              <div class="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex justify-center items-center z-50 animate-fadeIn">
                <div class="bg-white rounded-2xl shadow-2xl w-[420px] p-6 relative border border-slate-200">
                  <!-- Judul -->
                  <h3 class="text-lg font-bold mb-4 text-slate-800 flex items-center gap-2">
                    <i class="fa-solid fa-circle-info text-blue-600"></i>
                    Detail Data
                  </h3>

                  <!-- Isi tabel -->
                  <div class="max-h-72 overflow-auto rounded-md border border-slate-100">
                    <table class="text-sm w-full border-collapse">${detail}</table>
                  </div>

                  <!-- Tombol tutup -->
                  <div class="text-right mt-5">
                    <button
                      onclick="this.closest('.fixed').remove()"
                      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm shadow-md transition-all"
                    >
                      Tutup
                    </button>
                  </div>

                  <!-- Tombol close pojok kanan -->
                  <button
                    onclick="this.closest('.fixed').remove()"
                    class="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition"
                    title="Tutup"
                  >
                    <i class="fa-solid fa-xmark text-lg"></i>
                  </button>
                </div>
              </div>

              <!-- Animasi fadeIn -->
              <style>
                @keyframes fadeIn {
                  from { opacity: 0; transform: scale(0.95); }
                  to { opacity: 1; transform: scale(1); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
              </style>
            `;

            // Tambahkan modal ke halaman
            document.body.insertAdjacentHTML("beforeend", modalHtml);
          };

          // 🆕 Fungsi Info dari tabel hasil pencarian
          window.bukaInfoDariPencarian = function(noAntrean) {
            if (!noAntrean) return alert("Nomor antrean tidak ditemukan.");
            const key = noAntrean.replace(/\//g, "_");

            // 🔍 Coba cari di data_antrean dulu
            db.ref("data_antrean/" + key).once("value").then((snapA) => {
              if (snapA.exists()) {
                const data = snapA.val();
                isiModalInfo(data);
                return;
              }

              // Kalau gak ada, coba cari di data_mpp
              db.ref("data_mpp/" + key).once("value").then((snapM) => {
                if (snapM.exists()) {
                  const data = snapM.val();
                  isiModalInfo(data);
                } else {
                  alert("Data tidak ditemukan di Firebase.");
                }
              });
            });
          };

          // 🧩 Fungsi bantu isi modal info (dipakai juga oleh tombol Info lain)
          function isiModalInfo(data) {
            document.getElementById("infoTimestamp").value = data.Timestamps || "-";
            document.getElementById("infoNo").value = data.No_Antrean || "-";
            document.getElementById("infoStatus").value = data.Status || "-";
            document.getElementById("infoNama").value = data.Nama || "";
            document.getElementById("infoNik").value = data.NIK_NPWP || "";
            document.getElementById("infoHP").value = data.No_HP_WA || "";
            document.getElementById("infoEmail").value = data.Email || "";
            document.getElementById("infoKeperluan").value = data.Keperluan || "";
            document.getElementById("infoKeterangan").value = data.Keterangan || "";
            document.getElementById("infoPetugas").value = data.Petugas || "-";

            // ✅ Tampilkan modal
            document.getElementById("infoModal").classList.remove("hidden");
          }

        }


        document.addEventListener('DOMContentLoaded', () => {
          loadDashboardStats();
          listenDashboardAntreanRealtime(); // 🟢 realtime update
        });


        function listenDashboardAntreanRealtime() {
          const ref = db.ref("data_antrean");
          ref.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.values(data);
            const today = new Date();
            const todayStr = today.toLocaleDateString("id-ID");

            // filter data hari ini
            const hariIniAntrean = list.filter(x => {
              const t = x.Tanggal_Antrean || x.Tanggal;
              return t === todayStr;
            });

            const belumDipanggil = hariIniAntrean.filter(x => {
              const st = (x.Status || "").toLowerCase();
              return st === "" || st === "belum dipanggil";
            });

            // update angka di kartu "Antrean Hari Ini (Antrean)"
            const cardEl = document.querySelector("#dashboardStats .text-blue-600");
            const belumEl = cardEl?.parentElement?.querySelector(".text-xs.text-slate-500");
            if (cardEl) cardEl.textContent = hariIniAntrean.length;
            if (belumEl) belumEl.textContent = `Belum dipanggil: ${belumDipanggil.length}`;

            // update daftar belum dipanggil (kanan bawah)
            const listEl = document.getElementById("listBelumDipanggil");
            if (listEl) {
              listEl.innerHTML = belumDipanggil.length
                ? belumDipanggil
                    .sort((a, b) => parseInt(a.No_Antrean) - parseInt(b.No_Antrean))
                    .map(
                      (it) => `
                    <li class="py-2 px-2 flex justify-between">
                      <div>
                        <div class="font-semibold text-slate-700">${it.Nama || "-"}</div>
                        <div class="text-xs text-slate-500">${it.No_Antrean || "-"}</div>
                      </div>
                      <div class="text-xs text-slate-500">${it.Keperluan || "-"}</div>
                    </li>`
                    )
                    .join("")
                : `<li class="py-3 text-center text-slate-500">Tidak ada antrean belum dipanggil hari ini.</li>`;
            }
          });
        }

        // ====== Single-session enforcement: jika localStorage ada tapi sessionStorage tidak ada => anggap sesi lama sudah ditutup, hapus localStorage ======
        (function enforceRequireLoginAfterClose() {
          try {
            const lsUser = localStorage.getItem("username");
            const sessId = sessionStorage.getItem("sessionId");
            if (lsUser && !sessId) {
              // kemungkinan user sebelumnya menutup browser/tab -> jangan biarkan auto-login
              localStorage.removeItem("username");
              localStorage.removeItem("namaPetugas");
              localStorage.removeItem("role");
              localStorage.removeItem("sessionExpiry");
              localStorage.removeItem("lastActivity");
              // jangan hapus sessionStorage here (tidak ada), biarkan login baru men-set sessionStorage
              console.log("🧹 localStorage login dibersihkan karena tidak ditemukan sessionStorage — login harus diulang.");
            }
          } catch (err) {
            console.warn("Gagal enforce RequireLoginAfterClose:", err);
          }
        })();



        // === SCRIPT UTAMA APLIKASI PETUGAS ===
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
              });
            }

            // --- ELEMEN DASHBOARD ---
            const filterTanggalDashboard = document.getElementById("filterTanggalDashboard");
            // --- ELEMEN DATA ANTREAN ---
            const filterTanggalTabel = document.getElementById("filterTanggalTabel");
            const btnTambah = document.getElementById("btnTambah");
            const tabelAntreanBody = document.getElementById("tabelAntreanBody");
            // --- ELEMEN REFRESH INDICATOR ---
            const refreshSpinnerDashboard = document.getElementById("refreshSpinnerDashboard");
            const lastUpdateTimeDashboard = document.getElementById("lastUpdateTimeDashboard");
            const refreshSpinnerTabel = document.getElementById("refreshSpinnerTabel");
            const lastUpdateTimeTabel = document.getElementById("lastUpdateTimeTabel");
            // --- ELEMEN MODAL ---
            const ketModal = document.getElementById("ketModal");
            const ketInput = document.getElementById("ketInput");
            const btnSimpanKet = document.getElementById("btnSimpanKet");
            const btnTutupKet = document.getElementById("btnTutupKet");
            const infoModal = document.getElementById("infoModal");
            // ===== Perbaikan: handler btnSimpanInfo yang lebih andal (cek langsung ke Firebase) =====
            const btnSimpanInfo = document.getElementById("btnSimpanInfo");
            if (btnSimpanInfo) {
              btnSimpanInfo.addEventListener("click", async () => {
                try {
                  const noAntrean = document.getElementById("infoNo").value.trim();
                  if (!noAntrean) return alert("Nomor antrean tidak ditemukan.");

                  showLoading(true);

                  const key = noAntrean.replace(/\//g, "_");

                  // Ambil data dari field modal
                  const updatedData = {
                    Nama: document.getElementById("infoNama").value.trim(),
                    NIK_NPWP: document.getElementById("infoNik").value.trim(),
                    No_HP_WA: document.getElementById("infoHP").value.trim(),
                    Email: document.getElementById("infoEmail").value.trim(),
                    Keperluan: document.getElementById("infoKeperluan").value.trim(),
                    Keterangan: document.getElementById("infoKeterangan").value.trim(),
                    Petugas: localStorage.getItem("namaPetugas") || "-",
                    Status: document.getElementById("infoStatus").value.trim() || "Belum Dipanggil",
                    Timestamps: new Date().toLocaleString("id-ID")
                  };

                  // Cek apakah data ada di data_mpp atau data_antrean
                  const snapMPP = await db.ref("data_mpp/" + key).once("value");
                  if (snapMPP.exists()) {
                    await db.ref("data_mpp/" + key).update(updatedData);
                    if (typeof listenMPPRealtime === "function") listenMPPRealtime();
                    //alert("✅ Perubahan data MPP berhasil disimpan ke Firebase!");
                  } else {
                    const snapA = await db.ref("data_antrean/" + key).once("value");
                    if (snapA.exists()) {
                      await db.ref("data_antrean/" + key).update(updatedData);
                      if (typeof listenAntreanRealtime === "function") listenAntreanRealtime();
                      //alert("✅ Perubahan data antrean berhasil disimpan ke Firebase!");
                    } else {
                      alert("Data tidak ditemukan di data_mpp maupun data_antrean.");
                    }
                  }

                  // Tutup modal
                  const infoModalEl = document.getElementById("infoModal");
                  if (infoModalEl) infoModalEl.classList.add("hidden");

                } catch (err) {
                  console.error("Gagal menyimpan:", err);
                  alert("Terjadi kesalahan saat menyimpan data: " + (err.message || err));
                } finally {
                  showLoading(false);
                }
              });
            }


            // ===== Perbaikan: handler btnHapusInfo yang lebih andal (cek langsung ke Firebase) =====
            const btnHapusInfo = document.getElementById("btnHapusInfo");
            if (btnHapusInfo) {
              btnHapusInfo.addEventListener("click", async () => {
                try {
                  const noAntrean = document.getElementById("infoNo").value.trim();
                  if (!noAntrean) return alert("Nomor antrean tidak ditemukan.");
                  if (!confirm("Yakin ingin menghapus antrean ini dari Firebase?")) return;

                  showLoading(true);

                  const key = noAntrean.replace(/\//g, "_");
                  // Cek apakah ada di data_mpp dulu
                  const snapMPP = await db.ref("data_mpp/" + key).once("value");
                  if (snapMPP.exists()) {
                    // Hapus dari data_mpp
                    await db.ref("data_mpp/" + key).remove();
                    // refresh MPP list bila ada fungsi listener
                    if (typeof listenMPPRealtime === "function") listenMPPRealtime();
                    //alert("✅ Data MPP berhasil dihapus dari Firebase!");
                  } else {
                    // Kalau tidak ada di data_mpp, hapus di data_antrean
                    const snapA = await db.ref("data_antrean/" + key).once("value");
                    if (snapA.exists()) {
                      await db.ref("data_antrean/" + key).remove();
                      if (typeof listenAntreanRealtime === "function") listenAntreanRealtime();
                      alert("✅ Data antrean berhasil dihapus dari Firebase!");
                    } else {
                      alert("Data tidak ditemukan di data_mpp maupun data_antrean.");
                    }
                  }

                  // tutup modal bila masih terbuka
                  const infoModalEl = document.getElementById("infoModal");
                  if (infoModalEl) infoModalEl.classList.add("hidden");
                } catch (err) {
                  console.error("Gagal menghapus:", err);
                  alert("Terjadi kesalahan saat menghapus data: " + (err.message || err));
                } finally {
                  showLoading(false);
                }
              });
            }
            const btnTutupInfo = document.getElementById("btnTutupInfo");
            const tambahModal = document.getElementById("tambahModal");
            const btnSimpanTambah = document.getElementById("btnSimpanTambah");
            const btnTutupTambah = document.getElementById("btnTutupTambah");
            const tambahKeperluanSelect = document.getElementById("tambahKeperluan");
            const tambahKeperluanLainnyaDiv = document.getElementById("tambahKeperluanLainnyaDiv");
            const suksesModal = document.getElementById("suksesModal");
            const suksesMessage = document.getElementById("suksesMessage");
            const btnTutupSukses = document.getElementById("btnTutupSukses");
            let selectedNo = null; // Menyimpan nomor antrean yg sedang dioperasikan
            let activePage = "dashboard"; // Halaman aktif default
            let isActionInProgress = false; // Flag untuk mencegah auto-refresh tumpang tindih
            let pendingNo = null; // Menyimpan nomor antrean yang sedang diubah statusnya
            // === FUNGSI-FUNGSI ===
            const showLoading = (show) => {
                loadingOverlay.classList.toggle("hidden", !show);
            };
            const setTodayDate = () => {
                const today = new Date().toISOString().split("T")[0];
                if (filterTanggalDashboard) filterTanggalDashboard.value = today;
                if (filterTanggalTabel) filterTanggalTabel.value = today;
            };
            const updateTimestamp = () => {
                const now = new Date();
                const timeString = `Diperbarui: ${now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
                lastUpdateTimeDashboard.textContent = timeString;
                lastUpdateTimeTabel.textContent = timeString;
            };
            const setSidebarState = (isCollapsed) => {
                if (isCollapsed) {
                    sidebar.classList.remove('w-64');
                    sidebar.classList.add('sidebar-collapsed');
                } else {
                    sidebar.classList.remove('sidebar-collapsed');
                    sidebar.classList.add('w-64');
                }
                sidebarBrandText.classList.toggle('hidden', isCollapsed);
                sidebarToggleIcon.classList.toggle('fa-angles-left', !isCollapsed);
                sidebarToggleIcon.classList.toggle('fa-angles-right', isCollapsed);
                sidebarTexts.forEach(text => text.classList.toggle('hidden', isCollapsed));
            };
            // === Tooltip Sidebar saat mode kecil ===
            function enableSidebarTooltips() {
                const sidebarMenus = document.querySelectorAll('#sidebar .menu-item');
                const userInfo = document.getElementById('userInfo');
                const createTooltip = (text) => {
                    const tooltip = document.createElement('div');
                    tooltip.textContent = text;
                    tooltip.className = 'fixed bg-gray-900 text-white text-xs font-medium py-1 px-2 rounded shadow-lg z-[99999] pointer-events-none opacity-0 transition-opacity duration-150';
                    document.body.appendChild(tooltip);
                    return tooltip;
                };
                let activeTooltip = null;
                const showTooltip = (el, text, event) => {
                    // Tampilkan tooltip hanya saat sidebar dalam mode 'collapsed' (sidebar-collapsed)
                    if (!sidebar.classList.contains('sidebar-collapsed')) return;
                    activeTooltip = createTooltip(text);
                    const rect = el.getBoundingClientRect();
                    activeTooltip.style.left = rect.right + 10 + 'px';
                    activeTooltip.style.top = rect.top + (rect.height / 2 - 10) + 'px';
                    requestAnimationFrame(() => (activeTooltip.style.opacity = '1'));
                };
                const hideTooltip = () => {
                    if (activeTooltip) {
                        activeTooltip.remove();
                        activeTooltip = null;
                    }
                };
                sidebarMenus.forEach(menu => {
                    const text = menu.querySelector('span')?.textContent.trim() || '';
                    menu.addEventListener('mouseenter', (e) => showTooltip(menu, text, e));
                    menu.addEventListener('mouseleave', hideTooltip);
                });
                if (userInfo) {
                    const userTooltipText = document.getElementById('namaPetugas')?.textContent || 'Profil Petugas';
                    userInfo.addEventListener('mouseenter', (e) => showTooltip(userInfo, userTooltipText, e));
                    userInfo.addEventListener('mouseleave', hideTooltip);
                }
            }
            enableSidebarTooltips();
            // Toggle sidebar: lebih andal dengan kelas 'sidebar-collapsed'
            const toggleSidebar = () => {
                const isCollapsed = !sidebar.classList.contains('sidebar-collapsed');
                setSidebarState(isCollapsed);
                // simpan sebagai string 'true' / 'false'
                localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
            };
            const switchPage = (pageKey) => {
                activePage = pageKey;
                // 🔹 Sembunyikan SEMUA halaman terlebih dahulu
                for (const key in contentSections) {
                    if (contentSections[key]) {
                        contentSections[key].classList.add("hidden");
                    }
                }
                // 🔹 Tampilkan halaman sesuai menu yang diklik
                if (contentSections[pageKey]) {
                    contentSections[pageKey].classList.remove("hidden");
                }
                // 🔹 Atur tampilan menu aktif di sidebar
                for (const key in menuItems) {
                    if (menuItems[key]) {
                        menuItems[key].classList.remove("active");
                    }
                }
                if (menuItems[pageKey]) {
                    menuItems[pageKey].classList.add("active");
                }
                // 🔹 Sinkronisasi tab mobile biar tab yang aktif ikut berubah
                try {
                    const mTabs = document.getElementById("mobileNavTabs");
                    if (mTabs) {
                        const buttons = mTabs.querySelectorAll("button");
                        buttons.forEach(btn => {
                            if (btn.dataset.page === pageKey) {
                                btn.classList.add("active");
                            } else {
                                btn.classList.remove("active");
                            }
                        });
                    }
                } catch (e) {
                    console.warn("Gagal sinkron tab mobile:", e);
                }
                // 🔹 Jalankan fungsi masing-masing halaman
                setTodayDatePetugas();

                if (pageKey === "dashboard") loadDashboardFromFirebase();
                else if (pageKey === "dataAntrean") loadDataTable();
                else if (pageKey === "dataMPP") loadDataMPP();
                else if (pageKey === "tindakLanjut") {
                    const namaPetugas = localStorage.getItem("namaPetugas") || "-";
                    document.getElementById("tindakLoading").classList.remove("hidden");
                    listenTindakLanjutRealtime(namaPetugas);
                } else if (pageKey === "pengumuman") renderPengumuman();
                else if (pageKey === "pengaturan") loadPengaturanAntrean();
            };
            // ✅ Jadikan fungsi global agar bisa dipanggil dari script lain
            window.switchPage = switchPage;
            const checkSession = () => {
                const savedUser = localStorage.getItem("username");
                const savedName = localStorage.getItem("namaPetugas");
                if (savedUser && savedName) {
                    document.getElementById("namaPetugas").textContent = savedName;
                    document.getElementById("userInitial").textContent = savedName.charAt(0).toUpperCase();
                    loginSection.classList.add("hidden");
                    appSection.classList.remove("hidden");
                    document.getElementById("dataMPPContent").classList.add("hidden"); // ✅ pastikan MPP tidak aktif saat awal login
                    switchPage('dashboard');
                    Object.values(contentSections).forEach(section => section.classList.add("hidden"));
                    contentSections.dashboard.classList.remove("hidden");
                }
                showLoading(false);
                setTodayDatePetugas();
                updateChatUserIdentity();
                document.dispatchEvent(new Event("userLoggedIn"));

                const role = localStorage.getItem("role") || "user";
                applyRoleRestrictions(role);
            };

            function applyRoleRestrictions(role) {
              console.log("👤 Role aktif:", role);

              const menuPengumuman = document.getElementById("menuPengumuman");
              const menuPengaturan = document.getElementById("menuPengaturan");
              const contentPengumuman = document.getElementById("pengumumanContent");
              const contentPengaturan = document.getElementById("pengaturanContent");

              if (role === "user") {
                if (menuPengumuman) menuPengumuman.style.display = "none";
                if (menuPengaturan) menuPengaturan.style.display = "none";
                if (contentPengumuman) contentPengumuman.style.display = "none";
                if (contentPengaturan) contentPengaturan.style.display = "none";
              } else {
                // Role admin — pastikan semuanya muncul
                if (menuPengumuman) menuPengumuman.style.display = "";
                if (menuPengaturan) menuPengaturan.style.display = "";
                if (contentPengumuman) contentPengumuman.style.display = "";
                if (contentPengaturan) contentPengaturan.style.display = "";
              }
            }

            


            const handleLogin = async () => {
                const user = usernameEl.value.trim();
                const pass = passwordEl.value.trim();
                if (!user || !pass) {
                    alert("Masukkan username dan password");
                    return;
                }
                showLoading(true);
                btnLogin.disabled = true;
                btnLogin.textContent = "Memproses...";
                try {
                    const snapshot = await db.ref("petugas").once("value");
                    const data = snapshot.val();
                    if (data && data[user]) {
                        const userData = data[user];
                        if (userData.password && userData.password === pass) {
                            // Simpan ke localStorage
                            localStorage.setItem("username", user);
                            localStorage.setItem("namaPetugas", userData.nama || user);
                            localStorage.setItem("role", userData.roles || "user");
                            // tandai session runtime agar tidak auto-keep setelah browser ditutup
                            sessionStorage.setItem("sessionId", Date.now().toString());

                            // 🕓 Tambahan untuk session expiry
                            const now = Date.now();
                            localStorage.setItem("lastActivity", now.toString());
                            localStorage.setItem("sessionExpiry", (now + SESSION_TIMEOUT).toString());

                            // Tampilkan aplikasi
                            checkSession();
                            updateChatUserIdentity();
                            document.dispatchEvent(new Event("userLoggedIn"));

                            // Reset aktivitas pertama kali
                            resetSessionTimer();

                            // 🔥 Tunggu 500ms biar DOM sidebar kebentuk, baru atur akses
                            setTimeout(() => {
                              const role = localStorage.getItem("role") || "user";
                              applyRoleRestrictions(role);
                            }, 500);
                        } else {
                            loginError.textContent = "Password salah!";
                            loginError.classList.remove("hidden");
                        }
                    } else {
                        loginError.textContent = "Username tidak ditemukan!";
                        loginError.classList.remove("hidden");
                    }
                } catch (err) {
                    console.error("Gagal login dari Firebase:", err);
                    alert("Terjadi kesalahan saat login. Coba lagi nanti.");
                }
                showLoading(false);
                btnLogin.disabled = false;
                btnLogin.textContent = "Login";
            };
            const handleLogout = () => {
                localStorage.removeItem("username");
                localStorage.removeItem("namaPetugas");
                localStorage.removeItem("role");
                localStorage.removeItem("sessionExpiry");
                localStorage.removeItem("lastActivity");

                sessionStorage.removeItem("username");
                sessionStorage.removeItem("namaPetugas");
                sessionStorage.removeItem("role");
                sessionStorage.removeItem("sessionExpiry");
                sessionStorage.removeItem("lastActivity");
                sessionStorage.removeItem("sessionId");

                document.getElementById("appSection").classList.add("hidden");
                document.getElementById("loginSection").classList.remove("hidden");
                
                updateChatUserIdentity();

            };
            // 🚀 Versi ringan & cepat tanpa loading besar
            const loadDashboardFromFirebase = (showBigLoader = true) => {
                if (isActionInProgress && !showBigLoader) return;
                isActionInProgress = true;
                refreshSpinnerDashboard.classList.remove('hidden');
                const tanggalFilter = document.getElementById("filterTanggalDashboard").value;
                const keyTanggal = tanggalFilter.replaceAll("-", "_");
                try {
                    const dbRef = firebase.database().ref("data_antrean");
                    dbRef.on("value", (snapshot) => {
                        const semuaData = snapshot.val() || {};
                        const list = Object.values(semuaData).filter(d => d.Tanggal === tanggalFilter);
                        renderDashboard(list);
                        refreshSpinnerDashboard.classList.add('hidden');
                        isActionInProgress = false;
                    });
                } catch (err) {
                    console.error("❌ Gagal load dashboard:", err);
                    document.getElementById("dashboard-cards").innerHTML =
                        `<p class="text-center text-red-600">Gagal memuat data dari Firebase.</p>`;
                    refreshSpinnerDashboard.classList.add('hidden');
                }
            };

            function loadDataTable() {
                // gunakan listener realtime Firebase
                listenAntreanRealtime();
                refreshSpinnerTabel.classList.add('hidden');
                isActionInProgress = false;
            }
            const renderTable = (rows) => {
                tabelAntreanBody.innerHTML = "";
                if (Array.isArray(rows) && rows.length > 0) {
                    rows.forEach(r => {
                        // 🟦 Tambahan efek notifikasi loading di seluruh area Keterangan + Aksi
                        if (pendingNo && r.no === pendingNo) {
                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm font-medium text-gray-900">${r.no}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nama}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nik || '-'}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.hp || '-'}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.email || '-'}</td>
                  <td class="px-4 py-3 text-left text-sm text-gray-900">${r.keperluan}</td>
                  <td colspan="2" class="px-4 py-3 text-center text-sm font-medium text-slate-500">
                    <div class="flex items-center justify-center gap-2 text-blue-600 animate-pulse">
                      <i class="fa-solid fa-spinner fa-spin"></i>
                      <span class="italic">Sedang memperbarui status antrean...</span>
                    </div>
                  </td>
                `;
                            tabelAntreanBody.appendChild(tr);
                            return; // skip render normal
                        }
                        // 🟦 Selesai bagian tambahan
                        const tr = document.createElement("tr");
                        tr.className = "hover:bg-slate-50";
                        const panggilBtn = document.createElement('button');
                        panggilBtn.className = r.status === 'Belum Dipanggil' ?
                            'bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded' :
                            'bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-3 rounded';
                        panggilBtn.textContent = r.status === 'Belum Dipanggil' ? 'Panggil' : 'Batal';
                        panggilBtn.onclick = (event) =>
                            toggleStatus(r.no, r.status === 'Belum Dipanggil' ? 'Dipanggil' : 'Belum Dipanggil', event);
                        const ketBtn = document.createElement('button');
                        ketBtn.className = 'bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold py-1 px-3 rounded';
                        ketBtn.textContent = 'Ket';
                        ketBtn.onclick = () => bukaKet(r.no, r.ket);
                        const infoBtn = document.createElement('button');
                        infoBtn.className = 'bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold py-1 px-3 rounded';
                        infoBtn.textContent = 'Info';
                        infoBtn.onclick = () => bukaInfo(r.no);
                        tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm font-medium text-gray-900">${r.no}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nama}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nik || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.hp || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.email || '-'}</td>
                <td class="px-4 py-3 text-left text-sm text-gray-900">${r.keperluan}</td>
                <td class="px-4 py-3 text-left text-sm text-gray-900">${r.ket || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2"></td>`;
                        const aksiCell = tr.querySelector('td:last-child');
                        aksiCell.appendChild(panggilBtn);
                        aksiCell.appendChild(ketBtn);
                        aksiCell.appendChild(infoBtn);
                        tabelAntreanBody.appendChild(tr);
                    });
                } else {
                    tabelAntreanBody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-900">Tidak ada data untuk tanggal yang dipilih.</td></tr>`;
                }
                showLoading(false);
                refreshSpinnerTabel.classList.add('hidden');
                updateTimestamp();
                isActionInProgress = false;
                showRealtimeNotif();
                renderAntreanCards(rows);
            };
            // === Versi Mobile: Render kartu data antrean ===
            function renderAntreanCards(rows) {
                const container = document.getElementById("antreanCards");
                if (!container) return;
                container.innerHTML = "";
                if (!rows || rows.length === 0) {
                    container.innerHTML = `<p class="text-center text-slate-500 italic">Tidak ada data antrean.</p>`;
                    return;
                }
                rows.forEach(r => {
                    const card = document.createElement("div");
                    card.className = "data-card";
                    card.innerHTML = `
              <div class="data-card-header">
                <span class="text-blue-600 font-semibold">${r.nama}</span>
                <span>No. ${r.no}</span>
              </div>
              <div class="data-card-body">
                <p><strong>Keperluan:</strong> ${r.keperluan || '-'}</p>
              </div>
              <div class="data-card-actions">
                <button class="${r.status === 'Belum Dipanggil' ? 'bg-blue-600 text-white' : 'bg-yellow-500 text-white'}" data-action="panggil">${r.status === 'Belum Dipanggil' ? 'Panggil' : 'Batal'}</button>
                <button class="bg-gray-200 text-slate-800" data-action="info">Info</button>
              </div>
            `;
                    // === Tombol aksi ===
                    card.querySelector('[data-action="panggil"]').addEventListener("click", (e) => {
                        toggleStatus(r.no, r.status === 'Belum Dipanggil' ? 'Dipanggil' : 'Belum Dipanggil', e);
                    });
                    card.querySelector('[data-action="info"]').addEventListener("click", () => {
                        bukaInfo(r.no);
                    });
                    container.appendChild(card);
                });
            }
            const toggleStatus = (no, status, event) => {
                isActionInProgress = true;
                pendingNo = no; // 🔵 tandai antrean yang sedang diproses
                const aksiCell = event.target.parentElement;
                aksiCell.querySelectorAll('button').forEach(btn => btn.disabled = true);
                const spinner = document.createElement('i');
                spinner.className = 'fa-solid fa-spinner fa-spin text-blue-500 mr-2';
                aksiCell.prepend(spinner);
                const petugas = localStorage.getItem("namaPetugas") || "-";
                google.script.run
                    .withSuccessHandler(() => {
                        pendingNo = null; // 🔵 reset setelah selesai
                        isActionInProgress = false;
                        if (activePage === 'dataAntrean') loadDataTable(false);
                        if (activePage === 'dashboard') loadDashboardFromFirebase(false);
                        showRealtimeNotif();
                    })
                    .withFailureHandler((error) => {
                        console.error("Gagal mengubah status:", error);
                        pendingNo = null;
                        isActionInProgress = false;
                        if (activePage === 'dataAntrean') loadDataTable(false);
                    })
                    .toggleStatusAntrean(no, status, petugas);
            };
            const bukaKet = (no, isi) => {
                selectedNo = no;
                ketInput.value = isi || "";
                ketModal.classList.remove("hidden");
            };
            const bukaInfo = (noAntrean) => {
                isActionInProgress = true;
                showLoading(true);
                google.script.run.withSuccessHandler((data) => {
                    showLoading(false);
                    if (!data) return alert("Data antrean tidak ditemukan.");
                    document.getElementById("infoTimestamp").value = data.timestamp || "";
                    document.getElementById("infoNo").value = data.no || "";
                    document.getElementById("infoStatus").value = data.status || "";
                    document.getElementById("infoNama").value = data.nama || "";
                    document.getElementById("infoNik").value = data.nik || "";
                    document.getElementById("infoHP").value = data.hp || "";
                    document.getElementById("infoEmail").value = data.email || "";
                    document.getElementById("infoKeperluan").value = data.keperluan || "";
                    document.getElementById("infoPetugas").value = data.petugas || "-";
                    document.getElementById("infoKeterangan").value = data.ket || "";
                    infoModal.classList.remove("hidden");
                    isActionInProgress = false;
                }).getAntreanByNo(noAntrean);
            };
            sidebarToggle.addEventListener("click", toggleSidebar);
            btnLogin.addEventListener("click", handleLogin);
            // 🧩 Tambahan: biar bisa login pakai tombol Enter
            [usernameEl, passwordEl].forEach((input) => {
              input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLogin();
                }
              });
            });

            btnLogout.addEventListener("click", handleLogout);
            menuItems.dashboard.addEventListener("click", (e) => {
                e.preventDefault();
                switchPage('dashboard')
            });
            menuItems.dataAntrean.addEventListener("click", (e) => {
                e.preventDefault();
                switchPage("dataAntrean");
                listenAntreanRealtime();
            });
            menuItems.tindakLanjut.addEventListener("click", (e) => {
                e.preventDefault();
                switchPage("tindakLanjut");
            });
            menuItems.pengumuman.addEventListener("click", (e) => {
                e.preventDefault();
                switchPage('pengumuman')
            }); // ✅ Tambahan ini
            menuItems.pengaturan.addEventListener("click", (e) => {
                e.preventDefault();
                switchPage('pengaturan')
            });
            


            // === Navigasi Tab Mobile ===
            const mobileNavTabs = document.getElementById("mobileNavTabs");
            if (mobileNavTabs) {
                const tabButtons = mobileNavTabs.querySelectorAll("button");
                tabButtons.forEach(btn => {
                    btn.addEventListener("click", () => {
                        const page = btn.dataset.page;
                        switchPage(page);
                        // ubah tampilan aktif
                        tabButtons.forEach(b => b.classList.remove("active"));
                        btn.classList.add("active");
                    });
                });
            }
            // === Tombol Profil di Tab Mobile ===
            const btnProfilMobile = document.getElementById("btnProfilMobile");
            if (btnProfilMobile) {
                btnProfilMobile.addEventListener("click", () => {
                    const username = localStorage.getItem("username");
                    const nama = localStorage.getItem("namaPetugas");
                    if (!username || !nama) return alert("Sesi login tidak ditemukan.");
                    // isi modal profil seperti tombol sidebar kiri
                    document.getElementById("profilNama").value = nama;
                    document.getElementById("profilUsername").value = username;
                    document.getElementById("profilPassword").value = "";
                    document.getElementById("profilModal").classList.remove("hidden");
                });
            }
            filterTanggalDashboard.addEventListener("change", () => loadDashboardFromFirebase(true));
            filterTanggalTabel.addEventListener("change", () => loadDataTable(true));
            btnTambah.addEventListener("click", () => {
                document.getElementById('tambahNama').value = '';
                document.getElementById('tambahNik').value = '';
                document.getElementById('tambahHP').value = '';
                document.getElementById('tambahEmail').value = '';
                document.getElementById('tambahKeperluan').value = '';
                document.getElementById('tambahKeperluanLainnya').value = '';
                tambahKeperluanLainnyaDiv.classList.add('hidden');
                tambahModal.classList.remove("hidden");
                // 🧹 Hapus event lama dan reset tombol Simpan Tambah agar tidak terbawa dari MPP
                const oldBtn = document.getElementById("btnSimpanTambah");
                const newBtn = oldBtn.cloneNode(true);
                oldBtn.parentNode.replaceChild(newBtn, oldBtn);
                // 🧩 Tambahkan event baru khusus halaman Daftar Antrean
                newBtn.addEventListener("click", () => {
                    const nama = document.getElementById('tambahNama').value.trim().toUpperCase();
                    const nik = document.getElementById('tambahNik').value.trim();
                    const hp = document.getElementById('tambahHP').value.trim();
                    const email = document.getElementById('tambahEmail').value.trim();
                    let keperluan = document.getElementById('tambahKeperluan').value.trim().toUpperCase();
                    if (!nama || !keperluan) {
                        alert("Nama dan Keperluan wajib diisi.");
                        return;
                    }
                    if (keperluan === 'LAINNYA' || keperluan === 'LAINNYA...') {
                        const lainnya = document.getElementById('tambahKeperluanLainnya').value.trim().toUpperCase();
                        if (lainnya) {
                            keperluan = lainnya;
                        } else {
                            alert("Mohon sebutkan keperluan lainnya.");
                            return;
                        }
                    }
                    const data = {
                        nama,
                        nik,
                        hp,
                        email,
                        keperluan,
                        dariPetugas: true,
                        namaPetugas: localStorage.getItem("namaPetugas") || "-"
                    };
                    showLoading(true);
                    tambahModal.classList.add("hidden");
                    if (activePage === "dataMPP") {
                        tambahMPPFirebase(); // 🔥 tulis langsung ke Firebase
                    } else {
                        tambahAntreanFirebase(); // 🔥 tulis langsung ke Firebase
                    }
                    showLoading(false);
                });
            });
            tambahKeperluanSelect.addEventListener('change', () => {
                if (tambahKeperluanSelect.value === 'Lainnya') {
                    tambahKeperluanLainnyaDiv.classList.remove('hidden');
                } else {
                    tambahKeperluanLainnyaDiv.classList.add('hidden');
                }
            });
            btnSimpanTambah.addEventListener("click", () => {
                if (activePage === "dataMPP") {
                    tambahMPPFirebase();
                } else {
                    tambahAntreanFirebase();
                }
            });
            btnTutupTambah.addEventListener("click", () => tambahModal.classList.add("hidden"));
            btnTutupSukses.addEventListener("click", () => suksesModal.classList.add("hidden"));
            btnSimpanKet.addEventListener("click", () => {
                isActionInProgress = true;
                showLoading(true);
                const namaPetugas = localStorage.getItem("namaPetugas") || "-";
                google.script.run.withSuccessHandler(() => {
                    ketModal.classList.add("hidden");
                    loadDataTable(true);
                    loadDashboardFromFirebase(true);
                    if (activePage === 'dataAntrean') {
                        loadDataTable(true);
                    } else {
                        showLoading(false);
                        isActionInProgress = false;
                    }
                }).updateKeteranganWithPetugas(selectedNo, ketInput.value.trim(), namaPetugas);
            });
            btnTutupKet.addEventListener("click", () => ketModal.classList.add("hidden"));
            
            btnTutupInfo.addEventListener("click", () => infoModal.classList.add("hidden"));
            // === Tombol Tambah ke TL dari modal Info ===
            const btnTambahKeTL = document.getElementById("btnTambahKeTL");
            if (btnTambahKeTL) {
              btnTambahKeTL.addEventListener("click", async () => {
                const noAntrean = document.getElementById("infoNo").value.trim();
                const namaPetugas = localStorage.getItem("namaPetugas") || "-";

                if (!noAntrean) {
                  alert("Nomor antrean tidak ditemukan.");
                  return;
                }

                //if (!confirm("Tambahkan antrean ini ke daftar Tindak Lanjut?")) return;

                try {
                  btnTambahKeTL.disabled = true;
                  btnTambahKeTL.textContent = "Menambahkan...";

                  // 🔹 Ambil data sumber dari data_antrean atau data_mpp
                  const sumber = await fetchSourceByNo(noAntrean);
                  if (!sumber) {
                    alert("Data tidak ditemukan di data_antrean atau data_mpp.");
                    btnTambahKeTL.disabled = false;
                    btnTambahKeTL.textContent = "Tambah ke TL";
                    return;
                  }

                  // 🔹 Siapkan payload (pakai nomor antrean asli)
                  const tanggalHariIni = new Date().toLocaleDateString("id-ID");
                  const payload = {
                    Timestamps: new Date().toLocaleString("id-ID"),
                    No_Antrean: sumber.No_Antrean || noAntrean,
                    Nama: (sumber.Nama || sumber.nama || "-").toString().toUpperCase(),
                    NIK_NPWP: sumber.NIK_NPWP || sumber.nik || "",
                    No_HP_WA: sumber.No_HP_WA || sumber.hp || "",
                    Email: sumber.Email || sumber.email || "",
                    Keperluan: (sumber.Keperluan || sumber.keperluan || "-").toString().toUpperCase(),
                    Status: "Belum Ditindaklanjuti",
                    Urgensi: "Penting",
                    Petugas: namaPetugas,
                    Tanggal_Antrean: sumber.Tanggal_Antrean || tanggalHariIni,
                    // ✅ ambil nilai keterangan dari sumber atau dari input modal info
                    Ket: sumber.Ket || document.getElementById("infoKeterangan").value.trim() || "-",
                    Proses: ""
                  };


                  // 🔹 Simpan ke Firebase
                  await saveTindakToFirebase(payload);

                  alert("✅ Data berhasil ditambahkan ke daftar Tindak Lanjut.");

                  // reset tombol
                  btnTambahKeTL.disabled = false;
                  btnTambahKeTL.textContent = "Tambah ke TL";

                  // tutup modal info biar rapi
                  document.getElementById("infoModal").classList.add("hidden");
                } catch (err) {
                  console.error("Gagal tambah TL:", err);
                  alert("Terjadi kesalahan: " + err.message);
                  btnTambahKeTL.disabled = false;
                  btnTambahKeTL.textContent = "Tambah ke TL";
                }
              });
            }

            // === 🕓 Pengaturan Jam Layanan (guarded: hanya jika elemen ada) ===
            (function() {
                const jamBukaInput = document.getElementById("jamBuka");
                const jamTutupInput = document.getElementById("jamTutup");
                const btnSimpanJam = document.getElementById("btnSimpanJam");
                const jamStatus = document.getElementById("jamStatus");
                // Jika elemen tidak ada di DOM (karena layout pengaturan baru), skip bagian ini
                if (!jamBukaInput || !jamTutupInput || !btnSimpanJam || !jamStatus) {
                    return;
                }
                // Ambil data jam dari sheet saat halaman Pengaturan dibuka
                function loadJamLayananIfNeeded() {
                    google.script.run.withSuccessHandler((data) => {
                        if (data && data.jamBuka && data.jamTutup) {
                            jamBukaInput.value = data.jamBuka;
                            jamTutupInput.value = data.jamTutup;
                            jamStatus.textContent = `Jam antrean saat ini: ${data.jamBuka} - ${data.jamTutup} WIB`;
                        } else {
                            jamStatus.textContent = "Belum ada pengaturan jam layanan.";
                        }
                    }).getJamLayanan();
                }
                // Simpan perubahan jam layanan ke sheet
                btnSimpanJam.addEventListener("click", () => {
                    const jamBuka = jamBukaInput.value;
                    const jamTutup = jamTutupInput.value;
                    if (!jamBuka || !jamTutup) {
                        alert("Isi kedua jam terlebih dahulu!");
                        return;
                    }
                    btnSimpanJam.disabled = true;
                    btnSimpanJam.textContent = "Menyimpan...";
                    google.script.run.withSuccessHandler(() => {
                        jamStatus.textContent = `Jam antrean saat ini: ${jamBuka} - ${jamTutup} WIB`;
                        alert("✅ Jam layanan berhasil disimpan!");
                        btnSimpanJam.disabled = false;
                        btnSimpanJam.textContent = "Simpan Waktu";
                    }).setJamLayanan(jamBuka, jamTutup);
                });
                // Pastikan saat menu pengaturan lama dipanggil, kita ambil datanya
                menuItems.pengaturan.addEventListener("click", (e) => {
                    // jika pengaturan baru dipakai, loadPengaturanAntrean akan di-call juga; tidak masalah memanggil keduanya
                    loadJamLayananIfNeeded();
                });
            })();
            // === 🗓️ Pengaturan Hari Kerja & Libur (guarded: hanya jika elemen ada) ===
            (function() {
                const hariKerjaContainer = document.getElementById("hariKerjaContainer");
                const liburKhususContainer = document.getElementById("liburKhususContainer");
                const inputTanggalLibur = document.getElementById("inputTanggalLibur");
                const btnTambahLibur = document.getElementById("btnTambahLibur");
                const btnSimpanHariKerja = document.getElementById("btnSimpanHariKerja");
                if (!hariKerjaContainer || !liburKhususContainer || !inputTanggalLibur || !btnTambahLibur || !btnSimpanHariKerja) {
                    return;
                }
                const hariList = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
                let hariKerjaStatus = {};
                let tanggalLiburKhusus = [];
                // Ambil data pengaturan dari sheet
                function loadHariKerjaDanLiburIfNeeded() {
                    google.script.run.withSuccessHandler((data) => {
                        hariKerjaContainer.innerHTML = "";
                        hariKerjaStatus = data.hari || {};
                        tanggalLiburKhusus = data.liburKhusus || [];
                        hariList.forEach(hari => {
                            const aktif = hariKerjaStatus[hari] !== false; // default aktif
                            const toggle = `
                  <label class="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-medium">
                    <span>${hari}</span>
                    <input type="checkbox" ${aktif ? "checked" : ""} data-hari="${hari}" class="toggleHari accent-blue-600 h-4 w-4"></label>
                `;
                            hariKerjaContainer.insertAdjacentHTML("beforeend", toggle);
                        });
                        renderLiburKhusus();
                    }).getHariKerjaDanLibur();
                }

                function renderLiburKhusus() {
                    liburKhususContainer.innerHTML = "";
                    if (tanggalLiburKhusus.length === 0) {
                        liburKhususContainer.innerHTML = `<p class="text-slate-500 text-sm italic">Belum ada tanggal libur khusus.</p>`;
                        return;
                    }
                    tanggalLiburKhusus.forEach((tgl, i) => {
                        const item = `
                <div class="flex justify-between items-center bg-slate-50 border border-slate-200 px-3 py-2 rounded-md text-sm">
                  <span>${tgl}</span>
                  <button data-index="${i}" class="hapusLibur text-red-500 hover:text-red-700 text-xs font-semibold">Hapus</button>
                </div>
              `;
                        liburKhususContainer.insertAdjacentHTML("beforeend", item);
                    });
                    // Hapus libur
                    document.querySelectorAll(".hapusLibur").forEach(btn => {
                        btn.addEventListener("click", () => {
                            const idx = parseInt(btn.dataset.index);
                            tanggalLiburKhusus.splice(idx, 1);
                            renderLiburKhusus();
                        });
                    });
                }
                // Tambah libur baru
                btnTambahLibur.addEventListener("click", () => {
                    const tgl = inputTanggalLibur.value;
                    if (!tgl) return alert("Pilih tanggal terlebih dahulu!");
                    if (tanggalLiburKhusus.includes(tgl)) return alert("Tanggal sudah ada di daftar.");
                    tanggalLiburKhusus.push(tgl);
                    renderLiburKhusus();
                    inputTanggalLibur.value = "";
                });
                // Simpan pengaturan hari kerja & libur ke sheet
                btnSimpanHariKerja.addEventListener("click", () => {
                    const toggles = document.querySelectorAll(".toggleHari");
                    toggles.forEach(t => {
                        const hari = t.dataset.hari;
                        hariKerjaStatus[hari] = t.checked; // true = buka, false = tutup
                    });
                    btnSimpanHariKerja.disabled = true;
                    btnSimpanHariKerja.textContent = "Menyimpan...";
                    google.script.run.withSuccessHandler(() => {
                        alert("✅ Pengaturan hari kerja & libur berhasil disimpan!");
                        btnSimpanHariKerja.disabled = false;
                        btnSimpanHariKerja.textContent = "Simpan Pengaturan";
                    }).setHariKerjaDanLibur(hariKerjaStatus, tanggalLiburKhusus);
                });
                // Pastikan saat menu pengaturan di-click, kita load data ini (jika ada)
                menuItems.pengaturan.addEventListener("click", () => {
                    loadPengaturanAntrean(); // langsung panggil versi realtime
                });
            });
            // === 🔧 Load & Simpan Pengaturan Antrean (baru) ===
            // === 🔥 Load Pengaturan Antrean dari Firebase ===
            // === ⚡ Versi Realtime Load Pengaturan dari Firebase ===
            function loadPengaturanAntrean() {
              showLoading(true);
              const ref = db.ref("setting_antrean");
              ref.off(); // supaya gak dobel listener

              ref.on("value", (snapshot) => {
                const data = snapshot.val() || {};
                const arr = Object.keys(data).map((k) => ({
                  hari: data[k].Hari || k,
                  status: data[k].Status || "TUTUP",
                  maksimal: data[k].Maksimal || 0,
                  jamBuka: data[k]["Jam Buka"] || "",
                  jamTutup: data[k]["Jam Tutup"] || "",
                  catatan: data[k].Catatan || "",
                  tanggalTutup: data[k]["Tanggal Tutup Khusus"] || "",
                }));

                renderPengaturanAntrean(arr);
                if (typeof loadTanggalTutupKhusus === "function") loadTanggalTutupKhusus();
                showLoading(false);
              }, (err) => {
                console.error("❌ Gagal membaca data pengaturan:", err);
                alert("Gagal membaca data pengaturan dari Firebase.");
                showLoading(false);
              });

              // 🔥 muat juga daftar user management
              loadUserList();
            }


            function renderPengaturanAntrean(data) {
                console.log("renderPengaturanAntrean diterima:", data);
                const tbody = document.getElementById("tabelPengaturanBody");
                tbody.innerHTML = "";
                const urutanHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
                data.sort((a, b) => urutanHari.indexOf(a.hari) - urutanHari.indexOf(b.hari));
                data.forEach((item) => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                      <td class="px-3 py-2">${item.hari}</td>
                      <td class="px-3 py-2">
                        <select class="statusSelect border border-slate-300 rounded-md px-2 py-1 w-full">
                          <option value="BUKA" ${item.status === "BUKA" ? "selected" : ""}>BUKA</option>
                          <option value="TUTUP" ${item.status === "TUTUP" ? "selected" : ""}>TUTUP</option>
                        </select>
                      </td>
                      <td class="px-3 py-2">
                        <input type="number" class="maksInput border border-slate-300 rounded-md px-2 py-1 w-full" value="${item.maksimal || 0}">
                      </td>
                      <td class="px-3 py-2">
                        <input type="time" class="jamBukaInput border border-slate-300 rounded-md px-2 py-1 w-full" value="${item.jamBuka || ""}">
                      </td>
                      <td class="px-3 py-2">
                        <input type="time" class="jamTutupInput border border-slate-300 rounded-md px-2 py-1 w-full" value="${item.jamTutup || ""}">
                      </td>
                      <td class="px-3 py-2">
                        <input type="text" class="catatanInput border border-slate-300 rounded-md px-2 py-1 w-full" value="${item.catatan || ""}">
                      </td>
                    `;
                    tbody.appendChild(tr);
                });
                showLoading(false);
            }

            // --- Handler tunggal untuk Simpan Pengaturan ---
            const btnSimpanPengaturanEl = document.getElementById("btnSimpanPengaturan");
            if (btnSimpanPengaturanEl) {
              btnSimpanPengaturanEl.addEventListener("click", async () => {
                // ambil baris dari tabel (desktop)
                const rows = Array.from(document.querySelectorAll("#tabelPengaturanBody tr"));
                if (!rows || rows.length === 0) {
                  alert("Tidak ada pengaturan untuk disimpan.");
                  return;
                }

                // optional: set loading state
                btnSimpanPengaturanEl.disabled = true;
                const prevText = btnSimpanPengaturanEl.innerHTML;
                btnSimpanPengaturanEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Menyimpan...`;

                showLoading(true);
                try {
                  const updates = {};
                  rows.forEach(row => {
                    const hari = row.children[0].textContent.trim();
                    if (!hari) return;
                    const status = row.querySelector(".statusSelect")?.value || "TUTUP";
                    const maksimal = parseInt(row.querySelector(".maksInput")?.value || "0") || 0;
                    const jamBuka = row.querySelector(".jamBukaInput")?.value || "";
                    const jamTutup = row.querySelector(".jamTutupInput")?.value || "";
                    const catatan = row.querySelector(".catatanInput")?.value || "";
                    updates[`setting_antrean/${hari}`] = {
                      Hari: hari,
                      Status: status,
                      Maksimal: maksimal,
                      "Jam Buka": jamBuka,
                      "Jam Tutup": jamTutup,
                      Catatan: catatan,
                      // jangan sertakan "Tanggal Tutup Khusus" di sini karena itu disimpan terpisah
                    };
                  });

                  await db.ref().update(updates);
                  showRealtimeNotif && showRealtimeNotif();
                  alert("✅ Pengaturan berhasil disimpan ke Firebase!");
                  // reload pengaturan dari firebase
                  loadPengaturanAntrean();
                  // juga reload daftar tanggal tutup khusus supaya sinkron bila perlu
                  if (typeof loadTanggalTutupKhusus === 'function') loadTanggalTutupKhusus();
                } catch (err) {
                  console.error("Gagal menyimpan pengaturan:", err);
                  alert("Gagal menyimpan pengaturan: " + (err && err.message ? err.message : err));
                } finally {
                  showLoading(false);
                  btnSimpanPengaturanEl.disabled = false;
                  btnSimpanPengaturanEl.innerHTML = prevText;
                }
              });
            }


            
            
            setInterval(() => {
                if (!appSection.classList.contains("hidden") && !isActionInProgress) {
                    if (activePage === 'dataAntrean') listenAntreanRealtime();
                    if (activePage === 'dataMPP') listenMPPRealtime();
                }
            }, 10000);
            // 🟢 Refresh otomatis saat tab aktif kembali
            document.addEventListener("visibilitychange", () => {
                if (!document.hidden && !isActionInProgress) {
                    // Cek halaman aktif
                    if (activePage === 'dataAntrean') {
                        loadDataTable(false); // Refresh otomatis Data Antrean
                        console.log("🔄 Tab aktif kembali — Data Antrean di-refresh otomatis.");
                    } else if (activePage === 'dataMPP') {
                        loadDataTableMPP(false); // Refresh otomatis Data MPP
                        console.log("🔄 Tab aktif kembali — Data MPP di-refresh otomatis.");
                    }
                }
            });
            setTodayDate();
            checkSession();
            updateChatUserIdentity();
            document.dispatchEvent(new Event("userLoggedIn"));



            // === 🔥 Kelola Tanggal Tutup Khusus ===
            function loadTanggalTutupKhusus() {
              const listEl = document.getElementById("daftarTanggalKhusus");
              if (!listEl) return;
              db.ref("tanggal_tutup_khusus").on("value", (snapshot) => {
                const data = snapshot.val() || [];
                listEl.innerHTML = "";
                data.forEach((tgl, idx) => {
                  const li = document.createElement("li");
                  li.className = "flex justify-between items-center py-2";
                  li.innerHTML = `
                    <span class="text-slate-800">${tgl}</span>
                    <div class="flex gap-2">
                      <button class="btnEditTanggal bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-md" data-index="${idx}" data-value="${tgl}">
                        Edit
                      </button>
                      <button class="btnHapusTanggal bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-md" data-index="${idx}">
                        Hapus
                      </button>
                    </div>
                  `;
                  listEl.appendChild(li);
                  // pastikan elemen daftar tanggal terlihat di layar kecil
                  const wrapperTanggal = document.querySelector("#daftarTanggalKhusus")?.closest("div");
                  if (wrapperTanggal) {
                    wrapperTanggal.classList.remove("hidden");
                    wrapperTanggal.style.display = "block";
                  }

                });
              });
            }

            // Tambah tanggal baru
            document.getElementById("btnTambahTanggalKhusus").addEventListener("click", async () => {
              const input = document.getElementById("inputTanggalKhusus");
              const tgl = input.value.trim();
              if (!tgl) return alert("Isi tanggal terlebih dahulu (format DD/MM/YYYY)");
              
              const ref = db.ref("tanggal_tutup_khusus");
              const snap = await ref.get();
              const data = snap.val() || [];
              
              if (data.includes(tgl)) return alert("Tanggal sudah ada di daftar!");
              data.push(tgl);
              await ref.set(data);
              input.value = "";
              alert("✅ Tanggal ditambahkan!");
            });

            // Edit tanggal
            document.addEventListener("click", async (e) => {
              if (e.target.classList.contains("btnEditTanggal")) {
                const idx = e.target.dataset.index;
                const oldVal = e.target.dataset.value;
                const newVal = prompt("Edit tanggal:", oldVal);
                if (!newVal) return;
                const ref = db.ref("tanggal_tutup_khusus");
                const snap = await ref.get();
                const data = snap.val() || [];
                data[idx] = newVal;
                await ref.set(data);
                alert("✅ Tanggal diperbarui!");
              }
            });

            // Hapus tanggal
            document.addEventListener("click", async (e) => {
              if (e.target.classList.contains("btnHapusTanggal")) {
                const idx = e.target.dataset.index;
                if (!confirm("Yakin hapus tanggal ini?")) return;
                const ref = db.ref("tanggal_tutup_khusus");
                const snap = await ref.get();
                const data = snap.val() || [];
                data.splice(idx, 1);
                await ref.set(data);
                alert("🗑️ Tanggal dihapus!");
              }
            });

            document.getElementById("menuPengaturan").addEventListener("click", () => {
              // muat pengaturan + tanggal tutup khusus realtime
              loadPengaturanAntrean();
              loadTanggalTutupKhusus();
            });



            // === 🧩 USER MANAGEMENT SECTION ===
            // === 🧩 Versi fix: User List + Event Delegation (Edit/Hapus) ===
            async function loadUserList() {
              const tbody = document.getElementById("tabelUserBody");
              tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-slate-500">Memuat data...</td></tr>`;

              try {
                const snap = await db.ref("petugas").once("value");
                const data = snap.val() || {};

                if (Object.keys(data).length === 0) {
                  tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-slate-500">Belum ada user.</td></tr>`;
                  return;
                }

                const rows = Object.entries(data)
                  .map(
                    ([uid, user]) => `
                  <tr class="hover:bg-slate-50">
                    <td class="px-3 py-2 font-medium">${uid}</td>
                    <td class="px-3 py-2">${user.nama || "-"}</td>
                    <td class="px-3 py-2">••••••</td>
                    <td class="px-3 py-2 text-slate-600 capitalize">${user.roles || "user"}</td>
                    <td class="px-3 py-2 text-center space-x-2">
                      <button class="btnEditUser bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded text-xs" data-uid="${uid}">
                        <i class='fa fa-edit'></i> Edit
                      </button>
                      <button class="btnHapusUser bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs" data-uid="${uid}">
                        <i class='fa fa-trash'></i>
                      </button>
                    </td>
                  </tr>`
                  )
                  .join("");

                tbody.innerHTML = rows;

              } catch (err) {
                console.error("Gagal memuat user:", err);
                tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-red-500">Gagal memuat data.</td></tr>`;
              }
            }

            // === 🧩 Event Delegation untuk tombol Edit & Hapus ===
            document.getElementById("tabelUserBody").addEventListener("click", async (e) => {
              const editBtn = e.target.closest(".btnEditUser");
              const delBtn = e.target.closest(".btnHapusUser");

              if (editBtn) {
                const uid = editBtn.getAttribute("data-uid");
                editUser(uid);
              }

              if (delBtn) {
                const uid = delBtn.getAttribute("data-uid");
                hapusUser(uid);
              }
            });



            // === 🧩 Tambah User Baru ===
            document.getElementById("btnTambahUser").addEventListener("click", () => {
              document.getElementById("userModalTitle").textContent = "Tambah User Baru";
              document.getElementById("userIdInput").value = "";
              document.getElementById("userNamaInput").value = "";
              document.getElementById("userPasswordInput").value = "";
              document.getElementById("userRoleInput").value = "user";
              document.getElementById("userModal").classList.remove("hidden");
            });

            document.getElementById("btnBatalUser").addEventListener("click", () => {
              document.getElementById("userModal").classList.add("hidden");
            });

            document.getElementById("btnSimpanUser").addEventListener("click", async () => {
              const uid = document.getElementById("userIdInput").value.trim();
              const nama = document.getElementById("userNamaInput").value.trim();
              const pass = document.getElementById("userPasswordInput").value.trim();
              const role = document.getElementById("userRoleInput").value;
              const isEditMode = document.getElementById("userIdInput").disabled; // true kalau sedang edit

              if (!uid || !nama || !pass) return alert("Lengkapi semua kolom!");

              try {
                if (!isEditMode) {
                  // === MODE TAMBAH ===
                  const snap = await db.ref("petugas/" + uid).once("value");
                  const existing = snap.val();

                  if (existing) {
                    const konfirmasi = confirm(
                      `⚠️ User dengan ID "${uid}" sudah ada.\nApakah kamu ingin menimpa (update) data lama ini?`
                    );
                    if (!konfirmasi) {
                      alert("❎ Aksi dibatalkan, data lama tetap aman.");
                      return;
                    }
                  }
                }

                // === Simpan data baru atau update (edit) ===
                await db.ref("petugas/" + uid).set({
                  nama: nama,
                  password: pass,
                  roles: role,
                });

                alert(isEditMode ? "✅ Data user berhasil diperbarui!" : "✅ User baru berhasil ditambahkan!");
                document.getElementById("userModal").classList.add("hidden");
                document.getElementById("userIdInput").disabled = false;
                loadUserList();
              } catch (err) {
                console.error("❌ Gagal menyimpan data:", err);
                alert("Terjadi kesalahan saat menyimpan data user.");
              }
            });




            // === 🧩 Edit User ===
            async function editUser(uid) {
              try {
                const snap = await db.ref("petugas/" + uid).once("value");
                const data = snap.val();
                if (!data) return alert("Data user tidak ditemukan.");

                document.getElementById("userModalTitle").textContent = "Edit User";
                document.getElementById("userIdInput").value = uid;
                document.getElementById("userIdInput").disabled = false;
                document.getElementById("userNamaInput").value = data.nama || "";
                document.getElementById("userPasswordInput").value = data.password || "";
                document.getElementById("userRoleInput").value = data.roles || "user";

                document.getElementById("userModal").classList.remove("hidden");
              } catch (err) {
                console.error(err);
                alert("Terjadi kesalahan saat memuat data user.");
              }
            }


            // === 🧩 Hapus User ===
            async function hapusUser(uid) {
              if (!confirm(`Yakin ingin menghapus user '${uid}'?`)) return;
              try {
                await db.ref("petugas/" + uid).remove();
                alert("🗑️ User berhasil dihapus!");
                loadUserList();
              } catch (err) {
                console.error("Gagal hapus user:", err);
                alert("Gagal menghapus user, cek console.");
              }
            }






            // Mengubah default state sidebar menjadi collapsed (kecil)
            // Baca preferensi dari localStorage: default collapsed = true (seperti sebelumnya)
            const storedSidebar = localStorage.getItem('sidebarCollapsed');
            const isSidebarCollapsed = storedSidebar === null ? true : (storedSidebar === 'true');
            setSidebarState(isSidebarCollapsed);
            showLoading(false);
            // === 🔐 PROFIL PETUGAS ===
            // Klik nama/avatar -> buka profil
            document.getElementById("userInfo").addEventListener("click", () => {
                const username = localStorage.getItem("username");
                const nama = localStorage.getItem("namaPetugas");
                if (!username || !nama) return alert("Sesi login tidak ditemukan.");
                profilNama.value = nama;
                profilUsername.value = username;
                profilPassword.value = "";
                profilModal.classList.remove("hidden");
            });
            // Tutup modal profil
            btnTutupProfil.addEventListener("click", () => {
                profilModal.classList.add("hidden");
            });
            // Simpan perubahan username / password
            btnSimpanProfil.addEventListener("click", async () => {
                const currentUsername = localStorage.getItem("username");
                const newUsername = profilUsername.value.trim();
                const newPassword = profilPassword.value.trim();
                const namaPetugas = profilNama.value.trim();
                if (!currentUsername || !namaPetugas) {
                    alert("Data login tidak valid.");
                    return;
                }
                showLoading(true);
                try {
                    const petugasRef = db.ref("petugas");
                    const snapshot = await petugasRef.once("value");
                    const data = snapshot.val() || {};
                    if (!data[currentUsername]) {
                        showLoading(false);
                        alert("Data akun tidak ditemukan di Firebase!");
                        return;
                    }
                    const userData = data[currentUsername];
                    const updatedData = {
                        nama: namaPetugas,
                        password: newPassword ? newPassword : userData.password || "",
                    };
                    // === Jika username berubah ===
                    if (newUsername !== currentUsername) {
                        // Cek apakah username baru sudah ada
                        if (data[newUsername]) {
                            showLoading(false);
                            alert("Username baru sudah digunakan oleh petugas lain.");
                            return;
                        }
                        // Buat akun baru dengan data baru
                        await db.ref("petugas/" + newUsername).set(updatedData);
                        // Hapus akun lama
                        await db.ref("petugas/" + currentUsername).remove();
                        // Update localStorage
                        localStorage.setItem("username", newUsername);
                        localStorage.setItem("namaPetugas", namaPetugas);
                        alert("✅ Username dan password berhasil diperbarui!");
                    } else {
                        // Username sama → hanya update password/nama
                        await db.ref("petugas/" + currentUsername).update(updatedData);
                        localStorage.setItem("namaPetugas", namaPetugas);
                        alert("✅ Profil berhasil diperbarui!");
                    }
                    // Tutup modal
                    profilModal.classList.add("hidden");
                } catch (err) {
                    console.error("Gagal update profil:", err);
                    alert("Terjadi kesalahan saat menyimpan profil: " + err.message);
                }
                showLoading(false);
            });
            // Logout langsung dari modal
            btnLogoutProfil.addEventListener("click", () => {
                localStorage.removeItem("username");
                localStorage.removeItem("namaPetugas");
                profilModal.classList.add("hidden");
                appSection.classList.add("hidden");
                loginSection.classList.remove("hidden");
            });
            // === DATA MPP (MIRIP PERSIS DENGAN DATA ANTREAN) ===
            const menuDataMPP = document.getElementById("menuDataMPP");
            const dataMPPContent = document.getElementById("dataMPPContent");
            const tabelMPPBody = document.getElementById("tabelMPPBody");
            const filterTanggalMPP = document.getElementById("filterTanggalMPP");
            const btnTambahMPP = document.getElementById("btnTambahMPP");
            const refreshSpinnerMPP = document.getElementById("refreshSpinnerMPP");
            const lastUpdateTimeMPP = document.getElementById("lastUpdateTimeMPP");

            function loadDataMPP() {
                listenMPPRealtime();
                refreshSpinnerMPP.classList.add("hidden");
                isActionInProgress = false;
            }

            function renderMPPTable(rows) {
                tabelMPPBody.innerHTML = "";
                if (Array.isArray(rows) && rows.length > 0) {
                    rows.forEach((r) => {
                        // jika antrean sedang diproses
                        if (pendingNo && r.no === pendingNo) {
                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm font-medium text-gray-900">${r.no}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nama}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nik || '-'}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.hp || '-'}</td>
                  <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.email || '-'}</td>
                  <td class="px-4 py-3 text-left text-sm text-gray-900">${r.keperluan}</td>
                  <td colspan="2" class="px-4 py-3 text-center text-sm font-medium text-gray-900">
                    <div class="flex items-center justify-center gap-2 text-blue-600 animate-pulse">
                      <i class="fa-solid fa-spinner fa-spin"></i>
                      <span class="italic">Sedang memperbarui status antrean...</span>
                    </div>
                  </td>
                `;
                            tabelMPPBody.appendChild(tr);
                            return;
                        }
                        const tr = document.createElement("tr");
                        tr.className = "hover:bg-slate-50";
                        const panggilBtn = document.createElement("button");
                        panggilBtn.className =
                            r.status === "Belum Dipanggil" ?
                            "bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-3 rounded" :
                            "bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-bold py-1 px-3 rounded";
                        panggilBtn.textContent = r.status === "Belum Dipanggil" ? "Panggil" : "Batal";
                        panggilBtn.onclick = (event) =>
                            toggleStatusMPP(r.no, r.status === "Belum Dipanggil" ? "Dipanggil" : "Belum Dipanggil", event);
                        const ketBtn = document.createElement("button");
                        ketBtn.className = "bg-slate-500 hover:bg-slate-600 text-white text-xs font-bold py-1 px-3 rounded";
                        ketBtn.textContent = "Ket";
                        ketBtn.onclick = () => bukaKetMPP(r.no, r.ket);
                        const infoBtn = document.createElement("button");
                        infoBtn.className = "bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold py-1 px-3 rounded";
                        infoBtn.textContent = "Info";
                        infoBtn.onclick = () => bukaInfoMPP(r.no);
                        tr.innerHTML = `
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm font-medium text-gray-900">${r.no}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nama}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.nik || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.hp || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-left text-sm text-gray-900">${r.email || '-'}</td>
                <td class="px-4 py-3 text-left text-sm text-gray-900">${r.keperluan}</td>
                <td class="px-4 py-3 text-left text-sm text-gray-900">${r.ket || '-'}</td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2"></td>
              `;
                        const aksiCell = tr.querySelector("td:last-child");
                        aksiCell.appendChild(panggilBtn);
                        aksiCell.appendChild(ketBtn);
                        aksiCell.appendChild(infoBtn);
                        tabelMPPBody.appendChild(tr);
                    });
                } else {
                    tabelMPPBody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-slate-900">Tidak ada data untuk tanggal yang dipilih.</td></tr>`;
                }
                showLoading(false);
                refreshSpinnerMPP.classList.add("hidden");
                const now = new Date();
                lastUpdateTimeMPP.textContent = `Diperbarui: ${now.toLocaleTimeString("id-ID")}`;
                isActionInProgress = false;
                showRealtimeNotif();
                renderMPPCards(rows);
            }
            // === Versi Mobile: Render kartu data MPP ===
            function renderMPPCards(rows) {
                const container = document.getElementById("mppCards");
                if (!container) return;
                container.innerHTML = "";
                if (!rows || rows.length === 0) {
                    container.innerHTML = `<p class="text-center text-slate-500 italic">Tidak ada data MPP.</p>`;
                    return;
                }
                rows.forEach(r => {
                    const card = document.createElement("div");
                    card.className = "data-card";
                    card.innerHTML = `
              <div class="data-card-header">
                <span class="text-indigo-600 font-semibold">${r.nama}</span>
                <span>No. ${r.no}</span>
              </div>
              <div class="data-card-body">
                <p><strong>Keperluan:</strong> ${r.keperluan || '-'}</p>
              </div>
              <div class="data-card-actions">
                <button class="${r.status === 'Belum Dipanggil' ? 'bg-blue-600 text-white' : 'bg-yellow-500 text-white'}" data-action="panggil">${r.status === 'Belum Dipanggil' ? 'Panggil' : 'Batal'}</button>
                <button class="bg-gray-200 text-slate-800" data-action="info">Info</button>
              </div>
            `;
                    // === Tombol aksi ===
                    card.querySelector('[data-action="panggil"]').addEventListener("click", (e) => {
                        toggleStatusMPP(r.no, r.status === 'Belum Dipanggil' ? 'Dipanggil' : 'Belum Dipanggil', e);
                    });
                    card.querySelector('[data-action="info"]').addEventListener("click", () => {
                        bukaInfoMPP(r.no);
                    });
                    container.appendChild(card);
                });
            }

            function toggleStatusMPP(no, status, event) {
                isActionInProgress = true;
                pendingNo = no;
                const aksiCell = event.target.parentElement;
                aksiCell.querySelectorAll("button").forEach((btn) => (btn.disabled = true));
                const spinner = document.createElement("i");
                spinner.className = "fa-solid fa-spinner fa-spin text-blue-500 mr-2";
                aksiCell.prepend(spinner);
                const petugas = localStorage.getItem("namaPetugas") || "-";
                google.script.run
                    .withSuccessHandler(() => {
                        pendingNo = null;
                        isActionInProgress = false;
                        loadDataMPP(false);
                        showRealtimeNotif();
                    })
                    .withFailureHandler((error) => {
                        console.error("Gagal ubah status:", error);
                        pendingNo = null;
                        isActionInProgress = false;
                        loadDataMPP(false);
                    })
                    .toggleStatusWithPetugasMPP(no, status, petugas);
            }

            function bukaKetMPP(no, isi) {
                selectedNo = no;
                ketInput.value = isi || "";
                ketModal.classList.remove("hidden");
                btnSimpanKet.onclick = () => {
                    isActionInProgress = true;
                    showLoading(true);
                    const namaPetugas = localStorage.getItem("namaPetugas") || "-";
                    google.script.run.withSuccessHandler(() => {
                        ketModal.classList.add("hidden");
                        loadDataMPP(true);
                    }).updateKeteranganWithPetugasMPP(selectedNo, ketInput.value.trim(), namaPetugas);
                };
            }
            // 🟢 Buat global function agar dikenali tombol Info di tabel
            window.bukaInfoMPP = function(noAntrean) {
                const key = noAntrean.replace(/\//g, "_");
                showLoading(true);
                db.ref("data_mpp/" + key).once("value").then((snapshot) => {
                    showLoading(false);
                    const data = snapshot.val();
                    if (!data) {
                        alert("Data tidak ditemukan di Firebase.");
                        return;
                    }
                    // 🧩 isi semua field modal Info (sama seperti Data Antrean)
                    document.getElementById("infoTimestamp").value = data.Timestamps || "-";
                    document.getElementById("infoNo").value = data.No_Antrean || "-";
                    document.getElementById("infoStatus").value = data.Status || "-";
                    document.getElementById("infoNama").value = data.Nama || "";
                    document.getElementById("infoNik").value = data.NIK_NPWP || "";
                    document.getElementById("infoHP").value = data.No_HP_WA || "";
                    document.getElementById("infoEmail").value = data.Email || "";
                    document.getElementById("infoKeperluan").value = data.Keperluan || "";
                    document.getElementById("infoKeterangan").value = data.Keterangan || "";
                    document.getElementById("infoPetugas").value = data.Petugas || "-";
                    // 🔹 tampilkan modal Info
                    document.getElementById("infoModal").classList.remove("hidden");
                }).catch((err) => {
                    showLoading(false);
                    console.error("Gagal ambil data MPP:", err);
                    alert("Terjadi kesalahan saat mengambil data.");
                });
            };
            filterTanggalMPP.addEventListener("change", () => loadDataMPP(true));
            btnTambahMPP.addEventListener("click", () => {
                document.getElementById("tambahNama").value = "";
                document.getElementById("tambahNik").value = "";
                document.getElementById("tambahHP").value = "";
                document.getElementById("tambahEmail").value = "";
                document.getElementById("tambahKeperluan").value = "";
                tambahKeperluanLainnyaDiv.classList.add("hidden");
                tambahModal.classList.remove("hidden");
                // 🧹 Hapus event listener lama secara aman
                const newBtn = document.getElementById("btnSimpanTambah");
                const clonedBtn = newBtn.cloneNode(true);
                newBtn.parentNode.replaceChild(clonedBtn, newBtn);
                // Tambahkan hanya SATU event click baru
                clonedBtn.addEventListener("click", async () => {
                    const now = new Date();
                    const tanggalStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
                    const waktuStr = `${now.getHours().toString().padStart(2, "0")}.${now.getMinutes().toString().padStart(2, "0")}.${now.getSeconds().toString().padStart(2, "0")}`;
                    const timestampFormat = `${tanggalStr} ${waktuStr}`;

                    const nama = document.getElementById("tambahNama").value.trim().toUpperCase();
                    const nik = document.getElementById("tambahNik").value.trim();
                    const hp = document.getElementById("tambahHP").value.trim();
                    const email = document.getElementById("tambahEmail").value.trim();
                    let keperluan = document.getElementById("tambahKeperluan").value.trim().toUpperCase();

                    // Kalau pilih Lainnya, ambil dari input tambahan
                    if (keperluan === 'LAINNYA' || keperluan === 'LAINNYA.') {
                      const elLainnya = document.getElementById('tambahKeperluanLainnya');
                      const isi = elLainnya ? elLainnya.value.trim() : "";
                      if (isi === "") {
                        alert("Mohon sebutkan keperluan lainnya.");
                        return; // batalkan simpan
                      }
                      keperluan = isi.toUpperCase();
                    }
                    if (!nama || !keperluan) return alert("Nama dan Keperluan wajib diisi.");
                    const tanggal = new Date();
                    // const tanggalStr = tanggal.toLocaleDateString("id-ID");
                    const tanggalKey = tanggalStr.replaceAll("/", "_");
                    // --- GANTI: gunakan counter_mpp transaction agar nomor aman dan persistent ---
                    const counterRef = db.ref("counter_mpp/" + tanggalKey);
                    const counterResult = await counterRef.transaction((current) => (current || 0) + 1);
                    const nextNumber = counterResult.snapshot.val() || 1;
                    const noAntrean = `M${String(nextNumber).padStart(3, "0")}-${tanggalKey}`;
                    // --- Selesai ganti ---

                    

                    const payload = {
                        Timestamps: timestampFormat,
                        No_Antrean: noAntrean.replace(/_/g, "/"),
                        Nama: nama,
                        NIK_NPWP: nik,
                        No_HP_WA: hp,
                        Email: email,
                        Keperluan: keperluan,
                        Status: "Belum Dipanggil",
                        Petugas: localStorage.getItem("namaPetugas") || "-",
                        Tanggal_Antrean: tanggalStr
                    };
                    // Simpan langsung ke Firebase (tanpa Apps Script)
                    const keySafe = noAntrean.replace(/\//g, "_");
                    await db.ref("data_mpp/" + keySafe).set(payload);
                    // Tutup modal & tampilkan sukses
                    tambahModal.classList.add("hidden");
                    //suksesMessage.textContent = `Antrean MPP berhasil ditambahkan dengan nomor: ${noAntrean}`;
                    //suksesModal.classList.remove("hidden");
                    // 🔁 Realtime update akan otomatis muncul via listener
                    showLoading(false);
                });
            });
            menuDataMPP.addEventListener("click", (e) => {
                e.preventDefault();
                Object.values(contentSections).forEach((section) => section.classList.add("hidden"));
                Object.values(menuItems).forEach((menu) => menu.classList.remove("active"));
                dataMPPContent.classList.remove("hidden");
                menuDataMPP.classList.add("active");
                activePage = "dataMPP";
                listenMPPRealtime();
                showLoading(false);
            });
            // === 🔔 Efek Notifikasi Realtime ===
            function showRealtimeNotif() {
                const notif = document.getElementById("realtimeNotif");
                notif.classList.remove("hidden");
                notif.style.animation = "fadeInOut 3s ease-in-out";
                notif.style.opacity = "1";
                // otomatis hilang setelah 3 detik
                setTimeout(() => {
                    notif.style.opacity = "0";
                    setTimeout(() => {
                        notif.classList.add("hidden");
                        notif.style.animation = "";
                    }, 500);
                }, 3000);
            }

            function setTodayDatePetugas() {
                const today = new Date().toISOString().split("T")[0];
                const inputs = [
                    document.getElementById("filterTanggalDashboard"),
                    document.getElementById("filterTanggalTabel"),
                    document.getElementById("filterTanggalMPP"),
                ];
                inputs.forEach(i => {
                    if (i) i.value = today;
                });
            }
            // ✅ Tambahkan realtimeNotif DI DALAM body sebelum script ditutup
            const notifDiv = document.createElement('div');
            notifDiv.id = "realtimeNotif";
            notifDiv.className = "hidden fixed bottom-3 right-4 bg-blue-600 text-white py-2 px-4 rounded-full shadow-lg";
            notifDiv.textContent = "🔁 Data diperbarui beberapa detik lalu";
            document.body.appendChild(notifDiv);
            // 🔄 Tampilkan banner pengumuman aktif saat halaman pertama kali dimuat
            updateRunningText();
            
        });
        
        /* =========================
          TINDAK LANJUT — Firebase-only
          Tempel di bawah: const db = firebase.database();
          ========================= */

        /** Helper: buat No_Antrean TL otomatis (TL001-DD/MM/YYYY) */
        /* Menggunakan counter harian di /tindak_lanjut_counter/<tanggalKey> */
        async function generateTLNo() {
          const now = new Date();
          const tanggalHariIni = now.toLocaleDateString('id-ID'); // "04/11/2025"
          const tanggalKey = tanggalHariIni.replace(/\//g, "_"); // "04_11_2025"
          const counterRef = db.ref("tindak_lanjut_counter/" + tanggalKey);

          try {
            // transaction untuk aman dari race condition
            const result = await counterRef.transaction((current) => (current || 0) + 1);
            const next = result.snapshot.val() || 1;
            const formatted = next.toString().padStart(3, "0"); // 001, 002, ...
            const no = `TL${formatted}-${tanggalHariIni}`;
            return { no, tanggalHariIni };
          } catch (err) {
            console.error("generateTLNo error:", err);
            throw err;
          }
        }

        /** Simpan tindak lanjut ke Firebase */
        async function saveTindakToFirebase(payload) {
          // key safe (ganti / ke _)
          const keySafe = payload.No_Antrean.replace(/\//g, "_");
          await db.ref("tindak_lanjut/" + keySafe).set(payload);
        }

        /** Update tindak lanjut (partial) */
        async function updateTindakFirebase(noAntrean, updates) {
          const keySafe = noAntrean.replace(/\//g, "_");
          await db.ref("tindak_lanjut/" + keySafe).update(updates);
        }

        /** Hapus tindak lanjut */
        async function deleteTindakFirebase(noAntrean) {
          const keySafe = noAntrean.replace(/\//g, "_");
          await db.ref("tindak_lanjut/" + keySafe).remove();
        }

        /** Ambil data sumber (data_antrean atau data_mpp) berdasarkan No_Antrean */
        async function fetchSourceByNo(noAntreanRaw) {
          // normalisasi cari: key di data_antrean/storage pakai _ untuk "/"
          const key = noAntreanRaw.replace(/\//g, "_");
          // cek data_antrean
          const snapA = await db.ref("data_antrean/" + key).get();
          if (snapA.exists()) return snapA.val();
          // cek data_mpp
          const snapM = await db.ref("data_mpp/" + key).get();
          if (snapM.exists()) return snapM.val();
          return null;
        }

        /** Listener realtime: baca semua /tindak_lanjut/ dan render ke #tindakCardsContainer */
        function listenTindakLanjutRealtime(namaPetugasFilter = null, showRiwayat = false) {
          const ref = db.ref("tindak_lanjut");
          ref.off(); // pastikan tidak double listener
          const loadingEl = document.getElementById("tindakLoading");
          if (loadingEl) loadingEl.classList.remove("hidden");

          ref.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            let arr = Object.keys(data).map(k => data[k]);

            // 🔹 Filter sesuai petugas login
            const petugasLogin = localStorage.getItem("namaPetugas") || "-";
            arr = arr.filter(a => (a.Petugas || "-") === petugasLogin);

            // 🔹 Pisahkan logika Riwayat dan Data aktif
            if (showRiwayat) {
              // hanya tampilkan yang sudah selesai
              arr = arr.filter(a => (a.Status || "").toLowerCase() === "selesai");
            } else {
              // tampilkan hanya yang belum selesai
              arr = arr.filter(a => {
                const status = (a.Status || "Belum Ditindaklanjuti").toLowerCase();
                return status === "belum ditindaklanjuti" || status === "menunggu proses";
              });
            }

            // 🔹 Urutkan berdasarkan Urgensi & Status
            const urgensiOrder = { "Sangat Penting": 1, "Penting": 2, "Biasa": 3 };
            const statusOrder = { "Belum Ditindaklanjuti": 1, "Menunggu Proses": 2, "Selesai": 3 };

            arr.sort((a, b) => {
              const ua = urgensiOrder[a.Urgensi || "Penting"] || 999;
              const ub = urgensiOrder[b.Urgensi || "Penting"] || 999;
              if (ua !== ub) return ua - ub;

              const sa = statusOrder[a.Status || "Belum Ditindaklanjuti"] || 999;
              const sb = statusOrder[b.Status || "Belum Ditindaklanjuti"] || 999;
              return sa - sb;
            });

            renderTindakCards(arr);
            if (loadingEl) loadingEl.classList.add("hidden");
          }, (err) => {
            console.error("Gagal listen tindak_lanjut:", err);
            if (loadingEl) loadingEl.classList.add("hidden");
          });
        }



       
        /** Render card untuk Tindak Lanjut (dipisah per status) */
        function renderTindakCards(items) {
          const container = document.getElementById("tindakCardsContainer");
          if (!container) return;
          container.innerHTML = "";

          if (!Array.isArray(items) || items.length === 0) {
            container.innerHTML = document.getElementById("emptyTindak")
              ? document.getElementById("emptyTindak").outerHTML
              : '<div class="col-span-full text-center py-8 text-slate-500 italic">Belum ada data tindak lanjut.</div>';
            return;
          }

          // cek apakah ini mode RIWAYAT (semua Selesai)
          const hanyaSelesai = items.every(i => (i.Status || "").toLowerCase() === "selesai");

          if (hanyaSelesai) {
            // gunakan tampilan asli (flat)
            items.sort((a, b) => {
              const ta = new Date(a.Timestamps || 0).getTime() || 0;
              const tb = new Date(b.Timestamps || 0).getTime() || 0;
              return tb - ta;
            });

            container.innerHTML = items
              .map(item => {
                const urgensi = item.Urgensi || "Penting";
                const status = item.Status || "Belum Ditindaklanjuti";
                const proses = item.Proses || "-";

                return `
                  <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition">
                    <div class="flex justify-between items-start mb-2">
                      <div>
                        <div class="text-sm text-slate-500">${item.Timestamps || ""}</div>
                        <h3 class="text-lg font-semibold text-slate-800">${item.Nama || '-'}</h3>
                        <div class="text-sm text-slate-600 mt-1">
                          No: <span class="font-medium text-blue-600">${item.No_Antrean}</span>
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-1">
                        <span class="px-3 py-1 text-xs font-semibold rounded-full ${
                          urgensi === "Sangat Penting"
                            ? "bg-red-100 text-red-700"
                            : urgensi === "Biasa"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-100 text-yellow-700"
                        }">${urgensi}</span>

                        <span class="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                          ${status}
                        </span>
                      </div>
                    </div>

                    <div class="text-sm text-slate-700 mt-2">
                      <p><strong>Keperluan:</strong> ${item.Keperluan || '-'}</p>
                      <p><strong>Proses:</strong> ${proses}</p>
                      <p class="text-slate-500 mt-1"><strong>Petugas:</strong> ${item.Petugas || '-'}</p>
                    </div>

                    <div class="mt-3 flex justify-end gap-2">
                      <button class="btn-editTindak bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1 px-3 rounded"
                        data-no="${item.No_Antrean}">
                        <i class="fa fa-edit mr-1"></i> Detail
                      </button>
                    </div>
                  </div>`;
              })
              .join("");

          } else {
            // === MODE AKTIF: dipisah Belum / Menunggu ===
            const belum = items.filter(i => (i.Status || "").toLowerCase() === "belum ditindaklanjuti");
            const menunggu = items.filter(i => (i.Status || "").toLowerCase() === "menunggu proses");

            const renderList = (list) => list
              .map(item => {
                const urgensi = item.Urgensi || "Penting";
                const status = item.Status || "Belum Ditindaklanjuti";
                const proses = item.Proses || "-";
                return `
                <div class="bg-white p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition">
                  <div class="flex justify-between items-start mb-2">
                    <div>
                      <div class="text-sm text-slate-500">${item.Timestamps || ""}</div>
                      <h3 class="text-lg font-semibold text-slate-800">${item.Nama || '-'}</h3>
                      <div class="text-sm text-slate-600 mt-1">
                        No: <span class="font-medium text-blue-600">${item.No_Antrean}</span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1">
                      <span class="px-3 py-1 text-xs font-semibold rounded-full ${
                        urgensi === "Sangat Penting"
                          ? "bg-red-100 text-red-700"
                          : urgensi === "Biasa"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-yellow-100 text-yellow-700"
                      }">${urgensi}</span>

                      <span class="px-3 py-1 text-xs font-semibold rounded-full ${
                        status === "Menunggu Proses"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                      }">${status}</span>
                    </div>
                  </div>

                  <div class="text-sm text-slate-700 mt-2">
                    <p><strong>Keperluan:</strong> ${item.Keperluan || '-'}</p>
                    <p><strong>Proses:</strong> ${proses}</p>
                    <p class="text-slate-500 mt-1"><strong>Petugas:</strong> ${item.Petugas || '-'}</p>
                  </div>

                  <div class="mt-3 flex justify-end gap-2">
                    <button class="btn-editTindak bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1 px-3 rounded"
                      data-no="${item.No_Antrean}">
                      <i class="fa fa-edit mr-1"></i> Detail
                    </button>
                  </div>
                </div>`;
              })
              .join("");

            container.innerHTML = `
              <div class="col-span-full">
                <h2 class="font-bold text-lg text-slate-800 mb-2">Belum Ditindaklanjuti</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  ${belum.length ? renderList(belum) : `<div class="col-span-full text-slate-500 italic">Tidak ada.</div>`}
                </div>
              </div>

              <div class="col-span-full">
                <h2 class="font-bold text-lg text-slate-800 mb-2">Menunggu Proses</h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${menunggu.length ? renderList(menunggu) : `<div class="col-span-full text-slate-500 italic">Tidak ada.</div>`}
                </div>
              </div>
            `;
          }

          // Re-bind button Detail
          container.querySelectorAll(".btn-editTindak").forEach(btn => {
            btn.addEventListener("click", async () => {
              const no = btn.dataset.no;
              const key = no.replace(/\//g, "_");
              const snap = await db.ref("tindak_lanjut/" + key).get();
              if (!snap.exists()) return alert("Data tidak ditemukan.");
              const data = snap.val();

              document.getElementById("dt_timestamps").textContent = data.Timestamps || "";
              document.getElementById("dt_no").textContent = data.No_Antrean || "";
              document.getElementById("dt_nama").value = data.Nama || "";
              document.getElementById("dt_nik").value = data.NIK_NPWP || "";
              document.getElementById("dt_hp").value = data.No_HP_WA || "";
              document.getElementById("dt_email").value = data.Email || "";
              document.getElementById("dt_keperluan").value = data.Keperluan || "";
              document.getElementById("dt_ket").value = data.Ket || "";
              document.getElementById("dt_petugas").textContent = data.Petugas || "-";
              document.getElementById("dt_proses").value = data.Proses || "";
              document.getElementById("dt_urgensi").value = data.Urgensi || "Penting";
              document.getElementById("dt_statusTindak").value = data.Status || "Belum Ditindaklanjuti";

              document.getElementById("detailTindakModal").classList.remove("hidden");
            });
          });
        }




        // Event handler untuk modal Tambah Tindak Lanjut
        const btnKonfirmTambah = document.getElementById("btnKonfirmTambah");
        if (btnKonfirmTambah) {
          btnKonfirmTambah.addEventListener("click", async () => {
            try {
              const jenis = document.getElementById("pilihJenisTambah").value;
              const inputNo = document.getElementById("inputNoAntreanTindak").value.trim();

              // jika ambil dari antrean/MPP
              if (jenis === "antrean") {
                if (!inputNo) return alert("Masukkan Nomor Antrean terlebih dahulu (contoh: 001-04/11/2025)");
                const sumber = await fetchSourceByNo(inputNo);
                if (!sumber) return alert("Nomor antrean tidak ditemukan di data_antrean maupun data_mpp.");

                // format payload sesuai struktur asli
                const now = new Date();
                const tanggalHariIni = now.toLocaleDateString('id-ID');
                const payload = {
                  Timestamps: new Date().toLocaleString('id-ID'),
                  No_Antrean: sumber.No_Antrean || inputNo, // 🔹 gunakan nomor asli
                  Nama: (sumber.Nama || sumber.nama || "-").toString().toUpperCase(),
                  NIK_NPWP: sumber.NIK_NPWP || sumber.nik || "",
                  No_HP_WA: sumber.No_HP_WA || sumber.hp || "",
                  Email: sumber.Email || sumber.email || "",
                  Keperluan: (sumber.Keperluan || sumber.keperluan || "-").toString().toUpperCase(),
                  Status: "Belum Ditindaklanjuti",
                  Petugas: localStorage.getItem("namaPetugas") || "-",
                  Tanggal_Antrean: sumber.Tanggal_Antrean || tanggalHariIni,
                  Ket: ""
                };

                await saveTindakToFirebase(payload);
                alert("Tindak lanjut berhasil ditambahkan dari sumber antrean/MPP: " + payload.No_Antrean);
                document.getElementById("tambahTindakModal").classList.add("hidden");
              } else {
                // Rekam manual
                const nama = document.getElementById("manNama").value.trim();
                const nik = document.getElementById("manNik").value.trim();
                const hp = document.getElementById("manHP").value.trim();
                const email = document.getElementById("manEmail").value.trim();
                let keperluan = document.getElementById("manKeperluan").value.trim();
                const ket = document.getElementById("manKet").value.trim() || "";
                const proses = document.getElementById("manProses").value.trim() || ""; // ✅ letakkan sebelum payload
                // validasi dasar
                if (!nama || !keperluan) return alert("Nama dan Keperluan wajib diisi.");
                // buat nomor TL
                const tl = await generateTLNo();
                const payload = {
                  Timestamps: new Date().toLocaleString('id-ID'),
                  No_Antrean: tl.no,
                  Nama: nama.toUpperCase(),
                  NIK_NPWP: nik,
                  No_HP_WA: hp,
                  Email: email,
                  Keperluan: keperluan.toUpperCase(),
                  Status: "Belum Ditindaklanjuti",
                  Petugas: localStorage.getItem("namaPetugas") || "-",
                  Tanggal_Antrean: tl.tanggalHariIni,
                  Ket: ket,
                  Proses: proses // ✅ tambahkan ini biar ikut tersimpan
                };
                await saveTindakToFirebase(payload);
                alert("Tindak lanjut manual berhasil ditambahkan: " + payload.No_Antrean);
                document.getElementById("tambahTindakModal").classList.add("hidden");
              }
            } catch (err) {
              console.error("Gagal tambah tindak:", err);
              alert("Gagal menyimpan tindak lanjut: " + err.message);
            }
          });
        }

        



        // 🔹 Tombol Riwayat: tampilkan hanya data dengan status "Selesai"
        const btnRiwayatTindak = document.getElementById("btnRiwayatTindak");
        if (btnRiwayatTindak) {
          let showingRiwayat = false;
          btnRiwayatTindak.addEventListener("click", () => {
            const namaPetugas = localStorage.getItem("namaPetugas") || "-";
            showingRiwayat = !showingRiwayat;
            listenTindakLanjutRealtime(namaPetugas, showingRiwayat);
            btnRiwayatTindak.innerHTML = showingRiwayat
              ? '<i class="fa-solid fa-arrow-left mr-2"></i>Kembali'
              : '<i class="fa-solid fa-history mr-2"></i>Riwayat';
            document.getElementById("labelTampilTindak").textContent = showingRiwayat
              ? "Menampilkan: Riwayat (Status Selesai)"
              : "Menampilkan: Belum Ditindaklanjuti & Menunggu Proses";
          });
        }


        // === Perbaikan robust: reset semua instance modal Tambah Tindak Lanjut ===
        // Cari dan ganti blok lama yang menggunakan getElementById("btnTambahTindak") / getElementById("pilihJenisTambah")
        // dengan blok ini.

        function resetAllTambahTindakForms() {
          // Reset semua select "pilihJenisTambah" (kalau ada duplikat)
          document.querySelectorAll('#pilihJenisTambah').forEach(sel => {
            sel.value = 'antrean';
          });

          // Sembunyikan semua form manual (kalau ada duplikat)
          document.querySelectorAll('#formManual').forEach(fm => {
            fm.classList.add('hidden');
          });

          // Tampilkan semua form AmbilAntrean kalau ada (safety)
          document.querySelectorAll('#formAmbilAntrean').forEach(fa => {
            fa.classList.remove('hidden');
          });

          // Kosongkan semua input nomor antrean pada modal
          document.querySelectorAll('#inputNoAntreanTindak').forEach(inp => {
            inp.value = '';
          });

          // Kosongkan semua input manual (nama, nik, hp, email, keperluan, ket, proses) di semua instance
          const manualFields = ['manNama','manNik','manHP','manEmail','manKeperluan','manKet','manProses'];
          manualFields.forEach(id => {
            document.querySelectorAll(`#${id}`).forEach(el => el.value = '');
          });
        }

        // Gunakan querySelectorAll untuk memastikan semua instance mendapat event handler
        document.querySelectorAll('#btnTambahTindak').forEach(btn => {
          btn.addEventListener('click', () => {
            resetAllTambahTindakForms();
            // Tampilkan (bila ada) modal yang relevan — kalau ada beberapa modal, tunjukkan yang pertama ditemukan
            const modal = document.querySelector('#tambahTindakModal');
            if (modal) modal.classList.remove('hidden');
          });
        });

        // Pasang event listener "change" pada semua select pilihJenisTambah (jika ada lebih dari 1)
        document.querySelectorAll('#pilihJenisTambah').forEach(sel => {
          sel.addEventListener('change', (ev) => {
            const currentValue = ev.target.value;
            // temukan container modal relatif ke select (jika ada), supaya hanya mempengaruhi instance yang sama
            const root = ev.target.closest('.modal-container') || document;
            const formManual = root.querySelector('#formManual');
            const formAmbil = root.querySelector('#formAmbilAntrean');

            if (currentValue === 'antrean') {
              if (formAmbil) formAmbil.classList.remove('hidden');
              if (formManual) formManual.classList.add('hidden');
            } else {
              if (formAmbil) formAmbil.classList.add('hidden');
              if (formManual) formManual.classList.remove('hidden');
            }
          });
        });

        // + tambahan safety: setiap kali modal ditutup, kita juga reset semua (mencegah state tersisa)
        document.querySelectorAll('#btnBatalTambahTindak, #btnTutupTambahTindak').forEach(btn => {
          btn.addEventListener('click', () => {
            resetAllTambahTindakForms();
            const modal = document.querySelector('#tambahTindakModal');
            if (modal) modal.classList.add('hidden');
          });
        });




        // tombol batal modal tambah TL
        const btnBatalTambahTindak = document.getElementById("btnBatalTambahTindak");
        if (btnBatalTambahTindak) {
          btnBatalTambahTindak.addEventListener("click", () => {
            document.getElementById("tambahTindakModal").classList.add("hidden");
          });
        }

        // Simpan perubahan dari modal detail tindak
        const btnSimpanDetailTindak = document.getElementById("btnSimpanDetailTindak");
        if (btnSimpanDetailTindak) {
          btnSimpanDetailTindak.addEventListener("click", async () => {
            try {
              const no = document.getElementById("dt_no").textContent.trim();
              if (!no) return alert("Nomor antrean tidak ditemukan.");
              const updates = {
                Nama: document.getElementById("dt_nama").value.trim().toUpperCase(),
                NIK_NPWP: document.getElementById("dt_nik").value.trim(),
                No_HP_WA: document.getElementById("dt_hp").value.trim(),
                Email: document.getElementById("dt_email").value.trim(),
                Keperluan: document.getElementById("dt_keperluan").value.trim().toUpperCase(),
                Ket: document.getElementById("dt_ket").value.trim(),
                Proses: document.getElementById("dt_proses").value.trim(),
                Urgensi: document.getElementById("dt_urgensi").value,
                Status: document.getElementById("dt_statusTindak").value
              };
              await updateTindakFirebase(no, updates);
              // alert("Perubahan tersimpan.");
              document.getElementById("detailTindakModal").classList.add("hidden");
            } catch (err) {
              console.error("Gagal update tindak:", err);
              alert("Gagal menyimpan perubahan: " + err.message);
            }
          });
        }

        // Hapus dari modal detail tindak
        const btnHapusDetailTindak = document.getElementById("btnHapusDetailTindak");
        if (btnHapusDetailTindak) {
          btnHapusDetailTindak.addEventListener("click", async () => {
            const no = document.getElementById("dt_no").textContent.trim();
            if (!no) return alert("Nomor tidak ditemukan.");
            if (!confirm("Yakin hapus tindak lanjut " + no + " ?")) return;
            try {
              await deleteTindakFirebase(no);
              alert("Data tindak lanjut dihapus.");
              document.getElementById("detailTindakModal").classList.add("hidden");
            } catch (err) {
              console.error(err);
              alert("Gagal hapus: " + err.message);
            }
          });
        }

        // Tombol tutup modal detail
        const btnTutupDetailTindak = document.getElementById("btnTutupDetailTindak");
        if (btnTutupDetailTindak) {
          btnTutupDetailTindak.addEventListener("click", () => {
            document.getElementById("detailTindakModal").classList.add("hidden");
          });
        }

















        
        // === 🔔 MENU PENGUMUMAN ===
        // === MENU PENGUMUMAN (perbaikan: edit + small inline loading) ===
        const menuPengumuman = document.getElementById("menuPengumuman");
        const pengumumanContent = document.getElementById("pengumumanContent");
        const daftarPengumuman = document.getElementById("daftarPengumuman");
        const btnTambahPengumuman = document.getElementById("btnTambahPengumuman");
        const pengumumanModal = document.getElementById("pengumumanModal");
        const pengumumanInput = document.getElementById("pengumumanInput");
        const btnBatalPengumuman = document.getElementById("btnBatalPengumuman");
        const btnSimpanPengumuman = document.getElementById("btnSimpanPengumuman");
        const runningMarquee = document.getElementById("runningMarquee");
        const editPengumumanModal = document.getElementById("editPengumumanModal");
        const editPengumumanInput = document.getElementById("editPengumumanInput");
        const btnBatalEditPengumuman = document.getElementById("btnBatalEditPengumuman");
        const btnSimpanEditPengumuman = document.getElementById("btnSimpanEditPengumuman");
        let pengumumanList = [];
        let editIndex = null;
        // === Override handler tombol hapus pengumuman agar realtime ===
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("btnHapusPengumuman")) {
                const id = e.target.dataset.id;
                if (!id) return alert("ID pengumuman tidak ditemukan.");
                if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;
                // 🔹 Jika Firebase sudah aktif, hapus langsung
                if (db) {
                    db.ref("pengumuman/" + id).remove((err) => {
                        if (err) {
                            alert("Gagal menghapus: " + err.message);
                        } else {
                            e.target.closest("li").remove(); // hilangkan dari tampilan
                            console.log("Pengumuman " + id + " dihapus langsung via Firebase.");
                        }
                    });
                } else {
                    // fallback ke Apps Script bila db tidak tersedia
                    google.script.run
                        .withSuccessHandler(() => {
                            google.script.run
                                .withSuccessHandler((data) => {
                                    renderPengumuman(data || []);
                                })
                                //.getPengumumanList();
                        })
                        .withFailureHandler((err) => {
                            alert("Gagal menghapus: " + err.message);
                        })
                        .hapusPengumumanGlobal(id);
                }
            }
        });
        // Realtime listener untuk pengumuman
        if (db) {
            db.ref("pengumuman").on("value", (snapshot) => {
                const data = snapshot.val() || {};
                pengumumanList = Object.entries(data).map(([id, v]) => ({
                    id,
                    text: v.text || "",
                    active: !!v.active
                }));
                renderPengumuman();
                updateRunningText();
            });
        }
        // === Handler tombol edit pengumuman (langsung Firebase) ===
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("btnEditPengumuman")) {
                const id = e.target.dataset.id;
                const text = e.target.dataset.text || "";
                if (!id) return alert("ID pengumuman tidak ditemukan.");
                const input = document.getElementById("editPengumumanInput");
                input.value = text;
                document.getElementById("editPengumumanModal").classList.remove("hidden");
                input.dataset.id = id; // simpan ID untuk referensi saat disimpan
            }
        });
        // === Handler tombol "Tampilkan / Sembunyikan dari Banner" ===
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("btnToggleBanner")) {
                const id = e.target.dataset.id;
                const currentActive = e.target.dataset.active === "true";
                const newActive = !currentActive;
                const btn = e.target;
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>${newActive ? "Menampilkan..." : "Menyembunyikan..."}`;
                if (db) {
                    db.ref("pengumuman/" + id).update({
                        active: newActive
                    }, (err) => {
                        if (err) {
                            alert("Gagal mengubah status banner: " + err.message);
                            btn.disabled = false;
                            btn.innerHTML = currentActive ? "Sembunyikan" : "Tampilkan";
                        } else {
                            console.log(`✅ Pengumuman ${id} sekarang ${newActive ? "aktif" : "nonaktif"}`);
                            showRealtimeNotif();
                        }
                    });
                } else {
                    // fallback ke Apps Script
                    google.script.run
                        .withSuccessHandler(() => {
                            showRealtimeNotif();
                        })
                        .withFailureHandler((err) => {
                            alert("Gagal mengubah status banner: " + err.message);
                        })
                        .setStatusPengumuman(id, newActive);
                }
            }
        });
        // === Handler tombol "Tampilkan di Banner" ===
        document.addEventListener("click", (e) => {
            if (e.target.classList.contains("btnTampilkanBanner")) {
                const id = e.target.dataset.id;
                if (!id) return alert("ID pengumuman tidak ditemukan.");
                const btn = e.target;
                btn.disabled = true;
                btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i>Memproses...`;
                if (db) {
                    // Toggle aktif true
                    db.ref("pengumuman/" + id).update({
                        active: true
                    }, (err) => {
                        if (err) {
                            alert("Gagal menampilkan pengumuman: " + err.message);
                            btn.disabled = false;
                            btn.innerHTML = "Tampilkan";
                        } else {
                            console.log("✅ Pengumuman ditampilkan di banner:", id);
                            showRealtimeNotif();
                        }
                    });
                } else {
                    // fallback ke Apps Script kalau Firebase belum siap
                    google.script.run
                        .withSuccessHandler(() => {
                            showRealtimeNotif();
                        })
                        .withFailureHandler((err) => {
                            alert("Gagal menampilkan: " + err.message);
                        })
                        .setStatusPengumuman(id, true);
                }
            }
        });
        

        // small helper: tampilkan loading kecil di tombol (gantikan innerHTML sementara)
        function setBtnLoading(btn, text = "Menyimpan...") {
            btn.disabled = true;
            btn.dataset.prev = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>${text}`;
        }

        function unsetBtnLoading(btn) {
            if (btn.dataset && btn.dataset.prev !== undefined) {
                btn.innerHTML = btn.dataset.prev;
                delete btn.dataset.prev;
            }
            btn.disabled = false;
        }
        // small helper: buat spinner elemen untuk checkbox/inline
        function makeInlineSpinner() {
            const span = document.createElement('span');
            span.className = 'inline-block ml-2';
            span.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
            return span;
        }
        // ambil list awal
        db.ref("pengumuman").once("value").then(snap => {
            pengumumanList = snap.val() ? Object.values(snap.val()) : [];
            renderPengumuman();
            updateRunningText();
        });
        //.getPengumumanList();
        // render daftar pengumuman (sisip tombol edit + hapus + toggle)
        function renderPengumuman() {
            daftarPengumuman.innerHTML = "";
            if (!Array.isArray(pengumumanList) || pengumumanList.length === 0) {
                daftarPengumuman.innerHTML = `<li class="text-center py-4 text-slate-500 italic">Belum ada pengumuman.</li>`;
                runningMarquee.textContent = "";
                return;
            }
            pengumumanList.forEach((item) => {
                const li = document.createElement("li");
                li.innerHTML = `
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <input type="checkbox" class="accent-blue-600 toggleRunning" data-id="${item.id}" ${item.active ? "checked" : ""}/>
                <span class="text-slate-700 text-sm">${item.text}</span>
              </div>
              <div class="flex gap-2">
                <button class="btnToggleBanner ${
                  item.active
                    ? "bg-red-100 hover:bg-red-200 text-red-700"
                    : "bg-blue-100 hover:bg-blue-200 text-blue-700"
                } text-xs font-semibold px-3 py-1 rounded-md" data-id="${item.id}" data-active="${item.active}">${item.active ? "Sembunyikan" : "Tampilkan"}</button>
                <button class="btnEditPengumuman bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold px-3 py-1 rounded-md" data-id="${item.id}" data-text="${item.text}">Edit</button>
                <button class="btnHapusPengumuman bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-md" data-id="${item.id}">Hapus</button>
              </div>
            </div>
          `;
                daftarPengumuman.appendChild(li);
            });
            updateRunningText();
        }
        // update running banner
        function updateRunningText() {
          const aktif = (pengumumanList || []).filter(p => p.active).map(p => p.text);
          const banner = document.getElementById("bannerPengumuman");
          const container = document.getElementById("runningTextContainer");

          if (!banner || !container) return;

          if (aktif.length > 0) {
            const teks = aktif.join("   •   ");
            container.textContent = teks;

            // 🔄 Reset animasi supaya jalan ulang setiap update
            container.classList.remove("animate-scroll-text");
            void container.offsetWidth; // force reflow
            container.classList.add("animate-scroll-text");

            banner.classList.remove("hidden");
          } else {
            banner.classList.add("hidden");
            container.textContent = "";
          }
        }


        // tombol Tambah
        btnTambahPengumuman.addEventListener("click", () => {
            pengumumanInput.value = "";
            pengumumanModal.classList.remove("hidden");
        });
        btnBatalPengumuman.addEventListener("click", () => pengumumanModal.classList.add("hidden"));
        // simpan pengumuman baru (inline small loading on button)
        btnSimpanPengumuman.addEventListener("click", () => {
            const text = pengumumanInput.value.trim();
            if (!text) return alert("Isi pengumuman tidak boleh kosong.");
            setBtnLoading(btnSimpanPengumuman, "Menyimpan...");
            google.script.run
                .withSuccessHandler(() => {
                    unsetBtnLoading(btnSimpanPengumuman);
                    pengumumanModal.classList.add("hidden");
                    // refresh list
                    google.script.run.withSuccessHandler((data) => {
                        pengumumanList = data || [];
                        renderPengumuman();
                        updateRunningText();
                        showRealtimeNotif();
                    })//.getPengumumanList();
                })
                .withFailureHandler((err) => {
                    unsetBtnLoading(btnSimpanPengumuman);
                    alert("Gagal menambah pengumuman: " + (err.message || err));
                })
                .tambahPengumumanGlobal(text);
        });
        // Event delegation untuk daftarPengumuman: edit / hapus / toggle
        daftarPengumuman.addEventListener("click", (e) => {
            // Hapus
            const hapusBtn = e.target.closest(".hapusPengumuman");
            if (hapusBtn) {
                const idx = parseInt(hapusBtn.dataset.index);
                if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;
                // small loading on delete button
                const prev = hapusBtn.innerHTML;
                hapusBtn.disabled = true;
                hapusBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
                google.script.run
                    .withSuccessHandler(() => {
                        // refresh list
                        google.script.run.withSuccessHandler((data) => {
                            pengumumanList = data || [];
                            renderPengumuman();
                            updateRunningText();
                        })//.getPengumumanList();
                    })
                    .withFailureHandler((err) => {
                        alert("Gagal menghapus pengumuman: " + (err.message || err));
                    })
                    .hapusPengumumanGlobal(idx);
                return;
            }
            // Edit (buka modal)
            const editBtn = e.target.closest(".editPengumuman");
            if (editBtn) {
                editIndex = parseInt(editBtn.dataset.index);
                editPengumumanInput.value = pengumumanList[editIndex] ? pengumumanList[editIndex].text : "";
                editPengumumanModal.classList.remove("hidden");
                return;
            }
        });
        // Simpan edit pengumuman (small loading on button)
        btnBatalEditPengumuman.addEventListener("click", () => editPengumumanModal.classList.add("hidden"));
        btnSimpanEditPengumuman.addEventListener("click", () => {
            const id = editPengumumanInput.dataset.id; // ambil ID dari input
            const newText = editPengumumanInput.value.trim();
            if (!id) {
                alert("Data pengumuman tidak ditemukan.");
                return;
            }
            if (!newText) return alert("Isi pengumuman tidak boleh kosong.");

            // Simpan ke Firebase
            if (db) {
                db.ref("pengumuman/" + id).update({
                    text: newText
                }, (err) => {
                    if (err) {
                        alert("Gagal menyimpan: " + err.message);
                    } else {
                        console.log(`✅ Pengumuman ${id} berhasil diperbarui.`);
                        editPengumumanModal.classList.add("hidden");
                        showRealtimeNotif();
                    }
                });
            } else {
                // fallback ke Apps Script
                google.script.run
                    .withSuccessHandler(() => {
                        editPengumumanModal.classList.add("hidden");
                        showRealtimeNotif();
                    })
                    .withFailureHandler((err) => {
                        alert("Gagal menyimpan: " + err.message);
                    })
                    .updatePengumumanGlobal(id, newText);
            }
        });

        // Handle checkbox change (client Firebase update — cepat)
        daftarPengumuman.addEventListener("change", (e) => {
            if (!e.target.classList.contains("toggleRunning")) return;
            const id = e.target.dataset.id;
            const checked = !!e.target.checked;
            const label = e.target.closest("label");
            const spinner = makeInlineSpinner();
            label.appendChild(spinner);
            if (!db) {
                // fallback: panggil server jika firebase client tidak tersedia
                google.script.run
                    .withSuccessHandler(() => {
                        // refresh list
                        google.script.run.withSuccessHandler((data) => {
                            pengumumanList = data || [];
                            renderPengumuman();
                            updateRunningText();
                        })//.getPengumumanList();
                    })
                    .withFailureHandler((err) => {
                        alert("Gagal mengubah status tampilkan: " + (err.message || err));
                        e.target.checked = !checked;
                    })
                    .setStatusPengumuman(id, checked);
                label.removeChild(spinner);
                return;
            }
            // faster: update langsung via Firebase client
            try {
                db.ref("pengumuman/" + id).update({
                    active: checked
                }, (err) => {
                    label.removeChild(spinner);
                    if (err) {
                        alert("Gagal mengubah status tampilkan: " + (err.message || err));
                        e.target.checked = !checked; // rollback UI
                        // refresh from server to stay consistent
                        google.script.run.withSuccessHandler((data) => {
                            pengumumanList = data || [];
                            renderPengumuman();
                            updateRunningText();
                        })//.getPengumumanList();
                    } else {
                        // update local list quickly without full reload
                        const p = pengumumanList.find(x => x.id === id);
                        if (p) p.active = checked;
                        updateRunningText();
                    }
                });
            } catch (ex) {
                label.removeChild(spinner);
                alert("Terjadi error update Firebase: " + ex.message);
                e.target.checked = !checked;
            }
        });
        // Klik menu Pengumuman -> tampilkan page
        menuPengumuman.addEventListener("click", (e) => {
            e.preventDefault();
            Object.values(contentSections).forEach((section) => section.classList.add("hidden"));
            Object.values(menuItems).forEach((menu) => menu.classList.remove("active"));
            pengumumanContent.classList.remove("hidden");
            menuPengumuman.classList.add("active");
            renderPengumuman();
        });
        

        

        // 🔁 Simpan dan perbarui waktu aktivitas
        function resetSessionTimer() {
          const now = Date.now();
          localStorage.setItem("lastActivity", now.toString());

          // Perpanjang masa aktif (sliding session)
          const newExpiry = now + SESSION_TIMEOUT;
          localStorage.setItem("sessionExpiry", newExpiry.toString());
        }

        // ⏰ Fungsi untuk logout otomatis & bersih total
        function logoutToLogin() {
          // Bersihkan semua data login
          localStorage.removeItem("username");
          localStorage.removeItem("namaPetugas");
          localStorage.removeItem("role");
          localStorage.removeItem("sessionExpiry");
          localStorage.removeItem("lastActivity");
          sessionStorage.removeItem("username");
          sessionStorage.removeItem("namaPetugas");
          sessionStorage.removeItem("role");
          sessionStorage.removeItem("sessionExpiry");
          sessionStorage.removeItem("lastActivity");
          sessionStorage.removeItem("sessionId");

          // Munculkan kembali halaman login
          document.getElementById("appSection").classList.add("hidden");
          document.getElementById("loginSection").classList.remove("hidden");
          alert("Sesi Anda telah berakhir. Silakan login kembali.");
        }

        // 🧠 Fungsi utama pengecekan session timeout
        function enforceSession() {
          const username =
            sessionStorage.getItem("username") || localStorage.getItem("username");
          if (!username) return; // tidak login

          const expiryStr =
            sessionStorage.getItem("sessionExpiry") || localStorage.getItem("sessionExpiry");
          const lastStr =
            sessionStorage.getItem("lastActivity") || localStorage.getItem("lastActivity");
          const now = Date.now();

          if (expiryStr && parseInt(expiryStr) < now) {
            // Masa aktif sudah habis
            logoutToLogin();
            return;
          }

          if (lastStr && now - parseInt(lastStr) > SESSION_TIMEOUT) {
            // Terlalu lama tidak aktif
            logoutToLogin();
            return;
          }
        }

        // 🖱️ Setiap aktivitas user perpanjang sesi
        ["click", "keydown", "mousemove", "scroll", "touchstart"].forEach((evt) => {
          window.addEventListener(evt, resetSessionTimer);
        });

        // 🕑 Jalankan pengecekan berkala dan juga saat halaman baru dibuka
        setInterval(enforceSession, 60 * 1000); // cek tiap 1 menit
        window.addEventListener("load", enforceSession);
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) enforceSession();
        });





        window.username = localStorage.getItem("username") || "-";
        window.namaPetugas = localStorage.getItem("namaPetugas") || window.username;

        
        /* ===========================================================
        🔥 DASHBOARD PETUGAS — Versi Firebase Realtime Database
        =========================================================== */
        // --- Inisialisasi Firebase --- (sudah di atas)
        window.addEventListener("load", () => {
            document.getElementById("loadingOverlay").style.display = "none";
            listenAntreanRealtime();
            listenMPPRealtime();
        });
        /* ===========================================================
        1️⃣ LISTENER REALTIME DATA ANTREAN
        =========================================================== */
        function listenAntreanRealtime() {
          const tanggalFilter = document.getElementById("filterTanggalTabel").value;
          const tanggalDisplay = tanggalFilter
            ? new Date(tanggalFilter).toLocaleDateString("id-ID")
            : new Date().toLocaleDateString("id-ID");

          const targetTanggal = normalizeDateString(tanggalDisplay);
          const ref = db.ref("data_antrean");

          ref.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            const rows = Object.values(data).filter((x) => {
              const tglItem = normalizeDateString(x.Tanggal_Antrean || x.Tanggal || "");
              return tglItem === targetTanggal;
            });
            renderTableAntrean(rows);
          });
        }

        /* ===========================================================
        2️⃣ RENDER TABEL ANTREAN
        =========================================================== */
        function renderTableAntrean(rows) {
            const body = document.getElementById("tabelAntreanBody");
            body.innerHTML = "";
            if (!rows || rows.length === 0) {
                body.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-700">Tidak ada data antrean hari ini.</td></tr>`;
                return;
            }
            rows.sort((a, b) => {
                const numA = parseInt((a.No_Antrean || "0").split("-")[0].replace(/\D/g, ""));
                const numB = parseInt((b.No_Antrean || "0").split("-")[0].replace(/\D/g, ""));
                return numB - numA; // 🔥 terbesar → terkecil
            });
            rows.forEach((r) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
            <td class="px-4 py-3 text-sm">${r.No_Antrean}</td>
            <td class="px-4 py-3 text-sm">${r.Nama}</td>
            <td class="px-4 py-3 text-sm">${r.NIK_NPWP || "-"}</td>
            <td class="px-4 py-3 text-sm">${r.No_HP_WA || "-"}</td>
            <td class="px-4 py-3 text-sm">${r.Email || "-"}</td>
            <td class="px-4 py-3 text-sm">${r.Keperluan}</td>
            <td class="px-4 py-3 text-sm">${r.Keterangan || "-"}</td>
            <td class="px-4 py-3 pr-6">
              <div class="flex justify-end gap-1">
                <button class="${r.Status === 'Belum Dipanggil'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'} text-white text-xs font-semibold px-3 py-1 rounded" 
                  onclick="toggleStatusAntrean('${r.No_Antrean}', '${r.Status}')">
                  ${r.Status === 'Belum Dipanggil' ? 'Panggil' : 'Batal'}
                </button>
                <button class="bg-gray-200 hover:bg-gray-300 text-xs font-semibold px-3 py-1 rounded" onclick="bukaInfoAntrean('${r.No_Antrean}')">Info</button>
              </div>
            </td>
          `;
                body.appendChild(tr);
            });
        }
        /* ===========================================================
                3️⃣ TAMBAH ANTREAN BARU
          =========================================================== */
        async function tambahAntreanFirebase() {
            try {
                const tanggalHariIni = new Date().toLocaleDateString('id-ID');
                const keyTanggal = tanggalHariIni.replaceAll("/", "_");

                const counterRef = db.ref("counter_antrean/" + keyTanggal);
                const result = await counterRef.transaction((current) => (current || 0) + 1);
                const nextNo = result.snapshot.val() || 1;
                const formattedNo = nextNo.toString().padStart(3, "0");
                const nomorAntrean = `${formattedNo}-${tanggalHariIni}`;

                // 🔹 Ambil keperluan (termasuk “Lainnya”)
                let keperluanSelect = document.getElementById("tambahKeperluan");
                let keperluan = keperluanSelect ? keperluanSelect.value.trim().toUpperCase() : "";

                // 🔹 Cek input tambahan “Sebutkan Keperluan Lainnya”
                const inputLainnya = document.querySelector("input[name='tambahKeperluanLainnya'], #tambahKeperluanLainnya");
                if (keperluan === "LAINNYA" && inputLainnya && inputLainnya.value.trim() !== "") {
                    keperluan = inputLainnya.value.trim().toUpperCase();
                }

                const newData = {
                    Timestamps: new Date().toLocaleString('id-ID'),
                    No_Antrean: nomorAntrean,
                    Nama: document.getElementById("tambahNama").value.trim().toUpperCase(),
                    NIK_NPWP: document.getElementById("tambahNik").value.trim(),
                    No_HP_WA: document.getElementById("tambahHP").value.trim(),
                    Email: document.getElementById("tambahEmail").value.trim(),
                    Keperluan: keperluan,
                    Status: "Belum Dipanggil",
                    Petugas: localStorage.getItem("namaPetugas") || "-",
                    Tanggal_Antrean: tanggalHariIni,
                    Ket: ""
                };

                await db.ref("data_antrean/" + nomorAntrean.replaceAll("/", "_")).set(newData);
                listenAntreanRealtime();
            } catch (err) {
                console.error("❌ Gagal menambah antrean:", err);
                alert("Terjadi kesalahan saat menambah antrean.");
            }
        }

        /* ===========================================================
                3️⃣ TAMBAH ANTREAN MPP (dengan sistem counter_mpp)
          =========================================================== */
        async function tambahMPPFirebase() {
          try {
            const tanggalHariIni = new Date().toLocaleDateString('id-ID');
            const keyTanggal = tanggalHariIni.replaceAll("/", "_");

            // 🔹 Ambil & naikkan counter_mpp (gunakan transaksi untuk keamanan data)
            const counterRef = db.ref("counter_mpp/" + keyTanggal);
            const result = await counterRef.transaction((current) => (current || 0) + 1);
            const nextNo = result.snapshot.val() || 1;

            // 🔹 Format nomor antrean (pakai 3 digit, M di depan)
            const formattedNo = nextNo.toString().padStart(3, "0");
            const nomorAntrean = `M${formattedNo}-${tanggalHariIni}`;

            // 🔹 Ambil keperluan (termasuk “Lainnya”)
            let keperluanSelect = document.getElementById("tambahKeperluan");
            let keperluan = keperluanSelect ? keperluanSelect.value.trim().toUpperCase() : "";
            const inputLainnya = document.querySelector("input[name='tambahKeperluanLainnya'], #tambahKeperluanLainnya");
            if (keperluan === "LAINNYA" && inputLainnya && inputLainnya.value.trim() !== "") {
              keperluan = inputLainnya.value.trim().toUpperCase();
            }

            // 🔹 Siapkan data baru
            const newData = {
              No_Antrean: nomorAntrean,
              Tanggal_Antrean: tanggalHariIni,
              Timestamps: new Date().toLocaleString('id-ID'),
              Nama: document.getElementById("tambahNama").value.trim().toUpperCase(),
              NIK: document.getElementById("tambahNik").value.trim(),
              HP: document.getElementById("tambahHP").value.trim(),
              Email: document.getElementById("tambahEmail").value.trim(),
              Keperluan: keperluan,
              Status: "Belum Dipanggil",
              Petugas: localStorage.getItem("namaPetugas") || "-",
              Ket: ""
            };

            // 🔹 Simpan ke Firebase
            await db.ref("data_mpp/" + nomorAntrean.replaceAll("/", "_")).set(newData);

            alert(`✅ Antrean MPP baru berhasil ditambahkan!\nNomor: ${nomorAntrean}`);
            listenMPPRealtime();
          } catch (err) {
            console.error("❌ Gagal menambah antrean MPP:", err);
            alert("Terjadi kesalahan saat menambah antrean MPP.");
          }
        }



        /* ===========================================================
        4️⃣ TOGGLE STATUS (PANGGIL/BATAL)
        =========================================================== */
        function toggleStatusAntrean(noAntrean, status) {
            const key = noAntrean.split("/").join("_");
            const newStatus = status === "Belum Dipanggil" ? "Dipanggil" : "Belum Dipanggil";
            const updateData = {
                Status: newStatus
            };
            // 🔹 kalau status baru = Dipanggil, tambahkan nama petugas login
            if (newStatus === "Dipanggil") {
                const petugas = localStorage.getItem("namaPetugas") || "-";
                updateData.Petugas = petugas;
            }
            db.ref("data_antrean/" + key).update(updateData);
        }
        /* ===========================================================
        5️⃣ BUKA DETAIL INFO
        =========================================================== */
        function bukaInfoAntrean(noAntrean) {
            const key = noAntrean.split("/").join("_");
            db.ref("data_antrean/" + key).once("value").then((snapshot) => {
                const data = snapshot.val();
                if (!data) return alert("Data tidak ditemukan.");
                // 🕓 Isi semua field modal
                document.getElementById("infoNo").value = data.No_Antrean || "";
                document.getElementById("infoNama").value = data.Nama || "";
                document.getElementById("infoNik").value = data.NIK_NPWP || "";
                document.getElementById("infoHP").value = data.No_HP_WA || "";
                document.getElementById("infoEmail").value = data.Email || "";
                document.getElementById("infoKeperluan").value = data.Keperluan || "";
                document.getElementById("infoKeterangan").value = data.Keterangan || "";
                // 🕒 Tambahan baru
                document.getElementById("infoTimestamp").value = data.Timestamps || "-";
                document.getElementById("infoStatus").value = data.Status || "-";
                document.getElementById("infoPetugas").value = data.Petugas || "-";
                // 🟢 Tampilkan modal
                document.getElementById("infoModal").classList.remove("hidden");
            });
        }
        /* ===========================================================
        6️⃣ SIMPAN PERUBAHAN DARI MODAL INFO
        =========================================================== */
        
        /* ===========================================================
        7️⃣ HAPUS DATA ANTREAN
        =========================================================== */
        function hapusAntrean(noAntrean) {
            if (!confirm("Yakin ingin menghapus antrean ini?")) return;
            const key = noAntrean.split("/").join("_");
            db.ref("data_antrean/" + key)
                .remove()
                .then(() => alert("Antrean berhasil dihapus."));
        }
        // 🔥 Hapus data antrean langsung dari Firebase
        async function hapusAntreanFirebase(noAntrean) {
            const key = noAntrean.replace(/\//g, "_");
            await db.ref("data_antrean/" + key).remove();
        }
        // 🔥 Hapus data MPP langsung dari Firebase
        async function hapusMPPFirebase(noAntrean) {
            const key = noAntrean.replace(/\//g, "_");
            await db.ref("data_mpp/" + key).remove();
        }
        /* ===========================================================
        8️⃣ LISTENER REALTIME DATA MPP
        =========================================================== */
        function listenMPPRealtime() {
          const tanggalFilter = document.getElementById("filterTanggalMPP").value;
          const tanggalDisplay = tanggalFilter
            ? new Date(tanggalFilter).toLocaleDateString("id-ID")
            : new Date().toLocaleDateString("id-ID");

          const targetTanggal = normalizeDateString(tanggalDisplay);
          const ref = db.ref("data_mpp");

          ref.on("value", (snapshot) => {
            const data = snapshot.val() || {};
            const rows = Object.values(data).filter((x) => {
              const tglItem = normalizeDateString(x.Tanggal_Antrean || x.Tanggal || "");
              return tglItem === targetTanggal;
            });
            renderTableMPP(rows);
          });
        }

        /* ===========================================================
        9️⃣ RENDER TABEL MPP
        =========================================================== */
        function renderTableMPP(rows) {
            const body = document.getElementById("tabelMPPBody");
            body.innerHTML = "";
            if (!rows || rows.length === 0) {
                body.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-700">Tidak ada data MPP hari ini.</td></tr>`;
                return;
            }
            rows.sort((a, b) => {
                const numA = parseInt((a.No_Antrean || "0").split("-")[0].replace(/\D/g, ""));
                const numB = parseInt((b.No_Antrean || "0").split("-")[0].replace(/\D/g, ""));
                return numB - numA; // 🔥 terbesar → terkecil
            });
            rows.forEach((r) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
            <td class="px-4 py-3 text-sm">${r.No_Antrean}</td>
            <td class="px-4 py-3 text-sm">${r.Nama}</td>
            <td class="px-4 py-3 text-sm">${r.NIK_NPWP || "-"}</td>
            <td class="px-4 py-3 text-sm">${r.No_HP_WA || "-"}</td>
            <td class="px-4 py-3 text-sm">${r.Email || "-"}</td>
            <td class="px-4 py-3 text-sm">${r.Keperluan}</td>
            <td class="px-4 py-3 text-sm">${r.Keterangan || "-"}</td>
            <td class="px-4 py-3 pr-6">
              <div class="flex justify-end gap-1">
                <button class="${r.Status === 'Belum Dipanggil'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-red-600 hover:bg-red-700'} text-white text-xs font-semibold px-3 py-1 rounded" 
                  onclick="toggleStatusMPP('${r.No_Antrean}', '${r.Status}')">
                  ${r.Status === 'Belum Dipanggil' ? 'Panggil' : 'Batal'}
                </button>
                <button class="bg-gray-200 hover:bg-gray-300 text-xs font-semibold px-3 py-1 rounded" onclick="bukaInfoMPP('${r.No_Antrean}')">Info</button>
              </div>
            </td>
          `;
                body.appendChild(tr);
            });
        }
        /* ===========================================================
        🔟 TOGGLE STATUS MPP
        =========================================================== */
// ⚠️ DUPLICATE FUNCTION: toggleStatusMPP
        function toggleStatusMPP(noAntrean, status) {
            const key = noAntrean.split("/").join("_");
            const newStatus = status === "Belum Dipanggil" ? "Dipanggil" : "Belum Dipanggil";
            const updateData = {
                Status: newStatus
            };
            if (newStatus === "Dipanggil") {
                const petugas = localStorage.getItem("namaPetugas") || "-";
                updateData.Petugas = petugas;
            }
            db.ref("data_mpp/" + key).update(updateData);
        }
        // === 🔥 DASHBOARD FIREBASE REALTIME ===
        function loadDashboardFromFirebase(showBigLoader = true) {
            try {
                if (window.isActionInProgress && !showBigLoader) return;
                window.isActionInProgress = true;
                const refreshSpinnerDashboard = document.getElementById("refreshSpinnerDashboard");
                if (refreshSpinnerDashboard) refreshSpinnerDashboard.classList.remove("hidden");
                const dashboardCards = document.getElementById("dashboard-cards");
                const tanggalFilterEl = document.getElementById("filterTanggalDashboard");
                const tanggalFilter = tanggalFilterEl ? tanggalFilterEl.value : null;
                if (typeof firebase === "undefined" || !firebase.database) {
                    throw new Error("Firebase belum terinisialisasi (compat).");
                }
                const dbRef = firebase.database().ref("data_antrean");
                dbRef.once("value")
                    .then((snapshot) => {
                        const semuaData = snapshot.val() || {};
                        let list = Object.values(semuaData || {});
                        // 🔧 perbaikan: bandingkan tanggal dari format Firebase (dd/mm/yyyy)
                        // dengan format input (yyyy-mm-dd)
                        if (tanggalFilter) {
                            const [yyyy, mm, dd] = tanggalFilter.split("-");
                            const tanggalFormFirebase = `${dd}/${mm}/${yyyy}`;
                            list = list.filter(item => {
                                const t = item.Tanggal || item.Timestamps || item.tanggal || "";
                                return String(t).includes(tanggalFormFirebase);
                            });
                        }
                        if (typeof renderDashboard === "function") {
                            renderDashboard(list);
                        } else if (dashboardCards) {
                            dashboardCards.innerHTML = `<p class="text-center text-gray-600">Dashboard siap, tapi fungsi renderDashboard belum tersedia.</p>`;
                        }
                        if (refreshSpinnerDashboard) refreshSpinnerDashboard.classList.add("hidden");
                        window.isActionInProgress = false;
                    })
                    .catch((err) => {
                        console.error("❌ Gagal ambil data dari Firebase:", err);
                        if (dashboardCards) dashboardCards.innerHTML = `<p class="text-center text-red-600">Gagal memuat data dari Firebase.</p>`;
                        if (refreshSpinnerDashboard) refreshSpinnerDashboard.classList.add("hidden");
                        window.isActionInProgress = false;
                    });
            } catch (err) {
                console.error("❌ Gagal load dashboard:", err);
                const dashboardCards = document.getElementById("dashboard-cards");
                if (dashboardCards) dashboardCards.innerHTML = `<p class="text-center text-red-600">Gagal memuat data dari Firebase.</p>`;
                const refreshSpinnerDashboard = document.getElementById("refreshSpinnerDashboard");
                if (refreshSpinnerDashboard) refreshSpinnerDashboard.classList.add("hidden");
                window.isActionInProgress = false;
            }
        }
        
        

        function renderDashboard(list) {
            const container = document.getElementById("dashboard-cards");
            if (!container) return;
            // Jika tidak ada data antrean
            if (!list || list.length === 0) {
                container.innerHTML = `
            <div class="text-center text-gray-500 py-4">Tidak ada data antrean untuk tanggal ini.</div>`;
                return;
            }
            // Render daftar antrean
            const cards = list.map(item => {
                const noAntrean = item.No_Antrean || "-";
                const nama = item.Nama || "-";
                const keperluan = item.Keperluan || "-";
                const status = item.Status || "Belum Dipanggil";
                return `
            <div class="bg-white rounded-xl shadow p-4 mb-3 border">
              <h2 class="font-bold text-lg mb-1">No. Antrean: ${noAntrean}</h2>
              <p><span class="font-semibold">Nama:</span> ${nama}</p>
              <p><span class="font-semibold">Keperluan:</span> ${keperluan}</p>
              <p><span class="font-semibold">Status:</span> 
                <span class="${status === "Selesai" ? "text-green-600" : "text-yellow-600"}">${status}</span>
              </p>
            </div>`;
            }).join("");
            container.innerHTML = cards;
        }
        // === Jalankan saat halaman dibuka ===
// ⚠️ DUPLICATE FUNCTION: loadDashboardFromFirebase
        function loadDashboardFromFirebase() {
            loadDashboardFromFirebase(); // override versi lama
        }

        function setTodayDate() {
            const el = document.getElementById("filterTanggalDashboard");
            if (!el) return;
            const d = new Date();
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            el.value = `${yyyy}-${mm}-${dd}`;
        }

        function checkSession() {
            console.log("✅ checkSession() dipanggil — sementara di-skip (belum ada login system).");
            // nanti kalau kamu sudah punya login system, isi validasi di sini
        }
        window.addEventListener("load", () => {
            setTodayDate();
            checkSession();
            updateChatUserIdentity();
            loadDashboardFromFirebase(true);
            // tombol refresh dashboard
            const btn = document.getElementById("btnUpdateDashboard");
            if (btn) btn.addEventListener("click", () => loadDashboardFromFirebase(false));
        });
        

        /* ===========================================================
        💬 CHAT PETUGAS FLOATING POP-UP (Firebase)
        =========================================================== */
        document.addEventListener("DOMContentLoaded", () => {
          const chatBtn = document.getElementById("chatButton");
          const chatPopup = document.getElementById("chatPopup");
          const closeChat = document.getElementById("closeChat");
          const sendChat = document.getElementById("sendChat");
          const chatInput = document.getElementById("chatInput");
          const chatMessages = document.getElementById("chatMessages");
          // === Sinkronisasi: Sembunyikan Chat Saat Login (Duplikat) ===
          function toggleChatVisibilityLocal() {
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

          setTimeout(() => {
              toggleChatVisibilityLocal();
          }, 300);

          document.addEventListener("userLoggedIn", () => {
            updateChatUserIdentity();
          });

          document.addEventListener("userLoggedIn", () => {
              toggleChatVisibilityLocal();
          });



          //const petugas = localStorage.getItem("namaPetugas") || "Petugas";
          //const warnaPetugas = "#" + intToRGB(hashCode(petugas)); // warna unik tiap petugas

          // Fungsi hash sederhana → warna bubble unik
          function hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              hash = str.charCodeAt(i) + ((hash << 5) - hash);
            }
            return hash;
          }
          function intToRGB(i) {
            const c = (i & 0x00FFFFFF)
              .toString(16)
              .toUpperCase();
            return "00000".substring(0, 6 - c.length) + c;
          }

          // Toggle buka/tutup popup
          chatBtn.addEventListener("click", () => {
            chatPopup.classList.toggle("hidden");
            if (!chatPopup.classList.contains("hidden")) {
              // scroll otomatis ke bawah pas dibuka
              setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
              }, 100);
            }
          });

          closeChat.addEventListener("click", () => {
            chatPopup.classList.add("hidden");
          });


          // Kirim pesan
          sendChat.addEventListener("click", () => {
            if (!localStorage.getItem("namaPetugas")) {
              alert("Login dulu sebelum mengirim pesan.");
              return;
            }
            sendMessage(); // panggil fungsi kirim yang udah kamu punya
          });

          chatInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!localStorage.getItem("namaPetugas")) {
                alert("Login dulu sebelum mengirim pesan.");
                return;
              }
              sendMessage();
            }
          });




          function sendMessage() {
            const text = chatInput.value.trim();
            if (!text) return;

            const timestamp = new Date().toLocaleString("id-ID");
            const currentPetugas = localStorage.getItem("namaPetugas") || "Petugas";
            const message = {
              sender: currentPetugas,
              text,
              time: timestamp,
            };


            db.ref("chat_messages").push(message)
              .then(() => {
                chatInput.value = "";
                chatInput.focus();
                setTimeout(() => {
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 100);
              })
              .catch(err => console.error("Gagal kirim pesan:", err));
          }


          // Listen pesan realtime (tiap petugas punya warna unik)
          // Listen pesan realtime (tiap petugas punya warna unik) — perbaikan auto-scroll
          db.ref("chat_messages").on("value", (snapshot) => {
            const data = snapshot.val() || {};
            chatMessages.innerHTML = "";

            Object.entries(data).forEach(([key, msg]) => {
              const currentPetugas = localStorage.getItem("namaPetugas") || "Petugas";
              const isSelf = msg.sender === currentPetugas;
              const warnaUnik = "#" + intToRGB(hashCode(msg.sender));

              const bubble = document.createElement("div");
              bubble.className = `flex ${isSelf ? "justify-end" : "justify-start"} animate-fade-in`;
              bubble.setAttribute("data-key", key);

              // isi bubble dengan tombol hapus (kalau pesan dari diri sendiri)
              bubble.innerHTML = `
                <div class="relative max-w-[70%] p-2 rounded-xl shadow text-sm"
                  style="background-color:${warnaUnik}; color: white">
                  <div class="font-semibold text-xs opacity-90 mb-1">${msg.sender}</div>
                  <div>${msg.text}</div>
                  <div class="text-[0.65rem] mt-1 opacity-75 text-right">${msg.time}</div>
                  ${isSelf ? `<button class="delete-chat-btn absolute top-1 right-1" title="Hapus pesan" onclick="hapusPesan('${key}')">✖</button>` : ""}
                </div>
              `;

              chatMessages.appendChild(bubble);
            });

            // function hapusPesan(key) {
              // if (confirm("Yakin mau hapus pesan ini?")) {
                // db.ref("chat_messages/" + key).remove()
                  // .then(() => console.log("Pesan dihapus:", key))
                  // .catch(err => console.error("Gagal hapus pesan:", err));
              // }
            // }



            // Fungsi scroll yang lebih andal: coba beberapa cara agar pasti ke bawah
            function scrollToBottomReliable() {
              // 1) langsung set
              chatMessages.scrollTop = chatMessages.scrollHeight;

              // 2) pakai requestAnimationFrame agar setelah browser render
              requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                // 3) fallback: pakai setTimeout singkat
                setTimeout(() => {
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                  // 4) jika ada elemen terakhir, paksa scrollIntoView
                  const last = chatMessages.lastElementChild;
                  if (last) {
                    last.scrollIntoView({ behavior: "auto", block: "end", inline: "nearest" });
                  }
                }, 50);
              });
            }

            scrollToBottomReliable();
          });



          // Auto-buka popup jika pesan baru dari petugas lain — tapi hanya jika pesan benar-benar baru
          let sudahInitChat = false; // supaya child_added awal nggak langsung buka popup

          db.ref("chat_messages").limitToLast(1).on("child_added", async (snapshot) => {
            const msg = snapshot.val();
            if (!msg) return;

            // Skip event pertama saat halaman baru dibuka (biar gak auto buka popup)
            if (!sudahInitChat) {
              sudahInitChat = true;
              return;
            }

            // Ambil waktu tutup terakhir dari Firebase
            const snapClosed = await db.ref(`chat_lastClosed/${petugas}`).once("value");
            const lastClosedStr = snapClosed.val();

            // Kalau belum pernah tutup sebelumnya, anggap belum baca sama sekali
            if (!lastClosedStr) {
              if (msg.sender !== petugas) {
                chatPopup.classList.remove("hidden");
              }
              return;
            }

            // Parse waktu lokal
            function parseLocalTime(str) {
              const [tanggalPart, waktuPart] = str.split(", ");
              const [d, m, y] = tanggalPart.split("/").map(Number);
              const [hh, mm, ss] = waktuPart.split(".").map(Number);
              return new Date(y, m - 1, d, hh, mm, ss);
            }

            const waktuTutupDate = parseLocalTime(lastClosedStr);
            const waktuPesanDate = parseLocalTime(msg.time);

            // Kalau pesan lebih baru dari waktu tutup terakhir dan bukan dari diri sendiri → buka popup
            const currentPetugas = localStorage.getItem("namaPetugas") || "Petugas";
            if (waktuPesanDate > waktuTutupDate && msg.sender !== currentPetugas){
              chatPopup.classList.remove("hidden");
            }

            // Scroll otomatis ke bawah
            setTimeout(() => {
              chatMessages.scrollTop = chatMessages.scrollHeight;
              requestAnimationFrame(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                const last = chatMessages.lastElementChild;
                if (last) last.scrollIntoView({ behavior: "auto", block: "end", inline: "nearest" });
              });
            }, 50);
          });


          // ==========================
          // 💾 SIMPAN DAN CEK WAKTU TUTUP CHAT (format lokal sama dengan pesan)
          // ==========================

          const lastClosedRef = db.ref(`chat_lastClosed/${petugas}`);

          // Fungsi bikin format waktu lokal: "8/11/2025, 17.09.30"
          function getLocalTimeString() {
            const now = new Date();
            const tanggal = now.getDate();
            const bulan = now.getMonth() + 1;
            const tahun = now.getFullYear();
            const jam = now.getHours().toString().padStart(2, "0");
            const menit = now.getMinutes().toString().padStart(2, "0");
            const detik = now.getSeconds().toString().padStart(2, "0");
            return `${tanggal}/${bulan}/${tahun}, ${jam}.${menit}.${detik}`;
          }

          // Simpan waktu ketika popup ditutup (pakai format lokal)
          function simpanWaktuTutup() {
            const waktuTutup = getLocalTimeString();
            lastClosedRef.set(waktuTutup);
          }

          closeChat.addEventListener("click", () => {
            chatPopup.classList.add("hidden");
            simpanWaktuTutup();
          });

          // Saat pertama kali halaman dibuka → cek apakah perlu auto-buka popup
          async function cekAutoBukaChat() {
            try {
              const [snapLastClosed, snapMessages] = await Promise.all([
                lastClosedRef.once("value"),
                db.ref("chat_messages").limitToLast(1).once("value"),
              ]);

              const lastClosedStr = snapLastClosed.val();
              if (!lastClosedStr) return;

              let lastClosedTime = lastClosedStr;
              let lastMessage = null;

              snapMessages.forEach((child) => {
                lastMessage = child.val();
              });

              if (!lastMessage) return;

              const lastMessageTime = lastMessage.time;

              // Bandingkan manual karena format sama-sama string lokal
              // ubah ke Date objek pakai parsing lokal sederhana
// ⚠️ DUPLICATE FUNCTION: parseLocalTime
              function parseLocalTime(str) {
                // format: 8/11/2025, 17.09.30
                const [tanggalPart, waktuPart] = str.split(", ");
                const [d, m, y] = tanggalPart.split("/").map(Number);
                const [hh, mm, ss] = waktuPart.split(".").map(Number);
                return new Date(y, m - 1, d, hh, mm, ss);
              }

              const waktuTutupDate = parseLocalTime(lastClosedTime);
              const waktuPesanDate = parseLocalTime(lastMessageTime);

              if (waktuPesanDate > waktuTutupDate && lastMessage.sender !== petugas) {
                chatPopup.classList.remove("hidden");
                setTimeout(() => {
                  chatMessages.scrollTop = chatMessages.scrollHeight;
                }, 100);
              }
            } catch (err) {
              console.error("Gagal cek auto-buka chat:", err);
            }
          }

          // === SEMBUNYIKAN CHAT SAAT DI HALAMAN LOGIN ===
          function toggleChatVisibility() {
            const chatBtn = document.getElementById("chatButton");
            const chatPopup = document.getElementById("chatPopup");
            const loginSection = document.getElementById("loginSection");
            const appSection = document.getElementById("appSection");

            if (!chatBtn || !chatPopup || !loginSection || !appSection) return;

            const sedangLogin = !loginSection.classList.contains("hidden"); // true kalau halaman login sedang tampil
            if (sedangLogin) {
              chatBtn.classList.add("hidden");
              chatPopup.classList.add("hidden");
            } else {
              chatBtn.classList.remove("hidden");
            }
          }

          // Jalankan saat pertama kali halaman dimuat
          toggleChatVisibility();

          // Jalankan juga tiap kali login/logout
          const loginSection = document.getElementById("loginSection");
          const appSection = document.getElementById("appSection");

          const observer = new MutationObserver(() => toggleChatVisibility());
          if (loginSection && appSection) {
            observer.observe(loginSection, { attributes: true, attributeFilter: ["class"] });
            observer.observe(appSection, { attributes: true, attributeFilter: ["class"] });
          }



          cekAutoBukaChat();

          // Simpan waktu saat sebelum keluar halaman
          window.addEventListener("beforeunload", simpanWaktuTutup);

        });

        // --- GLOBAL: hapus pesan (dipanggil oleh onclick di tiap tombol) ---
        window.hapusPesan = function(key) {
          if (!key) return;
          if (!confirm("Yakin mau hapus pesan ini?")) return;

          // hapus path di Firebase (sama dengan yang kamu push)
          db.ref("chat_messages/" + key).remove()
            .then(() => {
              console.log("Pesan dihapus:", key);
              // opsional: beri umpan balik visual singkat
              const el = document.querySelector(`[data-key="${key}"]`);
              if (el) {
                // fade out lalu remove
                el.style.transition = "opacity 200ms ease-out, transform 200ms";
                el.style.opacity = "0";
                el.style.transform = "translateY(6px)";
                setTimeout(() => el.remove(), 220);
              }
            })
            .catch(err => {
              console.error("Gagal hapus pesan:", err);
              alert("Gagal menghapus pesan: " + (err.message || err));
            });
        };


        

        // 🧠 Deteksi dan hapus session hanya saat browser/tab ditutup (bukan refresh)
        (function () {
          // Simpan flag bahwa halaman sedang aktif
          sessionStorage.setItem("pageActive", "true");

          // Saat halaman akan ditinggalkan
          window.addEventListener("pagehide", () => {
            sessionStorage.setItem("pageActive", "false");
          });

          // Saat halaman jadi tidak terlihat (biasanya saat tab ditutup)
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") {
              // Coba tunda sedikit, biar gak kehapus waktu reload biasa
              setTimeout(() => {
                const stillActive = sessionStorage.getItem("pageActive");
                if (stillActive !== "true") {
                  // Hapus session hanya kalau tab benar-benar ditutup
                  localStorage.removeItem("username");
                  localStorage.removeItem("namaPetugas");
                  localStorage.removeItem("role");
                  localStorage.removeItem("sessionExpiry");
                  localStorage.removeItem("lastActivity");

                  sessionStorage.removeItem("username");
                  sessionStorage.removeItem("namaPetugas");
                  sessionStorage.removeItem("role");
                  sessionStorage.removeItem("sessionExpiry");
                  sessionStorage.removeItem("lastActivity");
                }
              }, 300);
            }
          });
        })();


      // === CLOSE MODAL KETIKA KLIK DI LUAR KOTAK ===
      document.addEventListener("click", function(e) {
        const modal = e.target.closest(".modal-container");
        const overlay = e.target.classList.contains("modal-container");

        // Kalau klik pas area overlay (hitam), tutup modal tsb
        if (overlay && modal) {
          modal.classList.add("hidden");
        }
      });



// === PETUGAS INIT WRAPPER (added by Eji) ===
// Safe init: call common startup functions if they exist, without breaking if missing.
function __petugas_init_wrapper(){
  try {
    if (typeof listenAntreanRealtime === 'function') { listenAntreanRealtime(); }
    if (typeof listenMPPRealtime === 'function') { listenMPPRealtime(); }
    if (typeof updateDashboardView === 'function') { updateDashboardView(); }
    if (typeof cekStatusAntrean === 'function') { cekStatusAntrean(); }
    if (typeof setupEventListeners === 'function') { setupEventListeners(); }
    // expose some useful functions to window in case HTML or other code expects them globally
    if (typeof renderTicket === 'function') window.renderTicket = renderTicket;
    if (typeof showAntreanCard === 'function') window.showAntreanCard = showAntreanCard;
  } catch (err) {
    console.error("Error in __petugas_init_wrapper:", err);
  }
}

// Run on load (or immediately if already loaded)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  // slight delay to allow other scripts to finish initializing
  setTimeout(__petugas_init_wrapper, 50);
} else {
  window.addEventListener('load', __petugas_init_wrapper);
}
