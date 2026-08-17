// Rendering & Eingaben. Kennt die Spiel-Logik nur über core/actions.js.
// Aufteilung: renderFast (jeden Frame: HUD, Block, Timer) und
// renderSlow (3×/s: Listen des aktiven Tabs) — spart Arbeit auf schwachen Geräten.

import { fmt, fmtInt, fmtTime, fmtDepth } from '../util/format.js';
import { MINERS } from '../data/miners.js';
import {
  FORGE_UPGRADES, CRYSTAL_UPGRADES, CRYSTAL_ACTIONS, forgeMaxLevel, forgeUnlocked,
} from '../data/upgrades.js';
import { LAYERS, layerIndexAt, layerAt, isBossDepth, bossNameAt, ORE_BY_ID } from '../data/layers.js';
import { PICKS, pickAt, nextPick } from '../data/picks.js';
import * as B from '../core/balance.js';
import * as A from '../core/actions.js';
import { exportSave, importSave } from '../core/state.js';

const VERSION = 'Tiefenschacht v0.3 — Stufen, Erz, Härte, Schmelzofen';

const $ = (id) => document.getElementById(id);

const el = {};
let state;
let buyAmount = 1;
let activeView = 'mine';
let onTap = () => {};

// Tabs, die erst mit ihrer Mechanik auftauchen.
const TAB_FEATURE = { crystal: 'crystals', deep: 'prestige' };

export function initUI(gameState, handlers) {
  state = gameState;
  onTap = handlers.onTap;

  for (const id of [
    'res-gold', 'res-crystals', 'res-runes', 'hud-layer', 'hud-dps', 'hud-pick',
    'boost-bar', 'boost-time', 'level-num', 'level-fill', 'level-cap', 'depth-value', 'depth-max', 'block',
    'block-name', 'block-face', 'block-hp', 'block-vein', 'hpbar-fill', 'floaters',
    'hardness-warn', 'hardness-text', 'mode-row', 'mode-seg', 'mode-hint', 'ore-strip',
    'log', 'miner-list', 'forge-list', 'crystal-list', 'action-list',
    'pick-card', 'pick-section', 'ore-list', 'depot-section', 'smelter', 'smelter-section',
    'layer-list', 'stats', 'rune-gain', 'prestige-info', 'btn-collapse',
    'freebie-sub', 'bomb-sub', 'btn-freebie', 'btn-bomb', 'toast',
    'modal', 'modal-title', 'modal-body', 'modal-actions', 'version-line', 'build-line',
  ]) {
    el[id] = $(id);
  }

  bindTabs();
  bindBlock();
  bindMode();
  bindLists();
  bindQuick();
  bindPrestige();
  bindSaveRow();

  // Die Version gehört an eine Stelle, die man IMMER sieht. Im Prestige-Tab
  // allein nützt sie nichts — der ist am Anfang gar nicht freigeschaltet, und
  // genau dann will man wissen, ob überhaupt die neue Fassung geladen wurde.
  el['version-line'].textContent = VERSION;
  el['build-line'].textContent = VERSION;
  renderSlow();
}

// ── Eingaben ────────────────────────────────────────────────────────────────

function bindTabs() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => showView(tab.dataset.view));
  });
}

function showView(name) {
  activeView = name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === 'view-' + name);
  });
  $('views').scrollTop = 0;
  renderSlow();
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

function bindMode() {
  el['mode-seg'].querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const res = A.setMode(state, btn.dataset.mode);
      toast(res.msg, res.ok ? 'good' : 'bad');
      renderSlow();
    });
  });
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
  delegate(el['pick-card'], () => A.forgePick(state));
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
      `<p>Du verlierst Gold, Zwerge, Erz, Barren, die Schmiede-Upgrades — und die Spitzhacke.</p>
       <div class="row"><span>Seelenrunen</span><b>+${fmtInt(gain)} ᚱ</b></div>
       <div class="row"><span>Kristalle</span><b>+${fmtInt(gems)} 💎</b></div>
       <div class="row"><span>Neuer Bonus</span><b>×${fmt(B.runeMultiplier(state.runes + gain))}</b></div>
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
            showView('mine');
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
            localStorage.removeItem('tiefenschacht.save.v2');
            location.reload();
          },
        },
      ]
    );
  });
}

// ── Schneller Render-Pfad ───────────────────────────────────────────────────

export function renderFast(now = Date.now()) {
  el['res-gold'].querySelector('.res-val').textContent = fmt(state.gold);
  el['res-crystals'].querySelector('.res-val').textContent = fmtInt(state.crystals);
  el['res-runes'].querySelector('.res-val').textContent = fmtInt(state.runes);
  el['res-crystals'].classList.toggle('hidden', !state.features.crystals);
  el['res-runes'].classList.toggle('hidden', state.runes <= 0);

  const layer = LAYERS[layerIndexAt(state.depth)];
  const pick = pickAt(state.pickTier);
  el['hud-layer'].textContent = layer.name;
  el['hud-pick'].textContent = `${pick.icon} ${pick.name}`;
  el['hud-dps'].textContent = fmt(B.totalDps(state, now)) + '/s';
  document.documentElement.style.setProperty('--layer', layer.tint);

  const lvl = B.levelProgress(state);
  el['level-num'].textContent = 'Stufe ' + lvl.level;
  el['level-cap'].textContent = '/ ' + lvl.cap;
  el['level-fill'].style.width = (lvl.pct * 100).toFixed(1) + '%';
  el['level-fill'].classList.toggle('capped', lvl.capped);
  el['level-cap'].classList.toggle('capped', lvl.capped);

  const boostLeft = state.boostUntil - now;
  el['boost-bar'].classList.toggle('hidden', boostLeft <= 0);
  if (boostLeft > 0) el['boost-time'].textContent = fmtTime(boostLeft / 1000);

  el['depth-value'].textContent = fmtDepth(state.depth);
  el['depth-max'].textContent = 'max ' + fmtDepth(state.maxDepth);

  renderBlock(layer);
  renderHardness(layer, pick);
  renderOreStrip(layer);

  el['mode-row'].classList.toggle('hidden', !state.features.farmMode);
  el['mode-seg'].querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
  el['mode-hint'].textContent =
    state.mode === 'farm'
      ? `Du bleibst auf ${fmtDepth(state.depth)} und holst ${B.FARM_ORE_BONUS()}× Erz heraus.`
      : 'Es geht abwärts — jeder Block ein Meter.';

  updateQuick(el['btn-freebie'], el['freebie-sub'], state.freebieReadyAt, now,
    `+${fmtInt(B.freebieYield(state))} 💎`);
  updateQuick(el['btn-bomb'], el['bomb-sub'], state.bombReadyAt, now,
    `+${fmtInt(B.bombYield(state))} 💎`);

  for (const [view, feature] of Object.entries(TAB_FEATURE)) {
    const tab = document.querySelector(`.tab[data-view="${view}"]`);
    if (tab) tab.classList.toggle('hidden', !state.features[feature]);
  }
}

function renderBlock(layer) {
  const boss = isBossDepth(state.depth) && !state.bossesDown[state.depth];
  const max = B.blockMaxHp(state.depth, boss);
  const pct = Math.max(0, Math.min(1, state.blockHp / max));
  el['hpbar-fill'].style.width = (pct * 100).toFixed(1) + '%';
  el.block.classList.toggle('boss', boss);
  el['block-name'].textContent = boss ? '⚔ ' + bossNameAt(state.depth) : layer.name;
  el['block-face'].textContent = boss ? '👁️' : blockFace(layer.id);
  el['block-hp'].textContent = `${fmt(Math.max(0, state.blockHp))} / ${fmt(max)}`;

  const vein = B.VEINS[state.vein];
  const special = vein && vein.mult > 1;
  el['block-vein'].classList.toggle('hidden', !special);
  el.block.classList.toggle('vein', !!special);
  if (special) el['block-vein'].textContent = `${vein.icon} ${vein.name} · ${vein.mult}× Erz`;
}

function renderHardness(layer, pick) {
  const short = B.hardnessShortfall(state);
  el['hardness-warn'].classList.toggle('hidden', short <= 0);
  if (short <= 0) return;
  const pct = (B.hardnessFactor(state) * 100).toFixed(short > 1 ? 1 : 0);
  el['hardness-text'].innerHTML =
    `<b>${layer.name}</b> hat Härte ${layer.hardness}, deine ${pick.name} schafft ${pick.power}. ` +
    `Du richtest nur <b>${pct} %</b> aus — schmiede eine bessere Hacke.`;
}

function renderOreStrip(layer) {
  if (!state.features.forge) {
    el['ore-strip'].classList.add('hidden');
    return;
  }
  el['ore-strip'].classList.remove('hidden');
  const cap = B.depotCap(state);
  const ore = layer.ore;
  const have = state.ores[ore.id] || 0;
  const full = have >= cap;
  el['ore-strip'].innerHTML =
    `<div class="ore-chip ${full ? 'full' : ''}">
       <span>${ore.icon}</span>
       <span class="ore-name">${ore.name}</span>
       <span class="ore-amount">${fmtInt(have)} / ${fmtInt(cap)}</span>
     </div>` +
    (state.features.smelter
      ? `<div class="ore-chip"><span>🔩</span><span class="ore-name">Barren</span>
           <span class="ore-amount">${fmtInt(state.bars)} · ×${B.barMultiplier(state).toFixed(2)}</span></div>`
      : '');
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
  else if (activeView === 'forge') renderForgeView();
  else if (activeView === 'crystal') renderCrystals();
  else if (activeView === 'deep') renderDeep();
}

function renderLog() {
  const items = state.log.slice(-14).reverse();
  el.log.innerHTML =
    items.map((e) => `<li class="${e.kind}">${escapeHtml(e.text)}</li>`).join('') ||
    '<li>Der Stollen wartet.</li>';
}

function renderMiners() {
  el['miner-list'].innerHTML = MINERS.map((m) => {
    const owned = state.miners[m.id] || 0;
    const locked = state.pickTier < m.unlockPick;
    if (locked && owned === 0) {
      return card({
        id: m.id, icon: '🔒', title: '???',
        desc: `Freigeschaltet mit der ${pickAt(m.unlockPick).name}`,
        cost: '', disabled: true, cls: 'locked',
      });
    }
    const n = buyAmount === 'max' ? Math.max(1, B.maxAffordable(m, owned, state.gold)) : buyAmount;
    const cost = B.minerCostBulk(m, owned, n);
    const affordable = cost <= state.gold && !locked;
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

function renderForgeView() {
  renderPickCard();
  renderDepot();
  renderSmelter();
  renderForgeUpgrades();
}

function renderPickCard() {
  const current = pickAt(state.pickTier);
  const next = nextPick(state.pickTier);
  const layer = layerAt(state.depth);

  if (!next) {
    el['pick-card'].innerHTML = `<div class="pick-done">
      <div class="pick-now">${current.icon} ${current.name}</div>
      <p class="muted small">Die beste Hacke, die je geschmiedet wurde. Tiefer geht nur noch mit Runen.</p>
    </div>`;
    return;
  }

  const ore = ORE_BY_ID[next.ore];
  const have = state.ores[next.ore] || 0;
  const oreOk = have >= next.oreAmount;
  const goldOk = state.gold >= next.gold;
  const pct = Math.min(100, (have / next.oreAmount) * 100);

  el['pick-card'].innerHTML = `
    <div class="pick-now">Aktuell: ${current.icon} ${current.name} · Schlagkraft ${current.power}</div>
    <button class="pick-next ${oreOk && goldOk ? 'ready' : ''}" data-id="forge"
            ${oreOk && goldOk ? '' : 'disabled'}>
      <div class="pick-head">
        <span class="pick-icon">${next.icon}</span>
        <span>
          <span class="pick-name">${next.name}</span>
          <span class="pick-power">Schlagkraft ${next.power} — bricht Härte ${next.power}</span>
        </span>
      </div>
      <div class="pick-need ${oreOk ? 'ok' : ''}">
        ${ore.icon} ${fmtInt(have)} / ${fmtInt(next.oreAmount)} ${ore.name}
      </div>
      <div class="pick-bar"><div class="pick-bar-fill" style="width:${pct}%"></div></div>
      <div class="pick-need ${goldOk ? 'ok' : ''}">🪙 ${fmt(next.gold)}</div>
    </button>
    ${
      layer.hardness > current.power
        ? `<p class="muted small">Hier unten hilft nur diese Hacke weiter.</p>`
        : `<p class="muted small">Reicht noch. Brauchst du erst für Härte ${next.power}.</p>`
    }`;
}

function renderDepot() {
  const show = state.features.forge;
  el['depot-section'].classList.toggle('hidden', !show);
  if (!show) return;

  const cap = B.depotCap(state);
  const rows = LAYERS.filter((l) => (state.ores[l.ore.id] || 0) > 0 || state.seenLayers[l.id])
    .map((l) => {
      const have = state.ores[l.ore.id] || 0;
      const pct = Math.min(100, (have / cap) * 100);
      const full = have >= cap;
      return `<div class="ore-row ${full ? 'full' : ''}">
        <span class="ore-ico">${l.ore.icon}</span>
        <span class="ore-main">
          <span class="ore-title">${l.ore.name}${full ? ' <b>voll</b>' : ''}</span>
          <span class="ore-bar"><span class="ore-bar-fill" style="width:${pct}%"></span></span>
        </span>
        <span class="ore-num">${fmtInt(have)}<span class="cost-sub">/ ${fmtInt(cap)}</span></span>
      </div>`;
    });
  el['ore-list'].innerHTML = rows.join('') || '<p class="muted small">Noch kein Erz gefördert.</p>';
}

function renderSmelter() {
  const show = state.features.smelter;
  el['smelter-section'].classList.toggle('hidden', !show);
  if (!show) return;
  el.smelter.innerHTML = `
    <div class="smelter-body">
      <div class="smelter-num">🔩 ${fmtInt(state.bars)} <span class="muted small">Barren</span></div>
      <div class="muted small">
        Frisst ${fmt(B.smeltRate(state))} Erz/s · ${B.ORE_PER_BAR} Erz je Barren<br>
        Jeder Barren macht alles ${'×'}1,04 — aktuell <b>×${B.barMultiplier(state).toFixed(2)}</b>
      </div>
    </div>`;
}

function renderForgeUpgrades() {
  el['forge-list'].innerHTML = FORGE_UPGRADES.filter(
    (u) => (!u.feature || state.features[u.feature]) && forgeUnlocked(u, state.level)
  ).map((u) => {
    const level = state.upgrades[u.id] || 0;
    const cap = forgeMaxLevel(u, state, state.level);
    const maxed = level >= u.max;
    const gated = !maxed && level >= cap; // wartet auf eine bessere Hacke
    const cost = maxed || gated ? Infinity : B.forgeCost(u.id, level);
    const affordable = cost <= state.gold;
    return card({
      id: u.id,
      icon: u.icon,
      title: `${u.name} <span class="card-count">Stufe ${level}${cap < u.max ? ' / ' + cap : ''}</span>`,
      desc: u.desc,
      effect: gated ? `Frei ab Stufe ${level + (u.unlockLevel || 1)}` : forgeEffect(u.id, level),
      cost: maxed ? 'MAX' : gated ? '🔒' : `🪙 ${fmt(cost)}`,
      disabled: maxed || gated || !affordable,
      cls: !maxed && !gated && affordable ? 'affordable' : '',
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
    case 'sorting': return `${fmt(B.oreYield(state))} Erz pro Block`;
    case 'depot': return `Lager fasst ${fmtInt(B.depotCap(state))} je Sorte`;
    case 'furnace': return `${fmt(B.smeltRate(state))} Erz/s`;
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
      <span class="layer-hard">Härte ${l.hardness}</span>
      <span class="layer-depth">${range}</span>
    </div>`;
  }).join('');

  const s = state.stats;
  el.stats.innerHTML = [
    ['Blöcke zerschlagen', fmtInt(s.blocksBroken)],
    ['Erz gefördert', fmtInt(s.oreMined)],
    ['Barren geschmolzen', fmtInt(s.barsSmelted)],
    ['Adern getroffen', fmtInt(s.veins)],
    ['Hacken geschmiedet', fmtInt(s.picksForged)],
    ['Wächter besiegt', fmtInt(s.bossesSlain)],
    ['Stufenobergrenze', fmtInt(B.levelCap(state))],
    ['Geoden gefunden', fmtInt(s.geodes)],
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

/** Neue Mechanik: die bekommt einen eigenen Auftritt, keinen Toast nebenbei. */
export function announceFeature(feature) {
  showModal(
    `${feature.icon}  ${feature.name}`,
    `<p>${escapeHtml(feature.unlockText)}</p>`,
    [{ label: 'Verstanden', cls: 'danger', run: hideModal }]
  );
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

export { PICKS };
