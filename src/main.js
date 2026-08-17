// Bootstrap: Speicherstand laden, Offline verrechnen, Game-Loop starten.

import { load, save } from './core/state.js';
import { tick, tap, simulateOffline, pushLog } from './core/engine.js';
import { fmt, fmtInt, fmtTime, fmtDepth } from './util/format.js';
import * as UI from './ui/ui.js';

const SAVE_INTERVAL_MS = 10_000;
const SLOW_RENDER_MS = 300;

const state = load();
let lastTick = performance.now();
let lastSave = Date.now();
let lastSlow = 0;
const events = [];

// ── Offline-Fortschritt ─────────────────────────────────────────────────────

const away = Date.now() - (state.savedAt || Date.now());
if (away > 0) {
  const summary = simulateOffline(state, away);
  if (summary) queueMicrotask(() => showOfflineModal(summary));
}

function showOfflineModal(s) {
  const rows = [
    ['Abwesend', fmtTime(s.ms / 1000)],
    ['Tiefer gegraben', fmtDepth(s.depth)],
    ['Gold', fmt(s.gold)],
  ];
  if (s.crystals > 0) rows.push(['Kristalle', fmtInt(s.crystals) + ' 💎']);
  const capNote = s.cappedFrom
    ? `<p class="small">Offline-Kapazität erreicht. Mehr Zeit gibt es über <b>Nachtschicht</b> im Kristall-Shop.</p>`
    : '';
  UI.showModal(
    'Die Zwerge haben weitergegraben',
    rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('') + capNote,
    [{ label: 'Weiter', cls: 'danger', run: UI.hideModal }]
  );
}

// ── UI ──────────────────────────────────────────────────────────────────────

UI.initUI(state, {
  onTap: (pos) => {
    const before = state.depth;
    const { dmg, crit } = tap(state, events, Math.random);
    UI.hitBlock();
    UI.spawnFloater(fmt(dmg), crit ? 'crit' : '', pos);
    if (state.depth !== before) UI.renderSlow();
  },
});

if (!state.log.length) {
  pushLog(state, 'Du erbst einen verlassenen Stollen. Fang an zu graben.', 'story');
}

// ── Game-Loop ───────────────────────────────────────────────────────────────

function loop(now) {
  const dt = Math.min(1, (now - lastTick) / 1000); // Sprünge (Tab inaktiv) begrenzen
  lastTick = now;

  tick(state, dt, events);
  drainEvents();

  UI.renderFast();
  if (now - lastSlow > SLOW_RENDER_MS) {
    lastSlow = now;
    UI.renderSlow();
  }

  const wall = Date.now();
  if (wall - lastSave > SAVE_INTERVAL_MS) {
    lastSave = wall;
    save(state);
  }

  requestAnimationFrame(loop);
}

function drainEvents() {
  if (!events.length) return;
  // Nur die letzten paar Ereignisse visualisieren — bei hoher Grabkraft
  // brechen pro Frame sonst hunderte Blöcke und die Floater ersticken das UI.
  const recent = events.slice(-6);
  events.length = 0;
  for (const e of recent) {
    if (e.type === 'geode') UI.spawnFloater('+' + e.crystals + ' 💎', 'gem');
    else if (e.type === 'boss') UI.spawnFloater('⚔ ' + e.name, 'crit');
    else if (e.type === 'layer') UI.toast('Neue Schicht: ' + e.layer.name, 'good');
  }
}

requestAnimationFrame(loop);

// ── Lebenszyklus ────────────────────────────────────────────────────────────

// Beim Wegwechseln sofort speichern; beim Zurückkommen die Pause nachrechnen.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save(state);
  } else {
    const gap = Date.now() - state.savedAt;
    if (gap > 30_000) {
      const summary = simulateOffline(state, gap);
      if (summary) showOfflineModal(summary);
    }
    lastTick = performance.now();
  }
});

window.addEventListener('pagehide', () => save(state));

// ── PWA ─────────────────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* Ohne Service Worker läuft das Spiel trotzdem. */
    });
  });
}

// Für schnelles Debuggen am Handy über die Adresszeile bzw. Remote-Konsole.
window.TS = { state, save, UI };
