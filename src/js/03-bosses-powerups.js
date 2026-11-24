
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
