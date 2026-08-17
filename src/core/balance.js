// ALLE Spielformeln an einem Ort. Wer balancen will, ändert nur diese Datei
// (und die Zahlen in src/data/*). Keine DOM-Zugriffe, keine Seiteneffekte.

import { MINERS, COST_GROWTH } from '../data/miners.js';
import { FORGE_BY_ID, CRYSTAL_BY_ID } from '../data/upgrades.js';
import { layerIndexAt, isBossDepth } from '../data/layers.js';

// ── Block-Härte & Ertrag ────────────────────────────────────────────────────
// HP wächst minimal schneller als Gold — dadurch läuft man irgendwann
// zwangsläufig in eine Wand und der Einsturz (Prestige) wird attraktiv.
const HP_BASE = 12;
const HP_GROWTH = 1.055;
const GOLD_BASE = 5;
const GOLD_GROWTH = 1.045;
const BOSS_HP_MULT = 14;
const BOSS_GOLD_MULT = 25;

export function blockMaxHp(depth) {
  const hp = HP_BASE * Math.pow(HP_GROWTH, depth);
  return isBossDepth(depth) ? hp * BOSS_HP_MULT : hp;
}

export function blockGold(state, depth) {
  let gold = GOLD_BASE * Math.pow(GOLD_GROWTH, depth);
  if (isBossDepth(depth)) gold *= BOSS_GOLD_MULT;
  return gold * goldMultiplier(state);
}

// ── Multiplikatoren ─────────────────────────────────────────────────────────

// Wichtig: der Runenbonus MUSS exponentiell in der Runenzahl wachsen.
// Die Blockhärte wächst exponentiell mit der Tiefe (HP_GROWTH^depth), ein
// polynomialer Bonus fällt dagegen sofort zurück und Prestige lohnt sich
// nach zwei, drei Läufen nicht mehr.
const RUNE_BASE = 1.25;

export function runeMultiplier(runes) {
  if (runes <= 0) return 1;
  return Math.pow(RUNE_BASE, runes);
}

export function goldMultiplier(state) {
  const carts = lvl(state.upgrades, 'carts');
  return Math.pow(1.15, carts) * runeMultiplier(state.runes);
}

/** Grabkraft pro Sekunde aus allen Zwergen. */
export function totalDps(state, now = Date.now()) {
  const gear = Math.pow(1.12, lvl(state.upgrades, 'gear'));
  const diligence = 1 + 0.05 * lvl(state.crystalUpgrades, 'foresight');
  let base = 0;
  for (const m of MINERS) {
    const count = state.miners[m.id] || 0;
    if (count > 0) base += count * m.dps;
  }
  let dps = base * gear * diligence * runeMultiplier(state.runes);
  if (state.boostUntil > now) dps *= 8;
  return dps;
}

/** Schaden eines einzelnen Tipps (ohne Krit). */
export function tapDamage(state, now = Date.now()) {
  const pick = Math.pow(1.25, lvl(state.upgrades, 'pickaxe'));
  // Tippen bleibt relevant, indem es an der Auto-Grabkraft mitwächst.
  const share = totalDps(state, now) * 0.15;
  let dmg = (2 * pick + share) * runeMultiplier(state.runes);
  if (state.boostUntil > now) dmg *= 8;
  return dmg;
}

export function critChance(state) {
  return Math.min(0.6, 0.015 * lvl(state.upgrades, 'lantern'));
}

export function critMultiplier(state) {
  return 2 + 0.5 * lvl(state.upgrades, 'powder');
}

// ── Kosten ──────────────────────────────────────────────────────────────────

export function minerCost(miner, owned) {
  return miner.baseCost * Math.pow(COST_GROWTH, owned);
}

/** Kosten für `amount` weitere Einheiten (geometrische Reihe). */
export function minerCostBulk(miner, owned, amount) {
  const r = COST_GROWTH;
  return (
    miner.baseCost * Math.pow(r, owned) * (Math.pow(r, amount) - 1) / (r - 1)
  );
}

/** Wie viele Einheiten kann man sich mit `gold` maximal leisten? */
export function maxAffordable(miner, owned, gold) {
  const r = COST_GROWTH;
  const first = miner.baseCost * Math.pow(r, owned);
  if (gold < first) return 0;
  const n = Math.log((gold * (r - 1)) / first + 1) / Math.log(r);
  return Math.max(0, Math.floor(n + 1e-9));
}

export function forgeCost(id, level) {
  return FORGE_BY_ID[id].cost(level);
}

export function crystalCost(id, level) {
  return CRYSTAL_BY_ID[id].cost(level);
}

// ── Kristalle ───────────────────────────────────────────────────────────────

/** Chance, dass ein Block eine Geode enthält. */
export function geodeChance(state, depth) {
  const base = 0.012 + 0.0015 * layerIndexAt(depth);
  const survey = Math.pow(1.12, lvl(state.upgrades, 'survey'));
  const gespuer = Math.pow(1.25, lvl(state.crystalUpgrades, 'prospecting'));
  return Math.min(0.35, base * survey * gespuer);
}

/** Kristalle aus einer Geode. */
export function geodeYield(state, depth, rand) {
  const layer = layerIndexAt(depth);
  const base = 1 + Math.floor(layer * 0.7) + lvl(state.crystalUpgrades, 'yield');
  const roll = Math.floor(rand() * (1 + layer));
  return base + roll;
}

/** Freebie-Ertrag — skaliert bewusst stark mit Fortschritt. */
export function freebieYield(state) {
  return Math.floor(5 + state.maxDepth / 25 + state.runes);
}

/** Geodenbombe — der "Gem Bomb"-Burst. */
export function bombYield(state) {
  return Math.floor(10 + state.maxDepth / 15 + state.runes * 2);
}

export function bossCrystals(depth) {
  return 3 + layerIndexAt(Math.max(0, depth - 1)) * 3;
}

export const FREEBIE_COOLDOWN = 2 * 3600 * 1000; // 2 h
export const BOMB_COOLDOWN = 20 * 60 * 1000; // 20 min

// ── Prestige ────────────────────────────────────────────────────────────────

export const PRESTIGE_MIN_DEPTH = 120;

export function runeGain(state) {
  if (state.maxDepth < PRESTIGE_MIN_DEPTH) return 0;
  const raw = Math.pow(state.maxDepth / 40, 1.3);
  const bonus = 1 + 0.1 * lvl(state.crystalUpgrades, 'runeboost');
  return Math.max(0, Math.floor(raw * bonus) - state.runes);
}

/** Kristalle als zusätzlicher Anreiz für den Einsturz. */
export function prestigeCrystals(state) {
  return Math.floor(runeGain(state) * 0.5);
}

export function startDepth(state) {
  return 25 * lvl(state.crystalUpgrades, 'headstart');
}

// ── Offline ─────────────────────────────────────────────────────────────────

export function offlineCapMs(state) {
  return (8 + 2 * lvl(state.crystalUpgrades, 'offline')) * 3600 * 1000;
}

// ── Helfer ──────────────────────────────────────────────────────────────────

function lvl(map, id) {
  return (map && map[id]) || 0;
}
