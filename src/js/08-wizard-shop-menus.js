
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
