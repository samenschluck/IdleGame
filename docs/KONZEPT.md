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

## 10. Warum das Spiel bremst (v0.2)

Die erste Fassung war in zehn Minuten durchgespielt. Der Grund war strukturell,
nicht numerisch: **es gab genau einen Engpass.** Gold pro Block wächst
exponentiell mit der Tiefe, ein Zwerg kostet aber nur nach Anzahl mehr. Sobald
das Einkommen die Kosten überholt, kauft man alles auf einmal. Zusätzlich
schalteten sich Zwergenstufen über die *Tiefe* frei — mehr Tiefe gab also mehr
Grabkraft gab mehr Tiefe. Eine Rückkopplung ohne Bremse. Am Ende stoppte nicht
die Ökonomie, sondern dass die Zwergenliste leer war.

Seit v0.2 gibt es drei Achsen, die unabhängig blockieren:

| Achse | Was sie ist | Warum sie nicht ausreißt |
|-------|-------------|--------------------------|
| **Härte** | Jede Schicht verlangt eine Mindest-Schlagkraft. Zu schwach = 25 % Schaden, zwei Stufen zu schwach = 6 %. | Gold hilft hier gar nicht. |
| **Erz** | Fällt **pro Block**, nicht pro Meter — also linear statt exponentiell. Bezahlt die nächste Hacke. | Lässt sich nicht durch Tiefe abkürzen, nur durch Zeit im Stollen. |
| **Gold** | Bleibt der Beschleuniger: mehr Zwerge, mehr Blöcke pro Sekunde. | Bringt keinen Meter Tiefe für sich allein. |

Daraus entsteht der Rhythmus, der vorher fehlte:

```
vortreiben → Wand → ausbeuten → Hacke schmieden → Durchbruch → vortreiben
```

### Vier Regeln, die dabei nicht verhandelbar sind

Jede davon stammt aus einem gemessenen Fehlverhalten, nicht aus dem Bauchgefühl —
und jede ist im Test festgenagelt.

**1. Die Hacke für Härte N besteht aus dem Erz der Schicht mit Härte N.**
Im Schacht geht es nicht zurück nach oben. Bräuchte die Hacke das Erz der
*vorigen* Schicht, wäre ein Lauf unrettbar tot, sobald man eine Schicht
durchquert hat, ohne genug zu sammeln. Gemessen: der Bot klebte 47 Stunden auf
60 m fest.

**2. Der Schmelzofen rührt das Erz für die nächste Hacke nicht an.**
Ein ausgebauter Ofen frisst den Nachschub schneller weg, als er hereinkommt.
Gemessen: 208 Mio. Erz abgebaut, 1,7 Mio. Barren daraus — und nie die 1800
Amethyst für den Durchbruch beisammen.

**3. Die Werkstatt ist nur so gut wie die Hacke** (`perPick` in `upgrades.js`).
Ohne diese Klammer kauft man den Baum in der ersten Stunde leer: die Grabkraft
wuchs in den frühen Schichten um das 432-, 63- und 212-fache, die Blockhärte nur
um das 26-fache. Fünf Schichten fielen binnen einer Stunde.

**4. Ein Wächter zählt nur beim ersten Mal.**
Die Härtewand liegt zwangsläufig auf einer Schichtgrenze, und genau dort sitzt
der Wächter. Wer dort ausbeutet, erschlüge ihn sonst endlos. Gemessen: 213 954
Kristalle aus 12 355 Blöcken plus dauerhaft 30-facher Goldertrag.

### Gemessene Kurve

`node tools/tune.mjs` — simulierter Spieler, erster Lauf, ohne Runen:

| Schicht | erreicht nach |
|---------|---------------|
| Kalkbank | 2 min |
| Tiefengestein | 32 min |
| Kristallhöhlen | 54 min |
| Zwergenhallen | 1,4 h |
| Trollklüfte | 2,4 h |
| Vulkanschlund | 6,0 h |
| Schattenreich | 19 h |
| Höllenschlund | 61 h |
| Weltenwurzel | **nicht im ersten Lauf** |

Die ersten drei Schichten sind bewusst schnell — sie sind das Tutorial und
zeigen Wand, Ausbeuten und Schmiede je einmal. Danach etwa Verdopplung bis
Verdreifachung je Schicht. Die letzten Schichten gibt es nur über Prestige;
der zweite Lauf schafft dieselbe Strecke bis Tiefengestein statt in 32 Minuten
in unter einer.

### Werkzeuge

```
node tools/check.mjs                    Smoke-Test + Leitplanken (läuft in CI)
node tools/tune.mjs                     Kurve gegen die Zielkurve prüfen
node tools/tune.mjs oreGrowth 3 5 7     eine Stellschraube durchsweepen
HOURS=200 node tools/tune.mjs           längeren Horizont simulieren
```

Stellschrauben stehen in `balance.TUNING` und `picks.PICK_TUNING`. Der Test
prüft die Kurve **beidseitig** — zu schnell schlägt genauso fehl wie zu langsam.
Die erste Fassung war in zehn Minuten durch, ohne dass ein Test angeschlagen
hätte; das soll nicht noch einmal passieren.

## 11. Die Fortschrittsspindel (v0.3)

Aus dem vollständigen Wiki kam die eine Struktur, die vorher fehlte. Bei
Obelisk Miner treibt nicht die Tiefe den Fortschritt, sondern eine Kette:

```
Blöcke brechen → Erfahrung → Spielerstufe → Upgrades freigeschaltet
                                  ↑
                    Obergrenze steigt NUR durch besiegte Wächter
```

Das ist deshalb so wirksam, weil die Stufenobergrenze ein **harter Riegel** ist,
den kein Grinden aufweicht. Und es gibt den Wächtern endlich eine Aufgabe: Sie
sind der Torwächter des Fortschritts, nicht bloß ein Block mit viel HP.

Bei uns:

| | |
|---|---|
| Erfahrung je Block | `1 + 2 × Schichtnummer` |
| Stufe | aus der Gesamterfahrung, geschlossene Form |
| Obergrenze | `15 + 6 × tiefster besiegter Wächter` |
| Upgrade sichtbar ab | eigener `unlockLevel` je Upgrade (1, 3, 6, 8, 10, 12, 14, 16, 18) |
| Ausbaustufe | eine je Spielerstufe ab der Freischaltung |

Das ersetzt die `perPick`-Klammer aus v0.2. Die war eine reine Notbremse gegen
den zu schnellen Aufkauf und hatte keine Spielhandlung dahinter — jetzt hängt
der Ausbau an etwas, das man sich erkämpft.

Beim Einsturz gehen Erfahrung und Stufe mit; **die Obergrenze bleibt**. Genau
wie bei Obelisk Miner, wo der Obelisk-Rang permanent ist.

## 12. Was aus dem Wiki noch aussteht

Aus dem vollständigen Wiki (139 Seiten), sortiert nach Nutzen für unser Spiel.

### Als Nächstes

**1. Wächter als richtiger Kampf.** Das Original macht daraus ein Ereignis
statt eines dicken Blocks:
- **Rüstung** — zieht sich vom *Grundschaden je Schlag* ab, **vor** dem Krit.
  Liegt der Grundschaden darunter, richtet man *gar nichts* aus, egal wie hoch
  der Kritschaden wäre. Das belohnt wenige große Schläge statt vieler kleiner —
  eine ganz andere Achse als unsere Härte, die nur den Schaden herunterskaliert.
- **30 Sekunden Kampfzeit**, danach 20 Minuten Abklingzeit.
- **Schaden bleibt über alle Versuche erhalten** — man beißt sich über Stunden
  durch, statt in einem Anlauf gewinnen zu müssen.
- Belohnung: Obergrenze +5, Kristalle, neue Mechanik.

**2. Verträge** (Original: ab Obelisk 12). Verlangen **Barren**, nicht Erz —
damit bekommt der Schmelzofen einen zweiten Abnehmer. Jeder erfüllte Vertrag
gibt Vertragspunkte für einen eigenen Upgrade-Zweig; die Anforderungen steigen
mit jedem Abschluss. Gibt dem Warten an der Härtewand ein zweites Ziel.

**3. Truhen und Gegenstände.** Eine Leiste füllt sich mit ausgeteiltem Schaden
(Anforderung wächst exponentiell, gedeckelt durch die Block-HP). Voll = Truhe =
ein Gegenstand mit **zeitlich begrenztem Buff** (im Original 13 Stück, 1:30 bis
2:30 min: Kritchance, Tempo, Schaden). Das ist der Vorbereitungs-Schritt vor
einem Wächter-Kampf — und der Grund, überhaupt zuzuschauen.

**4. Adern als eigene Dauerwährung.** Im Original sind Veins keine
Erz-Multiplikatoren wie bei uns, sondern eine **Währung, die den Prestige
überlebt**. Erz-Knoten werden mit einer gewissen Chance zu Adern-Knoten und
geben dann beides. Damit gäbe es drei Ebenen statt zwei:
Erz/Barren/Gold (Reset) — Adern/Kristalle/Runen (permanent).

**5. Drohnen** — Automatisierung fürs Spätspiel. Im Original mit eigenem
Treibstoff-Kreislauf (Kohle → Generator), also selbst wieder ein Engpass.

### Später

**Herausforderungen** (Läufe mit Handicap für permanente Boni) ·
**Skill-Baum** · **Karten** mit Set-Boni · **Haustiere** ·
**Sonderböden** (Golden ×5, Rainbow ×50, multiplikativ stapelbar) ·
**Lootbugs** · **Statuen/Monumente**.

### Bewusst nicht übernommen

**Store**, **Codes** und **Events** — keine Monetarisierung und keine
Live-Service-Infrastruktur geplant. **Cloud-Speicherstand** — bei uns wandert
der Stand per Export/Import, ohne Konto. Die vier Nebenaktivitäten
(**Stargazing**, **Archaeology**, **Fishing**, **Arcanist**) sind eigene
Minispiele; sie lohnen erst, wenn der Hauptloop über Wochen trägt.
