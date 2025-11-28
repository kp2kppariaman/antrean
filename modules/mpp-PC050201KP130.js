/* ===========================================================
   RENDER TABEL MPP (DIAMBIL DARI petugas.js)
=========================================================== */
function renderTableMPP(rows) {
    const body = document.getElementById("tabelMPPBody");
    body.innerHTML = "";
    
    if (!rows || rows.length === 0) {
        body.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-10 text-gray-700">
            Tidak ada data MPP hari ini.
            </td>
        </tr>`;
        return;
    }

    rows.sort((a, b) => {
        const numA = parseInt((a.No_Antrean || "0").split("-")[0].replace(/\D/g, ""));
        const numB = parseInt((b.No_Antrean || "0").split("-")[0].replace(/\D/g, ""));
        return numB - numA;
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
            <button class="${r.Status === "Belum Dipanggil"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            } text-white text-xs font-semibold px-3 py-1 rounded"
                onclick="toggleStatusMPP('${r.No_Antrean}', '${r.Status}')">
                ${r.Status === "Belum Dipanggil" ? "Panggil" : "Batal"}
            </button>

            <button class="bg-gray-200 hover:bg-gray-300 text-xs font-semibold px-3 py-1 rounded"
                onclick="bukaInfoMPP('${r.No_Antrean}')">
                Info
            </button>
            </div>
        </td>
        `;
        body.appendChild(tr);
    });
}


/* ===========================================================
   TOGGLE STATUS MPP (VERSI FIREBASE — BUKAN Apps Script)
=========================================================== */
function toggleStatusMPP(noAntrean, status) {
    const key = noAntrean.split("/").join("_");
    const newStatus = status === "Belum Dipanggil" ? "Dipanggil" : "Belum Dipanggil";

    const updateData = { Status: newStatus };

    if (newStatus === "Dipanggil") {
        const petugas = localStorage.getItem("namaPetugas") || "-";
        updateData.Petugas = petugas;
    }

    db.ref("data_mpp/" + key).update(updateData);
}


/* ===========================================================
   BUKA INFO MPP (AMBIL DARI Firebase)
=========================================================== */
function bukaInfoMPP(noAntrean) {
    const key = noAntrean.split("/").join("_");

    db.ref("data_mpp/" + key).once("value").then((snapshot) => {
        const data = snapshot.val();
        if (!data) return alert("Data tidak ditemukan.");

        document.getElementById("infoNoMPP").value = data.No_Antrean || "";
        document.getElementById("infoNamaMPP").value = data.Nama || "";
        document.getElementById("infoNikMPP").value = data.NIK_NPWP || "";
        document.getElementById("infoHPMPP").value = data.No_HP_WA || "";
        document.getElementById("infoEmailMPP").value = data.Email || "";
        document.getElementById("infoKeperluanMPP").value = data.Keperluan || "";
        document.getElementById("infoKeteranganMPP").value = data.Keterangan || "";
        document.getElementById("infoTimestampMPP").value = data.Timestamps || "-";
        document.getElementById("infoStatusMPP").value = data.Status || "-";
        document.getElementById("infoPetugasMPP").value = data.Petugas || "-";

        document.getElementById("infoModalMPP").classList.remove("hidden");
    });
}


/* ===========================================================
   ⬇️ BAGIAN WAJIB UNTUK SISTEM MODULAR
   (Supaya fungsi bisa dipanggil dari HTML)
=========================================================== */
window.renderTableMPP = renderTableMPP;
window.toggleStatusMPP = toggleStatusMPP;
window.bukaInfoMPP = bukaInfoMPP;
