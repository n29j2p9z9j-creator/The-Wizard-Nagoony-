
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
