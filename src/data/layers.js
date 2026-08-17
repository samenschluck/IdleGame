// Schichten (Strata). Jede Schicht endet mit einem Wächter-Block.
// `to` ist exklusiv: der Wächter sitzt auf dem Block bei Tiefe `to`.
// Die letzte Schicht ist endlos; dort spawnen Wächter alle ENDLESS_BOSS_STEP Meter.

export const ENDLESS_BOSS_STEP = 200;

export const LAYERS = [
  {
    id: 'topsoil',
    name: 'Oberboden',
    to: 60,
    tint: '#7a5a30',
    ores: ['Lehmklumpen', 'Kies', 'Torf', 'Kohleflöz'],
    boss: 'Wurzelbiest',
    intro: 'Du setzt die Spitzhacke an. Der alte Stollen riecht nach nassem Holz.',
  },
  {
    id: 'limestone',
    name: 'Kalkbank',
    to: 160,
    tint: '#9aa08c',
    ores: ['Kalkstein', 'Kupferader', 'Zinnknolle', 'Versteinerung'],
    boss: 'Kalkgolem',
    intro: 'Der Boden wird hell und hart. Kalk. Darin glitzert Kupfer.',
  },
  {
    id: 'deeprock',
    name: 'Tiefengestein',
    to: 320,
    tint: '#6d7480',
    ores: ['Eisenerz', 'Silberader', 'Granitkern', 'Quarzband'],
    boss: 'Grubenmutter',
    intro: 'Kein Tageslicht mehr. Nur noch Fels und das Echo deiner Hauer.',
  },
  {
    id: 'geode',
    name: 'Kristallhöhlen',
    to: 540,
    tint: '#8c6fc4',
    ores: ['Amethyst', 'Bergkristall', 'Geodenschale', 'Prismaerz'],
    boss: 'Geodenherz',
    intro: 'Die Wand bricht auf — dahinter eine Höhle voller summender Kristalle.',
  },
  {
    id: 'halls',
    name: 'Zwergenhallen',
    to: 820,
    tint: '#c79a3e',
    ores: ['Mithril', 'Runengold', 'Ahnenerz', 'Schmiedeschlacke'],
    boss: 'Ahnenkönig',
    intro: 'Gemeißelte Säulen. Jemand war lange vor dir hier unten.',
  },
  {
    id: 'trollrift',
    name: 'Trollklüfte',
    to: 1180,
    tint: '#5f7a4a',
    ores: ['Trollstein', 'Blutquarz', 'Knochenkalk', 'Moosjade'],
    boss: 'Klüftenfürst',
    intro: 'Die Säulen sind umgeworfen. Die Bruchkanten sind frisch.',
  },
  {
    id: 'volcanic',
    name: 'Vulkanschlund',
    to: 1620,
    tint: '#c2542a',
    ores: ['Obsidian', 'Magmakern', 'Schwefelader', 'Glutstein'],
    boss: 'Magmawurm',
    intro: 'Das Gestein wird warm. Deine Laterne braucht keinen Docht mehr.',
  },
  {
    id: 'shadow',
    name: 'Schattenreich',
    to: 2150,
    tint: '#4a4470',
    ores: ['Seelenerz', 'Nachtsilber', 'Leerenglas', 'Flüsterstein'],
    boss: 'Schattenweber',
    intro: 'Der Stein hört auf, Stein zu sein.',
  },
  {
    id: 'hell',
    name: 'Höllenschlund',
    to: 2800,
    tint: '#a01f2e',
    ores: ['Höllenstein', 'Dämonenkern', 'Pechader', 'Ketteneisen'],
    boss: 'Pfortenwächter',
    intro: 'Unter dir liegt kein Gestein mehr. Unter dir liegt eine Tür.',
  },
  {
    id: 'worldroot',
    name: 'Weltenwurzel',
    to: Infinity,
    tint: '#2f8c7a',
    ores: ['Urerz', 'Wurzelsplitter', 'Erstlicht', 'Weltenader'],
    boss: 'Wurzelwächter',
    intro: 'Jenseits der Tür wächst etwas nach oben, das älter ist als der Berg.',
  },
];

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

/** Zufälliges Erz der Schicht, rein für die Fund-Meldungen. */
export function randomOre(depth, rand) {
  const ores = layerAt(depth).ores;
  return ores[Math.floor(rand() * ores.length)];
}
