/* ===========================================================
   IMPORT FIREBASE (MODULAR)
=========================================================== */
import { db } from "./firebase.js";
import { ref, push, update, remove, onValue } 
    from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/* ===========================================================
   RENDER LIST PENGUMUMAN
=========================================================== */
function renderListPengumuman(pengumumanList) {
    const container = document.getElementById("listPengumuman");
    container.innerHTML = "";

    if (!pengumumanList || pengumumanList.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-gray-500">
                Belum ada pengumuman.
            </div>`;
        return;
    }

    pengumumanList.forEach((p, index) => {
        const div = document.createElement("div");
        div.className =
            "p-4 bg-white rounded-lg shadow border border-gray-200 flex justify-between items-start";

        div.innerHTML = `
            <div>
                <p class="text-sm text-gray-600">${p.tanggal}</p>
                <h2 class="font-semibold text-gray-800">${p.judul}</h2>
                <p class="text-gray-700 mt-1">${p.isi}</p>
            </div>
            <div class="flex gap-2">
                <button
                    class="px-3 py-1 text-xs rounded bg-yellow-500 text-white hover:bg-yellow-600"
                    onclick="editPengumuman('${index}')"
                >Edit</button>
                <button
                    class="px-3 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600"
                    onclick="hapusPengumuman('${index}')"
                >Hapus</button>
            </div>
        `;
        container.appendChild(div);
    });
}

/* ===========================================================
   TAMBAH PENGUMUMAN
=========================================================== */
function tambahPengumuman() {
    const judul = document.getElementById("judulPengumuman").value.trim();
    const isi = document.getElementById("isiPengumuman").value.trim();

    if (!judul || !isi) {
        alert("Judul dan isi pengumuman wajib diisi!");
        return;
    }

    const tanggal = new Date().toLocaleDateString("id-ID");

    // push versi modular
    push(ref(db, "pengumuman"), {
        judul,
        isi,
        tanggal,
    });

    document.getElementById("judulPengumuman").value = "";
    document.getElementById("isiPengumuman").value = "";
}

/* ===========================================================
   EDIT PENGUMUMAN
=========================================================== */
function editPengumuman(index) {
    const judulBaru = prompt("Masukkan judul baru:");
    if (!judulBaru) return;

    const isiBaru = prompt("Masukkan isi baru:");
    if (!isiBaru) return;

    // update versi modular
    update(ref(db, "pengumuman/" + index), {
        judul: judulBaru,
        isi: isiBaru,
    });
}

/* ===========================================================
   HAPUS PENGUMUMAN
=========================================================== */
function hapusPengumuman(index) {
    if (!confirm("Yakin ingin menghapus pengumuman ini?")) return;

    // remove versi modular
    remove(ref(db, "pengumuman/" + index));
}

/* ===========================================================
   REALTIME LISTENER PENGUMUMAN (MODULAR)
=========================================================== */
onValue(ref(db, "pengumuman"), (snapshot) => {
    const data = snapshot.val() || {};
    const pengumumanList = Object.keys(data).map((k) => data[k]);
    renderListPengumuman(pengumumanList);
});

/* ===========================================================
   GLOBAL EXPORT (WAJIB UNTUK HTML onclick="")
=========================================================== */
window.renderListPengumuman = renderListPengumuman;
window.tambahPengumuman = tambahPengumuman;
window.editPengumuman = editPengumuman;
window.hapusPengumuman = hapusPengumuman;
