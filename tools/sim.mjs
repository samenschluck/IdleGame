// Kopflose Spielsimulation — Grundlage für den Smoke-Test (check.mjs) und für
// Balance-Sweeps (tune.mjs).
//
// Der simulierte Spieler benutzt die Mechaniken so, wie ein Mensch es täte:
// er tippt die ersten Minuten mit, kauft was bezahlbar ist, wechselt beim
// Anschlagen an die Härtewand aufs Ausbeuten und schmiedet, sobald das Erz
// reicht. Ein Bot, der das Ausbeuten nicht kennt, misst eine Kurve, die es
// im echten Spiel gar nicht gibt.

import * as B from '../src/core/balance.js';
import * as E from '../src/core/engine.js';
import * as A from '../src/core/actions.js';
import { createState } from '../src/core/state.js';
import { MINERS } from '../src/data/miners.js';
import { FORGE_UPGRADES, forgeMaxLevel } from '../src/data/upgrades.js';
import { nextPick } from '../src/data/picks.js';
import { LAYERS, layerIndexAt } from '../src/data/layers.js';

export const ACTIVE_TAPPING_SECONDS = 300;

/** Deterministischer PRNG, damit Läufe vergleichbar bleiben. */
export function makeRng(seed = 12345) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Ein Kauf-Schritt: höchste bezahlbare Zwergenstufe, dann Schmiede-Ausbau. */
function shop(state) {
  for (let purchase = 0; purchase < 40; purchase++) {
    let bought = false;

    for (let i = MINERS.length - 1; i >= 0; i--) {
      const m = MINERS[i];
      if (state.pickTier < m.unlockPick) continue;
      const owned = state.miners[m.id] || 0;
      if (B.minerCost(m, owned) <= state.gold * 0.5) {
        bought = A.buyMiner(state, m.id, 1).ok || bought;
        break;
      }
    }

    for (const u of FORGE_UPGRADES) {
      if (u.feature && !state.features[u.feature]) continue;
      const lvl = state.upgrades[u.id] || 0;
      if (lvl < forgeMaxLevel(u, state) && B.forgeCost(u.id, lvl) <= state.gold * 0.3) {
        bought = A.buyForge(state, u.id, 1).ok || bought;
        break;
      }
    }

    if (!bought) break;
  }
}

/**
 * Entscheidet über Vortrieb vs. Ausbeuten und schmiedet, wenn möglich.
 * Das ist die eigentliche Spielentscheidung — hier steckt das Tempo drin.
 */
function strategy(state) {
  const next = nextPick(state.pickTier);

  // Reicht das Erz? Dann sofort schmieden und weiter nach unten.
  if (next && state.features.forge) {
    const have = state.ores[next.ore] || 0;
    if (have >= next.oreAmount && state.gold >= next.gold) {
      if (A.forgePick(state).ok) {
        A.setMode(state, 'dig');
        return;
      }
    }
  }

  if (!state.features.farmMode) return;

  // An der Wand ausbeuten, sonst vortreiben.
  const blocked = B.hardnessShortfall(state) > 0;
  const wantFarm = blocked && next !== null;
  A.setMode(state, wantFarm ? 'farm' : 'dig');
}

/**
 * Simuliert `seconds` Sekunden.
 * @returns {{state, marks: Map<number, object>, layerAt: Map<number, number>}}
 */
export function simulate(state, seconds, opts = {}) {
  const rand = opts.rand || makeRng();
  const marks = opts.marks || [];
  const marked = new Map();
  const layerReached = opts.layerReached || new Map();
  const tapUntil = opts.tapSeconds ?? ACTIVE_TAPPING_SECONDS;
  const t0 = opts.t0 || 0;

  for (let t = 0; t < seconds; t++) {
    E.tick(state, 1, [], rand);
    if (t < tapUntil) {
      for (let i = 0; i < 3; i++) E.tap(state, [], rand);
    }

    strategy(state);
    shop(state);

    // Ueber die AKTUELLE Tiefe messen, nicht ueber maxDepth: nach einem
    // Einsturz steht maxDepth weiter auf dem alten Rekord, und ein Vergleich
    // "zweiter Lauf schneller als erster" wuerde stillschweigend nichts messen.
    const li = layerIndexAt(state.depth);
    if (!layerReached.has(li)) layerReached.set(li, t0 + t);
    if (marks.includes(t)) marked.set(t, snapshot(state));
  }

  return { state, marks: marked, layerReached };
}

export function snapshot(state) {
  return {
    depth: state.depth,
    maxDepth: state.maxDepth,
    gold: state.gold,
    crystals: state.crystals,
    bars: state.bars,
    pickTier: state.pickTier,
    layer: LAYERS[layerIndexAt(state.maxDepth)].name,
    ore: Object.values(state.ores).reduce((a, b) => a + b, 0),
  };
}

export function freshState() {
  return createState();
}
