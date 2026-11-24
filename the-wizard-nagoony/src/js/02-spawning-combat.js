
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
