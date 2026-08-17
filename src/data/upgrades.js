// unlockLevel: ab welcher Spielerstufe dieses Upgrade ueberhaupt auftaucht.
// Die Ausbaustufe ist zusaetzlich durch die Spielerstufe gedeckelt, und die
// Spielerstufe wiederum durch besiegte Waechter (siehe balance.levelCap).
//
// Ohne so eine Klammer kauft man den gesamten Baum in der ersten Stunde leer.
// Gemessen: die Grabkraft wuchs in den fruehen Schichten um das 432-, 63- und
// 212-fache, waehrend die Blockhaerte nur um das 26-fache stieg — die ersten
// fuenf Schichten fielen dadurch binnen einer Stunde.
//
// Zwei Upgrade-Familien:
//   FORGE_UPGRADES   — Gold, gehen beim Einsturz (Prestige) verloren
//   CRYSTAL_UPGRADES — Kristalle, permanent
//
// Jedes Upgrade liefert cost(level) und beschreibt seinen Effekt selbst;
// ausgewertet wird das in core/balance.js.

export const FORGE_UPGRADES = [
  {
    id: 'pickaxe',
    name: 'Spitzhacke',
    icon: '⛏️',
    desc: 'Tippschaden ×1,25 pro Stufe',
    max: 50,
    cost: (l) => 20 * Math.pow(1.45, l),
    unlockLevel: 1,
  },
  {
    id: 'gear',
    name: 'Ausrüstung',
    icon: '🦺',
    desc: 'Grabkraft aller Zwerge ×1,12 pro Stufe',
    max: 50,
    cost: (l) => 180 * Math.pow(1.42, l),
    unlockLevel: 3,
  },
  {
    id: 'carts',
    name: 'Loren',
    icon: '🛒',
    desc: 'Gold pro Block ×1,15 pro Stufe',
    max: 40,
    cost: (l) => 120 * Math.pow(1.5, l),
    unlockLevel: 6,
  },
  {
    id: 'lantern',
    name: 'Grubenlaterne',
    icon: '🏮',
    desc: '+1,5 % Kritchance beim Tippen (max 60 %)',
    max: 40,
    cost: (l) => 500 * Math.pow(1.45, l),
    unlockLevel: 10,
  },
  {
    id: 'powder',
    name: 'Schwarzpulver',
    icon: '💣',
    desc: 'Kritschaden +50 % pro Stufe',
    max: 40,
    cost: (l) => 900 * Math.pow(1.5, l),
    unlockLevel: 14,
  },
  {
    id: 'survey',
    name: 'Geologie-Kunde',
    icon: '🔍',
    desc: 'Geodenchance +5 % (relativ) pro Stufe',
    max: 25,
    cost: (l) => 2_500 * Math.pow(1.6, l),
    unlockLevel: 18,
  },
  {
    id: 'sorting',
    name: 'Erzwäsche',
    icon: '🪣',
    desc: 'Erz pro Block +25 % pro Stufe',
    max: 40,
    cost: (l) => 400 * Math.pow(1.7, l),
    feature: 'forge',
    unlockLevel: 8,
  },
  {
    id: 'depot',
    name: 'Erzlager',
    icon: '📦',
    desc: 'Fassungsvermögen ×2,2 pro Stufe',
    max: 20,
    cost: (l) => 1_200 * Math.pow(2.8, l),
    feature: 'depot',
    unlockLevel: 12,
  },
  {
    id: 'furnace',
    name: 'Blasebalg',
    icon: '🏭',
    desc: 'Schmelztempo ×1,9 pro Stufe',
    max: 20,
    cost: (l) => 25_000 * Math.pow(2.8, l),
    feature: 'smelter',
    unlockLevel: 16,
  },
];

export const CRYSTAL_UPGRADES = [
  {
    id: 'prospecting',
    name: 'Kristallgespür',
    icon: '💠',
    desc: 'Geodenchance +25 % (relativ) pro Stufe',
    max: 20,
    cost: (l) => Math.floor(120 + 90 * Math.pow(l, 2.1)),
  },
  {
    id: 'yield',
    name: 'Reiche Adern',
    icon: '💎',
    desc: '+1 Kristall pro Geode',
    max: 25,
    cost: (l) => Math.floor(200 + 150 * Math.pow(l, 2.2)),
  },
  {
    id: 'offline',
    name: 'Nachtschicht',
    icon: '🌙',
    desc: '+2 h Offline-Kapazität (Basis 8 h)',
    max: 8,
    cost: (l) => Math.floor(300 + 280 * Math.pow(l, 2.3)),
  },
  {
    id: 'runeboost',
    name: 'Ahnenblut',
    icon: 'ᚱ',
    desc: '+10 % Seelenrunen beim Einsturz',
    max: 25,
    cost: (l) => Math.floor(400 + 320 * Math.pow(l, 2.25)),
  },
  {
    id: 'headstart',
    name: 'Vorgetriebener Stollen',
    icon: '🕳️',
    desc: 'Start nach dem Einsturz +25 m tiefer',
    max: 40,
    cost: (l) => Math.floor(250 + 200 * Math.pow(l, 2.15)),
  },
  {
    id: 'foresight',
    name: 'Zwergenfleiß',
    icon: '⚡',
    desc: 'Dauerhaft +5 % Grabkraft pro Stufe',
    max: 40,
    cost: (l) => Math.floor(350 + 240 * Math.pow(l, 2.2)),
  },
];

/** Ist dieses Upgrade auf der aktuellen Spielerstufe schon sichtbar? */
export function forgeUnlocked(def, level) {
  return level >= (def.unlockLevel || 1);
}

/**
 * Wie weit dieses Upgrade ausgebaut werden darf.
 * Eine Stufe je Spielerstufe ab der Freischaltung — und die Spielerstufe
 * haengt an den Waechtern, nicht an der verstrichenen Zeit.
 */
export function forgeMaxLevel(def, state, level) {
  const lv = level ?? state.level ?? 1;
  if (!forgeUnlocked(def, lv)) return 0;
  return Math.min(def.max, 1 + (lv - (def.unlockLevel || 1)));
}

export const FORGE_BY_ID = Object.fromEntries(FORGE_UPGRADES.map((u) => [u.id, u]));
export const CRYSTAL_BY_ID = Object.fromEntries(CRYSTAL_UPGRADES.map((u) => [u.id, u]));

// Einmal-Aktionen im Kristall-Shop.
export const CRYSTAL_ACTIONS = {
  boost: { cost: 25, name: 'Adernstoß', icon: '🔥', desc: '×8 Grabkraft für 2 Minuten' },
  timeskip: { cost: 40, name: 'Zeitsprung', icon: '⏩', desc: '2 Stunden Ertrag sofort' },
  blast: { cost: 15, name: 'Sprengung', icon: '💥', desc: 'Die nächsten 10 Blöcke brechen sofort' },
};
