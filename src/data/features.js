// Mechaniken, die sich erst im Spielverlauf oeffnen.
//
// Absicht: das Spiel soll nicht am ersten Bildschirm schon alles zeigen.
// Jede Mechanik taucht genau dann auf, wenn der Spieler zum ersten Mal gegen
// die Wand laeuft, die sie loest — sie ist die Antwort auf ein Problem, das er
// gerade selbst gespuert hat, nicht ein Knopf, der immer schon da war.
//
// test(state) wird jeden Tick geprueft (billig, eine Handvoll Eintraege).
// Einmal freigeschaltet, bleibt eine Mechanik dauerhaft offen — auch ueber
// Prestige hinweg.

export const FEATURES = [
  {
    id: 'farmMode',
    name: 'Ausbeuten',
    icon: '🔁',
    // Die Wand: das Gestein ist haerter als die Hacke.
    unlockText:
      'Das Gestein ist zu hart für deine Hacke. Du kannst an Ort und Stelle ' +
      'weitergraben, statt vorzutreiben — der Stollen gibt dann mehr Erz her.',
    test: (s, ctx) => ctx.hardnessShortfall > 0,
  },
  {
    id: 'forge',
    name: 'Hackenschmiede',
    icon: '🔥',
    unlockText: 'Mit genug Erz lässt sich eine neue Spitzhacke schmieden.',
    test: (s) => Object.values(s.ores).some((n) => n >= 40),
  },
  {
    id: 'crystals',
    name: 'Kristalle',
    icon: '💎',
    unlockText: 'In den Blöcken stecken Kristalle. Die Zwerge sagen, sie seien Glück.',
    test: (s) => s.stats.crystalsEarned > 0,
  },
  {
    id: 'depot',
    name: 'Erzlager',
    icon: '📦',
    unlockText:
      'Dein Lager quillt über — überschüssiges Erz bleibt liegen. ' +
      'Ein größeres Lager fasst mehr.',
    test: (s, ctx) => ctx.oreWasted > 0,
  },
  {
    id: 'smelter',
    name: 'Schmelzofen',
    icon: '🏭',
    unlockText:
      'Der alte Schmelzofen der Ahnen. Er frisst Erz und spuckt Barren aus — ' +
      'und Barren machen jeden Schlag im Schacht härter.',
    test: (s) => s.pickTier >= 3,
  },
  {
    id: 'prestige',
    name: 'Einsturz',
    icon: '🕳️',
    unlockText:
      'Der Schacht ächzt. Wenn du ihn einstürzen lässt, bleiben die Seelen ' +
      'deiner Ahnen — und graben beim nächsten Mal mit.',
    test: (s) => s.maxDepth >= 200,
  },
];

export const FEATURE_BY_ID = Object.fromEntries(FEATURES.map((f) => [f.id, f]));

export function hasFeature(state, id) {
  return !!(state.features && state.features[id]);
}
