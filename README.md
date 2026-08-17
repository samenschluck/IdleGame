# Tiefenschacht ⛏️

Ein Idle-Mining-Game im Zwergen-Fantasy-Setting: Du gräbst dich vom Oberboden
durch Kalkbank, Kristallhöhlen, Zwergenhallen und Trollklüfte bis in den
Höllenschlund und die Weltenwurzel.

**Ohne Engine, ohne Framework, ohne Build-Step.** Was im Repo liegt, lädt der
Browser direkt. Damit lässt sich das Spiel komplett vom Handy aus
weiterentwickeln — Änderung pushen, eine Minute warten, neu laden.

- 📖 Spielkonzept: [`docs/KONZEPT.md`](docs/KONZEPT.md)
- ⚖️ Balancing-Formeln: [`src/core/balance.js`](src/core/balance.js)

---

## Am Handy spielen

Das Spiel liegt hier — **der Pfad `/IdleGame/` gehört dazu**, `samenschluck.github.io`
allein ist die Nutzer-Startseite und liefert einen 404:

**https://samenschluck.github.io/IdleGame/**

Jeder Push auf `main` oder den Entwicklungsbranch veröffentlicht automatisch neu
(siehe `.github/workflows/pages.yml`). Pages schaltet der Workflow beim ersten
Lauf selbst frei (`enablement: true`).

Falls das an einer Berechtigung scheitert, einmalig von Hand — geht auch in der
GitHub-App: Repo → **Settings** → **Pages** → bei *Source* **GitHub Actions**.

### Als App auf den Startbildschirm

Die Seite ist eine PWA. In Chrome auf Android:
Menü (⋮) → **Zum Startbildschirm hinzufügen**.
Danach startet sie im Vollbild ohne Adresszeile, läuft offline und verhält sich
wie eine installierte App.

---

## Lokal entwickeln (falls doch mal ein PC da ist)

Ein statischer Server genügt — `file://` funktioniert wegen der ES-Module nicht.

```bash
npx http-server -p 8080 .
# → http://localhost:8080
```

### Tests

```bash
node tools/check.mjs
```

Das ist kein Framework, sondern ein Smoke-Test, der prüft:

- alle Quelldateien sind syntaktisch gültig und importierbar
- Zahlenformatierung und Schichtgrenzen stimmen
- ein **simulierter Spieler** kommt tatsächlich voran (4 h erster Lauf)
- die **Prestige-Kette** bleibt über sieben Läufe hinweg lohnend
- Kristalle sind am Anfang knapp und später reichlich
- Offline-Fortschritt funktioniert und respektiert seinen Deckel
- Speicherstand-Export/Import ist verlustfrei

Der Test läuft auch in CI, bevor deployt wird.

### Balance drehen

```bash
node tools/tune.mjs                     # Konstanten-Sweep
node tools/tune.mjs 1.055,1.045,1.25    # HP-Wachstum, Gold-Wachstum, Runenbasis
```

Gibt aus, wie tief ein Spieler pro Prestige-Lauf kommt. Nützlich, weil sich
Idle-Balancing nicht zuverlässig im Kopf ausrechnen lässt — siehe die
Lehre unten.

### Icons neu erzeugen

```bash
python3 tools/gen_icons.py
```

---

## Aufbau

```
index.html            Einstieg + DOM-Gerüst
styles.css            komplettes UI (mobile-first, keine Bild-Assets)
manifest.webmanifest  PWA-Metadaten
sw.js                 Service Worker (network-first, damit Tests frisch sind)
src/
  main.js             Bootstrap, Game-Loop, Offline-Verrechnung
  core/
    balance.js        ALLE Spielformeln — hier wird gebalanced
    state.js          Speicherstand, Migration, Export/Import
    engine.js         Tick, Blöcke brechen, Offline-Simulation
    actions.js        Kaufen, Boosts, Einsturz
  data/
    layers.js         Schichten, Erze, Wächter
    miners.js         Zwergen-Stufen
    upgrades.js       Schmiede- und Kristall-Upgrades
  ui/ui.js            Rendering + Eingaben
  util/format.js      Zahlenformat (K/M/B/T/aa/ab…)
tools/
  check.mjs           Smoke-Test (läuft in CI)
  sim.mjs             kopflose Spielsimulation
  tune.mjs            Balance-Sweep
  gen_icons.py        PWA-Icons ohne Bildbearbeitung
```

Die Spiel-Logik kennt kein DOM, das UI kennt keine Formeln. Deshalb lässt sich
das Spiel headless simulieren — was fürs Balancing entscheidend ist.

---

## Eine Lehre aus dem Balancing

Der erste Entwurf hatte einen Prestige-Bonus von `1 + 0,08 · Runen^0,9`.
Die Simulation zeigte: nach drei Läufen bringt Prestige nichts mehr.

Der Grund ist strukturell. Die Blockhärte wächst exponentiell mit der Tiefe
(`1,055^Tiefe`). Die kaufbare Grabkraft wächst aber nur **linear** mit der
Tiefe, weil Zwerge `×1,15` pro Einheit kosten — Gold geht also nur
logarithmisch in die Grabkraft ein. Ein polynomialer Bonus verliert gegen
einen exponentiellen Gegner zwangsläufig.

Deshalb ist der Runenbonus jetzt `1,25^Runen`. Das ist kein hübscherer Wert,
sondern die richtige Wachstumsklasse. `tools/check.mjs` nagelt das fest:
sackt ein Lauf der Kette auf null Fortschritt, schlägt der Test fehl.

---

## Stand

**v0.1 — Vertical Slice.** Spielbar: graben, Zwerge, Schmiede, 10 Schichten
mit Wächtern, Kristalle, Prestige, Offline-Fortschritt, PWA.

Als Nächstes: Erz-Inventar, Relikte, Tagesquests, Troll- und Höllen-Fraktionen.
Roadmap in [`docs/KONZEPT.md`](docs/KONZEPT.md).
