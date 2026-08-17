// Spiel-Logik: Schaden, Blöcke brechen, Belohnungen, Offline-Simulation.
// Kennt kein DOM. Meldet Ereignisse über ein Event-Array, das die UI abholt.

import {
  blockMaxHp,
  blockGold,
  totalDps,
  tapDamage,
  critChance,
  critMultiplier,
  geodeChance,
  geodeYield,
  bossCrystals,
  offlineCapMs,
} from './balance.js';
import {
  LAYERS,
  layerIndexAt,
  layerAt,
  isBossDepth,
  bossNameAt,
  randomOre,
} from '../data/layers.js';

const MAX_BREAKS_PER_STEP = 400; // Schutz gegen Endlosschleifen bei Overkill
const LOG_MAX = 40;

export function pushLog(state, text, kind = 'info') {
  state.log.push({ t: Date.now(), text, kind });
  if (state.log.length > LOG_MAX) state.log.splice(0, state.log.length - LOG_MAX);
}

/**
 * Schaden auf den aktuellen Block anwenden. Überschüssiger Schaden läuft in
 * den nächsten Block über (Overkill), begrenzt durch MAX_BREAKS_PER_STEP.
 */
function applyDamage(state, dmg, ctx) {
  let guard = 0;
  while (dmg > 0 && guard < MAX_BREAKS_PER_STEP) {
    state.blockHp -= dmg;
    if (state.blockHp > 0) return;
    dmg = -state.blockHp; // Overkill
    breakBlock(state, ctx);
    guard++;
  }
}

/** Einen Block zerschlagen: Belohnungen buchen, Tiefe erhöhen, neuen Block setzen. */
function breakBlock(state, ctx) {
  const depth = state.depth;
  const boss = isBossDepth(depth);

  const gold = blockGold(state, depth);
  state.gold += gold;
  state.stats.goldEarned += gold;
  state.stats.blocksBroken++;
  ctx.gold += gold;

  if (boss) {
    const crystals = bossCrystals(depth);
    addCrystals(state, crystals, ctx);
    state.stats.bossesSlain++;
    pushLog(state, `${bossNameAt(depth)} bezwungen — +${crystals} 💎`, 'boss');
    if (!ctx.quiet) ctx.events.push({ type: 'boss', name: bossNameAt(depth), crystals });
  } else if (ctx.rand() < geodeChance(state, depth)) {
    const crystals = geodeYield(state, depth, ctx.rand);
    addCrystals(state, crystals, ctx);
    state.stats.geodes++;
    if (!ctx.quiet) {
      ctx.events.push({ type: 'geode', crystals });
      pushLog(state, `Geode aufgebrochen — +${crystals} 💎`, 'crystal');
    }
  } else if (!ctx.quiet && ctx.rand() < 0.06) {
    pushLog(state, `Fund: ${randomOre(depth, ctx.rand)}`, 'ore');
  }

  // Tiefer.
  const before = layerIndexAt(state.depth);
  state.depth++;
  if (state.depth > state.maxDepth) state.maxDepth = state.depth;
  const after = layerIndexAt(state.depth);

  if (after !== before) {
    const layer = LAYERS[after];
    ctx.newLayer = layer;
    if (!state.seenLayers[layer.id]) {
      state.seenLayers[layer.id] = true;
      pushLog(state, layer.intro, 'story');
    }
    pushLog(state, `Neue Schicht erreicht: ${layer.name}`, 'layer');
    if (!ctx.quiet) ctx.events.push({ type: 'layer', layer });
  }

  state.blockHp = blockMaxHp(state.depth);
  if (!ctx.quiet) ctx.events.push({ type: 'break', depth, gold, boss });
}

function addCrystals(state, amount, ctx) {
  state.crystals += amount;
  state.stats.crystalsEarned += amount;
  ctx.crystals += amount;
}

function makeCtx(events, rand, quiet) {
  return { events, rand, quiet, gold: 0, crystals: 0, depthStart: 0, newLayer: null };
}

/**
 * Ein Spiel-Tick.
 * @param {object} state
 * @param {number} dt Sekunden seit dem letzten Tick
 * @param {Array} events Ausgabe-Array für die UI
 */
export function tick(state, dt, events, rand = Math.random, now = Date.now()) {
  if (dt <= 0) return;
  state.stats.playtimeMs += dt * 1000;

  const ctx = makeCtx(events, rand, false);

  // Sprengungen zuerst: brechen Blöcke unabhängig von der Grabkraft.
  let blasts = 0;
  while (state.blastBlocks > 0 && blasts < 50) {
    state.blastBlocks--;
    state.blockHp = 0;
    breakBlock(state, ctx);
    blasts++;
  }

  const dps = totalDps(state, now);
  if (dps > 0) applyDamage(state, dps * dt, ctx);
}

/** Manueller Schlag. Gibt Infos für die Floating-Zahl zurück. */
export function tap(state, events, rand = Math.random, now = Date.now()) {
  const crit = rand() < critChance(state);
  let dmg = tapDamage(state, now);
  if (crit) dmg *= critMultiplier(state);

  state.stats.taps++;
  const ctx = makeCtx(events, rand, false);
  applyDamage(state, dmg, ctx);
  events.push({ type: 'tap', dmg, crit });
  return { dmg, crit };
}

/**
 * Offline-Fortschritt: echte Simulation in 1-Sekunden-Schritten statt Schätzung.
 * @returns {object|null} Zusammenfassung oder null, wenn zu kurz weg.
 */
export function simulateOffline(state, elapsedMs, rand = Math.random) {
  const cap = offlineCapMs(state);
  const capped = Math.min(elapsedMs, cap);
  if (capped < 10_000) return null; // unter 10 s lohnt keine Meldung

  const seconds = Math.floor(capped / 1000);
  const ctx = makeCtx([], rand, true);
  const depthBefore = state.depth;
  const now = Date.now();

  // Bis zu 24 h à 1 s = 86 400 Schritte. Das läuft in wenigen Millisekunden.
  const step = seconds > 43_200 ? 2 : 1;
  for (let i = 0; i < seconds; i += step) {
    const dps = totalDps(state, now);
    if (dps <= 0) break;
    applyDamage(state, dps * step, ctx);
  }

  const summary = {
    ms: capped,
    cappedFrom: elapsedMs > cap ? elapsedMs : 0,
    gold: ctx.gold,
    crystals: ctx.crystals,
    depth: state.depth - depthBefore,
    blocks: state.depth - depthBefore,
  };
  pushLog(
    state,
    `Nachtschicht: ${summary.depth} m tiefer, +${Math.floor(summary.gold)} Gold`,
    'offline'
  );
  return summary;
}

/** Aktuelle Schicht als Objekt — Bequemlichkeit für die UI. */
export function currentLayer(state) {
  return layerAt(state.depth);
}

export { isBossDepth, bossNameAt };
