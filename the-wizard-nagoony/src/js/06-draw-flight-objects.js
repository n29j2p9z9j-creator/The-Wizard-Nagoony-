
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
