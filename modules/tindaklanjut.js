/* ===========================================================
   BUKA FORM TAMBAH TINDAK LANJUT
=========================================================== */
function openAddTindakLanjut(noAntrean) {
    const key = noAntrean.replace(/\//g, "_");

    db.ref("data_antrean/" + key).once("value").then((snapshot) => {
        const data = snapshot.val();
        if (!data) return alert("Data tidak ditemukan.");

        document.getElementById("tlNama").value = data.Nama || "";
        document.getElementById("tlNik").value = data.NIK_NPWP || "";
        document.getElementById("tlNoAntrean").value = data.No_Antrean || "";
        document.getElementById("tlKeperluan").value = data.Keperluan || "";
        document.getElementById("tlKeterangan").value = data.Keterangan || "";

        document.getElementById("tambahTindakModal").classList.remove("hidden");
    });
}

/* ===========================================================
   RESET SEMUA FIELD FORM TINDAK LANJUT
=========================================================== */
function resetAllTambahTindakForms() {
    document.getElementById("tlNama").value = "";
    document.getElementById("tlNik").value = "";
    document.getElementById("tlNoAntrean").value = "";
    document.getElementById("tlKeperluan").value = "";
    document.getElementById("tlKeterangan").value = "";
    document.getElementById("tlCatatan").value = "";
}

/* ===========================================================
   LIHAT DETAIL TINDAK LANJUT (ASLI)
=========================================================== */
function lihatDetail(noAntrean) {
    const key = noAntrean.replace(/\//g, "_");

    db.ref("tindak_lanjut/" + key).once("value").then((snapshot) => {
        const data = snapshot.val();
        if (!data) {
            alert("Data tindak lanjut tidak ditemukan.");
            return;
        }

        document.getElementById("detailNoAntrean").value = data.No_Antrean || "-";
        document.getElementById("detailNama").value = data.Nama || "-";
        document.getElementById("detailNik").value = data.NIK_NPWP || "-";
        document.getElementById("detailKeperluan").value = data.Keperluan || "-";
        document.getElementById("detailKeterangan").value = data.Keterangan || "-";
        document.getElementById("detailCatatan").value = data.Catatan || "-";
        document.getElementById("detailPetugas").value = data.Petugas || "-";
        document.getElementById("detailTimestamp").value = data.Timestamps || "-";

        document.getElementById("detailTindakModal").classList.remove("hidden");
    });
}
