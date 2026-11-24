# CLAUDE.md – The Wizard Nagoony

Browser-Spiel (HTML5-Canvas, Vanilla-JS, keine Abhängigkeiten). Sprache der Oberfläche und der Kommentare: **Deutsch**; Sprechblasen im Spiel sind Englisch. Der Nutzer entwickelt das Spiel regelmäßig mit Claude weiter und testet am Handy.

## Befehle
- `npm start` – baut und startet `http://localhost:8000` (auch per WLAN am Handy)
- `npm test` – baut und spielt das Spiel headless automatisch durch (`tools/sim-test.js`); **vor jedem Commit ausführen**
- `npm run build` – erzeugt `public/game.js` und `public/sw.js` aus `src/`
- `npm run build:single` – Einzeldatei `dist/the-wizard-nagoony.html` (Musik als Base64; für Xcode-WKWebView)

## Wichtigste Regel
`public/game.js` und `public/sw.js` sind **generiert**. Immer in `src/js/*.js` ändern, dann `npm run build`, und das Ergebnis mit committen (Vercel baut ebenfalls selbst, aber so funktioniert `public/` auch ohne Build).

## Aufbau
`build.js` fügt `src/js/*.js` alphabetisch zusammen und packt alles in **eine** Funktion `(() => {'use strict'; … })();`. Alle Dateien teilen sich also einen Scope: keine `import`/`export`, Namen müssen über alle Dateien eindeutig sein, und Top-Level-Code darf nur Dinge benutzen, die in früheren Dateien definiert sind (Funktionen werden gehoistet, `const`/`let` nicht).

| Datei | Inhalt |
|---|---|
| `01-core-audio-input` | Canvas/Skalierung (`W` variabel, `H=540`, `GROUND=440`), Hilfsfunktionen, Audio (Web Audio, Musik aus `assets/music.mp3`, Effekte), Tastatur/Touch/Pause-Eingabe, Handy-Layout (`P.x`) |
| `02-spawning-combat` | Gegnertypen (`TYPES`), Spawn/Schwierigkeit, Flugphasen-Start, `cast` (Nagoony-Zauber, Feuerball), Treffer, Schaden (`hurt`), Game Over |
| `03-bosses-powerups` | Biome/Paletten, Boss-Namen/Skins, `startBoss(air)`, Boss-Muster, Bann (`applySilence`, `silenceT`), Items/Power-ups, `resetExtras`, Sternenbögen |
| `04-movement-update` | Bewegung Boden/Flug/Landung, `update`, `updateFX` |
| `05`–`07-draw-*` | Zeichnen: Himmel/Wald/Boden, Gegner, Flug-Hindernisse, Items, Bosse (`drawBoss*`), Schild, Orbs |
| `08-wizard-shop-menus` | `SHOP`-Daten, Zauberer-Zeichnung (`drawWizard`, Hut/Bart/Motorrad), Sprechblasen (`say`, `sayKill`), Menüs (Titel, Garderobe, Anleitung, Game Over, Pause) als Canvas-UI mit Klickflächen `UI[]` |
| `09-hud-render-loop` | HUD, `render`, Hauptschleife `frame` |

## Wichtige Konzepte
- **Zustände:** `state` = `'title' | 'play' | 'paused' | 'over'`; Menüs unter `title` über `menu` = `'main' | 'garage' | 'help'`. Aktionen laufen über `uiAction(id)`.
- **Modi im Spiel:** `mode` = `'ground' | 'fly' | 'land'`. Ungerader Flug → Landung → Bodenboss; gerader Flug (`flightNo % 2 === 0`) → Luftboss am Flugende.
- **Bosse:** Skins Boden 0–3, Luft über `AIR_SKIN` (4 Eule, 5 Phönix). Ab Phase 2 „Bann“ (Zauber gesperrt; Schild fängt ihn ab).
- **Sterne/Shop:** Guthaben `wallet`; Garderobe-Kategorien `g` Gewand, `h` Hut, `b` Bart, `m` Motorrad (`SHOP` in Datei 08). Preise dort ändern/ergänzen; Regenbogen-Items animieren über `hsl()`.
- **Speicher (localStorage):** `nagoony_hi` (Rekord), `wiz_stars`, `wiz_own`, `wiz_look`. Beim Ändern der Datenform alte Spielstände abwärtskompatibel laden und validieren.
- **Handy:** Querformat, Steuerknöpfe als HTML-Buttons in `index.html`/`style.css` (Klasse `.cl`); Touch wird per `matchMedia('(hover: none) and (pointer: coarse)')` erkannt. Menüs sind Canvas-Zeichnungen, Taps gehen über `onCanvasPointer`.

## Testen
- `npm test` prüft Menü, Shop-Kauf, Level-Anstieg, Boden-/Luftboss, Bann, Sprechblasen, Sternesammeln (mit Fake-Canvas, ohne Browser). Bei neuen Funktionen eine Prüfung in `tools/sim-test.js` ergänzen. Der Test hängt sich per Textersetzung an `function hurt(o) {` und an das Dateiende `})();` – bei Umbenennungen dort mitziehen.
- Sichtprüfung (Layout, Zeichnungen): `npm start`, im Browser öffnen und Handy-Ansicht (844×390, Touch) testen. Vor dem Veröffentlichen unbedingt Handy-Layout prüfen.

## Deployment
Vercel liefert `public/` aus (`vercel.json`: Build `node build.js`). Push auf `main` = live; andere Branches = Vorschau-URL. Der Service Worker (Netzwerk zuerst, Cache als Offline-Fallback) bekommt pro Build eine neue Version, daher sehen Nutzer neue Versionen beim nächsten Laden.

## Stil
Kleine, gezielte Änderungen; vorhandene Namen und Muster beibehalten; keine Frameworks/Bibliotheken einführen, ohne den Nutzer zu fragen. Neue sichtbare Texte auf Deutsch.
