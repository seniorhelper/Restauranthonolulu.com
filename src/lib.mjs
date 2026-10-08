// Shared helpers: escaping, formatting, hours logic, geo.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const attr = esc;

export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
export const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

export function fmtTime(t) {
  let [h, m] = t.split(':').map(Number);
  if (h === 24 || (h === 0 && m === 0)) return 'midnight';
  if (h === 12 && m === 0) return 'noon';
  const ap = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;
  return m ? `${h}:${String(m).padStart(2, '0')} ${ap}` : `${h} ${ap}`;
}
export const fmtRange = ([o, c]) => `${fmtTime(o)}–${fmtTime(c)}`;

// Closing time in minutes after the opening day's midnight (handles past-midnight closes).
export const closeMin = ([o, c]) => (toMin(c) <= toMin(o) ? toMin(c) + 1440 : toMin(c));

// Open late = closes at or after 10 pm on at least one day.
export function isLate(r) {
  return !!r.hours && Object.values(r.hours).some((d) => d.some((rg) => closeMin(rg) >= 22 * 60));
}
export function latestClose(r) {
  if (!r.hours) return null;
  let best = null;
  for (const d of DAY_ORDER) for (const rg of r.hours[d] || []) if (!best || closeMin(rg) > closeMin(best)) best = rg;
  return best;
}

// Compress hours to lines like "Tue–Sat 10 am–7:30 pm" / "Sun, Mon closed".
export function hoursLines(hours) {
  if (!hours) return [];
  const key = (d) => (hours[d] || []).map(fmtRange).join(', ') || 'Closed';
  const out = [];
  let start = 0;
  for (let i = 1; i <= DAY_ORDER.length; i++) {
    if (i === DAY_ORDER.length || key(DAY_ORDER[i]) !== key(DAY_ORDER[start])) {
      const a = DAY_SHORT[DAY_ORDER[start]], b = DAY_SHORT[DAY_ORDER[i - 1]];
      out.push([i - 1 === start ? a : `${a}–${b}`, key(DAY_ORDER[start])]);
      start = i;
    }
  }
  return out;
}

export function fmtDays(days) {
  const idx = days.map((d) => DAY_ORDER.indexOf(d)).sort((a, b) => a - b);
  const parts = [];
  let s = idx[0], p = idx[0];
  for (let i = 1; i <= idx.length; i++) {
    if (idx[i] === p + 1) { p = idx[i]; continue; }
    parts.push(s === p ? DAY_SHORT[DAY_ORDER[s]] : `${DAY_SHORT[DAY_ORDER[s]]}–${DAY_SHORT[DAY_ORDER[p]]}`);
    s = p = idx[i];
  }
  return idx.length === 7 ? 'Daily' : parts.join(', ');
}

export const price$ = (p) => (p ? '$'.repeat(p) : '—');
export const PRICE_LABEL = { 1: 'Under $15', 2: '$15–30', 3: '$30–60', 4: '$60+' };

export function miles(a, b) {
  if (a.lat == null || b.lat == null) return Infinity;
  const R = 3958.8, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = String(s).split('-').map(Number);
  if (!m) return String(y);
  if (!d) return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻ‘’'`]/g, '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[ʻ‘’`]/g, '').replace(/'/g, '').toLowerCase();

export const mapsUrl = (r) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name} ${r.address || 'Honolulu, HI'}`)}`;
