#!/usr/bin/env node
/* Build ohne Abhängigkeiten:  node build.js            -> public/game.js + public/sw.js
                               node build.js --single   -> zusätzlich dist/the-wizard-nagoony.html (alles in einer Datei, Musik als Base64)
   Die Dateien in src/js/ werden alphabetisch zusammengefügt und in EINE Funktion verpackt
   (alle Spiel-Variablen teilen sich also einen Scope – die Reihenfolge der Nummern ist wichtig). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = __dirname, pub = path.join(root, 'public'), srcDir = path.join(root, 'src', 'js');

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).sort();
const body = files.map(f => `/* ===== ${f} ===== */\n` + fs.readFileSync(path.join(srcDir, f), 'utf8')).join('\n');
const game = `(() => {\n'use strict';\n${body}\n})();\n`;
fs.writeFileSync(path.join(pub, 'game.js'), game);

const version = crypto.createHash('sha1').update(game)
  .update(fs.readFileSync(path.join(pub, 'index.html'))).update(fs.readFileSync(path.join(pub, 'style.css')))
  .digest('hex').slice(0, 10);
fs.writeFileSync(path.join(pub, 'sw.js'), fs.readFileSync(path.join(root, 'src', 'sw.template.js'), 'utf8').replaceAll('__VERSION__', version));
console.log(`public/game.js  ${(game.length / 1024).toFixed(0)} KB  (${files.length} Dateien)   Version ${version}`);

if (process.argv.includes('--single')) {
  const music = fs.readFileSync(path.join(pub, 'assets', 'music.mp3')).toString('base64');
  let html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(pub, 'style.css'), 'utf8');
  html = html.replace(/<link rel="(manifest|icon|apple-touch-icon|stylesheet)"[^>]*>\n?/g, '')
    .replace('</head>', `<style>\n${css}</style>\n</head>`)
    .replace(/<script src="game.js"><\/script>\n<script>[\s\S]*?<\/script>/,
      () => `<script>window.BGM_SRC="data:audio/mpeg;base64,${music}";</script>\n<script>\n${game}</script>`);
  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const out = path.join(root, 'dist', 'the-wizard-nagoony.html');
  fs.writeFileSync(out, html);
  console.log(`dist/the-wizard-nagoony.html  ${(html.length / 1048576).toFixed(1)} MB  (Einzeldatei, läuft per Doppelklick und in Xcode)`);
}
