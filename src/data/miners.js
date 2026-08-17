// Zwerge & Co. — die Auto-Grabkraft.
// cost(n) = baseCost * COST_GROWTH^n  (klassisches Idle-Scaling)
// Freigeschaltet wird ueber die Spitzhacken-Stufe, nicht ueber die Tiefe:
// sonst schaltet Tiefe neue Stufen frei, die sofort mehr Tiefe erlauben — die
// Rueckkopplung, an der die erste Balance-Fassung zerbrochen ist.
// Grabkraft ist linear in der Anzahl; die Multiplikatoren kommen aus der Schmiede.

export const COST_GROWTH = 1.15;

export const MINERS = [
  {
    id: 'apprentice',
    name: 'Lehrling',
    icon: '🧒',
    baseCost: 15,
    dps: 1,
    unlockPick: 1,
    flavor: 'Hält die Lampe. Meistens.',
  },
  {
    id: 'hewer',
    name: 'Hauer',
    icon: '⛏️',
    baseCost: 220,
    dps: 9,
    unlockPick: 1,
    flavor: 'Schlägt zu, redet wenig.',
  },
  {
    id: 'foreman',
    name: 'Steiger',
    icon: '🪖',
    baseCost: 4_800,
    dps: 72,
    unlockPick: 2,
    flavor: 'Brüllt Befehle, die niemand befolgt.',
  },
  {
    id: 'blaster',
    name: 'Sprengmeister',
    icon: '🧨',
    baseCost: 1.1e5,
    dps: 620,
    unlockPick: 3,
    flavor: 'Fragt nie, ob es zu viel Pulver ist.',
  },
  {
    id: 'runesmith',
    name: 'Runenschmied',
    icon: '🔨',
    baseCost: 3.5e6,
    dps: 5_400,
    unlockPick: 4,
    flavor: 'Verzaubert Hacken, die von selbst schlagen.',
  },
  {
    id: 'golem',
    name: 'Steingolem',
    icon: '🗿',
    baseCost: 1.4e8,
    dps: 52_000,
    unlockPick: 5,
    flavor: 'Braucht keine Pause und keinen Lohn.',
  },
  {
    id: 'troll',
    name: 'Troll-Söldner',
    icon: '👹',
    baseCost: 8e9,
    dps: 6.1e5,
    unlockPick: 6,
    flavor: 'Nimmt Bezahlung in Gold oder Lehrlingen.',
  },
  {
    id: 'magma',
    name: 'Magmakriecher',
    icon: '🦎',
    baseCost: 6.5e11,
    dps: 8.4e6,
    unlockPick: 7,
    flavor: 'Frisst sich durch Obsidian wie durch Butter.',
  },
  {
    id: 'shade',
    name: 'Schattenschürfer',
    icon: '👤',
    baseCost: 9e13,
    dps: 1.5e8,
    unlockPick: 8,
    flavor: 'Gräbt in Gestein, das noch nicht da ist.',
  },
  {
    id: 'demon',
    name: 'Dämonenschürfer',
    icon: '😈',
    baseCost: 2.2e16,
    dps: 3.2e9,
    unlockPick: 9,
    flavor: 'Der Vertrag hat sehr kleine Fußnoten.',
  },
];

export const MINERS_BY_ID = Object.fromEntries(MINERS.map((m) => [m.id, m]));
