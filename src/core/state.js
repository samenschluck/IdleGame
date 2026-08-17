// Speicherstand: Erzeugen, Laden, Migrieren, Sichern.
// Ein einziges JSON-Objekt in localStorage. Versioniert, damit spätere
// Balance-/Feature-Änderungen alte Stände nicht zerschießen.

import { blockMaxHp } from './balance.js';

export const SAVE_KEY = 'tiefenschacht.save.v1';
export const SAVE_VERSION = 1;

export function createState() {
  return {
    v: SAVE_VERSION,
    savedAt: Date.now(),

    depth: 0,
    maxDepth: 0,
    blockHp: blockMaxHp(0),

    gold: 0,
    crystals: 0,
    runes: 0,

    miners: {},
    upgrades: {},
    crystalUpgrades: {},

    boostUntil: 0,
    blastBlocks: 0,
    freebieReadyAt: 0,
    bombReadyAt: 0,

    stats: {
      blocksBroken: 0,
      taps: 0,
      bossesSlain: 0,
      collapses: 0,
      goldEarned: 0,
      crystalsEarned: 0,
      geodes: 0,
      playtimeMs: 0,
      startedAt: Date.now(),
    },

    seenLayers: { topsoil: true },
    log: [],
  };
}

export function load() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return createState(); // Privater Modus o.ä. — dann eben ohne Persistenz.
  }
  if (!raw) return createState();

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn('Speicherstand unlesbar, starte neu.');
    return createState();
  }
  return migrate(data);
}

/** Alte Stände auf das aktuelle Schema heben und fehlende Felder auffüllen. */
function migrate(data) {
  const fresh = createState();
  // Nur Felder übernehmen, die es im aktuellen Schema gibt.
  const state = { ...fresh, ...data, v: SAVE_VERSION };
  state.stats = { ...fresh.stats, ...(data.stats || {}) };
  state.miners = { ...(data.miners || {}) };
  state.upgrades = { ...(data.upgrades || {}) };
  state.crystalUpgrades = { ...(data.crystalUpgrades || {}) };
  state.seenLayers = { ...fresh.seenLayers, ...(data.seenLayers || {}) };
  state.log = Array.isArray(data.log) ? data.log.slice(-40) : [];

  // Plausibilität: kaputte/fehlende Zahlen abfangen.
  for (const key of ['depth', 'maxDepth', 'gold', 'crystals', 'runes', 'blockHp']) {
    if (typeof state[key] !== 'number' || !isFinite(state[key]) || state[key] < 0) {
      state[key] = fresh[key];
    }
  }
  state.depth = Math.floor(state.depth);
  state.maxDepth = Math.max(state.maxDepth, state.depth);
  const max = blockMaxHp(state.depth);
  if (state.blockHp <= 0 || state.blockHp > max) state.blockHp = max;

  return state;
}

export function save(state) {
  state.savedAt = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('Speichern fehlgeschlagen', err);
    return false;
  }
}

export function wipe() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* egal */
  }
}

/** Export/Import als Base64 — Backup ohne Cloud, funktioniert per Copy-Paste. */
export function exportSave(state) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(text) {
  const json = decodeURIComponent(escape(atob(text.trim())));
  return migrate(JSON.parse(json));
}
