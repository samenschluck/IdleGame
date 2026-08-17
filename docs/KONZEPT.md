# TIEFENSCHACHT — Spielkonzept

> Ein Idle-Mining-Game im Zwergen-Fantasy-Setting. Du gräbst immer tiefer:
> von der Grasnarbe über Zwergenhallen und Trollklüfte bis in den Höllenschlund
> und die Weltenwurzel. Alles handgeschrieben (Vanilla JS), keine Engine.

Version 0.1 — lebendes Dokument, wird beim Weiterentwickeln fortgeschrieben.

---

## 1. Pitch in drei Sätzen

Du erbst einen verlassenen Zwergenstollen und gräbst nach unten. Jeder Meter
ist ein Block, den deine Hauer zerschlagen; je tiefer du kommst, desto härter
das Gestein, desto wertvoller das Erz — und desto ungemütlicher die Nachbarn.
Wenn der Schacht einstürzt (Prestige), nimmst du Seelenrunen mit und gräbst
schneller wieder hinunter.

## 2. Kern-Loop

```
Antippen / Hauer graben  →  Block bricht  →  Erz + Gold
        ↑                                        ↓
   Upgrades kaufen  ←  Gold  ←  Loren verkaufen Erz
        ↓
   mehr Grabkraft  →  tiefer  →  wertvollere Schichten
        ↓
   Wächter besiegen → nächste Schicht + Kristalle
        ↓
   irgendwann zu langsam → EINSTURZ (Prestige) → Seelenrunen → schneller zurück
```

Sitzungslänge: 1–3 Minuten aktiv, Rest läuft offline weiter. Kein Zwang,
minütlich reinzuschauen.

## 3. Setting & Schichten

Die Tiefe ist in Schichten (Strata) unterteilt. Jede Schicht hat eigene Farbe,
eigenes Erz, eigene Story-Zeile und am Ende einen **Wächter** (Boss-Block mit
viel HP). Ton: zwergisch-derb oben, unheimlich unten.

| # | Tiefe | Schicht | Erz | Wächter |
|---|-------|---------|-----|---------|
| 1 | 0–60 m | Oberboden | Lehm, Kies, Kohle | Wurzelbiest |
| 2 | 60–160 m | Kalkbank | Kupfer, Zinn | Kalkgolem |
| 3 | 160–320 m | Tiefengestein | Eisen, Silber | Grubenmutter |
| 4 | 320–540 m | Kristallhöhlen | Amethyst, Geoden | Geodenherz |
| 5 | 540–820 m | Zwergenhallen | Mithril, Runengold | Ahnenkönig |
| 6 | 820–1180 m | Trollklüfte | Trollstein, Blutquarz | Klüftenfürst |
| 7 | 1180–1620 m | Vulkanschlund | Obsidian, Magmakern | Magmawurm |
| 8 | 1620–2150 m | Schattenreich | Seelenerz, Nachtsilber | Schattenweber |
| 9 | 2150–2800 m | Höllenschlund | Höllenstein, Dämonenkern | Pfortenwächter |
| 10 | 2800 m+ | Weltenwurzel | Urerz (endlos skalierend) | endlose Wächter alle 200 m |

Story-Beats (kurze Log-Zeilen, keine Textwände):
- 540 m: Du brichst in eine Halle mit gemeißelten Säulen ein. Jemand war hier zuerst.
- 820 m: Etwas hat die Säulen umgeworfen. Die Bruchkanten sind frisch.
- 1180 m: Das Gestein wird warm.
- 2150 m: Der Stein hört auf, Stein zu sein.

## 4. Ressourcen

| Ressource | Symbol | Quelle | Zweck | Reset bei Prestige |
|-----------|--------|--------|-------|--------------------|
| **Gold** | 🪙 | Blöcke zerschlagen | Hauer anheuern, Schmiede-Upgrades | ja |
| **Kristalle** | 💎 | Geoden, Freebie, Bomben, Wächter | Boosts, permanente Upgrades | **nein** |
| **Seelenrunen** | ᚱ | Prestige (Einsturz) | permanenter globaler Multiplikator | nein (das ist der Punkt) |

### Kristalle — die "Fake-Premium"-Währung

Genau der Obelisk-Miner-Trick, den du beschrieben hast: **sieht am Anfang aus wie
eine harte Premiumwährung, wird aber mit Fortschritt immer freigiebiger.**
Wichtig ist, dass die Quellen alle *mit der Tiefe skalieren* — der Spieler merkt
nach ein paar Stunden "ah, die kriege ich ja geschenkt", und genau dieses Gefühl
ist die Belohnung.

Quellen:
1. **Geoden** — Zufalls-Drop beim Blockbrechen. Basischance ~1,2 %, steigt mit
   Schichtnummer und dem Kristall-Upgrade *Geologie*. Ausbeute skaliert mit Tiefe.
2. **Freebie** — alle 2 h abholbar, Menge = `5 + Tiefe/25 + Runen`.
   Am Anfang 5 💎, im Spätspiel dreistellig.
3. **Geodenbombe** — alle 20 min ein Klick, sprengt eine Geodenader.
   (Später optional an Rewarded Ad hängbar — aber nie Pflicht.)
4. **Wächter-Kills** — feste Menge pro Schicht, wächst linear mit Schichtnummer.
5. **Einsturz** — jeder Prestige gibt Kristalle proportional zu den Runen.

Verwendung:
- **Adernstoß** — ×8 Grabkraft für 2 min
- **Zeitsprung** — 2 h Offline-Ertrag sofort
- **Sprengung** — die nächsten 10 Blöcke sofort brechen
- **Permanente Kristall-Upgrades** — Geologie, Offline-Kapazität, Runen-Bonus,
  Startertiefe, Kristallausbeute (überleben Prestige)

**Kein Pay-to-Win-Design.** Falls später Monetarisierung: Kosmetik,
Offline-Komfort, "Danke"-Kauf. Nichts, was Kristalle exklusiv macht.

## 5. Zwerge (Auto-Grabkraft)

Zehn Stufen, klassisches Idle-Scaling: Kosten ×1,15 pro Einheit, Grabkraft linear.
Freischaltung über erreichte Maximaltiefe, damit die Liste sich nach und nach öffnet.

Lehrling → Hauer → Steiger → Sprengmeister → Runenschmied → Steingolem →
Troll-Söldner → Magmakriecher → Schattenschürfer → Dämonenschürfer

## 6. Schmiede (Gold-Upgrades)

| Upgrade | Effekt |
|---------|--------|
| Spitzhacke | Tippschaden ×1,25 pro Stufe |
| Ausrüstung | Grabkraft aller Zwerge ×1,12 |
| Loren | Gold pro Block ×1,15 |
| Grubenlaterne | +1,5 % Krit-Chance beim Tippen |
| Schwarzpulver | Krit-Schaden +50 % |
| Geologie-Kunde | +12 % relative Geodenchance |

## 7. Prestige — "Einsturz"

Ab 200 m möglich. Formel:

```
Runen = floor( (maxTiefe / 60) ^ 1.35 ) * (1 + Runen-Bonus-Upgrade)
```

Effekt: `Globaler Multiplikator = 1 + 0.08 * Runen^0.9` auf Grabkraft **und** Gold.
Zurückgesetzt: Tiefe, Gold, Zwerge, Schmiede-Upgrades.
Behalten: Kristalle, Kristall-Upgrades, Runen, Statistiken.

Später geplant: Runen-Skillbaum statt reinem Flat-Multiplikator.

## 8. Offline-Fortschritt

Beim Start wird die Zeit seit dem letzten Speichern in 1-Sekunden-Schritten
echt simuliert (nicht geschätzt) — Blöcke brechen, Erz fällt, Geoden droppen.
Deckel: 8 h, per Kristall-Upgrade auf bis zu 24 h erweiterbar.
Beim Zurückkommen: "Während du weg warst"-Zusammenfassung.

## 9. Technik-Entscheidungen

Constraint: **Entwicklung nur am Handy, alles über GitHub, keine Engine,
später leicht als App verpackbar.**

- **Vanilla JS mit ES-Modulen, kein Build-Step.** Was im Repo liegt, ist das,
  was der Browser lädt. Kein npm, kein Bundler, kein Webpack-Debugging am Handy.
- **GitHub Pages** als Test-Deploy → nach jedem Push ~1 min später am Handy live.
- **PWA** (Manifest + Service Worker) → "Zum Startbildschirm hinzufügen",
  läuft offline und im Vollbild wie eine App.
- **Später APK:** Capacitor oder Bubblewrap (TWA) wickeln exakt diesen
  `www/`-Ordner ein. Weil kein Build-Step existiert, ist das ein Copy-Paste-Schritt,
  kein Port.
- **Keine Bilder-Assets.** UI ist CSS + Emoji. Spart Asset-Pipeline, die am Handy
  weh tun würde, und hält das Spiel unter 100 KB.
- **Speichern:** `localStorage`, versioniert mit Migrationspfad.

### Ordnerstruktur

```
index.html            Einstieg + DOM-Gerüst
styles.css            komplettes UI
manifest.webmanifest  PWA-Metadaten
sw.js                 Service Worker (network-first, damit Tests frisch sind)
src/
  main.js             Bootstrap + Game-Loop
  core/
    state.js          Speicherstand, Migration, Persistenz
    balance.js        ALLE Formeln an einem Ort
    engine.js         Tick, Blockbrechen, Offline-Simulation
  data/
    layers.js         Schichten, Erze, Wächter
    miners.js         Zwergen-Definitionen
    upgrades.js       Schmiede- + Kristall-Upgrades
  ui/
    ui.js             Rendering + Events
  util/
    format.js         Zahlenformatierung (K/M/B/T/aa/ab…)
    rng.js
```

Balance ist bewusst in `core/balance.js` und `data/*` isoliert: Zahlen drehen,
ohne Spiel-Logik anzufassen.

## 10. Gemessene Fortschrittskurve

Aus `node tools/check.mjs` (simulierter Spieler, tippt die ersten 5 Minuten mit,
kauft danach was bezahlbar ist):

| Zeitpunkt | Tiefe | Kristalle |
|-----------|-------|-----------|
| 1 min | 25 m | 2 💎 |
| 10 min | 91 m | 7 💎 |
| 30 min | 730 m | 834 💎 |
| 4 h (Ende Lauf 1) | 812 m | 958 💎 |

Prestige-Kette, danach je 1 Stunde pro Lauf:

| Lauf | Tiefe | Zuwachs | Runen |
|------|-------|---------|-------|
| 2 | 1 300 m | +488 m | 50 ᚱ |
| 3 | 1 706 m | +406 m | 92 ᚱ |
| 4 | 2 039 m | +333 m | 131 ᚱ |
| 5 | 2 382 m | +343 m | 165 ᚱ |
| 6 | 2 693 m | +311 m | 202 ᚱ |
| 7 | 2 995 m | +302 m | 238 ᚱ |

Die Kette trägt also stabil ~300 m pro Lauf. Die Weltenwurzel (endlose Schicht)
wird nach etwa sieben Läufen erreicht.

### Die wichtigste Balancing-Lehre

Der erste Entwurf hatte `Runenbonus = 1 + 0,08 · Runen^0,9`. Die Simulation
zeigte: **ab Lauf 4 bringt Prestige praktisch nichts mehr** (+6 m, +2 m, dann
Stillstand).

Der Grund ist strukturell, nicht kosmetisch:

- Blockhärte wächst **exponentiell** mit der Tiefe (`1,055^Tiefe`).
- Kaufbare Grabkraft wächst nur **linear** mit der Tiefe. Zwerge kosten
  `×1,15` pro Einheit, also geht Gold nur *logarithmisch* in die Grabkraft ein —
  und Gold selbst wächst exponentiell mit der Tiefe. Exponentiell + logarithmisch
  = linear.

Ein polynomialer Bonus verliert gegen einen exponentiellen Gegner immer. Der
Runenbonus muss deshalb selbst exponentiell sein: `1,25^Runen`.

Konsequenz fürs Weiterentwickeln: **jede neue Fortschrittsquelle muss auf ihre
Wachstumsklasse geprüft werden, nicht auf ihren Zahlenwert.** `check.mjs` lässt
den Test fehlschlagen, sobald ein Lauf der Kette auf null Fortschritt fällt.

### Offene Balancing-Punkte

- Zwischen Minute 10 und 30 beschleunigt der erste Lauf sehr abrupt
  (91 m → 730 m), weil in dieser Phase mehrere Zwergenstufen gleichzeitig
  freischalten. Freischalttiefen entzerren.
- Danach steht der erste Lauf 3,5 Stunden praktisch still. Das ist der
  klassische "Sprint gegen die Wand" — funktioniert, weil Prestige greift,
  könnte aber mit Zwischenzielen (Quests, Relikte) angenehmer werden.

## 11. Roadmap

**v0.1 — Vertical Slice (steht)**
Graben, Zwerge, Schmiede, 10 Schichten, Wächter, Kristalle, Prestige,
Offline, PWA, Pages-Deploy.

**v0.2 — Tiefe geben**
- Erz-Inventar mit sichtbaren Fundstücken statt nur Gold
- Relikte (Kristall-Gacha) mit passiven Effekten
- Tagesquests
- Zahlen-Balancing über echte Spieldaten

**v0.3 — Fraktionen**
- Zwergenhallen: NPC-Handelsposten
- Trolle: Bedrohungs-Mechanik (Kämpfe zurück, Ausrüstung nötig)
- Höllenschlund: Pakt-System mit Risiko/Ertrag

**v0.4 — App**
- Capacitor-Wrapper, Icons, Splash
- Play-Store-Testtrack

**Offene Fragen (bewusst noch nicht entschieden)**
- Sollen Trolle echte Kämpfe sein oder nur "härteres Gestein mit Namen"?
- Mehrere Schächte parallel (Obelisk-Miner-Stil) oder ein Schacht in die Tiefe?
- Erz als eigene Ressource zum Craften, oder bleibt Gold die einzige Wirtschaft?
