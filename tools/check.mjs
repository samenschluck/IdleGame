// Smoke-Test ohne Test-Framework: läuft in CI und lokal mit `node tools/check.mjs`.
//
// Prüft:
//   1. Jede Quelldatei ist syntaktisch gültig, alle Importe lösen auf.
//   2. Zahlenformat und Schichtgrenzen stimmen.
//   3. Das Balancing trägt: ein simulierter Spieler kommt voran, und die
//      Prestige-Kette bleibt über mehrere Läufe hinweg lohnend.
//   4. Offline-Fortschritt funktioniert und respektiert den Deckel.

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
let failures = 0;

const fail = (msg) => {
  console.error('  ✗ ' + msg);
  failures++;
};
const pass = (msg) => console.log('  ✓ ' + msg);

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

// ── 2. Module ───────────────────────────────────────────────────────────────
// main.js und ui.js bleiben außen vor: die brauchen ein DOM.

console.log('Module:');
const B = await import('../src/core/balance.js');
const E = await import('../src/core/engine.js');
const A = await import('../src/core/actions.js');
const { createState, exportSave, importSave } = await import('../src/core/state.js');
const { LAYERS, isBossDepth } = await import('../src/data/layers.js');
const { CRYSTAL_UPGRADES } = await import('../src/data/upgrades.js');
const { fmt } = await import('../src/util/format.js');
const { runPrestigeChain, simulateRun, makeRng } = await import('./sim.mjs');
pass('alle Logik-Module laden');

// ── 3. Formatierung ─────────────────────────────────────────────────────────

console.log('Formatierung:');
for (const [input, expected] of [
  [0, '0'], [999, '999'], [1000, '1K'], [1.5e6, '1.5M'], [1e15, '1aa'],
]) {
  const actual = fmt(input);
  if (actual !== expected) fail(`fmt(${input}) = "${actual}", erwartet "${expected}"`);
}
if (!failures) pass('Zahlenformat stimmt');

// ── 4. Schichten ────────────────────────────────────────────────────────────

console.log('Schichten:');
for (const layer of LAYERS) {
  if (layer.to !== Infinity && !isBossDepth(layer.to)) {
    fail(`kein Wächter auf ${layer.to} m (${layer.name})`);
  }
}
if (isBossDepth(37)) fail('Wächter auf zufälliger Tiefe 37 m');
if (!isBossDepth(3000)) fail('kein endloser Wächter bei 3000 m');
pass('Wächter sitzen korrekt');

// ── 5. Erster Lauf ──────────────────────────────────────────────────────────

console.log('Erster Lauf (4 h):');
const rand = makeRng();
const first = createState();
const marks = [60, 600, 1800, 3600, 7200, 4 * 3600 - 1];
const curve = simulateRun(first, 4 * 3600, rand, marks);
for (const m of curve) {
  console.log(
    `    nach ${String(Math.round(m.t / 60)).padStart(3)} min: ` +
      `${String(m.depth).padStart(5)} m · ${fmt(m.gold).padStart(9)} Gold · ${m.crystals} 💎`
  );
}

// Leitplanken für den Einstieg — die erste Viertelstunde entscheidet.
if (curve[0].depth < 5) fail(`nach 1 min erst ${curve[0].depth} m — Einstieg zu zäh`);
if (curve[1].depth < 25) fail(`nach 10 min erst ${curve[1].depth} m — zu langsam`);
if (first.maxDepth < B.PRESTIGE_MIN_DEPTH) {
  fail(`nach 4 h erst ${first.maxDepth} m — Prestige (${B.PRESTIGE_MIN_DEPTH} m) unerreichbar`);
}
if (first.crystals < 10) fail(`nach 4 h nur ${first.crystals} Kristalle — Geoden zu selten`);
if (first.stats.bossesSlain < 2) fail(`nur ${first.stats.bossesSlain} Wächter besiegt`);
if (!failures) pass(`erster Lauf endet bei ${first.maxDepth} m`);

// ── 6. Prestige-Kette ───────────────────────────────────────────────────────
// Der Kern eines Idle-Games: jeder Lauf muss spürbar weiter kommen. Ein
// polynomialer Runenbonus scheitert hier zwangsläufig, weil die Blockhärte
// exponentiell mit der Tiefe wächst — deshalb wird das hier festgenagelt.

console.log('Prestige-Kette (Lauf 1 = 4 h, danach je 1 h):');
const { state: chained, history } = runPrestigeChain({ runs: 7 });
for (const h of history) {
  if (!h.ok) {
    fail(`Lauf ${h.run}: Einsturz abgelehnt — ${h.msg}`);
    continue;
  }
  console.log(
    `    Lauf ${h.run}: ${String(h.depth).padStart(5)} m` +
      (h.gained === undefined ? '        ' : ` (+${String(h.gained).padStart(4)} m)`) +
      ` · ${h.runes} ᚱ ×${fmt(B.runeMultiplier(h.runes))} · ${h.crystals} 💎`
  );
}

const gains = history.filter((h) => h.gained !== undefined).map((h) => h.gained);
const stalled = gains.filter((g) => g <= 0).length;
if (stalled > 0) fail(`${stalled} Lauf/Läufe ohne Fortschritt — Prestige trägt nicht`);
const lastGain = gains[gains.length - 1] ?? 0;
if (lastGain < 100) fail(`letzter Lauf nur +${lastGain} m — die Kette versandet`);
if (!failures) {
  pass(`Kette trägt: ${history[history.length - 1].depth} m nach ${history.length} Läufen`);
}

// ── 7. Kristall-Ökonomie ────────────────────────────────────────────────────
// Die Währung soll sich anfangs knapp anfühlen und später von selbst fließen —
// genau das ist der Reiz der "unechten" Premiumwährung.

console.log('Kristalle:');
const early = createState();
simulateRun(early, 900, makeRng(7)); // 15 Minuten
if (early.crystals > 40) {
  fail(`nach 15 min schon ${early.crystals} Kristalle — zu großzügig für den Start`);
}
if (chained.crystals < early.crystals * 20) {
  fail('Kristalle skalieren im Spätspiel zu schwach');
}
pass(`15 min: ${early.crystals} 💎 · nach der Kette: ${fmt(chained.crystals)} 💎`);

for (const u of CRYSTAL_UPGRADES) {
  const top = u.cost(u.max - 1);
  if (top > chained.crystals * 50) {
    fail(`${u.name}: Endstufe kostet ${fmt(top)} 💎 — praktisch unerreichbar`);
  }
}

// ── 8. Offline ──────────────────────────────────────────────────────────────
// Frischer Stand: am Ende eines Laufs steht der Spieler per Definition vor der
// Wand, dort wäre auch offline kein Fortschritt zu erwarten.

console.log('Offline:');
const offlineState = createState();
offlineState.gold = 1e5;
A.buyMiner(offlineState, 'apprentice', 40);
A.buyMiner(offlineState, 'hewer', 15);
const before = offlineState.depth;
const summary = E.simulateOffline(offlineState, 3 * 3600 * 1000, rand);
if (!summary) fail('Offline-Simulation lieferte nichts');
else if (offlineState.depth <= before) fail('Offline kein Fortschritt');
else pass(`3 h offline → +${summary.depth} m`);

const capped = E.simulateOffline(offlineState, 400 * 3600 * 1000, rand);
if (capped && capped.ms > B.offlineCapMs(offlineState)) fail('Offline-Deckel greift nicht');
else pass('Offline-Deckel greift');

if (E.simulateOffline(createState(), 5000, rand) !== null) {
  fail('sehr kurze Abwesenheit sollte keine Meldung erzeugen');
}

// ── 9. Speicherstand ────────────────────────────────────────────────────────

console.log('Speicherstand:');
const roundtrip = importSave(exportSave(chained));
if (roundtrip.maxDepth !== chained.maxDepth || roundtrip.runes !== chained.runes) {
  fail('Export/Import verliert Fortschritt');
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
