// Rendering & Eingaben. Kennt die Spiel-Logik nur über core/actions.js.
// Aufteilung: renderFast (jeden Frame: HUD, Block, Timer) und
// renderSlow (3×/s: Listen des aktiven Tabs) — spart Arbeit auf schwachen Geräten.

import { fmt, fmtInt, fmtTime, fmtDepth } from '../util/format.js';
import { MINERS } from '../data/miners.js';
import { FORGE_UPGRADES, CRYSTAL_UPGRADES, CRYSTAL_ACTIONS } from '../data/upgrades.js';
import { LAYERS, layerIndexAt, isBossDepth, bossNameAt } from '../data/layers.js';
import * as B from '../core/balance.js';
import * as A from '../core/actions.js';
import { exportSave, importSave } from '../core/state.js';

const $ = (id) => document.getElementById(id);

const el = {};
let state;
let buyAmount = 1;
let activeView = 'mine';
let onTap = () => {};

export function initUI(gameState, handlers) {
  state = gameState;
  onTap = handlers.onTap;

  for (const id of [
    'res-gold', 'res-crystals', 'res-runes', 'hud-layer', 'hud-dps',
    'boost-bar', 'boost-time', 'depth-value', 'depth-max', 'block',
    'block-name', 'block-face', 'block-hp', 'hpbar-fill', 'floaters',
    'log', 'miner-list', 'forge-list', 'crystal-list', 'action-list',
    'layer-list', 'stats', 'rune-gain', 'prestige-info', 'btn-collapse',
    'freebie-sub', 'bomb-sub', 'btn-freebie', 'btn-bomb', 'toast',
    'modal', 'modal-title', 'modal-body', 'modal-actions', 'version-line',
  ]) {
    el[id] = $(id);
  }

  bindTabs();
  bindBlock();
  bindLists();
  bindQuick();
  bindPrestige();
  bindSaveRow();

  el['version-line'].textContent = 'Tiefenschacht v0.1 — Vertical Slice';
  renderSlow();
}

/** Zustandswechsel von außen (z.B. nach Import). */
export function setState(next) {
  state = next;
}

// ── Eingaben ────────────────────────────────────────────────────────────────

function bindTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeView = tab.dataset.view;
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.view').forEach((v) => {
        v.classList.toggle('active', v.id === 'view-' + activeView);
      });
      $('views').scrollTop = 0;
      renderSlow();
    });
  });
}

function bindBlock() {
  // pointerdown statt click: fühlt sich am Handy deutlich direkter an.
  el.block.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = el.block.getBoundingClientRect();
    onTap({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  });
  el.block.addEventListener('contextmenu', (e) => e.preventDefault());
}

function bindLists() {
  document.querySelectorAll('#buy-mode button').forEach((btn) => {
    btn.addEventListener('click', () => {
      buyAmount = btn.dataset.amount === 'max' ? 'max' : Number(btn.dataset.amount);
      document.querySelectorAll('#buy-mode button').forEach((b) => {
        b.classList.toggle('active', b === btn);
      });
      renderSlow();
    });
  });

  delegate(el['miner-list'], (id) => A.buyMiner(state, id, buyAmount));
  delegate(el['forge-list'], (id) => A.buyForge(state, id, buyAmount === 'max' ? 'max' : buyAmount));
  delegate(el['crystal-list'], (id) => A.buyCrystalUpgrade(state, id));
  delegate(el['action-list'], (id) => A.useCrystalAction(state, id));
}

function delegate(container, run) {
  container.addEventListener('click', (e) => {
    const card = e.target.closest('[data-id]');
    if (!card || card.disabled) return;
    const res = run(card.dataset.id);
    toast(res.msg, res.ok ? 'good' : 'bad');
    renderSlow();
  });
}

function bindQuick() {
  el['btn-freebie'].addEventListener('click', () => {
    const res = A.claimFreebie(state);
    toast(res.msg, res.ok ? 'good' : 'bad');
  });
  el['btn-bomb'].addEventListener('click', () => {
    const res = A.claimBomb(state);
    toast(res.msg, res.ok ? 'good' : 'bad');
    if (res.ok) burstFloaters();
  });
}

function bindPrestige() {
  el['btn-collapse'].addEventListener('click', () => {
    const gain = B.runeGain(state);
    const gems = B.prestigeCrystals(state);
    showModal(
      'Schacht einstürzen lassen?',
      `<p>Du verlierst Gold, Zwerge und alle Schmiede-Upgrades.</p>
       <div class="row"><span>Seelenrunen</span><b>+${fmtInt(gain)} ᚱ</b></div>
       <div class="row"><span>Kristalle</span><b>+${fmtInt(gems)} 💎</b></div>
       <div class="row"><span>Neue Starttiefe</span><b>${fmtDepth(B.startDepth(state))}</b></div>`,
      [
        { label: 'Abbrechen', cls: 'ghost', run: hideModal },
        {
          label: 'Einstürzen',
          cls: 'danger',
          run: () => {
            const res = A.collapse(state);
            toast(res.msg, res.ok ? 'good' : 'bad');
            hideModal();
            renderSlow();
          },
        },
      ]
    );
  });
}

function bindSaveRow() {
  $('btn-export').addEventListener('click', () => {
    const code = exportSave(state);
    showModal(
      'Speicherstand exportieren',
      `<p>Text kopieren und sicher ablegen.</p><textarea readonly>${code}</textarea>`,
      [{ label: 'Schließen', cls: 'ghost', run: hideModal }]
    );
    setTimeout(() => el['modal-body'].querySelector('textarea')?.select(), 60);
  });

  $('btn-import').addEventListener('click', () => {
    showModal(
      'Speicherstand importieren',
      `<p>Achtung: überschreibt den aktuellen Stand.</p><textarea placeholder="Code einfügen…"></textarea>`,
      [
        { label: 'Abbrechen', cls: 'ghost', run: hideModal },
        {
          label: 'Importieren',
          cls: 'danger',
          run: () => {
            const text = el['modal-body'].querySelector('textarea').value;
            try {
              const next = importSave(text);
              Object.keys(state).forEach((k) => delete state[k]);
              Object.assign(state, next);
              hideModal();
              toast('Import erfolgreich', 'good');
              renderSlow();
            } catch {
              toast('Code ungültig', 'bad');
            }
          },
        },
      ]
    );
  });

  $('btn-wipe').addEventListener('click', () => {
    showModal(
      'Wirklich alles löschen?',
      '<p>Fortschritt, Kristalle und Runen sind danach weg. Das lässt sich nicht rückgängig machen.</p>',
      [
        { label: 'Abbrechen', cls: 'ghost', run: hideModal },
        {
          label: 'Löschen',
          cls: 'danger',
          run: () => {
            localStorage.removeItem('tiefenschacht.save.v1');
            location.reload();
          },
        },
      ]
    );
  });
}

// ── Schneller Render-Pfad ───────────────────────────────────────────────────

export function renderFast(now = Date.now()) {
  // Gold immer ganzzahlig zeigen — Nachkommastellen wirken auf einem
  // Münzzähler wie ein Anzeigefehler.
  el['res-gold'].querySelector('.res-val').textContent = fmt(Math.floor(state.gold));
  el['res-crystals'].querySelector('.res-val').textContent = fmtInt(state.crystals);
  el['res-runes'].querySelector('.res-val').textContent = fmtInt(state.runes);

  const layer = LAYERS[layerIndexAt(state.depth)];
  el['hud-layer'].textContent = layer.name;
  el['hud-dps'].textContent = fmt(B.totalDps(state, now)) + '/s Grabkraft';
  document.documentElement.style.setProperty('--layer', layer.tint);

  const boostLeft = state.boostUntil - now;
  el['boost-bar'].classList.toggle('hidden', boostLeft <= 0);
  if (boostLeft > 0) el['boost-time'].textContent = fmtTime(boostLeft / 1000);

  el['depth-value'].textContent = fmtDepth(state.depth);
  el['depth-max'].textContent = 'max ' + fmtDepth(state.maxDepth);

  const boss = isBossDepth(state.depth);
  const max = B.blockMaxHp(state.depth);
  const pct = Math.max(0, Math.min(1, state.blockHp / max));
  el['hpbar-fill'].style.width = (pct * 100).toFixed(1) + '%';
  el.block.classList.toggle('boss', boss);
  el['block-name'].textContent = boss ? '⚔ ' + bossNameAt(state.depth) : layer.name;
  el['block-face'].textContent = boss ? '👁️' : blockFace(layer.id);
  el['block-hp'].textContent = `${fmt(Math.max(0, state.blockHp))} / ${fmt(max)}`;

  updateQuick(el['btn-freebie'], el['freebie-sub'], state.freebieReadyAt, now,
    `+${fmtInt(B.freebieYield(state))} 💎`);
  updateQuick(el['btn-bomb'], el['bomb-sub'], state.bombReadyAt, now,
    `+${fmtInt(B.bombYield(state))} 💎`);
}

function updateQuick(btn, sub, readyAt, now, readyText) {
  const left = readyAt - now;
  const ready = left <= 0;
  btn.disabled = !ready;
  btn.classList.toggle('ready', ready);
  sub.textContent = ready ? readyText : fmtTime(left / 1000);
}

const FACES = {
  topsoil: '🟫', limestone: '🪨', deeprock: '⛰️', geode: '💠', halls: '🏛️',
  trollrift: '🪵', volcanic: '🌋', shadow: '🌑', hell: '🔥', worldroot: '🌳',
};
function blockFace(id) {
  return FACES[id] || '🪨';
}

// ── Langsamer Render-Pfad (Listen) ──────────────────────────────────────────

export function renderSlow() {
  renderLog();
  if (activeView === 'crew') renderMiners();
  else if (activeView === 'forge') renderForge();
  else if (activeView === 'crystal') renderCrystals();
  else if (activeView === 'deep') renderDeep();
}

function renderLog() {
  const items = state.log.slice(-14).reverse();
  el.log.innerHTML = items
    .map((e) => `<li class="${e.kind}">${escapeHtml(e.text)}</li>`)
    .join('') || '<li>Der Stollen wartet.</li>';
}

function renderMiners() {
  el['miner-list'].innerHTML = MINERS.map((m) => {
    const owned = state.miners[m.id] || 0;
    const locked = state.maxDepth < m.unlockDepth;
    if (locked && owned === 0) {
      return card({
        id: m.id, icon: '🔒', title: '???', desc: `Freigeschaltet ab ${fmtDepth(m.unlockDepth)}`,
        cost: '', disabled: true, cls: 'locked',
      });
    }
    const n = buyAmount === 'max' ? Math.max(1, B.maxAffordable(m, owned, state.gold)) : buyAmount;
    const cost = B.minerCostBulk(m, owned, n);
    const affordable = cost <= state.gold;
    return card({
      id: m.id,
      icon: m.icon,
      title: `${m.name} <span class="card-count">×${fmtInt(owned)}</span>`,
      desc: m.flavor,
      effect: `${fmt(m.dps)} Grabkraft/s je Zwerg · aktuell ${fmt(owned * m.dps)}`,
      cost: `🪙 ${fmt(cost)}<span class="cost-sub">${buyAmount === 'max' ? `kauf ${fmtInt(n)}` : `×${n}`}</span>`,
      disabled: !affordable,
      cls: affordable ? 'affordable' : '',
    });
  }).join('');
}

function renderForge() {
  el['forge-list'].innerHTML = FORGE_UPGRADES.map((u) => {
    const level = state.upgrades[u.id] || 0;
    const maxed = level >= u.max;
    const cost = maxed ? Infinity : B.forgeCost(u.id, level);
    const affordable = cost <= state.gold;
    return card({
      id: u.id,
      icon: u.icon,
      title: `${u.name} <span class="card-count">Stufe ${level}</span>`,
      desc: u.desc,
      effect: forgeEffect(u.id, level),
      cost: maxed ? 'MAX' : `🪙 ${fmt(cost)}`,
      disabled: maxed || !affordable,
      cls: !maxed && affordable ? 'affordable' : '',
    });
  }).join('');
}

function forgeEffect(id, level) {
  switch (id) {
    case 'pickaxe': return `Tippschaden ×${fmt(Math.pow(1.25, level))}`;
    case 'gear': return `Grabkraft ×${fmt(Math.pow(1.12, level))}`;
    case 'carts': return `Gold ×${fmt(Math.pow(1.15, level))}`;
    case 'lantern': return `Kritchance ${(B.critChance(state) * 100).toFixed(1)} %`;
    case 'powder': return `Kritschaden ×${B.critMultiplier(state).toFixed(1)}`;
    case 'survey': return `Geodenchance ${(B.geodeChance(state, state.depth) * 100).toFixed(2)} %`;
    default: return '';
  }
}

function renderCrystals() {
  el['action-list'].innerHTML = Object.entries(CRYSTAL_ACTIONS).map(([id, a]) => {
    const affordable = state.crystals >= a.cost;
    return card({
      id, icon: a.icon, title: a.name, desc: a.desc,
      cost: `💎 ${fmtInt(a.cost)}`, costCls: 'gems',
      disabled: !affordable, cls: affordable ? 'affordable' : '',
    });
  }).join('');

  el['crystal-list'].innerHTML = CRYSTAL_UPGRADES.map((u) => {
    const level = state.crystalUpgrades[u.id] || 0;
    const maxed = level >= u.max;
    const cost = maxed ? Infinity : B.crystalCost(u.id, level);
    const affordable = state.crystals >= cost;
    return card({
      id: u.id,
      icon: u.icon,
      title: `${u.name} <span class="card-count">Stufe ${level}/${u.max}</span>`,
      desc: u.desc,
      cost: maxed ? 'MAX' : `💎 ${fmtInt(cost)}`,
      costCls: 'gems',
      disabled: maxed || !affordable,
      cls: !maxed && affordable ? 'affordable' : '',
    });
  }).join('');
}

function renderDeep() {
  const gain = B.runeGain(state);
  el['rune-gain'].textContent = '+' + fmtInt(gain);
  el['btn-collapse'].disabled = gain <= 0;
  el['prestige-info'].textContent =
    state.maxDepth < B.PRESTIGE_MIN_DEPTH
      ? `Mindestens ${fmtDepth(B.PRESTIGE_MIN_DEPTH)} nötig (aktuell ${fmtDepth(state.maxDepth)})`
      : `Aktueller Bonus: ×${fmt(B.runeMultiplier(state.runes))} · danach ×${fmt(B.runeMultiplier(state.runes + gain))}`;

  const current = layerIndexAt(state.depth);
  el['layer-list'].innerHTML = LAYERS.map((l, i) => {
    const seen = state.seenLayers[l.id];
    const from = i === 0 ? 0 : LAYERS[i - 1].to;
    const range = l.to === Infinity ? `ab ${fmtInt(from)} m` : `${fmtInt(from)}–${fmtInt(l.to)} m`;
    return `<div class="layer-row ${i === current ? 'current' : ''} ${seen ? '' : 'unseen'}">
      <span class="layer-dot" style="background:${l.tint}"></span>
      <span class="layer-name">${seen ? escapeHtml(l.name) : '???'}</span>
      <span class="layer-depth">${range}</span>
    </div>`;
  }).join('');

  const s = state.stats;
  el.stats.innerHTML = [
    ['Blöcke zerschlagen', fmtInt(s.blocksBroken)],
    ['Schläge von Hand', fmtInt(s.taps)],
    ['Wächter besiegt', fmtInt(s.bossesSlain)],
    ['Geoden gefunden', fmtInt(s.geodes)],
    ['Gold gesamt', fmt(s.goldEarned)],
    ['Kristalle gesamt', fmtInt(s.crystalsEarned)],
    ['Einstürze', fmtInt(s.collapses)],
    ['Spielzeit', fmtTime(s.playtimeMs / 1000)],
  ].map(([label, value]) =>
    `<div class="stat"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`
  ).join('');
}

function card({ id, icon, title, desc, effect, cost, costCls = '', disabled, cls = '' }) {
  return `<button class="card ${cls}" data-id="${id}" ${disabled ? 'disabled' : ''}>
    <span class="card-ico">${icon}</span>
    <span class="card-main">
      <span class="card-title">${title}</span>
      <span class="card-desc">${desc || ''}</span>
      ${effect ? `<span class="card-effect">${effect}</span>` : ''}
    </span>
    <span class="card-cost ${costCls}">${cost}</span>
  </button>`;
}

// ── Effekte ─────────────────────────────────────────────────────────────────

export function spawnFloater(text, cls = '', pos) {
  const node = document.createElement('div');
  node.className = 'floater ' + cls;
  node.textContent = text;
  const rect = el.block.getBoundingClientRect();
  node.style.left = ((pos?.x ?? rect.width * (0.3 + Math.random() * 0.4)) - 14) + 'px';
  node.style.top = ((pos?.y ?? rect.height * 0.45) - 10) + 'px';
  el.floaters.appendChild(node);
  setTimeout(() => node.remove(), 900);
}

export function hitBlock() {
  el.block.classList.remove('hit');
  void el.block.offsetWidth; // Reflow erzwingen, damit die Animation neu startet
  el.block.classList.add('hit');
}

function burstFloaters() {
  for (let i = 0; i < 8; i++) {
    setTimeout(() => spawnFloater('💎', 'gem'), i * 70);
  }
}

let toastTimer;
export function toast(msg, kind = '') {
  el.toast.textContent = msg;
  el.toast.className = 'toast ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.add('hidden'), 1800);
}

export function showModal(title, bodyHtml, actions) {
  el['modal-title'].textContent = title;
  el['modal-body'].innerHTML = bodyHtml;
  el['modal-actions'].innerHTML = '';
  for (const a of actions) {
    const btn = document.createElement('button');
    btn.className = 'btn ' + (a.cls || '');
    btn.textContent = a.label;
    btn.addEventListener('click', a.run);
    el['modal-actions'].appendChild(btn);
  }
  el.modal.classList.remove('hidden');
}

export function hideModal() {
  el.modal.classList.add('hidden');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}
