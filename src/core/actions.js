// Spieler-Aktionen: kaufen, boosten, einstürzen lassen.
// Jede Aktion gibt {ok, msg} zurück, damit die UI eine Rückmeldung zeigen kann.

import {
  minerCostBulk,
  maxAffordable,
  forgeCost,
  crystalCost,
  runeGain,
  prestigeCrystals,
  startDepth,
  blockMaxHp,
  freebieYield,
  bombYield,
  FREEBIE_COOLDOWN,
  BOMB_COOLDOWN,
  PRESTIGE_MIN_DEPTH,
} from './balance.js';
import { MINERS_BY_ID } from '../data/miners.js';
import { nextPick, pickAt } from '../data/picks.js';
import { ORE_BY_ID } from '../data/layers.js';
import { FORGE_BY_ID, CRYSTAL_BY_ID, CRYSTAL_ACTIONS, forgeMaxLevel } from '../data/upgrades.js';
import { pushLog, simulateOffline } from './engine.js';

/** Die nächste Spitzhacke schmieden — der eigentliche Durchbruch. */
export function forgePick(state) {
  const next = nextPick(state.pickTier);
  if (!next) return fail('Es gibt keine bessere Hacke');

  const have = state.ores[next.ore] || 0;
  if (have < next.oreAmount) {
    const missing = Math.ceil(next.oreAmount - have);
    return fail(`Es fehlen ${missing} ${ORE_BY_ID[next.ore].name}`);
  }
  if (state.gold < next.gold) return fail('Zu wenig Gold');

  state.ores[next.ore] = have - next.oreAmount;
  state.gold -= next.gold;
  state.pickTier = next.tier;
  state.stats.picksForged++;
  pushLog(state, `${next.name} geschmiedet — Schlagkraft ${next.power}`, 'forge');
  return ok(`${next.name} geschmiedet`);
}

/** Vortreiben oder an Ort und Stelle ausbeuten. */
export function setMode(state, mode) {
  if (mode !== 'dig' && mode !== 'farm') return fail('Unbekannter Modus');
  if (mode === 'farm' && !state.features.farmMode) return fail('Noch nicht freigeschaltet');
  state.mode = mode;
  return ok(mode === 'farm' ? 'Ausbeuten: Erz statt Tiefe' : 'Vortrieb: es geht abwärts');
}

/** amount: Zahl oder 'max' */
export function buyMiner(state, id, amount = 1) {
  const miner = MINERS_BY_ID[id];
  if (!miner) return fail('Unbekannter Zwerg');
  if (state.pickTier < miner.unlockPick) {
    return fail(`Erst ab ${pickAt(miner.unlockPick).name}`);
  }

  const owned = state.miners[id] || 0;
  let n = amount === 'max' ? maxAffordable(miner, owned, state.gold) : amount;
  if (n <= 0) return fail('Zu wenig Gold');

  const cost = minerCostBulk(miner, owned, n);
  if (cost > state.gold) return fail('Zu wenig Gold');

  state.gold -= cost;
  state.miners[id] = owned + n;
  return ok(`${n}× ${miner.name} angeheuert`);
}

export function buyForge(state, id, amount = 1) {
  const def = FORGE_BY_ID[id];
  if (!def) return fail('Unbekanntes Upgrade');

  let bought = 0;
  let level = state.upgrades[id] || 0;
  const limit = amount === 'max' ? 500 : amount;
  const cap = forgeMaxLevel(def, state, state.level);

  while (bought < limit && level < cap) {
    const cost = forgeCost(id, level);
    if (cost > state.gold) break;
    state.gold -= cost;
    level++;
    bought++;
  }
  if (bought === 0) {
    if (level >= def.max) return fail('Maximalstufe erreicht');
    if (level >= cap) return fail('Braucht eine höhere Spielerstufe');
    return fail('Zu wenig Gold');
  }
  state.upgrades[id] = level;
  return ok(`${def.name} → Stufe ${level}`);
}

export function buyCrystalUpgrade(state, id) {
  const def = CRYSTAL_BY_ID[id];
  if (!def) return fail('Unbekanntes Upgrade');
  const level = state.crystalUpgrades[id] || 0;
  if (level >= def.max) return fail('Maximalstufe erreicht');

  const cost = crystalCost(id, level);
  if (cost > state.crystals) return fail('Zu wenig Kristalle');

  state.crystals -= cost;
  state.crystalUpgrades[id] = level + 1;
  pushLog(state, `${def.name} auf Stufe ${level + 1} verbessert`, 'crystal');
  return ok(`${def.name} → Stufe ${level + 1}`);
}

export function useCrystalAction(state, id, now = Date.now()) {
  const def = CRYSTAL_ACTIONS[id];
  if (!def) return fail('Unbekannte Aktion');
  if (state.crystals < def.cost) return fail('Zu wenig Kristalle');

  if (id === 'boost') {
    state.crystals -= def.cost;
    // Läuft ein Boost noch, wird verlängert statt überschrieben.
    const from = Math.max(now, state.boostUntil);
    state.boostUntil = from + 120_000;
    pushLog(state, 'Adernstoß! ×8 Grabkraft', 'boost');
    return ok('Adernstoß aktiv');
  }

  if (id === 'timeskip') {
    state.crystals -= def.cost;
    const summary = simulateOffline(state, 2 * 3600 * 1000);
    return ok(
      summary
        ? `Zeitsprung: ${summary.depth} m tiefer`
        : 'Zeitsprung — aber ohne Zwerge passiert nichts'
    );
  }

  if (id === 'blast') {
    state.crystals -= def.cost;
    state.blastBlocks += 10;
    pushLog(state, 'Sprengladung gesetzt — 10 Blöcke', 'boost');
    return ok('Sprengung läuft');
  }

  return fail('Unbekannte Aktion');
}

export function claimFreebie(state, now = Date.now()) {
  if (now < state.freebieReadyAt) return fail('Noch nicht bereit');
  const amount = freebieYield(state);
  state.crystals += amount;
  state.stats.crystalsEarned += amount;
  state.freebieReadyAt = now + FREEBIE_COOLDOWN;
  pushLog(state, `Geschenk der Ahnen: +${amount} 💎`, 'crystal');
  return ok(`+${amount} Kristalle`);
}

export function claimBomb(state, now = Date.now()) {
  if (now < state.bombReadyAt) return fail('Noch nicht bereit');
  const amount = bombYield(state);
  state.crystals += amount;
  state.stats.crystalsEarned += amount;
  state.bombReadyAt = now + BOMB_COOLDOWN;
  pushLog(state, `Geodenbombe gezündet: +${amount} 💎`, 'crystal');
  return ok(`+${amount} Kristalle`);
}

/** Prestige. Setzt Lauf zurück, behält Kristalle, Kristall-Upgrades und Runen. */
export function collapse(state) {
  if (state.maxDepth < PRESTIGE_MIN_DEPTH) {
    return fail(`Erst ab ${PRESTIGE_MIN_DEPTH} m möglich`);
  }
  const gained = runeGain(state);
  if (gained <= 0) return fail('Noch keine neuen Runen verdient');

  const crystals = prestigeCrystals(state);
  state.runes += gained;
  state.crystals += crystals;
  state.stats.crystalsEarned += crystals;
  state.stats.collapses++;

  // Der ganze Lauf geht: Gold, Zwerge, Schmiede, Erz, Barren und die Hacke.
  // Die Runen machen den zweiten Durchgang so viel schneller, dass sich das
  // Nachschmieden wie Fortschritt anfuehlt und nicht wie Strafe.
  // Erfahrung und Stufe gehen mit — die Obergrenze (state.obelisk) bleibt.
  state.xp = 0;
  state.level = 1;
  state.gold = 0;
  state.miners = {};
  state.upgrades = {};
  state.ores = {};
  state.bars = 0;
  state.pickTier = 1;
  state.mode = 'dig';
  state.bossesDown = {};
  state.blastBlocks = 0;
  state.depth = startDepth(state);
  state.blockHp = blockMaxHp(state.depth);

  pushLog(state, `Der Schacht stürzt ein. +${gained} ᚱ, +${crystals} 💎`, 'prestige');
  return ok(`+${gained} Seelenrunen`);
}

function ok(msg) {
  return { ok: true, msg };
}
function fail(msg) {
  return { ok: false, msg };
}
