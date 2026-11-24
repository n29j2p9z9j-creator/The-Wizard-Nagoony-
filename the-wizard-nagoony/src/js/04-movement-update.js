
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
