#!/usr/bin/env node
/* Mini-Server für lokales Testen (ohne Abhängigkeiten): node tools/serve.js [port]
   Im WLAN: am Handy http://<IP-des-Rechners>:PORT öffnen. Unterstützt Range-Requests (nötig für Audio in Safari). */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const root = path.join(__dirname, '..', 'public'), port = +process.argv[2] || 8000;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(root, p));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('404'); }
  const size = fs.statSync(file).size, h = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (m) {
    const a = m[1] ? +m[1] : 0, b = m[2] ? Math.min(+m[2], size - 1) : size - 1;
    res.writeHead(206, { ...h, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': b - a + 1 });
    fs.createReadStream(file, { start: a, end: b }).pipe(res);
  } else { res.writeHead(200, { ...h, 'Content-Length': size }); fs.createReadStream(file).pipe(res); }
}).listen(port, () => {
  console.log(`\n  The Wizard Nagoony läuft:  http://localhost:${port}`);
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) console.log(`  Im selben WLAN (Handy):    http://${i.address}:${port}`);
  console.log('  Beenden mit Strg+C\n');
});
