/* ===========================================================
2️⃣ RENDER TABEL ANTREAN — DIAMBIL LENGKAP DARI petugas.js
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
            <button class="${r.Status === 'Belum Dipanggil'
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-red-600 hover:bg-red-700'} text-white text-xs font-semibold px-3 py-1 rounded" 
              onclick="toggleStatusAntrean('${r.No_Antrean}', '${r.Status}')">
              ${r.Status === 'Belum Dipanggil' ? 'Panggil' : 'Batal'}
            </button>
            <button class="bg-gray-200 hover:bg-gray-300 text-xs font-semibold px-3 py-1 rounded"
              onclick="bukaInfoAntrean('${r.No_Antrean}')">Info</button>
          </div>
        </td>
      `;
        body.appendChild(tr);
    });
}

/* ===========================================================
Toggle Status Antrean
=========================================================== */
function toggleStatusAntrean(noAntrean, status) {
    const key = noAntrean.split("/").join("_");
    const newStatus = status === "Belum Dipanggil" ? "Dipanggil" : "Belum Dipanggil";

    const updateData = { Status: newStatus };

    if (newStatus === "Dipanggil") {
        const petugas = localStorage.getItem("namaPetugas") || "-";
        updateData.Petugas = petugas;
    }

    db.ref("data_antrean/" + key).update(updateData);
}

/* ===========================================================
Modal Info Antrean
=========================================================== */
function bukaInfoAntrean(noAntrean) {
    const key = noAntrean.split("/").join("_");
    db.ref("data_antrean/" + key).once("value").then((snapshot) => {
        const data = snapshot.val();
        if (!data) return alert("Data tidak ditemukan.");

        document.getElementById("infoNo").value = data.No_Antrean || "";
        document.getElementById("infoNama").value = data.Nama || "";
        document.getElementById("infoNik").value = data.NIK_NPWP || "";
        document.getElementById("infoHP").value = data.No_HP_WA || "";
        document.getElementById("infoEmail").value = data.Email || "";
        document.getElementById("infoKeperluan").value = data.Keperluan || "";
        document.getElementById("infoKeterangan").value = data.Keterangan || "";
        document.getElementById("infoTimestamp").value = data.Timestamps || "-";
        document.getElementById("infoStatus").value = data.Status || "-";
        document.getElementById("infoPetugas").value = data.Petugas || "-";

        document.getElementById("infoModal").classList.remove("hidden");
    });
}

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

    document.getElementById("infoModal").classList.remove("hidden");
}
