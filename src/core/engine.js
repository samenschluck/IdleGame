// Spiel-Logik: Schaden, Blöcke brechen, Erz, Schmelzofen, Offline-Simulation.
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
  oreYield,
  depotCap,
  rollVein,
  hardnessShortfall,
  smeltRate,
  ORE_PER_BAR,
  VEINS,
} from './balance.js';
import {
  LAYERS,
  layerIndexAt,
  layerAt,
  isBossDepth,
  bossNameAt,
  randomFlavorOre,
} from '../data/layers.js';
import { FEATURES } from '../data/features.js';
import { nextPick } from '../data/picks.js';

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

/** Erz gutschreiben, begrenzt durch das Lager. Überlauf wird gezählt. */
function addOre(state, oreId, amount, ctx) {
  const cap = depotCap(state);
  const have = state.ores[oreId] || 0;
  const room = Math.max(0, cap - have);
  const stored = Math.min(amount, room);
  const wasted = amount - stored;

  if (stored > 0) {
    state.ores[oreId] = have + stored;
    state.stats.oreMined += stored;
    ctx.ore += stored;
  }
  if (wasted > 0) {
    state.stats.oreWasted += wasted;
    ctx.oreWasted += wasted;
  }
}

/** Einen Block zerschlagen: Belohnungen buchen, neuen Block setzen. */
function breakBlock(state, ctx) {
  const depth = state.depth;
  // Ein Waechter zaehlt nur beim ersten Mal.
  //
  // Die Haertewand liegt zwangslaeufig auf einer Schichtgrenze — und genau
  // dort sitzt der Waechter. Wer dort ausbeutet, wuerde denselben Waechter
  // endlos erschlagen: gemessen 213 954 Kristalle aus 12 355 Bloecken, dazu
  // dauerhaft der 30-fache Goldertrag. Also wird der Sieg vermerkt.
  const boss = isBossDepth(depth) && !state.bossesDown[depth];
  const vein = VEINS[state.vein] || VEINS.normal;

  const gold = blockGold(state, depth, boss);
  state.gold += gold;
  state.stats.goldEarned += gold;
  state.stats.blocksBroken++;
  ctx.gold += gold;

  // Erz der aktuellen Schicht.
  addOre(state, layerAt(depth).ore.id, oreYield(state, vein.mult), ctx);
  if (vein.mult > 1) {
    state.stats.veins++;
    if (!ctx.quiet) {
      ctx.events.push({ type: 'vein', vein });
      pushLog(state, `${vein.name} freigelegt — ${vein.mult}× Erz`, 'vein');
    }
  }

  if (boss) {
    state.bossesDown[depth] = true;
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
  } else if (!ctx.quiet && ctx.rand() < 0.05) {
    pushLog(state, `Fund: ${randomFlavorOre(depth, ctx.rand)}`, 'ore');
  }

  // Vortreiben oder an Ort und Stelle ausbeuten?
  if (state.mode === 'dig') {
    const before = layerIndexAt(state.depth);
    state.depth++;
    if (state.depth > state.maxDepth) state.maxDepth = state.depth;
    const after = layerIndexAt(state.depth);

    if (after !== before) {
      const layer = LAYERS[after];
      if (!state.seenLayers[layer.id]) {
        state.seenLayers[layer.id] = true;
        pushLog(state, layer.intro, 'story');
      }
      pushLog(state, `Neue Schicht erreicht: ${layer.name}`, 'layer');
      if (!ctx.quiet) ctx.events.push({ type: 'layer', layer });
    }
  }

  state.vein = rollVein(state, ctx.rand).id;
  state.blockHp = blockMaxHp(state.depth, !state.bossesDown[state.depth]);
  if (!ctx.quiet) ctx.events.push({ type: 'break', depth, gold, boss });
}

function addCrystals(state, amount, ctx) {
  state.crystals += amount;
  state.stats.crystalsEarned += amount;
  ctx.crystals += amount;
}

function makeCtx(events, rand, quiet) {
  return {
    events,
    rand,
    quiet,
    gold: 0,
    crystals: 0,
    ore: 0,
    oreWasted: 0,
    bars: 0,
    hardnessShortfall: 0,
  };
}

/**
 * Schmelzofen: frisst Erz aus dem größten Stapel und macht Barren daraus.
 *
 * Wichtig: er rührt das Erz für die nächste Spitzhacke NICHT an. Ohne diese
 * Sperre frisst ein ausgebauter Ofen den Nachschub schneller weg, als er
 * hereinkommt — der Spieler beobachtet dann stundenlang, wie sein Erzstapel
 * bei null steht, und kommt nie an die Hacke, die ihn weiterbrächte.
 */
function runSmelter(state, dt, ctx) {
  if (!state.features.smelter || state.smelterOff) return;
  let budget = smeltRate(state) * dt;

  const need = nextPick(state.pickTier);
  const reservedId = need ? need.ore : null;
  const reserved = need ? need.oreAmount : 0;
  const available = (id, amount) => (id === reservedId ? Math.max(0, amount - reserved) : amount);

  while (budget >= ORE_PER_BAR) {
    // Immer den größten verfügbaren Stapel anzapfen — so verstopft nichts.
    let bestId = null;
    let best = 0;
    for (const [id, amount] of Object.entries(state.ores)) {
      const free = available(id, amount);
      if (free > best) {
        best = free;
        bestId = id;
      }
    }
    if (!bestId || best < ORE_PER_BAR) break;

    const bars = Math.min(Math.floor(budget / ORE_PER_BAR), Math.floor(best / ORE_PER_BAR));
    if (bars <= 0) break;

    state.ores[bestId] -= bars * ORE_PER_BAR;
    state.bars += bars;
    state.stats.barsSmelted += bars;
    budget -= bars * ORE_PER_BAR;
    ctx.bars += bars;
  }
}

/** Neu erreichte Mechaniken freischalten. */
function checkFeatures(state, ctx) {
  for (const f of FEATURES) {
    if (state.features[f.id]) continue;
    if (!f.test(state, ctx)) continue;
    state.features[f.id] = true;
    pushLog(state, `Neu: ${f.name} — ${f.unlockText}`, 'unlock');
    if (!ctx.quiet) ctx.events.push({ type: 'feature', feature: f });
  }
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

  runSmelter(state, dt, ctx);

  ctx.hardnessShortfall = hardnessShortfall(state);
  checkFeatures(state, ctx);
}

/** Manueller Schlag. Gibt Infos für die Floating-Zahl zurück. */
export function tap(state, events, rand = Math.random, now = Date.now()) {
  const crit = rand() < critChance(state);
  let dmg = tapDamage(state, now);
  if (crit) dmg *= critMultiplier(state);

  state.stats.taps++;
  const ctx = makeCtx(events, rand, false);
  applyDamage(state, dmg, ctx);
  ctx.hardnessShortfall = hardnessShortfall(state);
  checkFeatures(state, ctx);
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
    if (dps > 0) applyDamage(state, dps * step, ctx);
    runSmelter(state, step, ctx);
  }
  ctx.hardnessShortfall = hardnessShortfall(state);
  checkFeatures(state, ctx);

  const summary = {
    ms: capped,
    cappedFrom: elapsedMs > cap ? elapsedMs : 0,
    gold: ctx.gold,
    crystals: ctx.crystals,
    ore: ctx.ore,
    oreWasted: ctx.oreWasted,
    bars: ctx.bars,
    depth: state.depth - depthBefore,
  };
  pushLog(
    state,
    `Nachtschicht: ${summary.depth} m tiefer, +${Math.floor(summary.ore)} Erz`,
    'offline'
  );
  return summary;
}

/** Aktuelle Schicht als Objekt — Bequemlichkeit für die UI. */
export function currentLayer(state) {
  return layerAt(state.depth);
}

export { isBossDepth, bossNameAt };
