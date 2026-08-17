// Balance-Sweep. Faehrt das Spiel kopflos durch und zeigt, wann welche Schicht
// faellt — fuer verschiedene Werte der Stellschrauben aus balance.TUNING und
// picks.PICK_TUNING.
//
//   node tools/tune.mjs                  aktuelle Werte, ausführlicher Bericht
//   node tools/tune.mjs hpPerLayer 18 22 26 30
//   node tools/tune.mjs oreGrowth 2.2 2.6 3.0
//
// Zielkurve (erster Lauf, ohne Runen): jede Schicht soll spuerbar laenger
// dauern als die vorige, und der erste Lauf soll NICHT bis zur Weltenwurzel
// durchlaufen — dafuer ist Prestige da.

import { TUNING } from '../src/core/balance.js';
import { PICK_TUNING } from '../src/data/picks.js';
import { LAYERS } from '../src/data/layers.js';
import { simulate, makeRng, freshState } from './sim.mjs';

const HOURS = Number(process.env.HOURS || 72);

// Die ersten drei Schichten sind bewusst schnell: sie sind das Tutorial und
// zeigen Wand, Ausbeuten und Schmiede einmal durch. Ab da verdoppelt bis
// verdreifacht sich der Aufwand je Schicht, und die letzten beiden Schichten
// erreicht der erste Lauf gar nicht — die gibt es nur ueber Prestige.
const TARGET = [
  null, // Oberboden: Start
  3 * 60,
  35 * 60,
  60 * 60,
  90 * 60,
  2.5 * 3600,
  6 * 3600,
  18 * 3600,
  60 * 3600,
  null,
];

function hhmm(sec) {
  if (sec === undefined) return '  —  ';
  if (sec >= 3600) return `${(sec / 3600).toFixed(1)}h`.padStart(6);
  return `${Math.round(sec / 60)}min`.padStart(6);
}

function run() {
  const state = freshState();
  const { layerReached } = simulate(state, HOURS * 3600, { rand: makeRng(12345) });
  return { state, layerReached };
}

function report(label) {
  const { state, layerReached } = run();
  const cells = LAYERS.map((_, i) => (i === 0 ? null : hhmm(layerReached.get(i))));
  console.log(
    `${label.padEnd(22)} ${cells.slice(1).join(' ')}  →  ${state.maxDepth} m, Hacke ${state.pickTier}`
  );
  return { state, layerReached };
}

const [knob, ...values] = process.argv.slice(2);

console.log(`Zielkurve (Schicht 2…10):  ${TARGET.slice(1).map(hhmm).join(' ')}`);
console.log('');

if (!knob) {
  console.log(`Aktuelle Werte, ${HOURS} h simuliert:`);
  console.log('');
  const { state, layerReached } = report('aktuell');
  console.log('');
  console.log('Abweichung von der Zielkurve:');
  for (let i = 1; i < LAYERS.length; i++) {
    const got = layerReached.get(i);
    const want = TARGET[i];
    if (want === null) {
      console.log(
        `  ${LAYERS[i].name.padEnd(16)} ${got === undefined ? 'nicht erreicht — richtig so' : hhmm(got) + ' — sollte der erste Lauf NICHT schaffen'}`
      );
      continue;
    }
    if (got === undefined) {
      console.log(`  ${LAYERS[i].name.padEnd(16)} nicht erreicht (Ziel ${hhmm(want)})`);
      continue;
    }
    const ratio = got / want;
    const verdict = ratio < 0.5 ? 'VIEL zu schnell' : ratio < 0.8 ? 'zu schnell' :
                    ratio > 2 ? 'VIEL zu langsam' : ratio > 1.25 ? 'zu langsam' : 'passt';
    console.log(
      `  ${LAYERS[i].name.padEnd(16)} ${hhmm(got)} (Ziel ${hhmm(want)}, ×${ratio.toFixed(2)}) ${verdict}`
    );
  }
  console.log('');
  console.log(`Hacken: ${state.stats.picksForged}  Barren: ${state.bars}  ` +
    `Kristalle: ${state.crystals}  Blöcke: ${Math.round(state.stats.blocksBroken)}`);
} else {
  const target = knob in TUNING ? TUNING : knob in PICK_TUNING ? PICK_TUNING : null;
  if (!target) {
    console.error(`Unbekannte Stellschraube "${knob}".`);
    console.error(`balance.TUNING: ${Object.keys(TUNING).join(', ')}`);
    console.error(`picks.PICK_TUNING: ${Object.keys(PICK_TUNING).join(', ')}`);
    process.exit(1);
  }
  const original = target[knob];
  for (const raw of values) {
    target[knob] = Number(raw);
    report(`${knob}=${raw}`);
  }
  target[knob] = original;
}
