/* ===========================================================
   DASHBOARD.JS — FINAL FULL VERSION
   Semua fungsi ini diambil langsung dari petugas.js kamu
=========================================================== */

/* ===========================================================
   1️⃣ Load Statistik Dashboard
=========================================================== */
function loadDashboardStats() {
    const dbRef = db.ref("data_antrean");
    dbRef.once("value", (snapshot) => {
        const data = snapshot.val() || {};

        const total = Object.keys(data).length;
        const dipanggil = Object.values(data).filter((d) => d.Status === "Dipanggil").length;
        const belumDipanggil = total - dipanggil;

        document.getElementById("totalAntrean").textContent = total;
        document.getElementById("totalDipanggil").textContent = dipanggil;
        document.getElementById("totalBelumDipanggil").textContent = belumDipanggil;
    });
}

/* ===========================================================
   2️⃣ Render Dashboard ke UI
=========================================================== */
function renderDashboard(stats) {
    document.getElementById("totalAntrean").textContent = stats.total || 0;
    document.getElementById("totalDipanggil").textContent = stats.dipanggil || 0;
    document.getElementById("totalBelumDipanggil").textContent = stats.belumDipanggil || 0;

    // Keperluan yang paling banyak & paling sedikit (jika ada)
    document.getElementById("keperluanTerbanyak").textContent = stats.keperluanMax || "-";
    document.getElementById("keperluanTerendah").textContent = stats.keperluanMin || "-";
}

/* ===========================================================
   3️⃣ Load Dashboard from Firebase (versi terbaru)
=========================================================== */
function loadDashboardFromFirebase() {
    const ref = db.ref("data_antrean");
    ref.once("value", function(snapshot) {
        const data = snapshot.val() || {};
        const values = Object.values(data);

        const stats = {
            total: values.length,
            dipanggil: values.filter((v) => v.Status === "Dipanggil").length,
            belumDipanggil: values.filter((v) => v.Status === "Belum Dipanggil").length,
            keperluanMax: "-",
            keperluanMin: "-"
        };

        renderDashboard(stats);
    });
}

/* ===========================================================
   4️⃣ Chart — Grafik Harian
=========================================================== */
function buildDailyChart(data) {
    const ctx = document.getElementById("dailyChart").getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Antrean",
                data: data.values,
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.3)",
            }],
        },
        options: { responsive: true }
    });
}

/* ===========================================================
   5️⃣ Chart — Grafik Bulanan
=========================================================== */
function buildMonthlyChart(data) {
    const ctx = document.getElementById("monthlyChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Total Bulanan",
                data: data.values,
                backgroundColor: "#10b981",
            }],
        },
        options: { responsive: true }
    });
}

/* ===========================================================
   6️⃣ Chart — Grafik Keperluan (Bar)
=========================================================== */
function buildKeperluanChart(data) {
    const ctx = document.getElementById("keperluanChart").getContext("2d");
    new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.labels,
            datasets: [{
                label: "Jumlah",
                data: data.values,
                backgroundColor: "#6366f1",
            }],
        },
        options: { responsive: true }
    });
}

/* ===========================================================
   7️⃣ Chart — Grafik Keperluan (Pie)
=========================================================== */
function buildKeperluanPie(data) {
    const ctx = document.getElementById("keperluanPie").getContext("2d");
    new Chart(ctx, {
        type: "pie",
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"],
            }],
        },
    });
}

/* ===========================================================
   8️⃣ Chart — Grafik Lainnya (Donut)
=========================================================== */
function buildLainnyaChart(data) {
    const ctx = document.getElementById("lainnyaChart").getContext("2d");
    new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                backgroundColor: ["#6366f1", "#f472b6", "#22d3ee"],
            }],
        },
    });
}
