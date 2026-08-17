// Balance-Sweep: probiert Konstanten-Kombinationen durch und zeigt, wie tief
// ein Spieler über mehrere Prestige-Läufe kommt.
//
//   node tools/tune.mjs                     # aktuelle Werte prüfen
//   node tools/tune.mjs 1.045,1.038,1.35    # HP-, Gold-Wachstum, Runenbasis
//
// Der Sweep schreibt die Werte kurzzeitig in src/core/balance.js und stellt
// die Datei danach wieder her.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BALANCE = fileURLToPath(new URL('../src/core/balance.js', import.meta.url));

function patch(hp, gold, rune) {
  const original = readFileSync(BALANCE, 'utf8');
  const patched = original
    .replace(/^const HP_GROWTH = .*$/m, `const HP_GROWTH = ${hp};`)
    .replace(/^const GOLD_GROWTH = .*$/m, `const GOLD_GROWTH = ${gold};`)
    .replace(/^const RUNE_BASE = .*$/m, `const RUNE_BASE = ${rune};`);
  writeFileSync(BALANCE, patched);
  return () => writeFileSync(BALANCE, original);
}

const CHILD = `
  const { runPrestigeChain } = await import('${fileURLToPath(new URL('./sim.mjs', import.meta.url))}');
  const { history } = runPrestigeChain({ firstRunSeconds: 4 * 3600, runs: 7 });
  console.log(JSON.stringify(history));
`;

function measure(hp, gold, rune) {
  const restore = patch(hp, gold, rune);
  try {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', CHILD], {
      encoding: 'utf8',
    });
    return JSON.parse(out.trim().split('\n').pop());
  } finally {
    restore();
  }
}

const combos = process.argv[2]
  ? [process.argv[2].split(',').map(Number)]
  : [
      [1.075, 1.05, 1.14],
      [1.055, 1.045, 1.25],
      [1.045, 1.038, 1.35],
      [1.04, 1.034, 1.4],
      [1.035, 1.03, 1.45],
    ];

console.log('HP     Gold   Rune   →  Tiefe je Lauf (Lauf 1 = 4 h, danach je 1 h)');
for (const [hp, gold, rune] of combos) {
  const history = measure(hp, gold, rune);
  const line = history
    .map((h) => (h.ok ? String(h.depth) : `✗${h.msg?.slice(0, 12)}`))
    .join(' → ');
  console.log(
    `${String(hp).padEnd(6)} ${String(gold).padEnd(6)} ${String(rune).padEnd(6)} →  ${line}`
  );
}
