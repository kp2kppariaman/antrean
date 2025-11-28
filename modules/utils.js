function normalizeDateString(tglStr) {
          if (!tglStr) return "";
          const parts = tglStr.split("/");
          if (parts.length !== 3) return tglStr;
          const [d, m, y] = parts;
          return `${parseInt(d)}/${parseInt(m)}/${y}`;
        }

function parseTanggalFlexible(tglStr) {
          if (!tglStr) return null;
          const datePart = tglStr.toString().split(" ")[0]; // handle "09/09/2025 10:00:00"
          const norm = normalizeDateString(datePart);
          const [d, m, y] = norm.split("/").map(Number);
          if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
          return new Date(y, m - 1, d);
        }

function parseTanggalFirebase(tstr) {
            return parseTanggalFlexible(tstr);
          }

function parseAnyDateField(raw) {
            if (!raw) return null;
            // ambil bagian tanggal pertama (handle "05/11/2025 10:12:00")
            const datePart = raw.toString().split(' ')[0].trim();
            return parseTanggalFirebase(datePart); // gunakan fungsi parseTanggalFirebase yang sudah ada
          }

function isSameDate(a, b) {
          if (!a || !b) return false;
          return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
          );
        }

function getStartOfWeek(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = (day === 0) ? -6 : (1 - day);
            d.setDate(d.getDate() + diff);
            d.setHours(0,0,0,0);
            return d;
          }

function ambilTanggal(item) {
            const raw = item.Tanggal_Antrean || item.Tanggal || item.Timestamps || null;
            if (!raw) return null;
            const part = raw.toString().split(" ")[0]; 
            return parseTanggalFlexible(part);
          }

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

function parseLocalTime(str) {
              const [tanggalPart, waktuPart] = str.split(", ");
              const [d, m, y] = tanggalPart.split("/").map(Number);
              const [hh, mm, ss] = waktuPart.split(".").map(Number);
              return new Date(y, m - 1, d, hh, mm, ss);
            }

function makeInlineSpinner() {
            const span = document.createElement('span');
            span.className = 'inline-block ml-2';
            span.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i>`;
            return span;
        }