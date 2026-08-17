// Kopflose Spielsimulation — Grundlage für den Smoke-Test (check.mjs) und für
// Balance-Sweeps (tune.mjs). Modelliert einen Spieler, der die ersten Minuten
// mittippt und danach kauft, was bezahlbar ist.

import * as B from '../src/core/balance.js';
import * as E from '../src/core/engine.js';
import * as A from '../src/core/actions.js';
import { createState } from '../src/core/state.js';
import { MINERS } from '../src/data/miners.js';
import { FORGE_UPGRADES } from '../src/data/upgrades.js';

export const ACTIVE_TAPPING_SECONDS = 300;

/** Deterministischer PRNG, damit Läufe vergleichbar bleiben. */
export function makeRng(seed = 12345) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Ein Kauf-Schritt: höchste bezahlbare Zwergenstufe, dann Schmiede. */
function shop(state) {
  for (let purchase = 0; purchase < 40; purchase++) {
    let bought = false;

    for (let i = MINERS.length - 1; i >= 0; i--) {
      const m = MINERS[i];
      if (state.maxDepth < m.unlockDepth) continue;
      const owned = state.miners[m.id] || 0;
      if (B.minerCost(m, owned) <= state.gold * 0.5) {
        bought = A.buyMiner(state, m.id, 1).ok || bought;
        break;
      }
    }

    for (const u of FORGE_UPGRADES) {
      const level = state.upgrades[u.id] || 0;
      if (level < u.max && B.forgeCost(u.id, level) <= state.gold * 0.3) {
        bought = A.buyForge(state, u.id, 1).ok || bought;
        break;
      }
    }

    if (!bought) return;
  }
}

/**
 * Simuliert `seconds` Spielzeit.
 * @param {number[]} marks Sekunden, an denen ein Messpunkt festgehalten wird
 */
export function simulateRun(state, seconds, rand, marks = []) {
  const milestones = [];
  const markSet = new Set(marks);
  for (let t = 0; t < seconds; t++) {
    E.tick(state, 1, [], rand);
    if (t < ACTIVE_TAPPING_SECONDS) {
      for (let i = 0; i < 3; i++) E.tap(state, [], rand);
    }
    shop(state);
    if (markSet.has(t)) {
      milestones.push({ t, depth: state.depth, gold: state.gold, crystals: state.crystals });
    }
  }
  return milestones;
}

/**
 * Erster Lauf plus `runs` Prestige-Läufe. Gibt pro Lauf die erreichte
 * Maximaltiefe zurück — die zentrale Kennzahl fürs Balancing.
 */
export function runPrestigeChain({ firstRunSeconds = 4 * 3600, runs = 6, runSeconds = 3600, seed = 12345 } = {}) {
  const rand = makeRng(seed);
  const state = createState();
  const history = [];

  simulateRun(state, firstRunSeconds, rand);
  history.push({ run: 1, depth: state.maxDepth, runes: state.runes, crystals: state.crystals, ok: true });

  for (let run = 2; run <= runs; run++) {
    const res = A.collapse(state);
    if (!res.ok) {
      history.push({ run, depth: state.maxDepth, runes: state.runes, crystals: state.crystals, ok: false, msg: res.msg });
      break;
    }
    const before = state.maxDepth;
    simulateRun(state, runSeconds, rand);
    history.push({
      run,
      depth: state.maxDepth,
      gained: state.maxDepth - before,
      runes: state.runes,
      crystals: state.crystals,
      ok: true,
    });
  }
  return { state, history };
}
