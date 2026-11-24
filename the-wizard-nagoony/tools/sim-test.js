#!/usr/bin/env node
/* Headless-Spieltest ohne Browser:  npm test   (oder: node tools/sim-test.js [Schritte])
   Lädt public/game.js mit einem Fake-Canvas, spielt automatisch im Gott-Modus und prüft,
   dass nichts abstürzt und die wichtigsten Systeme laufen (Menü, Shop, Boden-/Luftboss, Bann, Sprechblasen).
   Neue Funktionen? Hier eine Prüfung ergänzen – so merkt man Fehler, bevor man deployt. */
const fs = require('fs'), path = require('path');
let code = fs.readFileSync(path.join(__dirname, '..', 'public', 'game.js'), 'utf8');
code = code.replace('function hurt(o) {', 'function hurt(o) { if (globalThis.__god) { o.dead = true; return; }');
const hook = "globalThis.__dbg=()=>({mode,level,state,menu,distPx:Math.round(distPx),lives,boss:boss?{air:!!boss.air,phase:boss.phase,hp:boss.hp}:null,bossNo,sil:silenceT,wallet,bubble:bubble&&bubble.text,flightNo});globalThis.__ui=uiAction;globalThis.__setw=v=>{wallet=v};globalThis.__look=()=>({LOOK,OWN});\n})();";
if (!/\}\)\(\);\s*$/.test(code)) throw new Error('game.js endet nicht mit })();');
code = code.replace(/\}\)\(\);\s*$/, hook);

const handler = { get: (t, k) => k === 'createLinearGradient' || k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'measureText' ? s => ({ width: String(s).length * 10 }) : (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } };
const ctx = new Proxy({}, handler), listeners = {};
const el = () => ({ getContext: () => ctx, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} }, style: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 540 }) });
Object.assign(global, { document: { body: el(), documentElement: el(), getElementById: () => el(), addEventListener() {}, hidden: false }, window: global, devicePixelRatio: 1, innerWidth: 960, innerHeight: 540, matchMedia: () => ({ matches: false }) });
Object.defineProperty(global, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
global.Audio = function () { return { play: () => Promise.resolve(), pause() {}, volume: 1, currentTime: 0 }; };
global.addEventListener = (n, f) => { (listeners[n] = listeners[n] || []).push(f); };
const store = {}; global.localStorage = { getItem: k => store[k] || null, setItem(k, v) { store[k] = v; } };
let cb; global.requestAnimationFrame = f => { cb = f; };
(0, eval)(code);
const key = (t, c) => (listeners[t] || []).forEach(f => f({ code: c, preventDefault() {}, repeat: false }));
let ts = 0; const step = () => { ts += 16.7; cb(ts); };
const fails = []; const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FEHLT ') + msg); if (!ok) fails.push(msg); };

for (let i = 0; i < 30; i++) step();
check(__dbg().state === 'title', 'Startmenü wird angezeigt');
__ui('garage'); check(__dbg().menu === 'garage', 'Garderobe öffnet');
__ui('tab:h'); __ui('item:3'); __ui('buy'); check(__look().OWN.h.length === 1, 'Kaufen ohne Sterne wird abgelehnt');
__setw(100); __ui('buy'); check(__look().OWN.h.includes(3) && __look().LOOK.h === 3, 'Kaufen + Ausrüsten mit genug Sternen');
__ui('back'); __ui('play'); step();
check(__dbg().state === 'play', 'Spiel startet');

global.__god = true; const wallet0 = __dbg().wallet;
const N = +process.argv[2] || 30000; let maxLvl = 0, ground = false, air = false, silence = false; const bubbles = new Set();
for (let i = 0; i < N; i++) {
  const d = __dbg();
  if (d.state !== 'play') { if (d.state === 'over') { for (let k = 0; k < 50; k++) step(); } key('keydown', 'Space'); key('keyup', 'Space'); }
  if (i % 23 === 0) key('keydown', 'Space'); if (i % 23 === 9) key('keyup', 'Space');
  if (i % 37 === 0) key('keydown', 'ArrowDown'); if (i % 37 === 12) key('keyup', 'ArrowDown');
  if (i % 11 === 0) key('keydown', 'KeyN'); if (i % 41 === 0) key('keydown', 'KeyF');
  step();
  const s = __dbg(); maxLvl = Math.max(maxLvl, s.level);
  if (s.boss) { if (s.boss.air) air = true; else ground = true; }
  if (s.sil > 0) silence = true; if (s.bubble) bubbles.add(s.bubble);
}
console.log(`\nAuswertung nach ${N} Schritten: Level ${maxLvl}, Sterne ${__dbg().wallet}, Sprechblasen: ${[...bubbles].join(' | ')}`);
check(maxLvl >= 8, 'Schwierigkeit steigt (Level ≥ 8)');
check(ground, 'Bodenboss erscheint'); check(air, 'Luftboss erscheint'); check(silence, 'Boss-Bann tritt auf');
check(bubbles.size > 0, 'Sprechblasen erscheinen'); check(__dbg().wallet > wallet0, 'Sterne werden gesammelt');
if (fails.length) { console.log(`\n${fails.length} Prüfung(en) fehlgeschlagen`); process.exit(1); }
console.log('\nAlles in Ordnung ✔');
