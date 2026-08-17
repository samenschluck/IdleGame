// ALLE Spielformeln an einem Ort. Wer balancen will, ändert nur diese Datei
// (und die Zahlen in src/data/*). Keine DOM-Zugriffe, keine Seiteneffekte.
//
// ── Warum das Spiel so skaliert, wie es skaliert ────────────────────────────
//
// Die erste Fassung hatte genau einen Engpass: Gold → Grabkraft. Gold pro Block
// waechst exponentiell mit der Tiefe, die Kosten eines Zwergs aber nur mit
// seiner Anzahl. Sobald das Einkommen die Kosten ueberholt hatte, kaufte man
// alles auf einmal und rutschte durch sechs Schichten am Stueck — bis die
// Zwergenliste leer war. Nicht die Oekonomie hat gebremst, sondern der Content.
//
// Deshalb gibt es jetzt drei unabhaengige Achsen:
//
//   1. HAERTE (Tiefe)     Jede Schicht verlangt eine Mindest-Hacke. Zu schwach
//                         heisst: fast kein Schaden. Gold hilft hier gar nicht.
//   2. ERZ (Durchsatz)    Erz faellt pro BLOCK, nicht pro Meter — also linear
//                         statt exponentiell. Eine neue Hacke kostet Erz, und
//                         das laesst sich nur durch Zeit im Stollen beschaffen.
//   3. GOLD (Tempo)       Bleibt der Beschleuniger: mehr Zwerge, mehr Blöcke
//                         pro Sekunde, also schneller Erz. Aber Gold allein
//                         bringt einen keinen Meter tiefer.
//
// Ein Durchbruch braucht damit immer zwei Dinge gleichzeitig, und genau das
// erzeugt den Rhythmus vortreiben → Wand → ausbeuten → schmieden → Durchbruch.

import { MINERS, COST_GROWTH } from '../data/miners.js';
import { FORGE_BY_ID, CRYSTAL_BY_ID } from '../data/upgrades.js';
import { LAYERS, layerIndexAt, layerAt, isBossDepth } from '../data/layers.js';
import { pickAt } from '../data/picks.js';

// ── Stellschrauben ──────────────────────────────────────────────────────────
// Als Objekt statt als const, damit tools/tune.mjs Werte durchsweepen kann,
// ohne dass der Spielcode Tuning-Sonderwege braucht.

export const TUNING = {
  hpBase: 10,
  hpPerLayer: 26, // Härtesprung von Schicht zu Schicht
  hpWithinLayer: 6, // Faktor vom Anfang bis zum Ende einer Schicht
  goldShare: 0.5, // Gold pro Block, gemessen an dessen HP
  digOre: 0.3, // Erzanteil beim Vortreiben …
  farmOre: 3, // … und beim Ausbeuten
  bossHp: 20,
  bossGold: 30,
  endlessHpGrowth: 1.008, // pro Meter jenseits der letzten Schichtgrenze
};

// ── Block-Härte & Ertrag ────────────────────────────────────────────────────
//
// Die Härte haengt an der SCHICHT, nicht am einzelnen Meter.
//
// Vorher wuchs sie mit 1,032^Tiefe. Das klingt harmlos, heisst aber: ein Block
// auf 820 m hat das Fuenftausendfache der HP eines Blocks auf 540 m — waehrend
// er unveraendert genau ein Erz abwirft. Ausgerechnet an der Wand, wo man
// zwangslaeufig steht und Erz braucht, wurde das Farmen also unbezahlbar
// (gemessen: elf Stunden fuer eine Hacke). Jetzt ist die Haerte innerhalb einer
// Schicht nahezu flach und springt nur beim Schichtwechsel — genau da, wo auch
// eine neue Hacke und eine neue Zwergenstufe dazukommen.

/** Grenzen der Schicht, in der `depth` liegt. */
function layerSpan(depth) {
  const i = layerIndexAt(depth);
  const from = i === 0 ? 0 : LAYERS[i - 1].to;
  const to = LAYERS[i].to === Infinity ? from + 600 : LAYERS[i].to;
  return { i, from, to };
}

/** HP eines Blocks ohne Wächter-Zuschlag. */
function baseHp(depth) {
  const { i, from, to } = layerSpan(depth);
  const t = Math.min(1, (depth - from) / (to - from));
  let hp = TUNING.hpBase * Math.pow(TUNING.hpPerLayer, i) * Math.pow(TUNING.hpWithinLayer, t);
  // Endlos-Schicht: ab hier wieder pro Meter, damit es nie ganz aufhört.
  if (depth > to) hp *= Math.pow(TUNING.endlessHpGrowth, depth - to);
  return hp;
}

/**
 * HP eines Blocks. `alive` sagt, ob der Waechter dieser Tiefe noch steht —
 * ein bereits erschlagener Waechter hinterlaesst normales Gestein.
 */
export function blockMaxHp(depth, alive = true) {
  const hp = baseHp(depth);
  return alive && isBossDepth(depth) ? hp * TUNING.bossHp : hp;
}

export function blockGold(state, depth, boss = isBossDepth(depth)) {
  // Gold haengt an der Blockhaerte: wer haertere Blöcke bricht, verdient mehr.
  let gold = baseHp(depth) * TUNING.goldShare;
  if (boss) gold *= TUNING.bossGold;
  return gold * goldMultiplier(state);
}

// ── Härte: die Wand ─────────────────────────────────────────────────────────

/** Um wie viele Stufen ist die Hacke zu schwach? 0 = ausreichend. */
export function hardnessShortfall(state, depth = state.depth) {
  return Math.max(0, layerAt(depth).hardness - pickAt(state.pickTier).power);
}

/**
 * Schadensfaktor bei zu schwacher Hacke. Eine Stufe zu wenig ist zaeh aber
 * machbar (25 %) — man MUSS dort ja das Erz fuer die naechste Hacke abbauen.
 * Zwei Stufen sind mit 6 % praktisch dicht. Bewusst kein harter
 * Riegel: man darf sich in die naechste Schicht hineinquaelen, es lohnt nur
 * nicht — die Botschaft ist "schmiede endlich", nicht "du darfst nicht".
 */
export function hardnessFactor(state, depth = state.depth) {
  const short = hardnessShortfall(state, depth);
  return short === 0 ? 1 : Math.pow(0.25, short);
}

// ── Multiplikatoren ─────────────────────────────────────────────────────────

// Der Runenbonus muss exponentiell in der Runenzahl wachsen: die Blockhaerte
// waechst exponentiell mit der Tiefe, ein polynomialer Bonus faellt dagegen
// sofort zurueck und Prestige lohnt sich nach zwei, drei Laeufen nicht mehr.
const RUNE_BASE = 1.18;

export function runeMultiplier(runes) {
  return runes <= 0 ? 1 : Math.pow(RUNE_BASE, runes);
}

/**
 * Barren aus dem Schmelzofen. Bewusst UNTERlinear: der Ofendurchsatz waechst
 * mit jedem Ausbau exponentiell, ein linearer Bonus daraus wuerde jeden
 * anderen Multiplikator im Spiel bedeutungslos machen.
 *   100 Barren ≈ ×3,3 · 10 000 ≈ ×20 · 1 Mio ≈ ×126
 */
export function barMultiplier(state) {
  const bars = state.bars || 0;
  return bars <= 0 ? 1 : 1 + 0.5 * Math.pow(bars, 0.4);
}

export function goldMultiplier(state) {
  const carts = lvl(state.upgrades, 'carts');
  return Math.pow(1.15, carts) * runeMultiplier(state.runes);
}

/** Rohe Grabkraft pro Sekunde — ohne Härte-Abzug. */
export function rawDps(state, now = Date.now()) {
  const gear = Math.pow(1.12, lvl(state.upgrades, 'gear'));
  const diligence = 1 + 0.05 * lvl(state.crystalUpgrades, 'foresight');
  let base = 0;
  for (const m of MINERS) {
    const count = state.miners[m.id] || 0;
    if (count > 0) base += count * m.dps;
  }
  let dps = base * gear * diligence * barMultiplier(state) * runeMultiplier(state.runes);
  if (state.boostUntil > now) dps *= 8;
  return dps;
}

/** Tatsächlich wirksame Grabkraft — das, was am Block ankommt. */
export function totalDps(state, now = Date.now()) {
  return rawDps(state, now) * hardnessFactor(state);
}

/** Schaden eines einzelnen Tipps (ohne Krit). */
export function tapDamage(state, now = Date.now()) {
  const pick = pickAt(state.pickTier).power;
  const pickUp = Math.pow(1.25, lvl(state.upgrades, 'pickaxe'));
  // Tippen bleibt relevant, indem es an der Auto-Grabkraft mitwächst.
  const share = rawDps(state, now) * 0.15;
  let dmg = (2 * pick * pickUp + share) * runeMultiplier(state.runes) * barMultiplier(state);
  if (state.boostUntil > now) dmg *= 8;
  return dmg * hardnessFactor(state);
}

export function critChance(state) {
  return Math.min(0.6, 0.015 * lvl(state.upgrades, 'lantern'));
}

export function critMultiplier(state) {
  return 2 + 0.5 * lvl(state.upgrades, 'powder');
}

// ── Erz ─────────────────────────────────────────────────────────────────────

/**
 * Erz pro zerschlagenem Block.
 *
 * Vortreiben wirft bewusst wenig ab, Ausbeuten das Zehnfache davon. Sonst
 * sammelt man das Erz fuer die naechste Hacke beiläufig beim Durchqueren der
 * Schicht ein — dann ist die Haerte keine Wand mehr, sondern eine Schwelle,
 * und die Schichten fallen im Minutentakt hintereinander weg. Genau das hat
 * die Messung vorher gezeigt.
 */
export function oreYield(state, vein = 1) {
  const rich = 1 + 0.25 * lvl(state.upgrades, 'sorting');
  const mode = state.mode === 'farm' ? TUNING.farmOre : TUNING.digOre;
  return vein * rich * mode;
}

/** Nur fuer die Anzeige: wie viel mehr Erz das Ausbeuten bringt. */
export const FARM_ORE_BONUS = () => TUNING.farmOre / TUNING.digOre;

/** Fassungsvermögen des Lagers, pro Erzsorte. */
export function depotCap(state) {
  return Math.floor(400 * Math.pow(2.2, lvl(state.upgrades, 'depot')));
}

// ── Adern (Veins): Block-Varianten ──────────────────────────────────────────
// Gibt jedem Block eine kleine Chance, etwas Besonderes zu sein. Kostet fast
// nichts an Code, macht das Zusehen aber deutlich lebendiger.

export const VEINS = {
  normal: { id: 'normal', name: '', mult: 1, weight: 1 },
  rich: { id: 'rich', name: 'Reiche Ader', mult: 6, weight: 0.06, icon: '✨' },
  motherlode: { id: 'motherlode', name: 'Hauptader', mult: 25, weight: 0.008, icon: '🌟' },
};

export function rollVein(state, rand) {
  const luck = 1 + 0.15 * lvl(state.crystalUpgrades, 'prospecting');
  const r = rand();
  if (r < VEINS.motherlode.weight * luck) return VEINS.motherlode;
  if (r < VEINS.rich.weight * luck) return VEINS.rich;
  return VEINS.normal;
}

// ── Schmelzofen ─────────────────────────────────────────────────────────────

export const ORE_PER_BAR = 120;

/** Wie viel Erz der Ofen pro Sekunde frisst. */
export function smeltRate(state) {
  return 2 * Math.pow(1.9, lvl(state.upgrades, 'furnace'));
}

// ── Kosten ──────────────────────────────────────────────────────────────────

export function minerCost(miner, owned) {
  return miner.baseCost * Math.pow(COST_GROWTH, owned);
}

/** Kosten für `amount` weitere Einheiten (geometrische Reihe). */
export function minerCostBulk(miner, owned, amount) {
  const r = COST_GROWTH;
  return (miner.baseCost * Math.pow(r, owned) * (Math.pow(r, amount) - 1)) / (r - 1);
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
  const base = 0.006 + 0.0008 * layerIndexAt(depth);
  const survey = Math.pow(1.05, lvl(state.upgrades, 'survey'));
  const gespuer = Math.pow(1.25, lvl(state.crystalUpgrades, 'prospecting'));
  return Math.min(0.3, base * survey * gespuer);
}

/** Kristalle aus einer Geode. */
export function geodeYield(state, depth, rand) {
  const layer = layerIndexAt(depth);
  const base = 1 + Math.floor(layer * 0.5) + lvl(state.crystalUpgrades, 'yield');
  return base + Math.floor(rand() * (1 + layer));
}

/** Freebie-Ertrag — skaliert bewusst stark mit Fortschritt. */
export function freebieYield(state) {
  return Math.floor(5 + state.maxDepth / 40 + state.runes);
}

/** Geodenbombe — der "Gem Bomb"-Burst. */
export function bombYield(state) {
  return Math.floor(10 + state.maxDepth / 25 + state.runes * 2);
}

export function bossCrystals(depth) {
  return 3 + layerIndexAt(Math.max(0, depth - 1)) * 3;
}

export const FREEBIE_COOLDOWN = 2 * 3600 * 1000; // 2 h
export const BOMB_COOLDOWN = 20 * 60 * 1000; // 20 min

// ── Prestige ────────────────────────────────────────────────────────────────

export const PRESTIGE_MIN_DEPTH = 200;

export function runeGain(state) {
  if (state.maxDepth < PRESTIGE_MIN_DEPTH) return 0;
  const raw = Math.pow(state.maxDepth / 120, 1.15);
  const bonus = 1 + 0.1 * lvl(state.crystalUpgrades, 'runeboost');
  return Math.max(0, Math.floor(raw * bonus) - state.runes);
}

/** Kristalle als zusätzlicher Anreiz für den Einsturz. */
export function prestigeCrystals(state) {
  return Math.floor(runeGain(state) * 2);
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
