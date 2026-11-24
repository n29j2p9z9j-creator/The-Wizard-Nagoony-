
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
