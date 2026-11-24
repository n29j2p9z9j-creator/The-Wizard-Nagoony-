
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
