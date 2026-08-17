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
    max: 200,
    cost: (l) => 20 * Math.pow(1.32, l),
  },
  {
    id: 'gear',
    name: 'Ausrüstung',
    icon: '🦺',
    desc: 'Grabkraft aller Zwerge ×1,12 pro Stufe',
    max: 200,
    cost: (l) => 180 * Math.pow(1.27, l),
  },
  {
    id: 'carts',
    name: 'Loren',
    icon: '🛒',
    desc: 'Gold pro Block ×1,15 pro Stufe',
    max: 200,
    cost: (l) => 120 * Math.pow(1.3, l),
  },
  {
    id: 'lantern',
    name: 'Grubenlaterne',
    icon: '🏮',
    desc: '+1,5 % Kritchance beim Tippen (max 60 %)',
    max: 40,
    cost: (l) => 500 * Math.pow(1.45, l),
  },
  {
    id: 'powder',
    name: 'Schwarzpulver',
    icon: '💣',
    desc: 'Kritschaden +50 % pro Stufe',
    max: 60,
    cost: (l) => 900 * Math.pow(1.5, l),
  },
  {
    id: 'survey',
    name: 'Geologie-Kunde',
    icon: '🔍',
    desc: 'Geodenchance +12 % (relativ) pro Stufe',
    max: 30,
    cost: (l) => 2_500 * Math.pow(1.6, l),
  },
];

export const CRYSTAL_UPGRADES = [
  {
    id: 'prospecting',
    name: 'Kristallgespür',
    icon: '💠',
    desc: 'Geodenchance +25 % (relativ) pro Stufe',
    max: 20,
    cost: (l) => Math.floor(25 + 18 * Math.pow(l, 1.7)),
  },
  {
    id: 'yield',
    name: 'Reiche Adern',
    icon: '💎',
    desc: '+1 Kristall pro Geode',
    max: 25,
    cost: (l) => Math.floor(40 + 30 * Math.pow(l, 1.8)),
  },
  {
    id: 'offline',
    name: 'Nachtschicht',
    icon: '🌙',
    desc: '+2 h Offline-Kapazität (Basis 8 h)',
    max: 8,
    cost: (l) => Math.floor(60 + 55 * Math.pow(l, 1.9)),
  },
  {
    id: 'runeboost',
    name: 'Ahnenblut',
    icon: 'ᚱ',
    desc: '+10 % Seelenrunen beim Einsturz',
    max: 25,
    cost: (l) => Math.floor(80 + 60 * Math.pow(l, 1.85)),
  },
  {
    id: 'headstart',
    name: 'Vorgetriebener Stollen',
    icon: '🕳️',
    desc: 'Start nach dem Einsturz +25 m tiefer',
    max: 40,
    cost: (l) => Math.floor(50 + 40 * Math.pow(l, 1.75)),
  },
  {
    id: 'foresight',
    name: 'Zwergenfleiß',
    icon: '⚡',
    desc: 'Dauerhaft +5 % Grabkraft pro Stufe',
    max: 40,
    cost: (l) => Math.floor(70 + 45 * Math.pow(l, 1.8)),
  },
];

export const FORGE_BY_ID = Object.fromEntries(FORGE_UPGRADES.map((u) => [u.id, u]));
export const CRYSTAL_BY_ID = Object.fromEntries(CRYSTAL_UPGRADES.map((u) => [u.id, u]));

// Einmal-Aktionen im Kristall-Shop.
export const CRYSTAL_ACTIONS = {
  boost: { cost: 25, name: 'Adernstoß', icon: '🔥', desc: '×8 Grabkraft für 2 Minuten' },
  timeskip: { cost: 40, name: 'Zeitsprung', icon: '⏩', desc: '2 Stunden Ertrag sofort' },
  blast: { cost: 15, name: 'Sprengung', icon: '💥', desc: 'Die nächsten 10 Blöcke brechen sofort' },
};
