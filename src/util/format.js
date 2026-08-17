// Zahlen- und Zeitformatierung.
// Idle-Games erzeugen absurd große Zahlen; ab 1e15 wird auf aa/ab/ac… umgestellt.

const SHORT = ['', 'K', 'M', 'B', 'T'];
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';

function suffix(tier) {
  if (tier < SHORT.length) return SHORT[tier];
  const i = tier - SHORT.length;
  return ALPHA[Math.floor(i / 26) % 26] + ALPHA[i % 26];
}

/** Kompakte Zahl, z.B. 1.23M */
export function fmt(n) {
  if (n === Infinity) return '∞';
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1) return n === 0 ? '0' : n.toFixed(2);
  if (n < 1000) return n < 10 ? trim(n.toFixed(2)) : Math.floor(n).toString();

  const tier = Math.floor(Math.log10(n) / 3);
  const scaled = n / Math.pow(1000, tier);
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  return trim(scaled.toFixed(digits)) + suffix(tier);
}

function trim(s) {
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

/** Ganzzahl mit Tausenderpunkten, für kleine Werte wie Kristalle. */
export function fmtInt(n) {
  if (n >= 1e6) return fmt(n);
  return Math.floor(n).toLocaleString('de-DE');
}

/** Sekunden → "2h 14m" / "45s" */
export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600) % 24;
  const d = Math.floor(sec / 86400);
  if (d > 0) return `${d}t ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${sec % 60}s`;
}

/** Tiefe in Metern. */
export function fmtDepth(m) {
  return fmtInt(m) + ' m';
}
