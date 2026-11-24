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
