// Spitzhacken-Stufen — das Nadeloehr des Spiels.
//
// Jede Schicht hat eine Haerte; die Hacke muss mithalten, sonst richtet man
// fast nichts mehr aus. Eine neue Hacke kostet ERZ — und zwar das Erz GENAU
// DER Schicht, an der man haengenbleibt.
//
// Das ist keine Kosmetik, sondern zwingend: man kann im Schacht nicht wieder
// nach oben. Wuerde die Hacke fuer Haerte 2 aus dem Erz von Haerte 1 bestehen,
// haette man nach dem Durchqueren der ersten Schicht keine Chance mehr, den
// Rueckstand aufzuholen — der Lauf waere unrettbar tot. Also gilt:
//
//     Hacke mit Schlagkraft N  ⟵  Erz der Schicht mit Haerte N
//
// Man steht in der zu harten Schicht, kratzt mit Muehe (siehe hardnessFactor)
// ihr Erz heraus und schmiedet sich damit den Durchbruch. Genau dieser Moment
// ist der Kern des Spiels.

import { LAYERS } from './layers.js';

// Erzmengen und Goldpreis je Stufe, aus je einer Stellschraube erzeugt.
// Als Handtabelle war jede Balance-Aenderung ein Zahlenraten ueber zehn Werte.
export const PICK_TUNING = {
  oreBase: 300, // Erz fuer die zweite Hacke
  oreGrowth: 5, // Faktor je weiterer Stufe (per tools/tune.mjs eingemessen)
};

const oreCost = (i) => Math.round(PICK_TUNING.oreBase * Math.pow(PICK_TUNING.oreGrowth, i - 1));
// Gold soll spuerbar, aber nie der eigentliche Engpass sein: es waechst mit der
// Blockhaerte mit, die Erzmenge nicht.
const goldCost = (i) => Math.round(1500 * Math.pow(26, i - 1));

const NAMES = [
  'Rostige Hacke',
  'Kupferhacke',
  'Eisenhacke',
  'Kristallhacke',
  'Mithrilhacke',
  'Trollbrecher',
  'Obsidianhacke',
  'Seelenhacke',
  'Höllenhacke',
  'Weltenzahn',
];

const ICONS = ['⛏️', '⛏️', '🔨', '💠', '🥇', '🪓', '⬛', '👻', '😈', '🌟'];

// Stufe N schlaegt Haerte N und wird aus dem Erz der Schicht mit Haerte N
// geschmiedet. Stufe 1 ist die Starthacke und kostet nichts.
export const PICKS = LAYERS.map((layer, i) => ({
  tier: i + 1,
  name: NAMES[i],
  icon: ICONS[i],
  power: layer.hardness,
  ore: i === 0 ? null : layer.ore.id,
  // Als Getter, damit tools/tune.mjs an PICK_TUNING drehen kann. Waeren es
  // feste Werte, wuerde jeder Sweep stillschweigend dieselbe Kurve messen.
  get oreAmount() {
    return i === 0 ? 0 : oreCost(i);
  },
  get gold() {
    return i === 0 ? 0 : goldCost(i);
  },
}));

export const MAX_PICK_TIER = PICKS.length;

export function pickAt(tier) {
  return PICKS[Math.min(Math.max(1, tier), MAX_PICK_TIER) - 1];
}

/** Die naechste schmiedbare Hacke, oder null wenn schon am Ende. */
export function nextPick(tier) {
  return tier >= MAX_PICK_TIER ? null : PICKS[tier];
}
