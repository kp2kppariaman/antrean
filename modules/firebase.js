/* ===============================
🔥 Firebase Config & Init
=============================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
  getDatabase, ref, get, set, push, update, remove, onValue, runTransaction 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

/* ===============================
🔥 Helper
=============================== */

export const normalizeKey = (no) => no.replace(/\//g, "_");

/* ===============================
🔥 Antrean Functions
=============================== */

export async function hapusAntreanFirebase(noAntrean) {
  const key = normalizeKey(noAntrean);
  await remove(ref(db, "data_antrean/" + key));
}

export async function hapusMPPFirebase(noAntrean) {
  const key = normalizeKey(noAntrean);
  await remove(ref(db, "data_mpp/" + key));
}

export async function fetchSourceByNo(noAntreanRaw) {
  const key = normalizeKey(noAntreanRaw);

  const snapA = await get(ref(db, "data_antrean/" + key));
  if (snapA.exists()) return snapA.val();

  const snapM = await get(ref(db, "data_mpp/" + key));
  if (snapM.exists()) return snapM.val();

  return null;
}

/* ===============================
🔥 Tindak Lanjut Functions
=============================== */

// Generate nomor TL otomatis → TL001-DD/MM/YYYY
export async function generateTLNo() {
  const now = new Date();
  const tanggalHariIni = now.toLocaleDateString("id-ID");
  const tanggalKey = tanggalHariIni.replace(/\//g, "_");
  const counterRef = ref(db, "tindak_lanjut_counter/" + tanggalKey);

  const result = await runTransaction(counterRef, (current) => (current || 0) + 1);
  const next = result.snapshot.val() || 1;

  return {
    no: `TL${String(next).padStart(3, "0")}-${tanggalHariIni}`,
    tanggalHariIni
  };
}

export async function saveTindakToFirebase(payload) {
  const keySafe = normalizeKey(payload.No_Antrean);
  await set(ref(db, "tindak_lanjut/" + keySafe), payload);
}

export async function updateTindakFirebase(noAntrean, updates) {
  const keySafe = normalizeKey(noAntrean);
  await update(ref(db, "tindak_lanjut/" + keySafe), updates);
}

export async function deleteTindakFirebase(noAntrean) {
  const keySafe = normalizeKey(noAntrean);
  await remove(ref(db, "tindak_lanjut/" + keySafe));
}

/* ===============================
🔥 Realtime Listeners (Reusable)
=============================== */

export function listenAntreanRealtime(callback) {
  return onValue(ref(db, "data_antrean"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.values(data));
  });
}

export function listenMPPRealtime(callback) {
  return onValue(ref(db, "data_mpp"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.values(data));
  });
}

export function listenDashboardAntreanRealtime(callback) {
  return onValue(ref(db, "data_antrean"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.values(data));
  });
}

export function listenTindakLanjutRealtime(callback) {
  return onValue(ref(db, "tindak_lanjut"), (snapshot) => {
    const data = snapshot.val() || {};
    callback(Object.values(data));
  });
}
