// Schichten (Strata). Jede Schicht endet mit einem Wächter-Block.
// `to` ist exklusiv: der Wächter sitzt auf dem Block bei Tiefe `to`.
// Die letzte Schicht ist endlos; dort spawnen Wächter alle ENDLESS_BOSS_STEP Meter.
//
// Zwei Felder steuern das Tempo des ganzen Spiels:
//
//   hardness — Mindest-Schlagkraft der Spitzhacke. Wer zu schwach ist, richtet
//              nur einen Bruchteil aus (siehe balance.hardnessFactor). Das ist
//              die Wand, an der ein Lauf haengenbleibt.
//   ore      — das Erz dieser Schicht. Erz faellt PRO BLOCK, nicht pro Meter,
//              waechst also linear statt exponentiell. Genau deshalb bleibt es
//              knapp, waehrend Gold irgendwann im Ueberfluss da ist.

export const ENDLESS_BOSS_STEP = 200;

export const LAYERS = [
  {
    id: 'topsoil',
    name: 'Oberboden',
    to: 60,
    hardness: 1,
    tint: '#7a5a30',
    ore: { id: 'coal', name: 'Kohle', icon: '🪨' },
    flavorOres: ['Lehmklumpen', 'Kies', 'Torf'],
    boss: 'Wurzelbiest',
    intro: 'Du setzt die Spitzhacke an. Der alte Stollen riecht nach nassem Holz.',
  },
  {
    id: 'limestone',
    name: 'Kalkbank',
    to: 160,
    hardness: 2,
    tint: '#9aa08c',
    ore: { id: 'copper', name: 'Kupfer', icon: '🟤' },
    flavorOres: ['Kalkstein', 'Zinnknolle', 'Versteinerung'],
    boss: 'Kalkgolem',
    intro: 'Der Boden wird hell und hart. Kalk. Darin glitzert Kupfer.',
  },
  {
    id: 'deeprock',
    name: 'Tiefengestein',
    to: 320,
    hardness: 3,
    tint: '#6d7480',
    ore: { id: 'iron', name: 'Eisen', icon: '⚙️' },
    flavorOres: ['Granitkern', 'Quarzband', 'Silberader'],
    boss: 'Grubenmutter',
    intro: 'Kein Tageslicht mehr. Nur noch Fels und das Echo deiner Hauer.',
  },
  {
    id: 'geode',
    name: 'Kristallhöhlen',
    to: 540,
    hardness: 4,
    tint: '#8c6fc4',
    ore: { id: 'amethyst', name: 'Amethyst', icon: '🔮' },
    flavorOres: ['Bergkristall', 'Geodenschale', 'Prismaerz'],
    boss: 'Geodenherz',
    intro: 'Die Wand bricht auf — dahinter eine Höhle voller summender Kristalle.',
  },
  {
    id: 'halls',
    name: 'Zwergenhallen',
    to: 820,
    hardness: 5,
    tint: '#c79a3e',
    ore: { id: 'mithril', name: 'Mithril', icon: '🥇' },
    flavorOres: ['Runengold', 'Ahnenerz', 'Schmiedeschlacke'],
    boss: 'Ahnenkönig',
    intro: 'Gemeißelte Säulen. Jemand war lange vor dir hier unten.',
  },
  {
    id: 'trollrift',
    name: 'Trollklüfte',
    to: 1180,
    hardness: 6,
    tint: '#5f7a4a',
    ore: { id: 'trollstone', name: 'Trollstein', icon: '🟢' },
    flavorOres: ['Blutquarz', 'Knochenkalk', 'Moosjade'],
    boss: 'Klüftenfürst',
    intro: 'Die Säulen sind umgeworfen. Die Bruchkanten sind frisch.',
  },
  {
    id: 'volcanic',
    name: 'Vulkanschlund',
    to: 1620,
    hardness: 7,
    tint: '#c2542a',
    ore: { id: 'obsidian', name: 'Obsidian', icon: '⬛' },
    flavorOres: ['Magmakern', 'Schwefelader', 'Glutstein'],
    boss: 'Magmawurm',
    intro: 'Das Gestein wird warm. Deine Laterne braucht keinen Docht mehr.',
  },
  {
    id: 'shadow',
    name: 'Schattenreich',
    to: 2150,
    hardness: 8,
    tint: '#4a4470',
    ore: { id: 'soulore', name: 'Seelenerz', icon: '🌫️' },
    flavorOres: ['Nachtsilber', 'Leerenglas', 'Flüsterstein'],
    boss: 'Schattenweber',
    intro: 'Der Stein hört auf, Stein zu sein.',
  },
  {
    id: 'hell',
    name: 'Höllenschlund',
    to: 2800,
    hardness: 9,
    tint: '#a01f2e',
    ore: { id: 'hellstone', name: 'Höllenstein', icon: '🔥' },
    flavorOres: ['Dämonenkern', 'Pechader', 'Ketteneisen'],
    boss: 'Pfortenwächter',
    intro: 'Unter dir liegt kein Gestein mehr. Unter dir liegt eine Tür.',
  },
  {
    id: 'worldroot',
    name: 'Weltenwurzel',
    to: Infinity,
    hardness: 10,
    tint: '#2f8c7a',
    ore: { id: 'primal', name: 'Urerz', icon: '🌟' },
    flavorOres: ['Wurzelsplitter', 'Erstlicht', 'Weltenader'],
    boss: 'Wurzelwächter',
    intro: 'Jenseits der Tür wächst etwas nach oben, das älter ist als der Berg.',
  },
];

export const ORES = LAYERS.map((l) => l.ore);
export const ORE_BY_ID = Object.fromEntries(ORES.map((o) => [o.id, o]));

/** Index der Schicht, in der `depth` liegt. */
export function layerIndexAt(depth) {
  for (let i = 0; i < LAYERS.length; i++) {
    if (depth < LAYERS[i].to) return i;
  }
  return LAYERS.length - 1;
}

export function layerAt(depth) {
  return LAYERS[layerIndexAt(depth)];
}

/** Sitzt auf dieser Tiefe ein Wächter? */
export function isBossDepth(depth) {
  if (depth <= 0) return false;
  for (const layer of LAYERS) {
    if (layer.to !== Infinity && depth === layer.to) return true;
  }
  const endlessStart = LAYERS[LAYERS.length - 2].to;
  return depth > endlessStart && (depth - endlessStart) % ENDLESS_BOSS_STEP === 0;
}

/** Name des Wächters auf dieser Tiefe (nur gültig wenn isBossDepth). */
export function bossNameAt(depth) {
  return LAYERS[layerIndexAt(Math.max(0, depth - 1))].boss;
}

/** Zufälliges Schmuckerz der Schicht, rein für die Fund-Meldungen. */
export function randomFlavorOre(depth, rand) {
  const list = layerAt(depth).flavorOres;
  return list[Math.floor(rand() * list.length)];
}
