// Smoke-Test ohne Test-Framework: läuft in CI und lokal mit `node tools/check.mjs`.
//
// Prüft:
//   1. Syntax aller Quelldateien
//   2. Module laden, Formatierung stimmt, Wächter sitzen richtig
//   3. Die Fortschrittskurve — das eigentliche Sicherheitsnetz. Die erste
//      Fassung des Spiels war in zehn Minuten durchgespielt, ohne dass ein
//      Test angeschlagen hätte. Deshalb prüft der Test jetzt nicht nur "kommt
//      man voran", sondern auch "dauert es lange genug".

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as B from '../src/core/balance.js';
import * as E from '../src/core/engine.js';
import * as A from '../src/core/actions.js';
import { createState, exportSave, importSave } from '../src/core/state.js';
import { LAYERS, isBossDepth, layerIndexAt } from '../src/data/layers.js';
import { PICKS } from '../src/data/picks.js';
import { FEATURES } from '../src/data/features.js';
import { fmt } from '../src/util/format.js';
import { simulate, makeRng, freshState } from './sim.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;

const fail = (msg) => {
  console.error('  ✗ ' + msg);
  failures++;
};
const pass = (msg) => console.log('  ✓ ' + msg);
const hhmm = (sec) =>
  sec >= 3600 ? `${(sec / 3600).toFixed(1)} h` : `${Math.round(sec / 60)} min`;

// ── 1. Syntax ───────────────────────────────────────────────────────────────

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

console.log('Syntax:');
const files = [...walk(join(root, 'src')), join(root, 'sw.js')];
for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
  } catch (err) {
    fail(`${relative(root, file)}: ${err.stderr?.toString().split('\n')[0] || err.message}`);
  }
}
if (!failures) pass(`${files.length} Dateien in Ordnung`);

// ── 2. Grundlagen ───────────────────────────────────────────────────────────

console.log('Formatierung:');
for (const [input, expected] of [[0, '0'], [999, '999'], [1000, '1K'], [1.5e6, '1.5M'], [1e15, '1aa']]) {
  const actual = fmt(input);
  if (actual !== expected) fail(`fmt(${input}) = "${actual}", erwartet "${expected}"`);
}
if (!failures) pass('Zahlenformat stimmt');

console.log('Schichten & Hacken:');
for (const layer of LAYERS) {
  if (layer.to !== Infinity && !isBossDepth(layer.to)) {
    fail(`kein Wächter auf ${layer.to} m (${layer.name})`);
  }
}
if (isBossDepth(37)) fail('Wächter auf zufälliger Tiefe 37 m');

// Zu jeder Schichthärte muss es eine Hacke geben, die sie packt — sonst
// laeuft der Spieler in eine Wand, die sich nicht oeffnen laesst.
const maxPower = Math.max(...PICKS.map((p) => p.power));
for (const layer of LAYERS) {
  if (layer.hardness > maxPower) fail(`Härte ${layer.hardness} (${layer.name}) ist unbrechbar`);
}
// Und jede Hacke muss aus Erz bezahlbar sein, das man vorher erreicht hat.
for (const pick of PICKS.slice(1)) {
  const oreLayer = LAYERS.findIndex((l) => l.ore.id === pick.ore);
  if (oreLayer < 0) fail(`${pick.name} verlangt unbekanntes Erz ${pick.ore}`);
  else if (LAYERS[oreLayer].hardness !== pick.power) {
    // Das Erz muss aus genau der Schicht kommen, die diese Hacke aufbricht —
    // sonst ist es nach dem Durchqueren der Schicht unerreichbar.
    fail(`${pick.name} (Stufe ${pick.power}) verlangt Erz aus Härte ${LAYERS[oreLayer].hardness}`);
  }
}
if (!failures) pass('Wächter, Härten und Hacken passen zusammen');

// ── 3. Fortschrittskurve ────────────────────────────────────────────────────

console.log('Erster Lauf (48 h simuliert):');

const rand = makeRng(12345);
const state = freshState();
const HOURS = 48;
const marks = [60, 600, 1800, 3600, 4 * 3600, 12 * 3600, 24 * 3600, HOURS * 3600 - 1];
const { marks: got, layerReached } = simulate(state, HOURS * 3600, { rand, marks });

for (const t of marks) {
  const m = got.get(t);
  if (!m) continue;
  console.log(
    `    ${hhmm(t).padStart(6)}: ${String(m.maxDepth).padStart(5)} m · ` +
      `Hacke ${m.pickTier} · ${fmt(m.gold).padStart(8)} Gold · ${m.layer}`
  );
}

console.log('  Schichten erreicht nach:');
for (const [li, sec] of [...layerReached].sort((a, b) => a[0] - b[0])) {
  if (li === 0) continue;
  console.log(`    ${LAYERS[li].name.padEnd(16)} ${hhmm(sec).padStart(7)}`);
}

// Leitplanken. Absichtlich beidseitig: zu schnell ist genauso kaputt wie zu langsam.
const at = (t) => got.get(t);
const min1 = at(60).maxDepth;
const min10 = at(600).maxDepth;
const h1 = at(3600).maxDepth;

if (min1 < 5) fail(`nach 1 min erst ${min1} m — Einstieg zu zäh`);
if (min1 > 60) fail(`nach 1 min schon ${min1} m — Einstieg zu schnell`);
if (min10 > 160) fail(`nach 10 min schon ${min10} m — zweite Schicht darf nicht so früh fallen`);
if (h1 > 400) fail(`nach 1 h schon ${h1} m — zu schnell`);
if (h1 < 40) fail(`nach 1 h erst ${h1} m — zu langsam`);

// Der Kernfehler der ersten Fassung: das ganze Spiel an einem Nachmittag durch.
const lastLayer = LAYERS.length - 1;
const reachedEnd = layerReached.get(lastLayer);
if (reachedEnd !== undefined) {
  fail(`Weltenwurzel schon nach ${hhmm(reachedEnd)} — der erste Lauf darf nicht durchlaufen`);
}
const hell = layerReached.get(8);
if (hell !== undefined && hell < 20 * 3600) {
  fail(`Höllenschlund nach ${hhmm(hell)} im ersten Lauf — zu früh`);
}
if (!failures) pass(`erster Lauf endet bei ${state.maxDepth} m mit Hacke ${state.pickTier}`);

// ── 4. Mechaniken schalten sich frei ────────────────────────────────────────

console.log('Freischaltungen:');
for (const f of FEATURES) {
  if (!state.features[f.id]) fail(`${f.name} wurde in 48 h nie freigeschaltet`);
}
if (!failures) pass(`alle ${FEATURES.length} Mechaniken erreicht`);

if (state.stats.picksForged < 3) fail(`nur ${state.stats.picksForged} Hacken geschmiedet`);
else pass(`${state.stats.picksForged} Hacken geschmiedet, ${state.stats.barsSmelted} Barren`);

// ── 5. Härte wirkt wirklich als Wand ────────────────────────────────────────

console.log('Härte:');
const wall = createState();
wall.pickTier = 1;
wall.depth = 200; // Tiefengestein, Härte 3
if (B.hardnessShortfall(wall) !== 2) fail('Härtedifferenz falsch berechnet');
const factor = B.hardnessFactor(wall);
if (factor > 0.1) fail(`zwei Stufen zu schwach ergeben noch ${(factor * 100).toFixed(1)} % Schaden`);
else pass(`zwei Stufen zu schwach = ${(factor * 100).toFixed(1)} % Schaden`);

// Ohne Ausbeuten-Modus darf man an der Wand nicht verhungern: der Test stellt
// sicher, dass Farmen tatsächlich schneller Erz bringt als Vortrieb.
const digState = freshState();
digState.miners.apprentice = 50;
const farmState = freshState();
farmState.miners.apprentice = 50;
farmState.features.farmMode = true;
A.setMode(farmState, 'farm');
simulate(digState, 300, { rand: makeRng(7), tapSeconds: 0 });
simulate(farmState, 300, { rand: makeRng(7), tapSeconds: 0 });
const digOre = Object.values(digState.ores).reduce((a, b) => a + b, 0);
const farmOre = Object.values(farmState.ores).reduce((a, b) => a + b, 0);
if (farmOre <= digOre) fail(`Ausbeuten bringt nicht mehr Erz (${farmOre} vs ${digOre})`);
else pass(`Ausbeuten bringt mehr Erz (${Math.round(farmOre)} vs ${Math.round(digOre)})`);

// ── 6. Lager, Ofen, Prestige, Offline ───────────────────────────────────────

console.log('Lager & Ofen:');
const depot = freshState();
depot.ores.coal = B.depotCap(depot);
const before = depot.stats.oreWasted;
depot.miners.apprentice = 200;
simulate(depot, 60, { rand: makeRng(3), tapSeconds: 0 });
if (depot.stats.oreWasted <= before) fail('volles Lager lässt trotzdem alles durch');
else pass(`volles Lager verwirft Überschuss (${Math.round(depot.stats.oreWasted)} Erz)`);

const smelt = freshState();
smelt.features.smelter = true;
smelt.ores.coal = 5000;
E.tick(smelt, 60, [], makeRng(5));
if (smelt.bars <= 0) fail('Schmelzofen produziert keine Barren');
else pass(`Schmelzofen: ${smelt.bars} Barren, Bonus ×${B.barMultiplier(smelt).toFixed(2)}`);

console.log('Prestige:');
const gain = B.runeGain(state);
if (gain <= 0) {
  fail(`kein Runengewinn bei ${state.maxDepth} m`);
} else {
  const res = A.collapse(state);
  if (!res.ok) fail('Einsturz abgelehnt: ' + res.msg);
  if (state.gold !== 0) fail('Gold nach Einsturz nicht zurückgesetzt');
  if (state.pickTier !== 1) fail('Hacke nach Einsturz nicht zurückgesetzt');
  if (Object.keys(state.ores).length) fail('Erz nach Einsturz noch da');
  if (!state.features.forge) fail('Freischaltungen dürfen den Einsturz überleben');
  pass(`Einsturz bei ${state.maxDepth} m → +${gain} Runen (×${B.runeMultiplier(gain).toFixed(2)})`);
}

// Zweiter Lauf muss spürbar schneller sein — sonst ist Prestige sinnlos.
const firstRunTo200 = layerReached.get(2);
const second = simulate(state, 6 * 3600, { rand: makeRng(99) });
const secondTo200 = second.layerReached.get(2);
if (firstRunTo200 === undefined || secondTo200 === undefined) {
  fail('Prestige-Vergleich nicht messbar — Tiefengestein in einem der Läufe nie erreicht');
} else if (secondTo200 >= firstRunTo200) {
  fail(`zweiter Lauf nicht schneller (${hhmm(secondTo200)} vs ${hhmm(firstRunTo200)})`);
} else {
  pass(`Tiefengestein: 1. Lauf ${hhmm(firstRunTo200)} → 2. Lauf ${hhmm(secondTo200)}`);
}

console.log('Offline:');
const off = freshState();
off.gold = 1e6;
A.buyMiner(off, 'apprentice', 40);
const depthBefore = off.depth;
const summary = E.simulateOffline(off, 3 * 3600 * 1000, makeRng(11));
if (!summary) fail('Offline-Simulation lieferte nichts');
else if (off.depth <= depthBefore) fail('Offline kein Fortschritt');
else pass(`3 h offline → +${summary.depth} m, ${Math.round(summary.ore)} Erz`);

const capped = E.simulateOffline(off, 400 * 3600 * 1000, makeRng(12));
if (capped && capped.ms > B.offlineCapMs(off)) fail('Offline-Deckel greift nicht');
else pass('Offline-Deckel greift');

console.log('Speicherstand:');
const roundtrip = importSave(exportSave(off));
if (Math.round(roundtrip.maxDepth) !== Math.round(off.maxDepth) || roundtrip.pickTier !== off.pickTier) {
  fail('Export/Import verliert Daten');
} else {
  pass('Export/Import ist verlustfrei');
}

// ── Ergebnis ────────────────────────────────────────────────────────────────

console.log('');
if (failures) {
  console.error(`${failures} Problem(e) gefunden.`);
  process.exit(1);
}
console.log('Alles in Ordnung.');
