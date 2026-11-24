(() => {
'use strict';
/* ===== 01-core-audio-input.js ===== */
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W = 960;
const H = 540, GROUND = 440;
const TOUCH = matchMedia('(hover: none) and (pointer: coarse)').matches;
document.body.classList.toggle('touch', TOUCH);
const dpr = Math.min(2, window.devicePixelRatio || 1);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const fr = x => { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

let state = 'title';
let tm = 0, scroll = 0, speed = 360, distPx = 0, bonus = 0, kills = 0, lives = 3;
let hi = 0, shake = 0, overT = 0, spawnDist = 0, spawnCount = 0;
try { hi = +localStorage.getItem('nagoony_hi') || 0; } catch (e) {}

const P = { x: 170, y: GROUND, vy: 0, ground: true, duck: 0, ducking: false, inv: 0, tilt: 0, wheel: 0, jumpBuf: 0, up: false, shield: 0 };
const MAXC = 3;
let charges = MAXC, chargeT = 0, castCd = 0, castFx = 0;
let mode = 'ground', flightT = 0, flyGrace = 0, flightPending = false, nextFlightAt = 8000, level = 1, flyBlend = 0, bannerObj = null;
let obs = [], bolts = [], parts = [], pops = [];
const stars = Array.from({ length: 90 }, (_, i) => ({ x: fr(i) * 1200, y: fr(i + 50) * 230, r: 0.8 + fr(i + 9) * 1.6, p: fr(i + 20) * 6 }));
const flies = Array.from({ length: 26 }, (_, i) => ({ x: fr(i + 100) * 1200, y: 250 + fr(i + 130) * 170, p: fr(i + 160) * 6, f: 0.3 + fr(i + 190) * 0.7 }));

/* ---------- Audio ---------- */
let AC = null, muted = false, engine = null;
function initAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = 50; f.type = 'lowpass'; f.frequency.value = 260; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(AC.destination); o.start();
    engine = { o, g };
  } catch (e) { AC = null; }
}
function tone(f1, f2, dur, type, vol, delay) {
  if (!AC || muted) return;
  try {
    const t0 = AC.currentTime + (delay || 0);
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(vol || 0.1, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
function noise(dur, vol) {
  if (!AC || muted) return;
  try {
    const n = Math.floor(AC.sampleRate * dur), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(AC.destination); s.start();
  } catch (e) {}
}
const sfx = {
  jump: () => tone(220, 520, 0.18, 'triangle', 0.14),
  cast: () => { tone(900, 300, 0.28, 'sawtooth', 0.09); tone(1400, 600, 0.2, 'sine', 0.08, 0.03); },
  kill: () => { tone(400, 900, 0.12, 'square', 0.09); noise(0.15, 0.12); },
  hit: () => { noise(0.35, 0.3); tone(200, 50, 0.4, 'sawtooth', 0.14); },
  over: () => tone(400, 100, 0.9, 'sawtooth', 0.14),
  land: () => tone(120, 60, 0.08, 'sine', 0.1),
  fire: () => { noise(0.25, 0.18); tone(300, 120, 0.35, 'sawtooth', 0.12); },
  dry: () => tone(160, 90, 0.12, 'square', 0.06)
};
/* Musik: bevorzugt über Web Audio (läuft wie die Soundeffekte), sonst Audio-Element als Ersatz */
/* Musikquelle: Datei public/assets/music.mp3 (der Einzeldatei-Build setzt window.BGM_SRC als data-URL) */
const BGM_SRC = window.BGM_SRC || 'assets/music.mp3';
let bgm = null, bgmLast = null, bgmBuf = null, bgmDecoding = false, bgmFail = false;
let bgmSrc = null, bgmGain = null, bgmOff = 0, bgmT0 = 0;
function b64buf(str) {
  const bin = atob(str.slice(str.indexOf(',') + 1)), u = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
  return u.buffer;
}
function loadBgm() {
  if (!AC || bgmBuf || bgmDecoding || bgmFail) return;
  bgmDecoding = true;
  const fail = () => { if (!bgmBuf) { bgmDecoding = false; bgmFail = true; bgmLast = null; setMusic(); } };
  const decode = ab => {
    try {
      const pr = AC.decodeAudioData(ab, buf => { bgmBuf = buf; bgmDecoding = false; setMusic(); }, fail);
      if (pr && pr.catch) pr.catch(fail);
    } catch (e) { fail(); }
  };
  if (BGM_SRC.startsWith('data:')) decode(b64buf(BGM_SRC));
  else fetch(BGM_SRC).then(r => { if (!r.ok) throw new Error('bgm'); return r.arrayBuffer(); }).then(decode).catch(fail);
}
function startBgmSrc(vol) {
  try {
    if (!bgmGain) { bgmGain = AC.createGain(); bgmGain.connect(AC.destination); }
    bgmGain.gain.cancelScheduledValues(AC.currentTime); bgmGain.gain.value = vol;
    const src = AC.createBufferSource(); src.buffer = bgmBuf; src.loop = true; src.connect(bgmGain);
    const off = bgmOff % bgmBuf.duration;
    src.start(0, off); bgmT0 = AC.currentTime - off; bgmSrc = src;
  } catch (e) { bgmSrc = null; }
}
function stopBgmSrc() {
  try { bgmOff = (AC.currentTime - bgmT0) % bgmBuf.duration; bgmSrc.stop(); } catch (e) {}
  bgmSrc = null;
}
function setMusic() {
  const want = !muted && (state === 'play' || state === 'over');
  const vol = state === 'over' ? 0.12 : 0.4;
  if (AC && !bgmFail) {
    loadBgm();
    if (!bgmBuf) return;
    if (bgmGain) { try { bgmGain.gain.setTargetAtTime(vol, AC.currentTime, 0.05); } catch (e) {} }
    if (want && !bgmSrc) startBgmSrc(vol); else if (!want && bgmSrc) stopBgmSrc();
    return;
  }
  if (!bgm) { bgm = new Audio(BGM_SRC); bgm.loop = true; bgm.preload = 'auto'; }
  if (bgm.volume !== vol) bgm.volume = vol;
  if (want !== bgmLast) {
    bgmLast = want;
    if (want) { const pr = bgm.play(); if (pr && pr.catch) pr.catch(() => { bgmLast = null; }); }
    else bgm.pause();
  }
}
function restartMusic() {
  bgmOff = 0;
  if (bgmSrc) { stopBgmSrc(); bgmOff = 0; }
  if (bgm) { try { bgm.currentTime = 0; } catch (e) {} }
}
function setEngine() {
  setMusic();
  if (!engine || !AC) return;
  try {
    const on = state === 'play' && !muted;
    engine.g.gain.setTargetAtTime(on ? 0.05 : 0, AC.currentTime, 0.1);
    engine.o.frequency.setTargetAtTime(45 + speed * 0.12, AC.currentTime, 0.1);
  } catch (e) {}
}

/* ---------- Eingabe ---------- */
function canStart() { return (state === 'title' && menu === 'main') || (state === 'over' && overT > 0.7); }
function goFull() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      const pr = el.requestFullscreen({ navigationUI: 'hide' });
      if (pr && pr.then) pr.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
    }
  } catch (e) {}
}
function startGame() {
  initAudio();
  if (TOUCH) goFull();
  restartMusic();
  state = 'play'; speed = 360; distPx = 0; bonus = 0; kills = 0; lives = 3; shake = 0;
  obs = []; bolts = []; parts = []; pops = [];
  charges = MAXC; chargeT = 0; castCd = 0; castFx = 0;
  mode = 'ground'; flightT = 0; flyGrace = 0; flightPending = false; nextFlightAt = 8000; level = 1; flyBlend = 0; bannerObj = null;
  resetExtras();
  Object.assign(P, { y: GROUND, vy: 0, ground: true, duck: 0, ducking: false, inv: 0, tilt: 0, jumpBuf: 0, up: false });
  spawnDist = 700; spawnCount = 0;
  setEngine();
}
function pressJump() { initAudio(); if (canStart()) startGame(); else if (state === 'play') P.jumpBuf = 0.13; }
function releaseJump() { if (mode === 'ground' && !P.ground && P.vy < -380) P.vy *= 0.5; }
function pressCast() { initAudio(); if (canStart()) startGame(); else if (state === 'play') cast(); }
function pressFire() { initAudio(); if (canStart()) startGame(); else if (state === 'play') cast(true); }
function setDuck(v) { P.ducking = v; }
function togglePause() {
  if (state === 'play') state = 'paused'; else if (state === 'paused') state = 'play';
  setEngine();
}
const JUMPK = ['Space', 'ArrowUp', 'KeyW'], DUCKK = ['ArrowDown', 'KeyS'], CASTK = ['KeyN', 'KeyX', 'ArrowRight', 'KeyD'], FIREK = ['KeyF', 'KeyC'];
addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowRight', 'ArrowLeft'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (state === 'title' && menu !== 'main') { if (e.code === 'Escape' || e.code === 'Backspace') uiAction('back'); return; }
  if (state === 'title' && e.code === 'KeyG') { uiAction('garage'); return; }
  if ((state === 'over' || state === 'paused') && e.code === 'Escape' && state === 'over') { uiAction('menu'); return; }
  if (JUMPK.includes(e.code)) { pressJump(); P.up = true; }
  else if (DUCKK.includes(e.code)) setDuck(true);
  else if (CASTK.includes(e.code)) pressCast();
  else if (FIREK.includes(e.code)) pressFire();
  else if (e.code === 'Enter') { if (state === 'paused') togglePause(); else pressJump(); }
  else if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  else if (e.code === 'KeyM') { muted = !muted; setEngine(); }
});
addEventListener('keyup', e => {
  if (JUMPK.includes(e.code)) { P.up = false; releaseJump(); }
  else if (DUCKK.includes(e.code)) setDuck(false);
});
function bindBtn(id, down, up) {
  const b = document.getElementById(id); if (!b) return;
  let held = false;
  b.addEventListener('pointerdown', e => { e.preventDefault(); held = true; b.classList.add('on'); down(); });
  const end = () => { if (!held) return; held = false; b.classList.remove('on'); if (up) up(); };
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => b.addEventListener(n, end));
}
bindBtn('bJump', () => { pressJump(); P.up = true; }, () => { P.up = false; releaseJump(); });
bindBtn('bDuck', () => { initAudio(); setDuck(true); }, () => setDuck(false));
bindBtn('bCast', pressCast, null);
bindBtn('bFire', pressFire, null);
cv.addEventListener('pointerdown', e => onCanvasPointer(e));
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });
addEventListener('blur', () => { if (state === 'play') togglePause(); });

/* ---------- Layout, Pause-Knopf, Querformat ---------- */
const pauseBtn = document.getElementById('pauseBtn');
pauseBtn.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation(); initAudio();
  if (state === 'play' || state === 'paused') togglePause();
});
let pbShown = null, pbIcon = null;
const PB_SVG = {
  pause: '<svg viewBox="0 0 48 48" fill="currentColor"><rect x="10" y="7" width="10" height="34" rx="3.5"/><rect x="28" y="7" width="10" height="34" rx="3.5"/></svg>',
  play: '<svg viewBox="0 0 48 48" fill="currentColor" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><path d="M14 8 L40 24 L14 40 Z"/></svg>'
};
function syncPause() {
  const show = state === 'play' || state === 'paused', icon = state === 'paused' ? 'play' : 'pause';
  if (show !== pbShown) { pbShown = show; pauseBtn.style.display = show ? 'flex' : 'none'; document.body.classList.toggle('nogame', !show); }
  if (icon !== pbIcon) { pbIcon = icon; pauseBtn.innerHTML = PB_SVG[icon]; }
}
function layout() {
  const vw = innerWidth, vh = innerHeight;
  const portrait = TOUCH && vh > vw;
  document.body.classList.toggle('portrait', portrait);
  const aw = TOUCH ? vw : vw - 16, ah = TOUCH ? vh : vh - 96;
  const nw = TOUCH ? Math.round(clamp(H * aw / Math.max(1, ah), 960, 1200)) : 960;
  W = nw;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const sc = Math.max(0.1, Math.min(aw / W, ah / H));
  cv.style.width = Math.floor(W * sc) + 'px'; cv.style.height = Math.floor(H * sc) + 'px';
  if (TOUCH) {
    const r = document.getElementById('ctrlL').getBoundingClientRect(), cr = cv.getBoundingClientRect();
    P.x = clamp(Math.round((r.right - cr.left) / sc + 95), 300, W * 0.45);
  } else P.x = 170;
  if (portrait && state === 'play') togglePause();
}
addEventListener('resize', layout);
addEventListener('orientationchange', () => { layout(); setTimeout(layout, 300); });
document.addEventListener('contextmenu', e => e.preventDefault());
layout();

['touchend', 'pointerup', 'click', 'keydown'].forEach(n => addEventListener(n, () => {
  if (AC && AC.state !== 'running') { try { AC.resume(); } catch (e) {} }
  bgmLast = null; setMusic();
}, { passive: true }));

/* ===== 02-spawning-combat.js ===== */

/* ---------- Spiellogik ---------- */
const TYPES = {
  log:      { w: 84,  h: 46,  enemy: false },
  rock:     { w: 66,  h: 74,  enemy: false },
  branch:   { w: 150, h: GROUND - 82, enemy: false },
  bat:      { w: 58,  h: 38,  enemy: true, hp: 1, pts: 40,  vx: 70 },
  goblin:   { w: 54,  h: 92,  enemy: true, hp: 1, pts: 50,  vx: 130 },
  ghost:    { w: 58,  h: 66,  enemy: true, hp: 1, pts: 60,  vx: 40 },
  troll:    { w: 100, h: 172, enemy: true, hp: 2, pts: 120, vx: 30 },
  pillarUp: { w: 84,  h: 200, enemy: false },
  pillarDn: { w: 84,  h: 200, enemy: false },
  storm:    { w: 124, h: 76,  enemy: false },
  star:     { w: 30,  h: 30,  enemy: false, item: true },
  heart:    { w: 36,  h: 36,  enemy: false, item: true },
  potion:   { w: 36,  h: 36,  enemy: false, item: true },
  shield:   { w: 36,  h: 36,  enemy: false, item: true },
  orb:      { w: 38,  h: 38,  enemy: true, hp: 1, pts: 10, vx: 160 }
};
const score = () => Math.floor(distPx / 40) + bonus;
const dif = () => clamp((level - 1) / 8, 0, 1);

function addP(p) { p.max = p.life; parts.push(p); }
function burst(x, y, n, cols) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = rand(60, 380);
    addP({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.3, 0.7), size: rand(2, 6), color: cols[i % cols.length], glow: true, g: 300 });
  }
}
function dust(n) {
  for (let i = 0; i < n; i++) addP({ x: P.x - 30 + rand(-10, 10), y: GROUND - 2, vx: rand(-speed * 0.5, -speed * 0.1), vy: rand(-120, -20), life: rand(0.25, 0.5), size: rand(3, 7), color: '#7b6a8c', g: 200 });
}
function pop(text, x, y, color, size) { pops.push({ text, x, y, color, size: size || 24, life: 1, vy: -50 }); }
function banner(big, sub, dur) { bannerObj = { big, sub: sub || '', t: dur || 2.4, max: dur || 2.4 }; }

/* opt: y (Oberkante), h, low, fly */
function spawn(type, dx, opt) {
  opt = opt || {};
  const T = TYPES[type], h = opt.h || T.h;
  const o = { type, w: T.w, h, hp: T.hp || 1, x: opt.x !== undefined ? opt.x : W + 80 + (P.x - 170) + (dx || 0), skin: opt.skin || 0, y: opt.y !== undefined ? opt.y : GROUND - h, flash: 0, ph: Math.random() * 6, dead: false, base: 0, fly: !!opt.fly, vxm: 1 + 0.5 * dif() };
  if (type === 'branch' || type === 'pillarDn') o.y = 0;
  if (type === 'bat' && opt.y === undefined) o.y = GROUND - (opt.low ? 40 : 88) - h;
  if (type === 'ghost' && opt.y === undefined) o.y = GROUND - 151;
  if (type === 'troll') o.hp = level >= 5 ? 3 : 2;
  if (type === 'bat' || type === 'ghost' || type === 'storm') o.base = o.y;
  obs.push(o);
}
function pickType() {
  const d = dif(), adv = spawnCount > 3 || level > 1;
  const pool = [['log', 3], ['branch', 2.4], ['goblin', 2]];
  if (adv) pool.push(['rock', 1 + 2 * d], ['bat', 2]);
  if (spawnCount > 6 || level > 1) pool.push(['ghost', 1.4 + d]);
  if (spawnCount > 9 || level > 1) pool.push(['troll', 0.8 + 2.2 * d]);
  let r = Math.random() * pool.reduce((s, p) => s + p[1], 0);
  for (const [n, w] of pool) { if ((r -= w) <= 0) return n; }
  return 'log';
}
function doSpawn() {
  const d = dif(), t = pickType();
  spawn(t, 0, t === 'bat' && level >= 3 && Math.random() < 0.5 ? { low: true } : {}); spawnCount++;
  let extra = 0;
  const ground = t === 'log' || t === 'rock' || t === 'goblin';
  if (ground && (spawnCount > 6 || level > 1) && Math.random() < 0.2 + 0.4 * d) {
    const dx = speed * 1.05 + 170;
    spawn(Math.random() < 0.5 ? 'branch' : 'bat', dx); spawnCount++; extra = dx;
    if (level >= 4 && Math.random() < 0.5 * d + 0.15) {
      const dx2 = dx + speed * 1.05 + 170;
      spawn(Math.random() < 0.5 ? 'log' : 'goblin', dx2); extra = dx2;
    }
  }
  spawnDist = speed * rand(1.0, 1.7) * (1 - 0.3 * d) + 150 + extra;
}
function doSpawnFly() {
  const d = dif(), r = Math.random();
  if (r < 0.26) {
    const h1 = rand(30, 150), g = rand(225, 270) - d * 15, top = h1 + g;
    spawn('pillarDn', 0, { h: h1, fly: true });
    spawn('pillarUp', 0, { y: top, h: GROUND + 10 - top, fly: true });
  } else if (r < 0.44) {
    spawn('storm', 0, { y: rand(110, 340), fly: true });
  } else if (r < 0.62) {
    const n = 1 + (d > 0.3 && Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) spawn('bat', i * 150, { y: rand(150, 350), fly: true });
  } else if (r < 0.74) {
    spawn('ghost', 0, { y: rand(150, 330), fly: true });
  } else {
    const cy = rand(190, 370), n = 5;
    for (let i = 0; i < n; i++) spawn('star', i * 62, { y: cy - 22 + Math.sin(i / (n - 1) * Math.PI) * -50, fly: true });
  }
  spawnDist = speed * rand(0.9, 1.4) * (1 - 0.25 * d) + 150;
}
function startFlight() {
  mode = 'fly'; flightPending = false; flightNo++;
  flightT = 14 + Math.min(6, level); flyGrace = 1.6;
  P.ground = false; P.vy = -520; P.duck = 0; spawnDist = 0;
  tone(300, 900, 0.5, 'sine', 0.12); tone(450, 1350, 0.5, 'triangle', 0.08, 0.1);
  burst(P.x - 20, P.y - 20, 18, ['#7ff', '#c6f', '#fff']);
  banner('ABHEBEN!', 'Sammle Sterne und weiche aus!', 2.2);
}

function cast(fire) {
  if (state !== 'play' || castCd > 0) return;
  if (silenceT > 0) { castCd = 0.3; sfx.dry(); pop('Zauber gebannt!', P.x + 20, P.y - 150, '#ff7aff', 20); return; }
  const cost = fire ? 2 : 1;
  if (charges < cost) { castCd = 0.25; sfx.dry(); pop(charges > 0 ? 'Feuer braucht 2 Mana' : 'Mana leer!', P.x + 20, P.y - 150, '#9aa', 18); return; }
  charges -= cost; castCd = fire ? 0.45 : 0.22; castFx = 0.3;
  const hy = P.y - (P.duck > 0.5 ? 62 : 86);
  bolts.push({ x: P.x + 56, y: hy, life: 1.6, c: fire ? '#ffa43a' : '#7ff', fire: !!fire, dmg: fire ? 3 : 1, rx: fire ? 22 : 14, ry: fire ? 28 : 18, v: fire ? 900 : 1100 });
  pop(fire ? 'FLAMOONY!' : 'NAGOONY!', P.x + 30, P.y - 165, fire ? '#ffb060' : '#d9a6ff', 32);
  if (fire) sfx.fire(); else sfx.cast();
  burst(P.x + 56, hy, fire ? 16 : 10, fire ? ['#ffa43a', '#ff5a2a', '#ffe08a'] : ['#c6f', '#6ff']);
}
function hitEnemy(o, dmg) {
  o.hp -= dmg || 1; o.flash = 0.15;
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  burst(cx, cy, 8, ['#9ff', '#fff']);
  sfx.kill();
  if (o.hp <= 0) {
    o.dead = true; kills++;
    const pts = TYPES[o.type].pts; bonus += pts;
    burst(cx, cy, 28, ['#c6f', '#6ff', '#fff', '#fd6']);
    pop('+' + pts, cx, o.y - 10, '#ffe27a', 26);
    sayKill(o);
  }
}
function collect(o) {
  o.dead = true;
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  if (o.type === 'heart') {
    lives = Math.min(5, lives + 1);
    burst(cx, cy, 14, ['#ff4a6a', '#fff']); tone(500, 1200, 0.25, 'triangle', 0.12); pop('+1 Leben', cx, o.y - 6, '#ff8aa0', 24);
  } else if (o.type === 'potion') {
    charges = MAXC; chargeT = 0;
    burst(cx, cy, 14, ['#5ff0ff', '#fff']); tone(600, 1400, 0.25, 'sine', 0.12); pop('Mana voll!', cx, o.y - 6, '#7ff', 24);
  } else if (o.type === 'shield') {
    P.shield = 10;
    burst(cx, cy, 14, ['#7cf', '#fff']); tone(400, 900, 0.3, 'triangle', 0.12); pop('Schild!', cx, o.y - 6, '#9df', 24);
  } else {
    bonus += 25; addStars(1);
    burst(cx, cy, 10, ['#ffd84a', '#fff']); tone(900, 1700, 0.1, 'sine', 0.09); pop('+25', cx, o.y - 6, '#ffd84a', 18);
  }
}
function hurt(o) {
  o.dead = true;
  if (P.shield > 0) {
    P.shield = 0; P.inv = 1; shake = 0.15;
    burst(P.x, P.y - 55, 22, ['#7ff', '#fff', '#9af']); tone(600, 200, 0.25, 'triangle', 0.12);
    pop('Geblockt!', P.x, P.y - 140, '#9df', 24);
    return;
  }
  lives--; P.inv = 1.6; shake = 0.35; sfx.hit();
  burst(P.x, P.y - 50, 24, ['#f84', '#fc4', '#fff']);
  pop('Autsch!', P.x, P.y - 140, '#ff7a7a', 26);
  if (lives <= 0) gameOver();
}
function gameOver() {
  state = 'over'; overT = 0; bubble = null; sfx.over(); setEngine();
  newRec = score() > hi;
  if (newRec) { hi = score(); try { localStorage.setItem('nagoony_hi', String(hi)); } catch (e) {} }
}
function playerRect() {
  const h = mode !== 'ground' ? 92 : (P.ground && P.duck > 0.5 ? 62 : 105);
  return { x: P.x - 31, y: P.y - h, w: 62, h };
}

/* ===== 03-bosses-powerups.js ===== */

/* ---------- Landschaften, Power-ups, Bosse ---------- */
const BIOME_NAMES = ['Wald', 'Sumpf', 'Schneewald', 'Friedhof'];
const BOSS_NAMES = ['Wurzelkönig', 'Sumpfdrache', 'Eisriese', 'Geisterkönig', 'Nachteulen-König', 'Feuerphönix'];
const BOSS_H = [260, 210, 230, 250, 220, 230];
const AIR_SKIN = [4, 1, 5, 3], ORB_SKIN = [0, 1, 2, 3, 3, 0];
const biomeOf = l => Math.max(0, Math.floor((l - 1) / 2)) % 4;
const PAL = [
  { sky0: '#0d0626', sky1: '#2b1255', sky2: '#7a2f78', moon: '#fff4d6', hill: '#241346', far: '#2d1857', mid: '#1c0f3d', near: '#0f0722', mist: '#be64b4', g0: '#3a2a4e', g1: '#150b26', grass: '#2f6b4a', tuft: '#3f8a5c', fly: '#d8ff7a', can0: '#2a1a52', can1: '#0d0620', can2: '#33205f', snow: 0, grave: 0 },
  { sky0: '#04140f', sky1: '#0f3a2c', sky2: '#3f7a50', moon: '#e8ffb0', hill: '#0b2a20', far: '#12402f', mid: '#0c2c22', near: '#061a14', mist: '#7ee0a0', g0: '#2a3a2a', g1: '#0c1810', grass: '#4c8a3a', tuft: '#79b84a', fly: '#b8ff6a', can0: '#12402f', can1: '#04140f', can2: '#185040', snow: 0, grave: 0 },
  { sky0: '#0a1838', sky1: '#2a4a8a', sky2: '#9ac4e8', moon: '#ffffff', hill: '#3a5a90', far: '#4a6aa0', mid: '#2e4a80', near: '#1a2e5c', mist: '#dff0ff', g0: '#dce8f5', g1: '#8aa6c8', grass: '#ffffff', tuft: '#eaf4ff', fly: '#ffffff', can0: '#2e4a80', can1: '#1a2e5c', can2: '#3a5a90', snow: 1, grave: 0 },
  { sky0: '#140409', sky1: '#4a0f24', sky2: '#a8402e', moon: '#ff9a6a', hill: '#2a0a16', far: '#3a1022', mid: '#2a0c1a', near: '#16060e', mist: '#e07a5a', g0: '#3a2a30', g1: '#140a10', grass: '#5a3a40', tuft: '#7a4a50', fly: '#ffb060', can0: '#3a1022', can1: '#140409', can2: '#4a1a2c', snow: 0, grave: 1 }
];
const hx = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
const PALN = PAL.map(p => { const o = {}; for (const k in p) o[k] = typeof p[k] === 'string' ? hx(p[k]) : p[k]; return o; });
let pal = JSON.parse(JSON.stringify(PALN[0])), palTarget = 0;
function updatePal(dt) {
  const t = PALN[palTarget], k = Math.min(1, dt * 0.8);
  for (const key in t) {
    if (typeof t[key] === 'number') pal[key] += (t[key] - pal[key]) * k;
    else for (let i = 0; i < 3; i++) pal[key][i] += (t[key][i] - pal[key][i]) * k;
  }
}
const pc = key => 'rgb(' + pal[key].map(v => Math.round(v)).join(',') + ')';
const pa = (key, a) => 'rgba(' + pal[key].map(v => Math.round(v)).join(',') + ',' + a + ')';

let boss = null, bossPending = false, nextBossAt = Infinity, bossNo = 0, itemDist = 3000;
let silenceT = 0, flightNo = 0, airDone = false, starDist = 3500;
const clearAhead = () => obs.every(o => o.dead || o.x + o.w < P.x - 40);
function resetExtras() {
  boss = null; bossPending = false; nextBossAt = Infinity; bossNo = 0; itemDist = rand(6000, 9000);
  silenceT = 0; flightNo = 0; airDone = false; starDist = rand(3000, 4500); runStars = 0; bubble = null;
  pal = JSON.parse(JSON.stringify(PALN[0])); palTarget = 0; P.shield = 0;
}

function spawnItem() {
  const w = [['heart', lives < 3 ? 3 : lives < 5 ? 0.8 : 0], ['potion', charges < 2 ? 2.5 : 0.6], ['shield', P.shield > 0 ? 0 : 1.5]];
  let r = Math.random() * w.reduce((s, p) => s + p[1], 0), t = 'potion';
  for (const [n, k] of w) { if ((r -= k) <= 0) { t = n; break; } }
  spawn(t, 0, { y: mode === 'fly' ? rand(210, 380) : GROUND - 125, fly: mode === 'fly' });
}

function startBoss(air) {
  bossPending = false;
  const skin = air ? AIR_SKIN[biomeOf(level)] : biomeOf(level), h = BOSS_H[skin], hp = 16 + 4 * bossNo + (air ? 2 : 0);
  boss = { skin, air: !!air, hp, max: hp, x: W + 120, tx: W - (air ? 258 : 235), w: 170, h, y: air ? 200 : GROUND - h, cy: 272, flash: 0, cd: 2, q: [], dying: 0, warn: false, ph: 0, half: false, phase: 1, silCd: rand(5, 8), curse: 0 };
  banner((air ? 'LUFT-BOSS: ' : 'BOSS: ') + BOSS_NAMES[skin], air ? 'Schieße ihn aus der Luft!' : 'Besiege ihn mit Nagoony!', 2.8);
  tone(120, 60, 0.9, 'sawtooth', 0.15);
}
function hitsBoss(b) {
  return boss.dying <= 0 && boss.x < W && b.x + b.rx > boss.x + 20 && b.x - b.rx < boss.x + boss.w && b.y + b.ry > boss.y && b.y - b.ry < boss.y + boss.h;
}
function hitBoss(dmg) {
  boss.hp -= dmg || 1; boss.flash = 0.12; sfx.kill();
  burst(boss.x + 40, boss.y + boss.h * 0.5, 10, ['#fff', '#c6f', '#6ff']);
  if (!boss.half && boss.hp <= boss.max / 2) { boss.half = true; spawn('potion', 0, { y: boss.air ? rand(230, 340) : GROUND - 125, fly: !!boss.air }); }
  if (boss.hp > 0) {
    const ph = boss.hp > boss.max * 2 / 3 ? 1 : boss.hp > boss.max / 3 ? 2 : 3;
    if (ph > boss.phase) phaseUp(ph);
  }
  if (boss.hp <= 0) {
    boss.dying = 1.4; boss.curse = 0;
    for (const o of obs) if (o.type === 'orb') { o.dead = true; burst(o.x + 19, o.y + 19, 8, ['#fff', '#fd6']); }
  }
}
function phaseUp(ph) {
  boss.phase = ph; boss.q = []; boss.cd = 1.6; boss.warn = false; boss.curse = 0;
  if (ph === 2) boss.silCd = rand(3.5, 5.5);
  shake = 0.5; tone(90, 50, 0.7, 'sawtooth', 0.16);
  burst(boss.x + 85, boss.y + boss.h / 2, 30, ['#ff6a3a', '#ffd84a', '#fff']);
  banner('PHASE ' + ph, ph === 2 ? 'Der Boss greift schneller an!' : 'Der Boss rastet aus!', 1.8);
}
function bossDown() {
  const air = boss.air;
  bonus += 400 + 150 * bossNo; kills++; bossNo++;
  lives = Math.min(5, lives + 1);
  const reward = 6 + 2 * bossNo; addStars(reward);
  burst(boss.x + 85, boss.y + boss.h / 2, 50, ['#fd6', '#f84', '#fff', '#c6f', '#6ff']);
  banner('BOSS BESIEGT!', '+1 Leben, Bonuspunkte und ' + reward + ' Sterne', 2.8);
  tone(500, 1500, 0.6, 'triangle', 0.14); tone(700, 2000, 0.6, 'sine', 0.1, 0.1);
  say(BOSS_LINES, true, 3.2);
  silenceT = 0; boss = null; nextBossAt = Infinity; spawnDist = 900;
  if (air) { mode = 'land'; airDone = true; nextFlightAt = Infinity; } else nextFlightAt = distPx + 9000;
}
function groundPattern(b) {
  const ph = b.phase;
  const pats = ph === 1 ? [['low'], ['high'], ['low', 'high'], ['high', 'low']]
    : ph === 2 ? [['low', 'high'], ['high', 'low'], ['low', 'high', 'low'], ['high', 'low', 'high']]
    : [['low', 'high', 'low'], ['high', 'low', 'high'], ['low', 'high', 'low', 'high'], ['low', 'low', 'high']];
  if (bossNo >= 1 && ph === 1) pats.push(['low', 'high', 'low'], ['high', 'low', 'high']);
  const pat = pats[Math.floor(Math.random() * pats.length)], step = [0.62, 0.55, 0.5][ph - 1];
  pat.forEach((h, i) => b.q.push({ t: 0.4 + i * step, h }));
  b.cd = Math.max(0.7, (2 - 0.12 * bossNo) * [1, 0.8, 0.65][ph - 1]) + pat.length * step;
}
function airPattern(b) {
  const ph = b.phase, step = [0.7, 0.6, 0.5][ph - 1], q = b.q;
  const kinds = ph === 1 ? ['aim', 'aim2', 'sweep'] : ph === 2 ? ['aim2', 'sweep', 'wall', 'tri'] : ['wall', 'tri', 'aim3', 'sweep', 'wall'];
  const k = kinds[Math.floor(Math.random() * kinds.length)];
  let len = 1;
  if (k === 'aim' || k === 'aim2' || k === 'aim3') { len = k === 'aim' ? 1 : k === 'aim2' ? 2 : 3; for (let i = 0; i < len; i++) q.push({ t: 0.5 + i * step, aim: true }); }
  else if (k === 'sweep') { const ys = [170, 250, 330, 410]; if (Math.random() < 0.5) ys.reverse(); len = 4; ys.forEach((y, i) => q.push({ t: 0.5 + i * 0.3, y })); }
  else if (k === 'wall') { const gc = rand(210, 390); for (const c of [150, 215, 280, 345, 410]) if (Math.abs(c - gc) >= 66) q.push({ t: 0.7, y: c }); len = 1; }
  else { q.push({ t: 0.6, aim: true, off: -125 }, { t: 0.6, aim: true }, { t: 0.6, aim: true, off: 125 }); len = 1; }
  b.cd = Math.max(0.9, (2.3 - 0.1 * bossNo) * [1, 0.85, 0.7][ph - 1]) + len * step;
}
function fireBoss(b, it) {
  if (b.air) {
    const y = it.aim ? clamp(P.y - 46 + (it.off || 0), 130, 430) : it.y;
    spawn('orb', 0, { x: b.x - 20, y: y - 19, skin: ORB_SKIN[b.skin], fly: true });
    burst(b.x, y, 6, ['#fff', '#fd6']);
  } else {
    spawn('orb', 0, { x: b.x - 20, y: it.h === 'low' ? GROUND - 40 : GROUND - 128, skin: ORB_SKIN[b.skin] });
    burst(b.x, GROUND - (it.h === 'low' ? 40 : 110), 6, ['#fff', '#fd6']);
  }
  obs[obs.length - 1].vxm *= 1 + 0.2 * (b.phase - 1);
}
function applySilence(b) {
  b.silCd = b.phase === 3 ? rand(8, 11) : rand(11, 15);
  if (P.shield > 0) {
    P.shield = 0; P.inv = Math.max(P.inv, 0.5);
    burst(P.x, P.y - 55, 22, ['#7ff', '#fff', '#ff7aff']); tone(600, 200, 0.25, 'triangle', 0.12);
    pop('Schild bricht den Bann!', P.x, P.y - 150, '#9df', 22);
    return;
  }
  silenceT = b.phase === 3 ? 4.5 : 3.5;
  burst(P.x, P.y - 55, 26, ['#ff7aff', '#c6f', '#fff']); shake = Math.max(shake, 0.2); tone(300, 80, 0.5, 'sawtooth', 0.12);
  banner('ZAUBER GEBANNT!', 'Weiche den Angriffen aus!', 2);
}
function updateBoss(dt) {
  const b = boss; b.ph += dt; b.flash = Math.max(0, b.flash - dt);
  if (b.air) { b.cy = 272 + Math.sin(b.ph * (0.8 + 0.22 * (b.phase - 1))) * 86; b.y = b.cy - b.h / 2; }
  if (b.dying > 0) {
    b.dying -= dt; shake = Math.max(shake, 0.2);
    if (Math.random() < 0.5) burst(b.x + rand(0, b.w), b.y + rand(0, b.h), 6, ['#fd6', '#f84', '#fff', '#c6f']);
    if (b.dying <= 0) bossDown();
    return;
  }
  if (b.x > b.tx) { b.x = Math.max(b.tx, b.x - 260 * dt); return; }
  if (b.phase >= 2 && silenceT <= 0) {
    if (b.curse > 0) {
      b.curse -= dt;
      const sy = b.y + b.h * 0.4;
      if (Math.random() < 0.7) addP({ x: b.x + 40, y: sy + rand(-30, 30), vx: -rand(500, 800), vy: (P.y - 50 - sy) * 1.8 + rand(-40, 40), life: 0.5, size: rand(3, 6), color: '#ff6aff', glow: true });
      if (b.curse <= 0) applySilence(b);
    } else {
      b.silCd -= dt;
      if (b.silCd <= 0 && b.q.length === 0) { b.curse = 1.1; pop('BANN!', b.x + 60, Math.max(60, b.y - 8), '#ff7aff', 32); tone(200, 80, 0.8, 'sawtooth', 0.12); }
    }
  }
  b.cd -= dt;
  if (b.cd <= 0 && b.q.length === 0 && b.curse <= 0) (b.air ? airPattern : groundPattern)(b);
  b.warn = false;
  for (const it of b.q) {
    it.t -= dt;
    if (it.t < 0.3) b.warn = true;
    if (it.t <= 0) { it.done = true; fireBoss(b, it); }
  }
  b.q = b.q.filter(it => !it.done);
}
function spawnStarArc() {
  for (let i = 0; i < 3; i++) spawn('star', i * 70, { y: GROUND - [115, 150, 115][i] });
}
function updateExtras(dt) {
  P.shield = Math.max(0, P.shield - dt);
  palTarget = biomeOf(level); updatePal(dt);
  if (mode !== 'land') { itemDist -= speed * dt; if (itemDist <= 0) { spawnItem(); itemDist = rand(10000, 16000); } }
  if (silenceT > 0) { silenceT -= dt; if (silenceT <= 0) { silenceT = 0; pop('Zauber frei!', P.x + 20, P.y - 150, '#9fffb0', 22); tone(500, 1000, 0.2, 'triangle', 0.1); } }
  if (mode === 'ground' && !boss && !flightPending && !bossPending) { starDist -= speed * dt; if (starDist <= 0) { spawnStarArc(); starDist = rand(3500, 6000); } }
  if (boss) updateBoss(dt);
}

/* ===== 04-movement-update.js ===== */

/* ---------- Update ---------- */
function groundMove(dt) {
  P.duck = lerp(P.duck, P.ducking && P.ground ? 1 : 0, Math.min(1, dt * 18));
  if (P.jumpBuf > 0 && P.ground) { P.vy = -860; P.ground = false; P.jumpBuf = 0; sfx.jump(); dust(8); }
  if (!P.ground) {
    P.vy += (P.ducking ? 4200 : 2400) * dt;
    P.y += P.vy * dt;
    if (P.y >= GROUND) { P.y = GROUND; P.vy = 0; P.ground = true; sfx.land(); dust(6); }
  }
  P.tilt = lerp(P.tilt, P.ground ? 0 : clamp(P.vy / 1800, -0.3, 0.3), Math.min(1, dt * 10));
  if (!flightPending && !bossPending && !boss && distPx >= nextFlightAt) {
    flightPending = true;
    banner('FLUGPHASE!', 'Gleich hebst du ab: ↑ steigen, ↓ sinken', 2.4);
  }
  if (!flightPending && !bossPending && !boss && distPx >= nextBossAt) {
    bossPending = true;
    banner('ACHTUNG!', 'Ein Boss nähert sich …', 2.2);
  }
  if (flightPending || bossPending) {
    if (P.ground && clearAhead()) { if (flightPending) startFlight(); else startBoss(); }
  } else if (!boss) {
    spawnDist -= speed * dt;
    if (spawnDist <= 0) doSpawn();
  }
}
function flyMove(dt) {
  flightT -= dt; flyGrace -= dt;
  P.duck = lerp(P.duck, 0, Math.min(1, dt * 12));
  const up = P.up && !P.ducking, dn = P.ducking && !P.up;
  const tv = (up ? -440 : dn ? 440 : 0) + Math.sin(tm * 3) * 22;
  P.vy = lerp(P.vy, tv, Math.min(1, dt * 6));
  P.y += P.vy * dt;
  if (P.y < 190) { P.y = 190; P.vy = Math.max(0, P.vy); }
  if (P.y > 425) { P.y = 425; P.vy = Math.min(0, P.vy); }
  P.tilt = lerp(P.tilt, clamp(P.vy / 1500, -0.3, 0.3), Math.min(1, dt * 8));
  if (flyGrace <= 0 && flightT > 2.4 && !boss) {
    spawnDist -= speed * dt;
    if (spawnDist <= 0) doSpawnFly();
  }
  if (Math.random() < 0.8) addP({ x: P.x - 62, y: P.y - 28, vx: rand(-260, -160), vy: rand(-25, 25), life: 0.35, size: rand(3, 7), color: Math.random() < 0.5 ? '#ffb84a' : '#7ff', glow: true });
  if (flightT <= 0 && !boss) {
    if (flightNo % 2 === 0) startBoss(true);
    else { mode = 'land'; banner('Landeanflug', '', 1.5); }
  }
}
function landMove(dt) {
  P.duck = lerp(P.duck, 0, Math.min(1, dt * 12));
  const tv = clamp((GROUND - P.y) * 3, 70, 520);
  P.vy = lerp(P.vy, tv, Math.min(1, dt * 5));
  P.y += P.vy * dt;
  P.tilt = lerp(P.tilt, 0.12, Math.min(1, dt * 6));
  if (P.y >= GROUND) {
    P.y = GROUND; P.vy = 0; P.ground = true; mode = 'ground'; flightPending = false;
    if (airDone) { airDone = false; nextFlightAt = distPx + 9000; nextBossAt = Infinity; }
    else { nextFlightAt = Infinity; nextBossAt = distPx + 5000; }
    spawnDist = 1000; P.jumpBuf = 0;
    obs = obs.filter(o => !o.fly);
    sfx.land(); dust(12);
    banner('Gelandet!', 'Weiter geht’s durch den Wald', 1.8);
  }
}
function update(dt) {
  distPx += speed * dt;
  const tgtSp = Math.min(820, 360 + distPx / 80);
  speed = lerp(speed, mode === 'fly' ? Math.min(tgtSp, 620) : mode === 'land' ? Math.min(tgtSp, 700) : tgtSp, Math.min(1, dt * 2));
  scroll += speed * dt;
  const nl = 1 + Math.floor(distPx / 8000);
  if (nl > level) {
    level = nl;
    if (mode === 'ground' && !flightPending && !bossPending && !boss) { banner('LEVEL ' + level, biomeOf(level) !== biomeOf(level - 1) ? 'Neue Landschaft: ' + BIOME_NAMES[biomeOf(level)] : 'Es wird schwieriger!', 2.2); tone(500, 1000, 0.3, 'triangle', 0.1); }
  }
  const rt = (1.1 + 0.25 * dif()) * (boss ? 0.7 : 1);
  if (charges < MAXC) { chargeT += dt; if (chargeT >= rt) { chargeT = 0; charges++; } } else chargeT = 0;
  castCd = Math.max(0, castCd - dt); castFx = Math.max(0, castFx - dt);
  P.inv = Math.max(0, P.inv - dt); P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  const fb = mode === 'fly' ? 1 : mode === 'land' ? clamp((GROUND - P.y) / 140, 0, 1) : 0;
  flyBlend = lerp(flyBlend, fb, Math.min(1, dt * 3));

  if (mode === 'ground') groundMove(dt); else if (mode === 'fly') flyMove(dt); else landMove(dt);
  P.wheel += speed * dt / 20;
  updateExtras(dt);
  if (mode === 'ground' && Math.random() < 0.6) addP({ x: P.x - 58, y: P.y - 26, vx: rand(-220, -120), vy: rand(-30, 10), life: 0.4, size: rand(3, 6), color: lookCols(LOOK).bikeA, g: -30 });

  for (const o of obs) {
    o.x -= (speed + (TYPES[o.type].vx || 0) * o.vxm) * dt;
    o.ph += dt * 5; o.flash = Math.max(0, o.flash - dt);
    if (o.type === 'bat') o.y = o.base + Math.sin(o.ph * 1.6) * 6;
    else if (o.type === 'ghost') o.y = o.base + Math.sin(o.ph * 0.9) * 18;
    else if (o.type === 'storm') o.y = o.base + Math.sin(o.ph * 0.5) * 22;
  }
  for (const b of bolts) {
    b.x += b.v * dt; b.life -= dt;
    addP({ x: b.x - 10, y: b.y + rand(-6, 6), vx: rand(-60, -10), vy: rand(-30, 30), life: 0.35, size: rand(3, 6), color: b.c, glow: true });
    for (const o of obs) {
      if (o.dead || !TYPES[o.type].enemy || o.x > W) continue;
      if (b.x + b.rx > o.x && b.x - b.rx < o.x + o.w && b.y + b.ry > o.y && b.y - b.ry < o.y + o.h) { hitEnemy(o, b.dmg); if (!(b.fire && o.dead)) { b.life = 0; break; } }
    }
    if (boss && b.life > 0 && hitsBoss(b)) { b.life = 0; hitBoss(b.dmg); }
  }
  bolts = bolts.filter(b => b.life > 0 && b.x < W + 40);

  const pr = playerRect();
  for (const o of obs) {
    if (o.dead || state !== 'play') continue;
    if (TYPES[o.type].item) {
      if (pr.x < o.x + o.w && pr.x + pr.w > o.x && pr.y - 10 < o.y + o.h && pr.y + pr.h + 10 > o.y) collect(o);
      continue;
    }
    if (P.inv > 0 || mode === 'land') continue;
    const mx = (o.type === 'pillarUp' || o.type === 'pillarDn') ? 20 : 8;
    const my = (o.type === 'branch' || o.type === 'pillarDn' || o.type === 'pillarUp') ? 0 : 8;
    if (pr.x < o.x + o.w - mx && pr.x + pr.w > o.x + mx && pr.y < o.y + o.h - my && pr.y + pr.h > o.y + my) hurt(o);
  }
  obs = obs.filter(o => !o.dead && o.x + o.w > -60);
  setEngine();
}
function updateFX(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; }
  parts = parts.filter(p => p.life > 0);
  for (const q of pops) { q.life -= dt * 0.9; q.y += q.vy * dt; }
  pops = pops.filter(q => q.life > 0);
  updateBubble(dt); if (gMsg) { gMsg.t -= dt; if (gMsg.t <= 0) gMsg = null; }
  if (bannerObj) { bannerObj.t -= dt; if (bannerObj.t <= 0) bannerObj = null; }
  shake = Math.max(0, shake - dt);
}

/* ===== 05-draw-world-enemies.js ===== */

/* ---------- Zeichnen: Welt ---------- */
function rr(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function circle(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill(); }
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, pc('sky0')); g.addColorStop(0.55, pc('sky1')); g.addColorStop(1, pc('sky2'));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  for (const s of stars) { ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(tm * 0.8 + s.p)); ctx.fillRect(s.x, s.y, s.r, s.r); }
  ctx.globalAlpha = 1;
  const mx = 740, my = 120, mg = ctx.createRadialGradient(mx, my, 20, mx, my, 150);
  mg.addColorStop(0, 'rgba(255,240,200,0.45)'); mg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = mg; ctx.fillRect(mx - 160, my - 160, 320, 320);
  circle(mx, my, 44, pc('moon')); circle(mx - 14, my - 8, 9, 'rgba(200,180,150,0.4)'); circle(mx + 16, my + 14, 6, 'rgba(200,180,150,0.4)');
  ctx.fillStyle = pc('hill'); ctx.beginPath(); ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, GROUND - 110 - Math.sin((x + scroll * 0.05) * 0.006) * 34 - Math.sin((x + scroll * 0.05) * 0.017) * 14);
  ctx.lineTo(W, GROUND); ctx.closePath(); ctx.fill();
}
function pine(x, base, h, w, col) {
  ctx.fillStyle = col; ctx.fillRect(x - w * 0.06, base - h * 0.15, w * 0.12, h * 0.15);
  for (let k = 0; k < 4; k++) {
    const yb = base - h * 0.1 - k * h * 0.2, wd = w * (1 - k * 0.2), th = h * 0.38;
    ctx.beginPath(); ctx.moveTo(x - wd / 2, yb); ctx.lineTo(x, yb - th); ctx.lineTo(x + wd / 2, yb); ctx.closePath(); ctx.fill();
  }
}
function treeLayer(f, sp, hmin, hvar, col, baseY, seed) {
  const off = scroll * f, first = Math.floor(off / sp) - 1;
  for (let i = first; i < first + Math.ceil(W / sp) + 3; i++) {
    const x = i * sp - off + fr(i + seed) * sp * 0.7, h = hmin + fr(i + seed + 40) * hvar;
    pine(x, baseY, h, h * 0.55, col);
  }
}
function drawForest() {
  treeLayer(0.12, 70, 130, 90, pc('far'), GROUND - 20, 1);
  treeLayer(0.3, 110, 190, 110, pc('mid'), GROUND - 6, 2);
  const m = ctx.createLinearGradient(0, GROUND - 120, 0, GROUND);
  m.addColorStop(0, pa('mist', 0)); m.addColorStop(1, pa('mist', 0.28));
  ctx.fillStyle = m; ctx.fillRect(0, GROUND - 120, W, 120);
  treeLayer(0.65, 240, 300, 110, pc('near'), GROUND + 10, 3);
  if (pal.grave > 0.02) drawTombs();
  for (const f of flies) {
    const x = (((f.x - scroll * 0.25 * f.f) % W) + W) % W, y = f.y + Math.sin(tm * f.f * 2 + f.p) * 14;
    const a = 0.35 + 0.65 * Math.abs(Math.sin(tm * f.f * 3 + f.p));
    ctx.globalAlpha = a * 0.25; circle(x, y, 6, pc('fly')); ctx.globalAlpha = a; circle(x, y, 1.8, '#fffff0');
  }
  ctx.globalAlpha = 1;
}
function drawGround() {
  const g = ctx.createLinearGradient(0, GROUND, 0, H);
  g.addColorStop(0, pc('g0')); g.addColorStop(1, pc('g1'));
  ctx.fillStyle = g; ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = pc('grass'); ctx.fillRect(0, GROUND - 2, W, 6);
  const f0 = Math.floor(scroll / 60) - 1;
  for (let i = f0; i < f0 + W / 60 + 3; i++) {
    const x = i * 60 - scroll + fr(i) * 40;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, GROUND + 22 + fr(i + 3) * 50, 24 + fr(i + 5) * 30, 4);
    ctx.fillStyle = pc('tuft'); ctx.beginPath(); ctx.moveTo(x, GROUND); ctx.lineTo(x + 4, GROUND - 10 - fr(i + 8) * 8); ctx.lineTo(x + 8, GROUND); ctx.fill();
  }
}

/* ---------- Zeichnen: Hindernisse & Feinde ---------- */
const col = (o, c) => (o.flash > 0 ? '#fff' : c);
function drawLog(o) {
  ctx.fillStyle = '#6b4a2f'; rr(o.x, o.y, o.w, o.h, 14); ctx.fill();
  ctx.fillStyle = '#563a24'; ctx.fillRect(o.x + 14, o.y + 8, o.w - 28, 4); ctx.fillRect(o.x + 22, o.y + 24, o.w - 40, 4);
  circle(o.x + 12, o.y + o.h / 2, o.h / 2 - 3, '#b98a58'); circle(o.x + 12, o.y + o.h / 2, o.h / 4, '#8e6538');
  ctx.fillStyle = '#3f8a5c'; rr(o.x + o.w * 0.45, o.y - 4, o.w * 0.4, 9, 4); ctx.fill();
}
function drawRock(o) {
  ctx.fillStyle = '#6d6a80'; ctx.beginPath();
  ctx.moveTo(o.x, o.y + o.h); ctx.lineTo(o.x + 6, o.y + o.h * 0.45); ctx.lineTo(o.x + o.w * 0.35, o.y + 4);
  ctx.lineTo(o.x + o.w * 0.75, o.y); ctx.lineTo(o.x + o.w - 2, o.y + o.h * 0.5); ctx.lineTo(o.x + o.w, o.y + o.h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a879e'; ctx.beginPath(); ctx.moveTo(o.x + 10, o.y + o.h * 0.5); ctx.lineTo(o.x + o.w * 0.35, o.y + 8); ctx.lineTo(o.x + o.w * 0.5, o.y + o.h * 0.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3f8a5c'; ctx.fillRect(o.x + o.w * 0.3, o.y + 2, o.w * 0.4, 8);
}
function drawBranch(o) {
  const cx = o.x + o.w / 2, b = o.h;
  ctx.fillStyle = '#4a3020';
  ctx.beginPath(); ctx.moveTo(cx - 20, 0); ctx.lineTo(cx + 20, 0); ctx.lineTo(cx + 11, b - 4); ctx.lineTo(cx - 11, b - 4); ctx.fill();
  ctx.strokeStyle = '#4a3020'; ctx.lineWidth = 14; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, b - 34); ctx.lineTo(o.x + 14, b - 10); ctx.moveTo(cx, b - 28); ctx.lineTo(o.x + o.w - 14, b - 6); ctx.stroke();
  ctx.strokeStyle = '#2f6b4a'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const vx = o.x + 20 + i * 22; ctx.beginPath(); ctx.moveTo(vx, b - 20); ctx.lineTo(vx + Math.sin(tm * 2 + i) * 3, b + 4 + (i % 2) * 6); ctx.stroke(); }
  circle(o.x + 14, b - 12, 15, '#2a5a3c'); circle(o.x + o.w - 14, b - 8, 15, '#2a5a3c'); circle(cx, b - 6, 14, '#336b48'); circle(cx - 28, b - 20, 12, '#336b48');
}
function drawBat(o) {
  const x = o.x + o.w / 2, y = o.y + o.h / 2, w = Math.sin(o.ph * 3) * 16, c = col(o, '#2a1a3a');
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x - 30, y - 10 - w); ctx.lineTo(x - 22, y + 4); ctx.lineTo(x - 12, y + 2); ctx.lineTo(x - 6, y + 10); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 30, y - 10 - w); ctx.lineTo(x + 22, y + 4); ctx.lineTo(x + 12, y + 2); ctx.lineTo(x + 6, y + 10); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, 11, 13, 0, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 9, y - 8); ctx.lineTo(x - 7, y - 20); ctx.lineTo(x - 2, y - 10); ctx.moveTo(x + 9, y - 8); ctx.lineTo(x + 7, y - 20); ctx.lineTo(x + 2, y - 10); ctx.fill();
  circle(x - 4, y - 3, 2.5, '#ff4a4a'); circle(x + 4, y - 3, 2.5, '#ff4a4a');
}
function drawGoblin(o) {
  const x = o.x, y = o.y, s = Math.sin(o.ph * 2.4) * 8, c = col(o, '#5cb04a');
  ctx.strokeStyle = c; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 22, y + 60); ctx.lineTo(x + 22 - s, y + 90); ctx.moveTo(x + 32, y + 60); ctx.lineTo(x + 32 + s, y + 90); ctx.stroke();
  ctx.fillStyle = col(o, '#7a4a2a'); rr(x + 12, y + 34, 32, 32, 6); ctx.fill();
  ctx.lineWidth = 7; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(x + 16, y + 40); ctx.lineTo(x - 6, y + 52); ctx.stroke();
  ctx.strokeStyle = col(o, '#a0a0b0'); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 10, y + 70); ctx.lineTo(x - 2, y + 14); ctx.stroke();
  ctx.fillStyle = col(o, '#d8d8e8'); ctx.beginPath(); ctx.moveTo(x - 6, y + 20); ctx.lineTo(x + 1, y + 20); ctx.lineTo(x - 2, y + 4); ctx.fill();
  circle(x + 28, y + 22, 17, c);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x + 14, y + 18); ctx.lineTo(x - 4, y + 10); ctx.lineTo(x + 12, y + 28); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 42, y + 18); ctx.lineTo(x + 56, y + 8); ctx.lineTo(x + 42, y + 28); ctx.fill();
  circle(x + 22, y + 20, 3.5, '#ffe14a'); circle(x + 33, y + 20, 3.5, '#ffe14a');
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 20, y + 29, 3, 4); ctx.fillRect(x + 28, y + 29, 3, 4);
}
function drawGhost(o) {
  const x = o.x + o.w / 2, y = o.y + o.h / 2, wv = Math.sin(o.ph * 2) * 4;
  ctx.globalAlpha = 0.85; ctx.fillStyle = col(o, '#cfe9ff');
  ctx.beginPath(); ctx.arc(x, y - 8, 27, Math.PI, 0); ctx.lineTo(x + 27, y + 30);
  for (let i = 0; i < 4; i++) ctx.lineTo(x + 27 - (i + 0.5) * 13.5, y + 22 + (i % 2 ? 8 : 0) + wv * (i % 2 ? 1 : -1));
  ctx.lineTo(x - 27, y + 30); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1; circle(x - 9, y - 10, 5, '#1b1030'); circle(x + 9, y - 10, 5, '#1b1030');
  ctx.beginPath(); ctx.ellipse(x, y + 5, 5, 7, 0, 0, 6.3); ctx.fill();
}
function drawTroll(o) {
  const x = o.x, y = o.y, s = Math.sin(o.ph * 1.4) * 8, c = col(o, '#5a3b25');
  ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = 22;
  ctx.beginPath(); ctx.moveTo(x + 32, y + 120); ctx.lineTo(x + 30 - s, y + 168); ctx.moveTo(x + 66, y + 120); ctx.lineTo(x + 68 + s, y + 168); ctx.stroke();
  ctx.fillStyle = c; rr(x + 12, y + 50, 76, 80, 22); ctx.fill();
  ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(x + 16, y + 66); ctx.lineTo(x - 8, y + 100 + s); ctx.moveTo(x + 84, y + 66); ctx.lineTo(x + 104, y + 96 - s); ctx.stroke();
  ctx.strokeStyle = col(o, '#3d2616'); ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x + 24 + i * 16, y + 66); ctx.lineTo(x + 28 + i * 16, y + 118); ctx.stroke(); }
  circle(x + 50, y + 34, 26, c);
  ctx.fillStyle = col(o, '#2f6b4a');
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x + 22 + i * 14, y + 16); ctx.lineTo(x + 28 + i * 14, y - 4 - (i % 2) * 6); ctx.lineTo(x + 34 + i * 14, y + 16); ctx.fill(); }
  circle(x + 40, y + 32, 5, '#ffd84a'); circle(x + 60, y + 32, 5, '#ffd84a');
  ctx.fillStyle = '#1b1030'; ctx.fillRect(x + 38, y + 46, 24, 6);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 42, y + 46, 4, 4); ctx.fillRect(x + 54, y + 46, 4, 4);
}
function drawObstacle(o) {
  ({ log: drawLog, rock: drawRock, branch: drawBranch, bat: drawBat, goblin: drawGoblin, ghost: drawGhost, troll: drawTroll, pillarUp: drawPillarUp, pillarDn: drawPillarDn, storm: drawStorm, star: drawStar, heart: drawHeart, potion: drawPotion, shield: drawShieldItem, orb: drawOrb })[o.type](o);
}

/* ===== 06-draw-flight-objects.js ===== */

/* ---------- Flugphase: Himmel, Hindernisse ---------- */
function drawAir() {
  ctx.globalAlpha = flyBlend;
  for (let i = 0; i < 7; i++) {
    const span = W + 400, x = ((((i * 260 - scroll * 0.45) % span) + span) % span) - 200, y = 70 + fr(i + 5) * 260;
    ctx.fillStyle = 'rgba(255,190,240,0.10)';
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * 34, y + (k % 2) * 8, 52, 20, 0, 0, 6.3); ctx.fill(); }
  }
  const g = ctx.createLinearGradient(0, GROUND - 20, 0, H);
  g.addColorStop(0, pc('can0')); g.addColorStop(1, pc('can1'));
  ctx.fillStyle = g; ctx.fillRect(0, GROUND - 4, W, H - GROUND + 4);
  const f0 = Math.floor(scroll / 46) - 1;
  for (let i = f0; i < f0 + W / 46 + 3; i++) {
    const h = 66 + fr(i + 11) * 34;
    pine(i * 46 - scroll + fr(i) * 20, GROUND + 76, h, h * 0.62, i % 2 ? pc('can0') : pc('can2'));
  }
  ctx.globalAlpha = 1;
}
function drawPillarUp(o) {
  const cx = o.x + o.w / 2;
  ctx.fillStyle = '#231446'; ctx.strokeStyle = '#6a3bd0'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, o.y);
  const n = Math.max(2, Math.floor(o.h / 46));
  for (let k = 1; k <= n; k++) { const yy = o.y + (o.h * k) / n, hw = o.w * (0.25 + 0.25 * k / n); ctx.lineTo(cx + hw + 8, yy - o.h / n * 0.5); ctx.lineTo(cx + hw - 6, yy); }
  ctx.lineTo(cx - o.w / 2 - 6, o.y + o.h);
  for (let k = n; k >= 1; k--) { const yy = o.y + (o.h * k) / n, hw = o.w * (0.25 + 0.25 * k / n); ctx.lineTo(cx - hw + 6, yy); ctx.lineTo(cx - hw - 8, yy - o.h / n * 0.5); }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  circle(cx, o.y + 6, 5, 'rgba(120,255,200,0.8)');
}
function drawPillarDn(o) {
  const cx = o.x + o.w / 2, b = o.y + o.h;
  ctx.fillStyle = '#5b4a8a'; ctx.strokeStyle = '#b79cff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(o.x, 0); ctx.lineTo(o.x + o.w, 0); ctx.lineTo(o.x + o.w * 0.7, b * 0.55); ctx.lineTo(cx + 6, b * 0.6); ctx.lineTo(cx, b); ctx.lineTo(cx - 8, b * 0.62); ctx.lineTo(o.x + o.w * 0.3, b * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.moveTo(o.x + 10, 0); ctx.lineTo(o.x + 26, 0); ctx.lineTo(cx - 4, b * 0.8); ctx.fill();
}
function drawStorm(o) {
  const x = o.x + o.w / 2, y = o.y + o.h / 2, flash = Math.sin(o.ph * 1.3) > 0.85;
  ctx.fillStyle = flash ? '#8a85b8' : '#4a4570';
  for (const [dx, dy, r] of [[-38, 8, 24], [-14, -10, 30], [16, -6, 28], [40, 8, 22], [0, 14, 26]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.beginPath(); ctx.arc(x - 12, y - 18, 16, 0, 6.3); ctx.fill();
  if (flash) {
    ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + 4, y + 22); ctx.lineTo(x - 8, y + 44); ctx.lineTo(x + 6, y + 44); ctx.lineTo(x - 6, y + 68); ctx.stroke();
  }
  circle(x - 12, y, 4, '#ff6a6a'); circle(x + 12, y, 4, '#ff6a6a');
}
function drawStar(o) {
  const x = o.x + 15, y = o.y + 15, r = 15 + Math.sin(o.ph * 2) * 1.5;
  const g = ctx.createRadialGradient(x, y, 2, x, y, 28); g.addColorStop(0, 'rgba(255,230,120,0.5)'); g.addColorStop(1, 'rgba(255,230,120,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 28, y - 28, 56, 56);
  ctx.fillStyle = '#ffd84a'; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -1.5708 + i * 0.6283 + o.ph * 0.4, rr2 = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
}

/* ===== 07-draw-items-bosses.js ===== */

/* ---------- Zeichnen: Power-ups, Boss, Wetter ---------- */
function glow(x, y, r, c) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, r);
  g.addColorStop(0, c); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
function drawHeart(o) {
  const x = o.x + 18, y = o.y + 18 + Math.sin(o.ph * 2) * 3;
  glow(x, y, 34, 'rgba(255,90,120,0.55)');
  ctx.fillStyle = '#ff4a6a'; ctx.beginPath(); ctx.moveTo(x, y + 14);
  ctx.bezierCurveTo(x - 24, y - 4, x - 12, y - 22, x, y - 8); ctx.bezierCurveTo(x + 12, y - 22, x + 24, y - 4, x, y + 14); ctx.fill();
  circle(x - 7, y - 6, 3, 'rgba(255,255,255,0.7)');
}
function drawPotion(o) {
  const x = o.x + 18, y = o.y + 18 + Math.sin(o.ph * 2) * 3;
  glow(x, y, 34, 'rgba(90,240,255,0.5)');
  ctx.fillStyle = '#5ff0ff'; ctx.beginPath(); ctx.arc(x, y + 5, 11, 0, 6.3); ctx.fill();
  ctx.fillStyle = '#bff'; ctx.fillRect(x - 4, y - 12, 8, 12);
  ctx.fillStyle = '#c28a50'; ctx.fillRect(x - 5, y - 16, 10, 5);
  circle(x - 4, y + 2, 3, 'rgba(255,255,255,0.7)');
}
function drawShieldItem(o) {
  const x = o.x + 18, y = o.y + 18 + Math.sin(o.ph * 2) * 3;
  glow(x, y, 34, 'rgba(120,200,255,0.55)');
  ctx.fillStyle = '#4a9aff'; ctx.strokeStyle = '#dff'; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(x - 13, y - 13); ctx.lineTo(x + 13, y - 13); ctx.lineTo(x + 12, y + 4); ctx.quadraticCurveTo(x + 8, y + 14, x, y + 18); ctx.quadraticCurveTo(x - 8, y + 14, x - 12, y + 4); ctx.closePath(); ctx.fill(); ctx.stroke();
}
const ORB_COL = ['#e09a4a', '#9dff4a', '#a8e8ff', '#d08aff'];
function drawOrb(o) {
  const x = o.x + 19, y = o.y + 19, c = col(o, ORB_COL[o.skin || 0]);
  glow(x, y, 34, 'rgba(255,255,255,0.35)');
  for (let i = 1; i <= 3; i++) { ctx.globalAlpha = 0.5 - i * 0.12; circle(x + i * 16, y, 14 - i * 3, c); }
  ctx.globalAlpha = 1; circle(x, y, 15, c); circle(x - 3, y - 3, 7, 'rgba(255,255,255,0.8)');
}
function drawShield() {
  if (P.shield <= 0 || (P.shield < 2 && Math.floor(tm * 10) % 2 === 0)) return;
  const x = P.x, y = P.y - 58, g = ctx.createRadialGradient(x, y, 30, x, y, 80);
  g.addColorStop(0, 'rgba(120,220,255,0.05)'); g.addColorStop(0.85, 'rgba(120,220,255,0.28)'); g.addColorStop(1, 'rgba(200,250,255,0.6)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 80, 0, 6.3); ctx.fill();
}
function drawSnow() {
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8 * pal.snow;
  for (let i = 0; i < 70; i++) {
    const sp = 40 + fr(i + 3) * 60, s = 2 + fr(i + 5) * 2;
    const x = (((fr(i) * W - scroll * (0.25 + fr(i + 7) * 0.3) + Math.sin(tm + i) * 20) % W) + W) % W, y = (fr(i + 9) * H + tm * sp) % H;
    ctx.fillRect(x, y, s, s);
  }
  ctx.globalAlpha = 1;
}
function drawTombs() {
  const sp = 190, off = scroll * 0.8, f0 = Math.floor(off / sp) - 1;
  ctx.globalAlpha = pal.grave; ctx.fillStyle = '#241018';
  for (let i = f0; i < f0 + W / sp + 3; i++) {
    const x = i * sp - off + fr(i + 50) * sp * 0.6, h = 34 + fr(i + 60) * 30, w = 28 + fr(i + 70) * 14;
    rr(x, GROUND - h, w, h + 4, 10); ctx.fill();
    if (fr(i + 80) > 0.5) { ctx.fillRect(x + w / 2 - 3, GROUND - h - 22, 6, 24); ctx.fillRect(x + w / 2 - 11, GROUND - h - 14, 22, 6); }
  }
  ctx.globalAlpha = 1;
}

function drawBossTree(b) {
  const x = b.x, y = b.y + Math.sin(b.ph * 2) * 3, c = k => col(b, k), s = Math.sin(b.ph * 3) * 10;
  ctx.fillStyle = c('#4a2f1c'); rr(x + 45, y + 90, 80, 170, 18); ctx.fill();
  ctx.strokeStyle = c('#4a2f1c'); ctx.lineWidth = 22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 55, y + 130); ctx.lineTo(x - 10, y + 170 + s); ctx.moveTo(x + 115, y + 130); ctx.lineTo(x + 170, y + 160 - s); ctx.stroke();
  ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x + 60, y + 255); ctx.lineTo(x + 20, y + 262); ctx.moveTo(x + 110, y + 255); ctx.lineTo(x + 155, y + 262); ctx.stroke();
  for (const [dx, dy, r] of [[20, 60, 40], [85, 30, 52], [145, 64, 40], [85, 80, 40]]) circle(x + dx, y + dy, r, c('#2f6b4a'));
  circle(x + 85, y + 20, 34, c('#3f8a5c'));
  circle(x + 68, y + 130, 9, b.warn ? '#ff5a2a' : '#ffd84a'); circle(x + 102, y + 130, 9, b.warn ? '#ff5a2a' : '#ffd84a');
  ctx.fillStyle = '#1b1030'; rr(x + 62, y + 156, 46, 16, 6); ctx.fill();
  if (b.warn) glow(x + 50, y + 164, 40, 'rgba(255,160,60,0.7)');
}
function drawBossDragon(b) {
  const x = b.x, y = b.y + Math.sin(b.ph * 2) * 4, c = k => col(b, k), fl = Math.sin(b.ph * 6) * 18;
  ctx.fillStyle = c('#2a6b4a'); ctx.beginPath(); ctx.moveTo(x + 110, y + 90); ctx.lineTo(x + 150, y - 10 + fl); ctx.lineTo(x + 190, y + 60 + fl * 0.5); ctx.lineTo(x + 165, y + 70); ctx.lineTo(x + 175, y + 110); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c('#3f9a5c'); ctx.beginPath(); ctx.ellipse(x + 110, y + 150, 70, 52, 0, 0, 6.3); ctx.fill();
  ctx.strokeStyle = c('#3f9a5c'); ctx.lineWidth = 26; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 165, y + 170); ctx.quadraticCurveTo(x + 195, y + 200, x + 175, y + 208); ctx.stroke();
  ctx.fillStyle = c('#c8e8a0'); ctx.beginPath(); ctx.ellipse(x + 95, y + 165, 40, 34, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = c('#2a6b4a'); rr(x + 70, y + 185, 26, 25, 8); ctx.fill(); rr(x + 122, y + 185, 26, 25, 8); ctx.fill();
  ctx.strokeStyle = c('#3f9a5c'); ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(x + 70, y + 130); ctx.quadraticCurveTo(x + 30, y + 90, x + 40, y + 55); ctx.stroke();
  circle(x + 36, y + 50, 30, c('#3f9a5c'));
  ctx.fillStyle = c('#3f9a5c'); ctx.beginPath(); ctx.moveTo(x + 14, y + 40); ctx.lineTo(x - 22, y + 58); ctx.lineTo(x + 14, y + 72); ctx.fill();
  ctx.fillStyle = c('#e8e0c0'); ctx.beginPath(); ctx.moveTo(x + 28, y + 24); ctx.lineTo(x + 40, y - 6); ctx.lineTo(x + 46, y + 26); ctx.fill();
  circle(x + 30, y + 42, 5, b.warn ? '#ff3a1a' : '#ffd84a');
  if (b.warn) { glow(x - 14, y + 60, 34, 'rgba(255,130,40,0.8)'); }
}
function drawBossGolem(b) {
  const x = b.x, y = b.y + Math.sin(b.ph * 1.5) * 3, c = k => col(b, k), s = Math.sin(b.ph * 3) * 8;
  ctx.fillStyle = c('#7ab8e8'); rr(x + 30, y + 130, 44, 100, 8); ctx.fill(); rr(x + 96, y + 130, 44, 100, 8); ctx.fill();
  ctx.fillStyle = c('#a8d8f8'); rr(x + 20, y + 60, 130, 90, 16); ctx.fill();
  ctx.fillStyle = c('#7ab8e8'); rr(x - 18, y + 70 + s, 40, 90, 12); ctx.fill(); rr(x + 148, y + 70 - s, 40, 90, 12); ctx.fill();
  ctx.fillStyle = c('#d8f0ff'); ctx.beginPath();
  for (let i = 0; i < 5; i++) { ctx.moveTo(x + 30 + i * 24, y + 62); ctx.lineTo(x + 42 + i * 24, y + 20 + (i % 2) * 14); ctx.lineTo(x + 54 + i * 24, y + 62); }
  ctx.fill();
  ctx.fillStyle = c('#a8d8f8'); rr(x + 48, y + 8, 74, 60, 12); ctx.fill();
  circle(x + 70, y + 36, 7, b.warn ? '#ff6a3a' : '#5ff0ff'); circle(x + 100, y + 36, 7, b.warn ? '#ff6a3a' : '#5ff0ff');
  ctx.fillStyle = '#1b3a6a'; ctx.fillRect(x + 70, y + 52, 32, 5);
  if (b.warn) glow(x + 20, y + 100, 40, 'rgba(120,220,255,0.7)');
}
function drawBossLich(b) {
  const x = b.x, y = b.y + Math.sin(b.ph * 2) * 8, c = k => col(b, k);
  ctx.fillStyle = c('#3a1a5a'); ctx.beginPath(); ctx.moveTo(x + 85, y + 50); ctx.lineTo(x + 150, y + 200);
  for (let i = 0; i < 5; i++) ctx.lineTo(x + 150 - (i + 0.5) * 26, y + 205 + (i % 2 ? 14 : 0) + Math.sin(b.ph * 4 + i) * 4);
  ctx.lineTo(x + 20, y + 200); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = c('#6a3bd0'); ctx.lineWidth = 12; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x + 60, y + 90); ctx.lineTo(x + 10, y + 120 + Math.sin(b.ph * 3) * 6); ctx.stroke();
  ctx.strokeStyle = '#8a5a2f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 4, y + 170); ctx.lineTo(x + 14, y + 60); ctx.stroke();
  circle(x + 14, y + 54, b.warn ? 16 : 10, b.warn ? '#ff6aff' : '#8fff8f');
  circle(x + 88, y + 50, 26, c('#e8e4d0'));
  circle(x + 79, y + 48, 6, '#1b1030'); circle(x + 98, y + 48, 6, '#1b1030');
  circle(x + 79, y + 48, 2.5, '#8fff8f'); circle(x + 98, y + 48, 2.5, '#8fff8f');
  ctx.fillStyle = c('#ffd84a'); ctx.beginPath(); ctx.moveTo(x + 62, y + 28); ctx.lineTo(x + 66, y + 6); ctx.lineTo(x + 77, y + 20); ctx.lineTo(x + 88, y + 2); ctx.lineTo(x + 99, y + 20); ctx.lineTo(x + 110, y + 6); ctx.lineTo(x + 114, y + 28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1b1030'; ctx.fillRect(x + 76, y + 62, 24, 4);
  if (b.warn) glow(x + 14, y + 54, 36, 'rgba(255,110,255,0.7)');
}
function drawBossOwl(b) {
  const x = b.x, y = b.y + Math.sin(b.ph * 2) * 4, c = k => col(b, k), fl = Math.sin(b.ph * 7) * 30;
  ctx.fillStyle = c('#3d2f5c'); ctx.beginPath(); ctx.moveTo(x + 118, y + 108); ctx.quadraticCurveTo(x + 215, y + 40 + fl, x + 205, y + 160 + fl * 0.5); ctx.lineTo(x + 126, y + 172); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c('#5a4a7a'); ctx.beginPath(); ctx.ellipse(x + 90, y + 135, 60, 78, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = c('#c8b8e8'); ctx.beginPath(); ctx.ellipse(x + 80, y + 152, 36, 54, 0, 0, 6.3); ctx.fill();
  ctx.strokeStyle = c('#8a78b0'); ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + 80, y + 126 + i * 20, 14, 0.3, 2.8); ctx.stroke(); }
  ctx.fillStyle = c('#4a3a6a'); ctx.beginPath(); ctx.moveTo(x + 62, y + 108); ctx.quadraticCurveTo(x - 38, y + 40 - fl, x - 18, y + 160 - fl * 0.5); ctx.lineTo(x + 56, y + 172); ctx.closePath(); ctx.fill();
  circle(x + 85, y + 62, 44, c('#6a5a8a'));
  ctx.fillStyle = c('#6a5a8a'); ctx.beginPath(); ctx.moveTo(x + 50, y + 34); ctx.lineTo(x + 46, y + 2); ctx.lineTo(x + 70, y + 22); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 120, y + 34); ctx.lineTo(x + 124, y + 2); ctx.lineTo(x + 100, y + 22); ctx.fill();
  circle(x + 68, y + 60, 15, '#ffe27a'); circle(x + 102, y + 60, 15, '#ffe27a');
  circle(x + 66, y + 60, 7, b.warn ? '#ff3a1a' : '#1b1030'); circle(x + 100, y + 60, 7, b.warn ? '#ff3a1a' : '#1b1030');
  ctx.fillStyle = '#ffb838'; ctx.beginPath(); ctx.moveTo(x + 80, y + 70); ctx.lineTo(x + 92, y + 70); ctx.lineTo(x + 78, y + 92); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#ffb838'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 70, y + 206); ctx.lineTo(x + 70, y + 218); ctx.moveTo(x + 104, y + 206); ctx.lineTo(x + 104, y + 218); ctx.stroke();
  if (b.warn) glow(x + 40, y + 70, 36, 'rgba(255,120,60,0.6)');
}
function drawBossPhoenix(b) {
  const x = b.x, y = b.y + Math.sin(b.ph * 2) * 5, c = k => col(b, k), fl = Math.sin(b.ph * 6) * 28, fk = 1 + 0.12 * Math.sin(b.ph * 14);
  glow(x + 100, y + 120, 130, 'rgba(255,120,40,0.35)');
  for (const [k, cl] of [[0, '#d8361a'], [1, '#ff8a2a'], [2, '#ffe26a']]) {
    const s = 1 - k * 0.28; ctx.fillStyle = c(cl);
    ctx.beginPath(); ctx.moveTo(x + 110, y + 120);
    ctx.quadraticCurveTo(x + 230 * s + 10, y + 20 + fl * s, x + 215 * s + 20, y + 150 + fl * 0.5);
    ctx.quadraticCurveTo(x + 170, y + 130, x + 130, y + 160); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 70, y + 120);
    ctx.quadraticCurveTo(x - 50 * s, y + 20 - fl * s, x - 30 * s, y + 150 - fl * 0.5);
    ctx.quadraticCurveTo(x + 20, y + 130, x + 60, y + 160); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = c('#ff9a2a');
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 100, y + 170); ctx.quadraticCurveTo(x + 150 + i * 14, y + 215 + i * 6, x + 120 + i * 26 + fl * 0.3, y + 235 * fk); ctx.quadraticCurveTo(x + 100 + i * 12, y + 210, x + 84, y + 176); ctx.fill(); }
  ctx.fillStyle = c('#e0452a'); ctx.beginPath(); ctx.ellipse(x + 90, y + 125, 40, 56, 0, 0, 6.3); ctx.fill();
  ctx.fillStyle = c('#ffcf6a'); ctx.beginPath(); ctx.ellipse(x + 80, y + 140, 22, 36, 0, 0, 6.3); ctx.fill();
  circle(x + 72, y + 64, 26, c('#ff7a2a'));
  ctx.fillStyle = c('#ffd84a'); ctx.beginPath(); ctx.moveTo(x + 58, y + 50); ctx.lineTo(x + 54, y + 14 * fk - 12); ctx.lineTo(x + 70, y + 40); ctx.lineTo(x + 78, y + 8 * fk - 14); ctx.lineTo(x + 86, y + 42); ctx.fill();
  ctx.fillStyle = '#ffb838'; ctx.beginPath(); ctx.moveTo(x + 52, y + 62); ctx.lineTo(x + 20, y + 74); ctx.lineTo(x + 54, y + 80); ctx.closePath(); ctx.fill();
  circle(x + 62, y + 58, 6, '#fff'); circle(x + 60, y + 58, 3, b.warn ? '#ff0000' : '#1b1030');
  if (b.warn) glow(x + 24, y + 74, 34, 'rgba(255,200,80,0.8)');
}
function drawBoss(b) {
  if (b.phase >= 2) glow(b.x + 85, b.y + b.h * 0.5, 170, 'rgba(255,60,40,' + (0.14 * (b.phase - 1)) + ')');
  if (b.curse > 0) glow(b.x + 85, b.y + b.h * 0.4, 150 + 20 * Math.sin(tm * 18), 'rgba(255,90,255,0.5)');
  if (b.dying > 0) ctx.globalAlpha = 0.65 + 0.35 * Math.sin(tm * 40);
  ctx.save();
  if (b.phase >= 3 && b.dying <= 0) ctx.translate(Math.sin(tm * 60) * 2, 0);
  [drawBossTree, drawBossDragon, drawBossGolem, drawBossLich, drawBossOwl, drawBossPhoenix][b.skin](b);
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ===== 08-wizard-shop-menus.js ===== */

/* ---------- Aussehen, Shop, Menüs, Sprechblasen ---------- */
const SHOP = {
  g: { name: 'Gewand', items: [
    { n: 'Mitternacht', p: 0,  robe: '#6a3bd0', cape: '#4a2395', hat: '#5a2fb0', brim: '#4a23a0' },
    { n: 'Ozean',       p: 10, robe: '#2f7ad0', cape: '#1f4f95', hat: '#2a63b0', brim: '#1f4f95' },
    { n: 'Waldgrün',    p: 10, robe: '#2fa860', cape: '#1d7040', hat: '#27904f', brim: '#1d7040' },
    { n: 'Rubinrot',    p: 15, robe: '#d03a52', cape: '#8f2236', hat: '#b82f46', brim: '#8f2236' },
    { n: 'Schatten',    p: 15, robe: '#58547a', cape: '#25222f', hat: '#34304a', brim: '#25222f' },
    { n: 'Zuckerrosa',  p: 20, robe: '#e070b8', cape: '#a8408a', hat: '#d060a8', brim: '#a8408a' },
    { n: 'Sonnengold',  p: 25, robe: '#e0a82e', cape: '#a8741a', hat: '#d09a26', brim: '#a8741a' },
    { n: 'Regenbogen',  p: 60, robe: '#6a3bd0', cape: '#4a2395', hat: '#5a2fb0', brim: '#4a23a0', rb: 1 }
  ] },
  h: { name: 'Hut', items: [
    { n: 'Spitzhut',     p: 0,  st: 'classic' },
    { n: 'Schiefer Hut', p: 8,  st: 'bent' },
    { n: 'Mondhut',      p: 12, st: 'moon' },
    { n: 'Sternenhut',   p: 15, st: 'stars' },
    { n: 'Zylinder',     p: 18, st: 'top' },
    { n: 'Flammenhut',   p: 25, st: 'flame' },
    { n: 'Krone',        p: 40, st: 'crown' }
  ] },
  b: { name: 'Bart', items: [
    { n: 'Weiß',        p: 0,  c: '#f4f4ff', st: 'long' },
    { n: 'Grau',        p: 5,  c: '#b4b6c6', st: 'long' },
    { n: 'Braun',       p: 8,  c: '#8a5a34', st: 'long' },
    { n: 'Feuerrot',    p: 8,  c: '#e0562a', st: 'long' },
    { n: 'Rosa',        p: 12, c: '#ff8ac8', st: 'long' },
    { n: 'Schnurrbart', p: 8,  c: '#f4f4ff', st: 'stache' },
    { n: 'Rasiert',     p: 5,  c: '#f4f4ff', st: 'none' }
  ] },
  m: { name: 'Motorrad', items: [
    { n: 'Klassik',      p: 0,  a: '#ff7a2f', b: '#d9441f' },
    { n: 'Türkis',       p: 8,  a: '#2fd0d8', b: '#1a8f9a' },
    { n: 'Limette',      p: 8,  a: '#8fd02f', b: '#5a9a1a' },
    { n: 'Kirschrot',    p: 10, a: '#e03030', b: '#a01818' },
    { n: 'Violett',      p: 10, a: '#a060ff', b: '#6a30c8' },
    { n: 'Nachtschwarz', p: 15, a: '#5a5f78', b: '#1c1e2a' },
    { n: 'Gold',         p: 25, a: '#ffd84a', b: '#c8901a' },
    { n: 'Regenbogen',   p: 60, a: '#ff7a2f', b: '#d9441f', rb: 1 }
  ] }
};
const CATS = ['g', 'h', 'b', 'm'];

let wallet = 0, runStars = 0;
let OWN = { g: [0], h: [0], b: [0], m: [0] }, LOOK = { g: 0, h: 0, b: 0, m: 0 };
try {
  wallet = Math.max(0, Math.floor(+localStorage.getItem('wiz_stars') || 0));
  const o = JSON.parse(localStorage.getItem('wiz_own') || 'null'), l = JSON.parse(localStorage.getItem('wiz_look') || 'null');
  if (o && typeof o === 'object') OWN = o;
  if (l && typeof l === 'object') LOOK = l;
} catch (e) {}
for (const k of CATS) {
  const own = Array.isArray(OWN[k]) ? OWN[k] : [];
  OWN[k] = [0].concat(own.filter(i => i > 0 && SHOP[k].items[i]));
  if (!SHOP[k].items[LOOK[k]] || !OWN[k].includes(LOOK[k])) LOOK[k] = 0;
}
const saveWallet = () => { try { localStorage.setItem('wiz_stars', String(wallet)); } catch (e) {} };
const saveLook = () => { try { localStorage.setItem('wiz_own', JSON.stringify(OWN)); localStorage.setItem('wiz_look', JSON.stringify(LOOK)); } catch (e) {} };
function addStars(n) { wallet += n; runStars += n; saveWallet(); }

const hsl = (h, s, l) => 'hsl(' + Math.round(((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%)';
function lookCols(L) {
  const g = SHOP.g.items[L.g], m = SHOP.m.items[L.m], b = SHOP.b.items[L.b];
  const c = { robe: g.robe, cape: g.cape, hat: g.hat, brim: g.brim, bikeA: m.a, bikeB: m.b, beard: b.c };
  if (g.rb) { const h = tm * 60; c.robe = hsl(h, 70, 58); c.cape = hsl(h + 30, 65, 40); c.hat = hsl(h + 15, 70, 48); c.brim = hsl(h + 30, 65, 38); }
  if (m.rb) { const h = tm * 80 + 120; c.bikeA = hsl(h, 85, 58); c.bikeB = hsl(h + 40, 85, 42); }
  return c;
}

/* ---------- kleine Zeichenhelfer ---------- */
function star5(x, y, r, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r;
    if (i) ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); else ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath(); ctx.fill();
}
function spark(x, y, r, col, a) {
  ctx.save(); ctx.globalAlpha = a === undefined ? 1 : a; ctx.fillStyle = col; ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.12, x + r, y); ctx.quadraticCurveTo(x + r * 0.12, y + r * 0.12, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.12, y + r * 0.12, x - r, y); ctx.quadraticCurveTo(x - r * 0.12, y - r * 0.12, x, y - r); ctx.fill(); ctx.restore();
}
function flameShape(x, y, s) {
  const cols = ['#ff4a1a', '#ff9a2a', '#ffe26a'];
  for (let k = 0; k < 3; k++) {
    const sc = s * (1 - k * 0.27), f = 1 + 0.18 * Math.sin(tm * 14 + k * 2);
    ctx.fillStyle = cols[k]; ctx.beginPath(); ctx.moveTo(x, y - 24 * sc * f);
    ctx.quadraticCurveTo(x + 10 * sc, y - 6 * sc, x, y + 4 * sc); ctx.quadraticCurveTo(x - 10 * sc, y - 6 * sc, x, y - 24 * sc * f); ctx.fill();
  }
}

/* ---------- Hut, Bart, Motorrad (gemeinsam für Spiel und Garderobe) ---------- */
function drawHat(st, hx, hy, d, C) {
  const cone = (tx, ty, cx, cy) => {
    ctx.fillStyle = C.hat; ctx.beginPath(); ctx.moveTo(hx - 12, hy - 8); ctx.lineTo(hx + 10, hy - 8);
    ctx.quadraticCurveTo(cx, cy, tx, ty); ctx.quadraticCurveTo(hx - 18 - 10 * d, hy - 24 + 4 * d, hx - 12, hy - 8); ctx.fill();
  };
  const band = () => { ctx.fillStyle = '#ffd84a'; ctx.fillRect(hx - 12, hy - 11, 22, 3); };
  const brim = rx => { ctx.fillStyle = C.brim; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 8, rx, 5, 0, 0, 6.3); ctx.fill(); };
  if (st === 'bent') {
    const tx = hx - 30 - 34 * d, ty = hy - 30 + 14 * d;
    cone(tx, ty, hx - 1 - 10 * d, hy - 44 + 8 * d); band(); brim(19); circle(tx, ty, 4.5, '#ffd84a');
  } else if (st === 'top') {
    const sh = -8 * d, ty = hy - 36 + 10 * d;
    ctx.fillStyle = '#2a2438'; ctx.beginPath(); ctx.moveTo(hx - 11, hy - 8); ctx.lineTo(hx - 11 + sh, ty); ctx.lineTo(hx + 9 + sh, ty); ctx.lineTo(hx + 10, hy - 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.hat; ctx.fillRect(hx - 11, hy - 16, 21, 6);
    ctx.fillStyle = '#3a3350'; ctx.beginPath(); ctx.ellipse(hx - 1 + sh, ty, 10, 3.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#1d1a28'; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 8, 19, 5, 0, 0, 6.3); ctx.fill();
  } else if (st === 'crown') {
    ctx.fillStyle = '#ffd84a'; ctx.beginPath(); ctx.moveTo(hx - 11, hy - 9); ctx.lineTo(hx - 12, hy - 27 + 8 * d); ctx.lineTo(hx - 5, hy - 18 + 6 * d);
    ctx.lineTo(hx, hy - 31 + 9 * d); ctx.lineTo(hx + 5, hy - 18 + 6 * d); ctx.lineTo(hx + 11, hy - 27 + 8 * d); ctx.lineTo(hx + 10, hy - 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c8901a'; ctx.fillRect(hx - 11, hy - 12, 21, 3);
    circle(hx, hy - 15, 2.4, '#ff4a6a'); circle(hx - 7, hy - 14, 1.8, '#5ff0ff'); circle(hx + 7, hy - 14, 1.8, '#5ff0ff');
  } else {
    const tx = hx - 14 - 38 * d, ty = hy - 46 + 22 * d;
    cone(tx, ty, hx - 2 - 14 * d, hy - 30 + 6 * d); band(); brim(st === 'stars' ? 24 : 19);
    const sx = hx - 5 - d * 8, sy = hy - 18 + d * 6;
    if (st === 'classic') star5(sx, sy, 5.5, '#ffd84a');
    else if (st === 'moon') { circle(sx, sy - 1, 6.5, '#ffd84a'); circle(sx + 3, sy - 3, 5.6, C.hat); }
    else if (st === 'stars') { star5(sx, sy, 4.5, '#ffd84a'); star5(hx - 13 - d * 14, hy - 33 + d * 12, 3.4, '#fff3a0'); star5(hx + 3, hy - 21 + d * 4, 3, '#fff3a0'); }
    else if (st === 'flame') flameShape(tx, ty + 4, 1);
  }
}
function drawBeard(st, col, hx, hy, d) {
  if (st === 'none') return;
  ctx.fillStyle = col;
  if (st === 'stache') {
    ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(hx - 4, hy + 5); ctx.quadraticCurveTo(hx + 4, hy + 10, hx + 12, hy + 4); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx + 12, hy + 4); ctx.quadraticCurveTo(hx + 17, hy + 1, hx + 15, hy - 1); ctx.stroke();
    return;
  }
  ctx.beginPath(); ctx.moveTo(hx - 5, hy + 2); ctx.lineTo(hx + 10, hy + 3); ctx.lineTo(hx + 4 - d * 6, hy + 28 - d * 4); ctx.closePath(); ctx.fill();
}
function wheel(x, y) {
  ctx.strokeStyle = '#14141c'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(x, y, 19, 0, 6.2832); ctx.stroke();
  ctx.strokeStyle = '#aab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 15, 0, 6.2832); ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = P.wheel + i * Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(x - Math.cos(a) * 15, y - Math.sin(a) * 15); ctx.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); ctx.stroke();
  }
}
function drawBike(C) {
  ctx.strokeStyle = '#8a8fa0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-10, -28); ctx.lineTo(-62, -30); ctx.stroke();
  wheel(-38, -22); wheel(38, -22);
  ctx.strokeStyle = C.bikeA; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(-38, -22); ctx.lineTo(-18, -46); ctx.lineTo(14, -50); ctx.lineTo(30, -60); ctx.moveTo(30, -60); ctx.lineTo(38, -22); ctx.stroke();
  ctx.fillStyle = '#444a58'; rr(-14, -40, 32, 20, 5); ctx.fill();
  ctx.fillStyle = C.bikeB; ctx.beginPath(); ctx.ellipse(4, -54, 17, 8, -0.1, 0, 6.3); ctx.fill();
  ctx.strokeStyle = '#1e1e2a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-32, -50); ctx.lineTo(-8, -50); ctx.stroke();
  ctx.strokeStyle = '#2b2b38'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(26, -62); ctx.lineTo(35, -69); ctx.stroke();
  circle(44, -58, 6, '#ffe9a0');
}

/* ---------- Zauberer auf Motorrad ---------- */
function drawWizard(px, py, sc, L, tilt, d, casting, fb) {
  const C = lookCols(L), bd = SHOP.b.items[L.b];
  ctx.save(); ctx.translate(px, py); ctx.scale(sc, sc); ctx.rotate(tilt); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const hx = lerp(8, 32, d), hy = lerp(-104, -78, d), sx = lerp(-2, 18, d), sy = lerp(-88, -64, d);
  if (fb > 0.02) {
    const fl = Math.sin(tm * 12) * 16;
    for (const [k, s2] of [[0, 1], [1, 0.65]]) {
      const wg = ctx.createLinearGradient(0, -70, -110, -90);
      wg.addColorStop(0, 'rgba(160,255,255,' + 0.85 * fb + ')'); wg.addColorStop(1, 'rgba(190,110,255,0)');
      ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(-8, -66 + k * 8);
      ctx.quadraticCurveTo(-60 * s2, -140 * s2 + fl * s2 - k * 4, -118 * s2, -104 * s2 + fl * 1.3 * s2);
      ctx.quadraticCurveTo(-90 * s2, -96 * s2, -100 * s2, -82 * s2 + fl * 0.6 * s2);
      ctx.quadraticCurveTo(-70 * s2, -80 * s2, -78 * s2, -66 + fl * 0.3);
      ctx.quadraticCurveTo(-45 * s2, -66, -8, -58 + k * 8); ctx.fill();
    }
  }
  const lg = ctx.createLinearGradient(44, -58, 150, -58);
  lg.addColorStop(0, 'rgba(255,240,170,0.28)'); lg.addColorStop(1, 'rgba(255,240,170,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(44, -60); ctx.lineTo(150, -90); ctx.lineTo(150, -30); ctx.fill();
  drawBike(C);
  const w1 = Math.sin(tm * 18) * 5, w2 = Math.cos(tm * 15) * 5;
  ctx.fillStyle = C.cape; ctx.beginPath(); ctx.moveTo(sx - 10, sy);
  ctx.quadraticCurveTo(-40, sy + 8 + w1, -72 - speed * 0.02, -52 + w2); ctx.lineTo(-62 - speed * 0.02, -36 + w1); ctx.lineTo(-18, -44); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#2a2a55'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-14, -50); ctx.lineTo(8, -44); ctx.lineTo(6, -26); ctx.stroke();
  ctx.strokeStyle = C.robe; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(-14, -52); ctx.lineTo(sx, sy); ctx.stroke();
  ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sx, sy + 2); ctx.lineTo(30, -62); ctx.stroke();
  circle(30, -62, 5, '#f2c9a0');
  const orbA = 0.6 + 0.4 * Math.sin(tm * 6);
  let ox, oy;
  ctx.strokeStyle = '#8a5a2f'; ctx.lineWidth = 4;
  if (casting) {
    ctx.beginPath(); ctx.moveTo(sx - 6, sy + 26); ctx.lineTo(sx + 60, sy + 2); ctx.stroke();
    ctx.strokeStyle = C.robe; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + 28, sy + 10); ctx.stroke();
    ox = sx + 60; oy = sy + 2;
  } else {
    ctx.beginPath(); ctx.moveTo(-26, -42); ctx.lineTo(-22, sy - 34); ctx.stroke();
    ox = -22; oy = sy - 34;
  }
  const og = ctx.createRadialGradient(ox, oy, 1, ox, oy, casting ? 26 : 14);
  og.addColorStop(0, 'rgba(200,255,255,' + (casting ? 1 : orbA) + ')'); og.addColorStop(1, 'rgba(90,220,255,0)');
  ctx.fillStyle = og; ctx.fillRect(ox - 30, oy - 30, 60, 60); circle(ox, oy, casting ? 7 : 5, '#bff');
  circle(hx, hy, 11, '#f2c9a0');
  drawBeard(bd.st, bd.c, hx, hy, d);
  circle(hx + 5, hy - 2, 1.8, '#222');
  drawHat(SHOP.h.items[L.h].st, hx, hy, d, C);
  ctx.restore();
}
function drawPlayer() {
  if (P.inv > 0 && Math.floor(tm * 14) % 2 === 0) return;
  drawWizard(P.x, P.y, 1, LOOK, P.tilt, P.duck, castFx > 0, flyBlend);
}

/* ---------- Bann-Anzeige ---------- */
function drawSilence() {
  if (silenceT <= 0) return;
  const a = Math.min(1, silenceT * 2) * (0.75 + 0.25 * Math.sin(tm * 10));
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  g.addColorStop(0, 'rgba(160,30,160,0)'); g.addColorStop(1, 'rgba(160,30,160,' + 0.32 * a + ')');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(P.x + 6, P.y - (mode === 'ground' ? 52 : 46)); ctx.globalAlpha = a;
  ctx.strokeStyle = '#ff7aff'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -tm * 40;
  ctx.beginPath(); ctx.arc(0, 0, 80, 0, 6.2832); ctx.stroke();
  ctx.lineDashOffset = tm * 30; ctx.beginPath(); ctx.arc(0, 0, 66, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-18, -18); ctx.lineTo(18, 18); ctx.moveTo(18, -18); ctx.lineTo(-18, 18); ctx.stroke();
  ctx.restore();
}

/* ---------- Sprechblasen ---------- */
const LINES = ['Oh Yeah!', 'Gotcha!', 'Kabaam!', 'The Wand chooses the Wizard!', 'Nagoony-tastic!', 'Too easy!', 'Magic never fails!', 'Not today, monster!', 'Abra-Kaboom!', 'Wizard power!', 'Sparkle time!', 'Poof! Gone!', 'Magic Mike? No, Magic Mage!'];
const BOSS_LINES = ['Who is the boss now?', 'The Wand has spoken!', 'Down you go, Boss!', 'Legendary!', 'Kabaaaam! Boss down!', 'Boss? More like Moss!', 'Magic wins again!', 'Nagoony, baby!'];
let bubble = null, lastLine = '';
function say(list, force, dur) {
  if (!force && bubble && bubble.t > 0.9) return;
  let s; do { s = list[Math.floor(Math.random() * list.length)]; } while (s === lastLine && list.length > 1);
  lastLine = s; bubble = { text: s, t: dur || 2, max: dur || 2 };
}
function sayKill(o) { if (o.type === 'orb') return; if (Math.random() < (o.type === 'troll' ? 0.4 : 0.15)) say(LINES); }
function updateBubble(dt) { if (bubble) { bubble.t -= dt; if (bubble.t <= 0) bubble = null; } }
function drawBubble() {
  if (!bubble || state === 'title') return;
  const age = bubble.max - bubble.t, a = clamp(Math.min(bubble.t * 4, age * 8), 0, 1), sc = 0.6 + 0.4 * Math.min(1, age * 8);
  const d = P.duck, hy = lerp(-104, -78, d), hxp = lerp(8, 32, d);
  ctx.save(); ctx.font = "bold 22px 'Trebuchet MS',system-ui,sans-serif";
  const bw = ctx.measureText(bubble.text).width + 34, bh = 42;
  const cx = clamp(P.x + hxp + 46, bw / 2 + 10, W - bw / 2 - 10), by = Math.max(8, P.y + hy - 66 - bh);
  const tipX = P.x + hxp + 14, tipY = P.y + hy - 30, bx = clamp(tipX - 8, cx - bw / 2 + 14, cx + bw / 2 - 40);
  ctx.globalAlpha = a; ctx.translate(cx, by + bh); ctx.scale(sc, sc); ctx.translate(-cx, -(by + bh));
  ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#2a1458'; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(bx, by + bh - 2); ctx.lineTo(tipX, tipY); ctx.lineTo(bx + 22, by + bh - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  rr(cx - bw / 2, by, bw, bh, 16); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillRect(bx + 3, by + bh - 4, 16, 6);
  ctx.fillStyle = '#2a1458'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(bubble.text, cx, by + bh / 2 + 1);
  ctx.restore();
}

/* ---------- Menü-Steuerung ---------- */
let menu = 'main', gTab = 'g', gPrev = { g: 0, h: 0, b: 0, m: 0 }, gMsg = null, hoverId = null;
const UI = [];
function toMenu() {
  state = 'title'; menu = 'main'; speed = 360; mode = 'ground'; flyBlend = 0; flightPending = false; bossPending = false;
  boss = null; silenceT = 0; bubble = null; obs = []; bolts = []; pops = []; bannerObj = null;
  Object.assign(P, { y: GROUND, vy: 0, ground: true, duck: 0, ducking: false, inv: 0, tilt: 0, up: false, shield: 0 });
  setEngine();
}
function uiAction(id) {
  if (id === 'play' || id === 'again') startGame();
  else if (id === 'menu') toMenu();
  else if (id === 'garage') { menu = 'garage'; gTab = 'g'; gPrev = Object.assign({}, LOOK); gMsg = null; }
  else if (id === 'help') menu = 'help';
  else if (id === 'back') { menu = 'main'; }
  else if (id.startsWith('tab:')) { gTab = id.slice(4); gMsg = null; }
  else if (id.startsWith('item:')) { gPrev[gTab] = +id.slice(5); gMsg = null; tone(700, 900, 0.06, 'triangle', 0.06); }
  else if (id === 'buy') garageAct();
}
function garageAct() {
  const i = gPrev[gTab], it = SHOP[gTab].items[i];
  if (OWN[gTab].includes(i)) { LOOK[gTab] = i; saveLook(); tone(500, 900, 0.12, 'triangle', 0.1); gMsg = { t: 1.4, text: 'Ausgerüstet!', col: '#9fffb0' }; }
  else if (wallet >= it.p) {
    wallet -= it.p; OWN[gTab].push(i); LOOK[gTab] = i; saveWallet(); saveLook();
    tone(600, 1500, 0.3, 'triangle', 0.12); tone(900, 2000, 0.3, 'sine', 0.08, 0.08); gMsg = { t: 1.8, text: 'Gekauft und ausgerüstet!', col: '#ffd84a' };
  } else { sfx.dry(); gMsg = { t: 1.8, text: 'Dir fehlen noch ' + (it.p - wallet) + ' Sterne', col: '#ff9aa8' }; }
}
function toCanvas(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
function hitUI(e) {
  const p = toCanvas(e);
  for (let i = UI.length - 1; i >= 0; i--) { const b = UI[i]; if (b.on && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; }
  return null;
}
function onCanvasPointer(e) {
  initAudio();
  if (state === 'play') return;
  const b = hitUI(e);
  if (state === 'paused') { if (b) uiAction(b.id); else togglePause(); return; }
  if (b) { hoverId = b.id; uiAction(b.id); }
}
cv.addEventListener('pointermove', e => {
  if (state === 'play') return;
  const b = hitUI(e); hoverId = b ? b.id : null; cv.style.cursor = b ? 'pointer' : 'default';
});
cv.addEventListener('pointerleave', () => { hoverId = null; });

/* ---------- Menü-Zeichnen ---------- */
function button(id, x, y, w, h, label, st, o) {
  o = o || {}; const off = !!o.off, hov = hoverId === id && !off;
  UI.push({ id, x, y, w, h, on: !off });
  ctx.save(); if (off || o.dim) ctx.globalAlpha = off ? 0.55 : 0.8;
  const prim = st === 'primary' || (st === 'tab' && o.active);
  if (prim) {
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, hov ? '#b49cff' : '#8f64ff'); g.addColorStop(1, hov ? '#6a4ae0' : '#4c2cb0');
    ctx.shadowColor = st === 'primary' ? 'rgba(95,240,255,0.7)' : 'rgba(150,110,255,0.6)'; ctx.shadowBlur = hov ? 26 : 16;
    ctx.fillStyle = g; rr(x, y, w, h, Math.min(20, h / 2.2)); ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = 3; ctx.strokeStyle = st === 'primary' ? '#7ff6ff' : '#c6b0ff'; ctx.stroke();
  } else {
    ctx.fillStyle = hov ? 'rgba(70,40,150,0.92)' : 'rgba(28,14,66,0.82)'; rr(x, y, w, h, Math.min(20, h / 2.2)); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = hov ? '#c6b0ff' : '#9a6bff'; ctx.stroke();
  }
  const fs = o.size || Math.round(h * 0.4);
  ctx.font = 'bold ' + fs + "px 'Trebuchet MS',system-ui,sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let tw = ctx.measureText(label).width, tx = x + w / 2, ico = o.icon ? fs * 1.1 : 0;
  tx += ico / 2;
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,5,50,0.55)'; ctx.strokeText(label, tx, y + h / 2 + 1);
  ctx.fillStyle = '#fff'; ctx.fillText(label, tx, y + h / 2 + 1);
  if (o.icon === 'play') { ctx.fillStyle = '#fff'; const ix = tx - tw / 2 - fs * 0.9; ctx.beginPath(); ctx.moveTo(ix, y + h / 2 - fs * 0.45); ctx.lineTo(ix + fs * 0.8, y + h / 2); ctx.lineTo(ix, y + h / 2 + fs * 0.45); ctx.closePath(); ctx.fill(); }
  if (o.icon === 'star') { star5(tx + tw / 2 + fs * 0.7, y + h / 2, fs * 0.55, '#ffd84a'); }
  ctx.restore();
}
function starBadge(x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(28,14,66,0.82)'; rr(x, y, w, h, h / 2); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd84a'; ctx.stroke();
  star5(x + h / 2, y + h / 2, h * 0.32, '#ffd84a');
  ctx.font = "bold 24px 'Trebuchet MS',system-ui,sans-serif"; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(String(wallet), x + w - 16, y + h / 2 + 1);
  ctx.restore();
}
function spaced(s, cx, y, size, gap, draw) {
  ctx.font = 'bold ' + size + "px 'Trebuchet MS',system-ui,sans-serif";
  const ws = [...s].map(ch => ctx.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0) + gap * (s.length - 1);
  let x = cx - tot / 2;
  [...s].forEach((ch, i) => { draw(ch, x + ws[i] / 2, y, i); x += ws[i] + gap; });
  return tot;
}
/* Logo: "THE WIZARD NAGOONY" */
function drawLogo(cx, top) {
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const halo = ctx.createRadialGradient(cx, top + 85, 10, cx, top + 85, 330);
  halo.addColorStop(0, 'rgba(140,80,255,0.42)'); halo.addColorStop(1, 'rgba(140,80,255,0)');
  ctx.fillStyle = halo; ctx.fillRect(cx - 340, top - 40, 680, 300);
  // NAGOONY
  let size = 118; ctx.font = 'bold ' + size + "px 'Trebuchet MS',system-ui,sans-serif";
  const probe = [...'NAGOONY'].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + 6 * 7;
  size = Math.floor(size * Math.min(1, (W - 120) / probe, 760 / probe));
  const base = top + 132;
  const tot = spaced('NAGOONY', cx, base, size, 6, (ch, x, y, i) => {
    const bob = Math.sin(tm * 2 + i * 0.75) * 3.5, rot = Math.sin(tm * 1.4 + i) * 0.025;
    ctx.save(); ctx.translate(x, y + bob); ctx.rotate(rot);
    ctx.font = 'bold ' + size + "px 'Trebuchet MS',system-ui,sans-serif";
    ctx.strokeStyle = '#08031a'; ctx.lineWidth = size * 0.2; ctx.strokeText(ch, 4, 8);
    ctx.shadowColor = '#b66bff'; ctx.shadowBlur = 28; ctx.strokeStyle = '#34187f'; ctx.lineWidth = size * 0.16; ctx.strokeText(ch, 0, 0); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#b894ff'; ctx.lineWidth = size * 0.075; ctx.strokeText(ch, 0, 0);
    const g = ctx.createLinearGradient(0, -size * 0.72, 0, size * 0.02);
    g.addColorStop(0, '#b8fcff'); g.addColorStop(0.5, '#4fe0f2'); g.addColorStop(1, '#7a5cff');
    ctx.fillStyle = g; ctx.fillText(ch, 0, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.strokeText(ch, -1, -2);
    ctx.restore();
  });
  // Zauberstab-Schweif unter dem Namen
  const x0 = cx - tot / 2 + 10, x1 = cx + tot / 2 - 4, yy = base + 26;
  const sg = ctx.createLinearGradient(x0, 0, x1, 0); sg.addColorStop(0, 'rgba(182,107,255,0)'); sg.addColorStop(0.5, '#b66bff'); sg.addColorStop(1, '#7ff6ff');
  ctx.strokeStyle = sg; ctx.lineWidth = 6; ctx.shadowColor = '#7ff6ff'; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(x0, yy + 6); ctx.quadraticCurveTo(cx, yy + 28, x1, yy - 6); ctx.stroke(); ctx.shadowBlur = 0;
  spark(x1 + 8, yy - 8, 20 + 3 * Math.sin(tm * 5), '#fff'); spark(x1 + 8, yy - 8, 30 + 4 * Math.sin(tm * 5), 'rgba(127,246,255,0.6)', 0.7);
  for (let i = 0; i < 6; i++) spark(x0 + (x1 - x0) * (0.2 + i * 0.14), yy + 14 + Math.sin(i * 2.1) * 8, 3 + (i % 2) * 2, '#d9c6ff', 0.4 + 0.6 * Math.abs(Math.sin(tm * 3 + i)));
  // Funken an den Buchstaben
  spark(cx - tot / 2 + 6, base - size * 0.78, 14, '#fff3a0', 0.5 + 0.5 * Math.sin(tm * 4));
  spark(cx + tot / 2 - 6, base - size * 0.8, 11, '#fff3a0', 0.5 + 0.5 * Math.sin(tm * 4 + 2));
  spark(cx + 20, base - size * 0.9, 8, '#c6f', 0.5 + 0.5 * Math.sin(tm * 5 + 1));
  // THE WIZARD
  const ty = top + 14;
  const wtot = spaced('THE WIZARD', cx, ty, 32, 9, (ch, x, y) => {
    ctx.save(); ctx.font = 'bold 32px ' + "'Trebuchet MS',system-ui,sans-serif";
    ctx.strokeStyle = '#1a0b44'; ctx.lineWidth = 8; ctx.strokeText(ch, x, y + 2);
    const g = ctx.createLinearGradient(0, y - 26, 0, y + 2); g.addColorStop(0, '#fff3b0'); g.addColorStop(1, '#ffb838');
    ctx.fillStyle = g; ctx.fillText(ch, x, y); ctx.restore();
  });
  ctx.strokeStyle = 'rgba(255,216,74,0.75)'; ctx.lineWidth = 2.5;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + s * (wtot / 2 + 18), ty - 11); ctx.lineTo(cx + s * (wtot / 2 + 74), ty - 11); ctx.stroke(); star5(cx + s * (wtot / 2 + 84), ty - 11, 7, '#ffd84a'); }
  ctx.restore();
}
function drawPanel(x, y, w, h) {
  ctx.fillStyle = 'rgba(14,6,36,0.78)'; rr(x, y, w, h, 22); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(154,107,255,0.8)'; ctx.stroke();
}
function drawMenu() {
  if (menu === 'garage') return drawGarage();
  if (menu === 'help') return drawHelp();
  dim(0.45);
  const cx = W / 2;
  drawLogo(cx, 34);
  button('play', cx - 160, 234, 320, 70, 'SPIELEN', 'primary', { icon: 'play', size: 34 });
  button('garage', cx - 208, 320, 200, 56, 'Garderobe', 'ghost', { size: 22 });
  button('help', cx + 8, 320, 200, 56, 'Anleitung', 'ghost', { size: 22 });
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'; ctx.font = "bold 18px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#ffd84a'; ctx.fillText('Rekord ' + hi, 22, 36);
  starBadge(W - 22 - 120, 14, 120, 44);
  if (!touch) { ctx.textAlign = 'center'; ctx.font = '15px sans-serif'; ctx.fillStyle = '#c9b8ff'; ctx.fillText('Leertaste: Start  ·  G: Garderobe  ·  M: Ton', cx, 500); }
}
function drawHelp() {
  dim(0.6);
  const cx = W / 2, pw = Math.min(W - 80, 760), px = cx - pw / 2;
  drawPanel(px, 22, pw, 436);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'center';
  ctx.save(); ctx.shadowColor = '#b66bff'; ctx.shadowBlur = 18; txt('ANLEITUNG', 72, 40, '#f1e4ff', true); ctx.restore();
  const k = s => touch ? '' : '  (' + s + ')';
  const rows = [
    ['Baumstämme & Felsen  →  springen' + k('Leertaste / ↑'), '#ffe9a0', 19],
    ['Äste & Fledermäuse  →  ducken' + k('↓'), '#ffe9a0', 19],
    ['Kobolde, Geister & Trolle  →  Nagoony!' + k('N / X / →'), '#9ff6ff', 19],
    ['Feuerball' + k('F / C') + ' kostet 2 Mana und macht 3-fachen Schaden', '#9ff6ff', 17],
    ['Flugphasen: ↑ / ↓ halten, Sterne sammeln, ausweichen', '#ffd84a', 17],
    ['Bosse (auch in der Luft!) können deine Zauber bannen', '#ff9aff', 17],
    ['Mit Sternen kaufst du in der Garderobe neue Looks', '#ffd84a', 17]
  ];
  rows.forEach((r, i) => txt(r[0], 122 + i * 36, r[2], r[1]));
  button('back', cx - 110, 384, 220, 54, 'Zurück', 'ghost', { size: 22 });
}
function gcard(cat, i, x, y, w, h) {
  const it = SHOP[cat].items[i], id = 'item:' + i, owned = OWN[cat].includes(i), sel = gPrev[cat] === i, eq = LOOK[cat] === i, hov = hoverId === id;
  UI.push({ id, x, y, w, h, on: true });
  ctx.save();
  ctx.fillStyle = sel ? 'rgba(96,64,200,0.92)' : hov ? 'rgba(60,36,130,0.92)' : 'rgba(28,14,62,0.88)'; rr(x, y, w, h, 14); ctx.fill();
  ctx.lineWidth = sel ? 3.5 : 2; ctx.strokeStyle = sel ? '#7ff6ff' : eq ? '#ffd84a' : 'rgba(154,107,255,0.55)'; ctx.stroke();
  const C = lookCols(Object.assign({}, gPrev, { [cat]: i })), mx = x + w / 2;
  ctx.save(); rr(x + 2, y + 2, w - 4, h - 4, 12); ctx.clip(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (cat === 'g') {
    const cy = y + 42; ctx.lineWidth = 1;
    ctx.fillStyle = C.hat; ctx.beginPath(); ctx.moveTo(mx - 14, cy - 8); ctx.lineTo(mx + 14, cy - 8); ctx.lineTo(mx + 3, cy - 38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.cape; ctx.beginPath(); ctx.moveTo(mx - 26, cy + 30); ctx.lineTo(mx - 10, cy - 6); ctx.lineTo(mx + 10, cy - 6); ctx.lineTo(mx + 26, cy + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.robe; ctx.beginPath(); ctx.moveTo(mx - 16, cy + 30); ctx.lineTo(mx - 6, cy - 4); ctx.lineTo(mx + 6, cy - 4); ctx.lineTo(mx + 16, cy + 30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.brim; ctx.beginPath(); ctx.ellipse(mx, cy - 8, 20, 5, 0, 0, 6.3); ctx.fill();
  } else if (cat === 'h') {
    const fl = it.st === 'flame'; ctx.translate(mx + 4, y + (fl ? 76 : 72)); ctx.scale(fl ? 1.05 : 1.55, fl ? 1.05 : 1.55); drawHat(it.st, 0, 0, 0, C);
  } else if (cat === 'b') {
    ctx.translate(mx - 4, y + 30); ctx.scale(1.45, 1.45); circle(0, 0, 11, '#f2c9a0'); drawBeard(it.st, it.c, 0, 0, 0); circle(5, -2, 1.8, '#222');
  } else {
    ctx.translate(mx, y + 74); ctx.scale(0.78, 0.78); drawBike(C);
  }
  ctx.restore();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = "bold 14px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#efe6ff'; ctx.fillText(it.n, mx, y + h - 26);
  ctx.font = "bold 14px 'Trebuchet MS',system-ui,sans-serif";
  if (eq) { ctx.fillStyle = '#9fffb0'; ctx.fillText('Aktiv', mx, y + h - 8); }
  else if (owned) { ctx.fillStyle = '#c9b8ff'; ctx.fillText('Im Besitz', mx, y + h - 8); }
  else { const s = String(it.p), tw = ctx.measureText(s).width; ctx.fillStyle = wallet >= it.p ? '#ffd84a' : '#ff9aa8'; ctx.fillText(s, mx - 8, y + h - 8); star5(mx + tw / 2 + 2, y + h - 12, 7, wallet >= it.p ? '#ffd84a' : '#ff9aa8'); }
  ctx.restore();
}
function drawGarage() {
  dim(0.74);
  const lw = W * 0.36, px0 = lw + 16, pw = W - px0 - 24, pcx = px0 + pw / 2;
  // Bühne links
  const sx = lw / 2 + 10, sy = 396;
  const sg = ctx.createRadialGradient(sx, sy, 10, sx, sy, 190); sg.addColorStop(0, 'rgba(150,100,255,0.55)'); sg.addColorStop(1, 'rgba(150,100,255,0)');
  ctx.fillStyle = sg; ctx.fillRect(sx - 200, sy - 120, 400, 240);
  ctx.strokeStyle = 'rgba(190,150,255,0.75)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(sx, sy + 8, 120, 20, 0, 0, 6.2832); ctx.stroke();
  ctx.strokeStyle = 'rgba(127,246,255,0.5)'; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -tm * 20; ctx.beginPath(); ctx.ellipse(sx, sy + 8, 150, 26, 0, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
  drawWizard(sx, sy, 1.5, gPrev, 0, 0, false, 0);
  // Kopfzeile
  button('back', 20, 16, 130, 48, 'Zurück', 'ghost', { size: 20 });
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.save(); ctx.shadowColor = '#b66bff'; ctx.shadowBlur = 18; ctx.font = "bold 32px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#f1e4ff'; ctx.fillText('GARDEROBE', pcx, 54); ctx.restore();
  starBadge(W - 24 - 120, 14, 120, 44);
  // Reiter
  const tw = (pw - 30) / 4;
  CATS.forEach((c, i) => button('tab:' + c, px0 + i * (tw + 10), 80, tw, 50, SHOP[c].name, 'tab', { active: gTab === c, size: 19 }));
  // Karten
  const cw = (pw - 30) / 4, items = SHOP[gTab].items;
  items.forEach((_, i) => gcard(gTab, i, px0 + (i % 4) * (cw + 10), 146 + Math.floor(i / 4) * 122, cw, 112));
  // Aktionsknopf
  const i = gPrev[gTab], it = items[i], owned = OWN[gTab].includes(i), eq = LOOK[gTab] === i;
  if (eq) button('buy', px0, 394, pw, 58, 'Ausgerüstet', 'ghost', { off: true, size: 22 });
  else if (owned) button('buy', px0, 394, pw, 58, 'Ausrüsten', 'primary', { size: 24 });
  else button('buy', px0, 394, pw, 58, 'Kaufen · ' + it.p, 'primary', { size: 24, icon: 'star', dim: wallet < it.p });
  // Name + Meldung
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = "bold 20px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#c9b8ff'; ctx.fillText(SHOP[gTab].name + ': ' + it.n, sx, 462);
  if (gMsg) { ctx.globalAlpha = Math.min(1, gMsg.t * 2); ctx.font = "bold 20px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = gMsg.col; ctx.fillText(gMsg.text, pcx, 490); ctx.globalAlpha = 1; }
  else { ctx.font = '15px sans-serif'; ctx.fillStyle = 'rgba(201,184,255,0.8)'; ctx.fillText('Sterne sammelst du in Flugphasen, auf der Strecke und bei Bossen.', pcx, 490); }
}
function drawOver() {
  const cx = W / 2, blink = 0.55 + 0.45 * Math.sin(tm * 4);
  dim(0.6);
  ctx.save(); ctx.shadowColor = '#ff4a6a'; ctx.shadowBlur = 20; txt('GAME OVER', 118, 70, '#ff8aa0', true); ctx.restore();
  txt('Punkte: ' + score(), 180, 34, '#fff', true);
  txt('Besiegte Feinde: ' + kills, 214, 20, '#c9b8ff');
  txt(newRec ? 'Neuer Rekord!' : 'Rekord: ' + hi, 250, 24, '#ffd84a', true);
  ctx.font = "bold 22px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#ffd84a';
  const s = '+' + runStars + ' Sterne gesammelt  ·  gesamt ' + wallet, tw = ctx.measureText(s).width;
  ctx.textAlign = 'left'; ctx.fillText(s, cx - tw / 2 + 14, 288); star5(cx - tw / 2 - 2, 281, 10, '#ffd84a'); ctx.textAlign = 'center';
  if (overT > 0.5) {
    button('again', cx - 258, 322, 250, 68, 'Nochmal', 'primary', { icon: 'play', size: 30 });
    button('menu', cx + 8, 322, 250, 68, 'Menü', 'ghost', { size: 28 });
    if (!touch) { ctx.globalAlpha = blink * 0.8; txt('Leertaste: nochmal  ·  Esc: Menü', 428, 16, '#c9b8ff'); ctx.globalAlpha = 1; }
  }
}
function drawPause() {
  const cx = W / 2;
  dim(0.55); txt('PAUSE', 190, 64, '#fff', true); txt(touch ? 'Tippen zum Weiterspielen' : 'P oder Enter zum Weiterspielen', 236, 22, '#c9b8ff');
  button('menu', cx - 110, 290, 220, 56, 'Hauptmenü', 'ghost', { size: 22 });
}

/* ===== 09-hud-render-loop.js ===== */

/* ---------- Effekte & HUD ---------- */
function drawFX() {
  for (const b of bolts) {
    const R = b.fire ? 40 : 24, g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, R);
    if (b.fire) { g.addColorStop(0, 'rgba(255,250,200,1)'); g.addColorStop(0.4, 'rgba(255,160,50,0.9)'); g.addColorStop(1, 'rgba(255,60,20,0)'); }
    else { g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(110,255,255,0.9)'); g.addColorStop(1, 'rgba(200,90,255,0)'); }
    ctx.fillStyle = g; ctx.fillRect(b.x - R - 2, b.y - R - 2, R * 2 + 4, R * 2 + 4);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * p.life / p.max), 0, 6.2832); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const q of pops) {
    ctx.globalAlpha = clamp(q.life * 1.5, 0, 1); ctx.font = 'bold ' + q.size + "px 'Trebuchet MS',system-ui,sans-serif";
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(20,5,50,0.9)'; ctx.strokeText(q.text, q.x, q.y);
    ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y);
  }
  ctx.globalAlpha = 1;
}
function drawHUD() {
  ctx.textAlign = 'left'; ctx.font = "30px 'Trebuchet MS',system-ui,sans-serif";
  for (let i = 0; i < Math.max(3, lives); i++) { ctx.fillStyle = i < lives ? '#ff4a6a' : '#3a2050'; ctx.fillText('♥', 18 + i * 36, 44); }
  for (let i = 0; i < MAXC; i++) {
    const x = 32 + i * 30, y = 74;
    circle(x, y, 10, '#1a2a44');
    if (i < charges) { circle(x, y, 10, '#5ff0ff'); circle(x - 3, y - 3, 3, '#fff'); }
    else if (i === charges) { ctx.strokeStyle = '#5ff0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 8, -1.57, -1.57 + 6.2832 * chargeT / 1.1); ctx.stroke(); }
  }
  if (silenceT > 0) {
    ctx.strokeStyle = '#ff5aff'; ctx.lineWidth = 3;
    for (let i = 0; i < MAXC; i++) { const x = 32 + i * 30; ctx.beginPath(); ctx.moveTo(x - 10, 64); ctx.lineTo(x + 10, 84); ctx.stroke(); }
    ctx.font = "bold 15px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#ff7aff'; ctx.fillText('ZAUBER GEBANNT ' + silenceT.toFixed(1) + ' s', 124, 80);
  } else { ctx.font = "bold 15px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#9fe'; ctx.fillText('Nagoony · Feuerball (2)', 124, 80); }
  ctx.textAlign = 'center'; ctx.font = "bold 36px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#fff'; ctx.fillText(String(score()), W / 2, 46);
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#c9b8ff'; ctx.fillText('PUNKTE', W / 2, 64);
  ctx.textAlign = 'left'; ctx.font = "bold 16px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#ffd84a'; ctx.fillText('Level ' + level, 20, 106);
  if (P.shield > 0) { ctx.fillStyle = '#7cf'; ctx.fillText('Schild ' + Math.ceil(P.shield) + ' s', 20, 128); }
  if (mode === 'fly' && !boss) {
    const fw = 200, k = clamp(flightT / (14 + Math.min(6, level)), 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(W / 2 - fw / 2, 74, fw, 8, 4); ctx.fill();
    ctx.fillStyle = '#7ff'; rr(W / 2 - fw / 2, 74, Math.max(8, fw * k), 8, 4); ctx.fill();
  }
  if (boss) {
    const bw = 360, k = clamp(boss.hp / boss.max, 0, 1);
    ctx.textAlign = 'center'; ctx.font = "bold 16px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#ffb0c0'; ctx.fillText(BOSS_NAMES[boss.skin] + ' · Phase ' + boss.phase, W / 2, 100);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; rr(W / 2 - bw / 2, 108, bw, 12, 6); ctx.fill();
    ctx.fillStyle = '#ff4a6a'; rr(W / 2 - bw / 2, 108, Math.max(8, bw * k), 12, 6); ctx.fill();
    ctx.fillStyle = 'rgba(20,5,50,0.8)'; ctx.fillRect(W / 2 - bw / 2 + bw / 3 - 1, 108, 2, 12); ctx.fillRect(W / 2 - bw / 2 + bw * 2 / 3 - 1, 108, 2, 12);
  }
  if (bannerObj && state === 'play') {
    const a = clamp(Math.min(bannerObj.t, bannerObj.max - bannerObj.t + 0.1) * 3, 0, 1);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.save(); ctx.shadowColor = '#b66bff'; ctx.shadowBlur = 20; txt(bannerObj.big, 170, 56, '#fff', true); ctx.restore();
    if (bannerObj.sub) txt(bannerObj.sub, 206, 20, '#e9d8ff');
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'right'; ctx.font = "bold 18px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#ffd84a'; ctx.fillText('Rekord ' + Math.max(hi, score()), W - (touch ? 100 : 76), 36);
  const rx = W - (touch ? 100 : 76), sn = String(wallet);
  ctx.font = "bold 18px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = '#fff'; ctx.fillText(sn, rx, 62);
  star5(rx - ctx.measureText(sn).width - 12, 56, 8, '#ffd84a');
  ctx.font = '13px sans-serif'; ctx.fillStyle = '#c9b8ff'; if (!touch) ctx.fillText(muted ? 'Ton aus (M)' : 'Ton an (M)', W - 76, 84);
}
function txt(s, y, size, color, bold) {
  ctx.font = (bold ? 'bold ' : '') + size + "px 'Trebuchet MS',system-ui,sans-serif"; ctx.fillStyle = color; ctx.fillText(s, W / 2, y);
}
function dim(a) { ctx.fillStyle = 'rgba(8,3,22,' + a + ')'; ctx.fillRect(0, 0, W, H); }
const touch = TOUCH;
let newRec = false;
function drawOverlay() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; UI.length = 0;
  if (state === 'title') drawMenu(); else if (state === 'over') drawOver(); else if (state === 'paused') drawPause();
}
function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.save();
  if (shake > 0) ctx.translate(rand(-1, 1) * shake * 16, rand(-1, 1) * shake * 10);
  drawSky(); drawForest(); drawGround();
  if (flyBlend > 0.01) drawAir();
  const sxp = state === 'title' ? 170 : P.x;
  ctx.fillStyle = 'rgba(0,0,0,' + 0.35 * (1 - flyBlend) + ')'; ctx.beginPath(); ctx.ellipse(sxp, GROUND + 6, Math.max(20, 54 - (GROUND - P.y) * 0.15), 7, 0, 0, 6.3); ctx.fill();
  for (const o of obs) drawObstacle(o);
  if (boss) drawBoss(boss);
  if (state === 'title') { if (menu !== 'garage') drawWizard(170, GROUND, 1, LOOK, 0, 0, false, 0); } else drawPlayer();
  drawShield(); drawFX(); drawSilence(); drawBubble();
  if (pal.snow > 0.02) drawSnow();
  ctx.restore();
  if (state === 'play' || state === 'paused') drawHUD();
  drawOverlay();
}

/* ---------- Hauptschleife ---------- */
let last = 0;
function frame(ts) {
  const dt = Math.min(0.033, (ts - last) / 1000 || 0); last = ts; tm += dt;
  if (state === 'play') update(dt);
  else if (state === 'title') { scroll += 140 * dt; P.wheel += 7 * dt; }
  else if (state === 'over') overT += dt;
  if (state !== 'paused') updateFX(dt);
  render(); syncPause();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

})();
