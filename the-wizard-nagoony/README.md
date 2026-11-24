# The Wizard Nagoony

Ein Zauberer auf dem Motorrad: Endless-Runner im Browser (HTML5-Canvas, reines JavaScript, **kein Framework, keine Abhängigkeiten**).
Bodenphasen und Flugphasen, Power-ups, Biome, Bodenbosse und Luftbosse (mit „Bann“, der deine Zauber sperrt), Sprechblasen, Sterne sammeln und in der Garderobe Gewand, Hut, Bart und Motorrad freischalten. Läuft am Desktop (Tastatur) und am Handy (Touch, Querformat) und lässt sich als App zum Home-Bildschirm hinzufügen (PWA, auch offline).

## Ordner im Überblick

```
the-wizard-nagoony/
├── public/            ← Das wird veröffentlicht (Vercel liefert genau diesen Ordner aus)
│   ├── index.html         Seite, Bedienelemente fürs Handy
│   ├── style.css          Layout und Touch-Buttons
│   ├── game.js            ⚠ wird GENERIERT (aus src/js) – nicht von Hand ändern
│   ├── sw.js              ⚠ wird GENERIERT – Offline-Cache
│   ├── manifest.webmanifest, icons/   App-Name und Icons (PWA)
│   └── assets/music.mp3   Hintergrundmusik
├── src/js/            ← Hier steckt der Spielcode (9 Dateien, Nummern = Reihenfolge)
├── src/sw.template.js     Vorlage für den Offline-Cache
├── build.js               Baut public/game.js aus src/js
├── tools/serve.js         Kleiner Server zum lokalen Testen
├── tools/sim-test.js      Automatischer Spieltest (npm test)
├── vercel.json            Einstellungen für Vercel
├── CLAUDE.md              Hinweise für Claude beim Weiterentwickeln
└── package.json           Kurzbefehle (npm start / test / run build)
```

## Lokal starten

Voraussetzung: [Node.js](https://nodejs.org) (Version 18 oder neuer). Mehr braucht es nicht.

```bash
npm start
```

Dann im Browser `http://localhost:8000` öffnen. Im Terminal steht außerdem eine Adresse wie `http://192.168.x.x:8000`: Die kannst du am **Handy im selben WLAN** öffnen, um die Touch-Version zu testen.

Weitere Befehle:

| Befehl | Wirkung |
|---|---|
| `npm start` | baut das Spiel und startet den lokalen Server |
| `npm test` | baut und lässt das Spiel automatisch durchspielen (Menü, Shop, Bosse, Bann …) |
| `npm run build` | baut nur `public/game.js` und `public/sw.js` |
| `npm run build:single` | erzeugt zusätzlich `dist/the-wizard-nagoony.html` (alles in **einer** Datei, per Doppelklick spielbar, auch für Xcode) |

> Die Seite nur per Doppelklick (`file://`) zu öffnen funktioniert ebenfalls, dann wird die Musik aber in einem einfacheren Modus abgespielt. Besser `npm start` verwenden.

## Auf GitHub hochladen

1. Auf [github.com](https://github.com) anmelden → **New repository** → Name z. B. `the-wizard-nagoony` → **Create repository** (ohne README/.gitignore anlegen, die sind schon dabei).
2. Variante A (am einfachsten, ohne Terminal): **GitHub Desktop** installieren, *File → Add local repository* den entpackten Projektordner wählen → *Publish repository*.
3. Variante B (Terminal), im Projektordner:
   ```bash
   git init
   git add .
   git commit -m "Erste Version"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/the-wizard-nagoony.git
   git push -u origin main
   ```
4. Variante C (nur Browser): Im neuen Repository **uploading an existing file** klicken und den **kompletten Inhalt** des Projektordners hineinziehen, also auch die Ordner `public`, `src`, `tools` und die Dateien `.gitignore`, `vercel.json` usw. Der Ordner `dist` und `node_modules` werden nicht benötigt.

## Mit Vercel veröffentlichen

1. Auf [vercel.com](https://vercel.com) mit dem GitHub-Konto anmelden.
2. **Add New → Project** → das Repository `the-wizard-nagoony` importieren.
3. Die Einstellungen kommen aus `vercel.json` (Build-Befehl `node build.js`, Ausgabeordner `public`). Einfach **Deploy** klicken.
4. Nach ca. einer Minute ist das Spiel unter `https://<projektname>.vercel.app` erreichbar. Unter *Settings → Domains* kannst du später eine eigene Domain eintragen.

**Ab dann gilt:** Jeder Push auf den Branch `main` veröffentlicht automatisch die neue Version. Pushes auf andere Branches erzeugen eine eigene **Vorschau-Adresse** zum Ausprobieren, ohne dass die Live-Version angefasst wird.

### Als App aufs Handy
- **iPhone (Safari):** Seite öffnen → Teilen → *Zum Home-Bildschirm*.
- **Android (Chrome):** Menü → *App installieren* bzw. *Zum Startbildschirm*.

Sterne und Garderobe werden im Browser des jeweiligen Geräts gespeichert (`localStorage`). Sie wandern also nicht automatisch zwischen Geräten.

## Weiterentwickeln mit Claude

1. Repository in **Claude Code** öffnen (Desktop, Web oder Terminal) und den Wunsch beschreiben, z. B. *„Füge einen neuen Biom-Boss hinzu"*. Claude liest `CLAUDE.md` und kennt damit den Aufbau.
2. Claude ändert Dateien in `src/js/`, führt `npm test` aus und baut `public/game.js` neu.
3. Änderungen auf einem Branch pushen → Vercel zeigt eine Vorschau-Adresse → am Handy ausprobieren → zusammenführen (Merge in `main`) → live.

## Hinweise
- **Musik:** `public/assets/music.mp3` ist öffentlich abrufbar, sobald die Seite online ist. Veröffentliche nur Musik, für die du die Rechte hast.
- **Ältere Versionen:** Die Xcode-Variante (iPhone-App) nutzt die Einzeldatei aus `npm run build:single`.
