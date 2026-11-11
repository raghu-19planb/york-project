// Next Stop, Toronto: a one-button ride through Toronto's history.
// The timeline is distance: every pixel travelled is a slice of a year.
(function () {
  const { W, H, GROUND, Y0, Y1, PXPY } = YP.GEO; // set in landscape.js
  const PX = 150, SPEED = 300;
  const END_D = (Y1 - Y0) * PXPY;
  const C = YP.C;
  const $ = id => document.getElementById(id);

  const cv = $('c'), ctx = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = W * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const S = { state: 'menu', mode: 'rush' };
  let cardTimer = 0;

  function reset(mode) {
    S.mode = mode; S.state = 'run';
    S.d = 0; S.t = 0; S.jy = 0; S.vy = 0; S.lives = 3; S.safe = 0;
    S.banner = null; S.ride = 'canoe';
    S.tokens = YP.RECORDS.map((r, i) => ({ r, d0: (r.at - Y0) * PXPY, high: mode === 'rush' && i % 3 === 1, got: false }));
    S.obstacles = [];
    if (mode === 'rush') {
      let seed = 20261110;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let x = 1100; x < END_D - 400; x += 400 + rnd() * 420) {
        if (S.tokens.some(t => Math.abs(t.d0 - x) < 230)) continue;
        S.obstacles.push({ d0: x, k: rnd() });
      }
    }
    $('menu').hidden = true; $('paused').hidden = true; $('after').hidden = true;
    $('hud').hidden = false; hideCard();
    $('lives').hidden = mode !== 'rush';
    hud();
  }

  const year = () => Math.min(Y1, Math.floor(Y0 + S.d / PXPY));
  const found = () => S.tokens.filter(t => t.got).length;

  function hud() {
    $('year').textContent = year();
    $('ride').textContent = YP.vehicleFor(year()).name;
    const pop = YP.populationAt(year());
    $('pop').textContent = pop ? pop[1].toLocaleString('en-CA') + ' people · ' + pop[0] + ' count' : '';
    $('found').textContent = found() + ' / ' + S.tokens.length + ' punched';
    $('lives').textContent = '●'.repeat(Math.max(0, S.lives)) + '○'.repeat(Math.max(0, 3 - S.lives));
  }

  function showCard(r) {
    $('card-yr').textContent = r.label;
    $('card-title').textContent = r.title;
    $('card-text').textContent = r.text;
    $('card-src').textContent = r.source;
    $('card-src').href = r.url;
    $('card').hidden = false;
    clearTimeout(cardTimer);
    if (S.mode === 'explore') {
      S.state = 'card';
      $('card-go').hidden = false;
      $('card-go').focus();
    } else {
      $('card-go').hidden = true;
      cardTimer = setTimeout(hideCard, 6000);
    }
  }
  function hideCard() { clearTimeout(cardTimer); $('card').hidden = true; }

  function jump() {
    if (S.state === 'run' && S.jy === 0) S.vy = 640;
  }
  function act() {
    if (S.state === 'card') { hideCard(); S.state = 'run'; }
    else jump();
  }
  function pause(on) {
    if (on && S.state === 'run') { S.state = 'paused'; $('paused').hidden = false; }
    else if (!on && S.state === 'paused') { S.state = 'run'; $('paused').hidden = true; }
  }

  // ---------- update ----------
  function update(dt) {
    S.t += dt;
    S.d += SPEED * dt;
    S.vy -= 1750 * dt;
    S.jy = Math.max(0, S.jy + S.vy * dt);
    if (S.jy === 0) S.vy = 0;
    if (S.safe > 0) S.safe -= dt;

    const ride = YP.vehicleFor(year());
    if (ride.id !== S.ride) {
      S.ride = ride.id;
      S.banner = { text: year() + ' · ' + ride.name, until: S.t + 2.4 };
    }

    for (const t of S.tokens) {
      if (t.got) continue;
      const dx = t.d0 - S.d;
      if (Math.abs(dx) < 52 && (t.high ? S.jy > 48 : S.jy < 70)) {
        t.got = true;
        showCard(t.r);
        break;
      }
    }
    if (S.safe <= 0) {
      for (const o of S.obstacles) {
        const sx = PX + 46 + (o.d0 - S.d);
        if (sx + 30 > PX + 16 && sx < PX + 80 && S.jy < 30) {
          S.lives--; S.safe = 1.4;
          if (S.lives <= 0) { hud(); return finish(false); }
          break;
        }
      }
    }
    hud();
    if (S.d >= END_D) finish(true);
  }

  // ---------- draw ----------
  function drawGround(d, yr) {
    const top = GROUND - 12;
    if (yr < 1861) {
      ctx.fillStyle = '#3f7f93'; ctx.fillRect(0, top, W, H - top);
      ctx.strokeStyle = 'rgba(243,236,221,0.5)'; ctx.lineWidth = 2;
      for (let row = 0; row < 5; row++) {
        const y = top + 16 + row * 22, sp = 90 + row * 30, o = (d * (0.7 + row * 0.25)) % sp;
        ctx.beginPath();
        for (let x = -o; x < W; x += sp) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 14, y - 5, x + 28, y); }
        ctx.stroke();
      }
      return;
    }
    ctx.fillStyle = yr < 1892 ? '#b08d5f' : yr < 1954 ? '#7d7468' : '#5a5f66';
    ctx.fillRect(0, top, W, H - top);
    ctx.fillStyle = 'rgba(23,32,43,0.35)';
    const o = d % 36;
    for (let x = -o; x < W; x += 36) ctx.fillRect(x, GROUND - 1, 16, 5);
    ctx.fillStyle = C.ink; ctx.fillRect(0, GROUND - 2, W, 3);
    ctx.fillStyle = 'rgba(23,32,43,0.12)';
    for (let x = -(d % 120); x < W; x += 120) ctx.fillRect(x, GROUND + 30, 60, 6);
    if (yr >= 1892 && yr < 1954) { ctx.fillStyle = C.ink; ctx.fillRect(0, GROUND - 67, W, 1.5); }
    if (yr >= 1954) { ctx.fillStyle = C.sun; ctx.fillRect(0, GROUND + 10, W, 3); }
  }

  function drawObstacle(sx, k, yr) {
    const y = GROUND;
    ctx.lineWidth = 2; ctx.strokeStyle = C.ink;
    if (yr < 1861) {
      if (k < 0.5) { // rock
        ctx.fillStyle = '#6f7a80';
        ctx.beginPath(); ctx.moveTo(sx - 4, y + 4); ctx.lineTo(sx + 4, y - 26); ctx.lineTo(sx + 20, y - 34); ctx.lineTo(sx + 34, y + 4); ctx.fill(); ctx.stroke();
      } else { // drifting log
        ctx.fillStyle = '#6b4526';
        ctx.fillRect(sx - 4, y - 22, 38, 24); ctx.strokeRect(sx - 4, y - 22, 38, 24);
        ctx.fillStyle = '#c79a66'; ctx.beginPath(); ctx.ellipse(sx + 34, y - 10, 5, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    } else if (yr < 1954) {
      if (k < 0.5) { // barrel
        ctx.fillStyle = '#8a5a33'; ctx.fillRect(sx, y - 34, 28, 34); ctx.strokeRect(sx, y - 34, 28, 34);
        ctx.fillStyle = C.ink; ctx.fillRect(sx, y - 26, 28, 3); ctx.fillRect(sx, y - 11, 28, 3);
      } else { // crate
        ctx.fillStyle = '#c79a66'; ctx.fillRect(sx, y - 32, 32, 32); ctx.strokeRect(sx, y - 32, 32, 32);
        ctx.beginPath(); ctx.moveTo(sx, y - 32); ctx.lineTo(sx + 32, y); ctx.moveTo(sx + 32, y - 32); ctx.lineTo(sx, y); ctx.stroke();
      }
    } else if (k < 0.5) { // cone
      ctx.fillStyle = '#e8762c';
      ctx.beginPath(); ctx.moveTo(sx + 15, y - 36); ctx.lineTo(sx + 28, y); ctx.lineTo(sx + 2, y); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.paper; ctx.fillRect(sx + 9, y - 20, 12, 5);
    } else { // barrier
      ctx.fillStyle = C.paper; ctx.fillRect(sx, y - 30, 34, 14); ctx.strokeRect(sx, y - 30, 34, 14);
      ctx.fillStyle = C.red; ctx.fillRect(sx + 5, y - 30, 7, 14); ctx.fillRect(sx + 21, y - 30, 7, 14);
      ctx.fillStyle = C.ink; ctx.fillRect(sx + 3, y - 16, 3, 16); ctx.fillRect(sx + 28, y - 16, 3, 16);
    }
  }

  function drawToken(sx, t) {
    const y = GROUND - (t.high ? 128 : 34) + Math.sin(S.t * 4 + t.d0) * 4;
    ctx.save(); ctx.translate(sx, y); ctx.rotate(-0.12);
    ctx.fillStyle = C.paper; ctx.strokeStyle = C.ink; ctx.lineWidth = 2;
    ctx.fillRect(-20, -13, 40, 26); ctx.strokeRect(-20, -13, 40, 26);
    ctx.fillStyle = C.red; ctx.fillRect(-20, -13, 40, 7);
    ctx.fillStyle = C.ink; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(t.r.at < 1787 ? 'TRAIL' : t.r.label, 0, 8);
    ctx.restore();
  }

  function draw() {
    const d = S.d || 0, yr = Y0 + d / PXPY;
    if (YP.view) { YP.view.draw(S, d, yr); return; } // 3D renderer (scene3d.js); below is the 2D fallback
    YP.drawLandscape(ctx, d, yr, S.state === 'menu' ? performance.now() / 1000 : S.t);
    drawGround(d, yr);
    if (S.state === 'menu') { YP.drawVehicle(ctx, 'canoe', PX, GROUND, performance.now() / 1000); return; }
    for (const o of S.obstacles) {
      const sx = PX + 46 + (o.d0 - d);
      if (sx > -60 && sx < W + 20) drawObstacle(sx, o.k, Y0 + o.d0 / PXPY);
    }
    for (const t of S.tokens) {
      const sx = PX + 46 + (t.d0 - d);
      if (!t.got && sx > -40 && sx < W + 40) drawToken(sx, t);
    }
    if (!(S.safe > 0 && Math.floor(S.t * 12) % 2)) YP.drawVehicle(ctx, S.ride, PX, GROUND - S.jy, S.t);
    if (S.banner && S.t < S.banner.until) {
      ctx.font = '600 30px Fraunces, Georgia, serif';
      const w = ctx.measureText(S.banner.text).width + 36;
      ctx.fillStyle = C.ink; ctx.fillRect((W - w) / 2, 150, w, 50);
      ctx.fillStyle = C.paper; ctx.textAlign = 'center'; ctx.fillText(S.banner.text, W / 2, 185);
    }
  }

  // ---------- end of run ----------
  function finish(completed) {
    S.state = 'end';
    hideCard();
    $('hud').hidden = true;
    const n = found(), total = S.tokens.length;
    $('after-kicker').textContent = 'Next Stop, Toronto · ' + (S.mode === 'rush' ? 'Rush' : 'Explore');
    $('after-title').textContent = completed ? 'End of the line: 2026.' : 'The ride stopped in ' + year() + '.';
    $('after-sub').textContent = n + ' of ' + total + ' records punched. Every one is listed below with its source.';
    drawTransfer(n, total, completed);
    const list = $('after-records');
    list.textContent = '';
    S.tokens.forEach(t => {
      const li = YP.recordItem(t.r);
      if (!t.got) li.className = 'missed';
      list.append(li);
    });
    $('after').hidden = false;
    $('after').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function drawTransfer(n, total, completed) {
    const c = $('transfer'), x = c.getContext('2d'), w = c.width, h = c.height;
    x.fillStyle = '#e9dfca'; x.fillRect(0, 0, w, h);
    x.fillStyle = C.red; x.fillRect(0, 0, w, 58);
    x.fillStyle = C.paper; x.textBaseline = 'middle';
    x.font = '600 26px Fraunces, Georgia, serif'; x.textAlign = 'left'; x.fillText('The York Project', 40, 30);
    x.font = '600 15px "IBM Plex Mono", monospace'; x.textAlign = 'right'; x.fillText('TRANSFER', w - 40, 30);
    x.fillStyle = C.ink; x.textAlign = 'left';
    x.font = '14px "IBM Plex Mono", monospace';
    const now = new Date();
    const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    x.fillText('CARRYING PLACE · ' + S.mode.toUpperCase() + ' · ISSUED ' + today, 40, 88);
    x.fillText(completed ? 'RODE THE WHOLE LINE TO 2026' : 'RODE AS FAR AS ' + year(), 40, 110);

    const x0 = 62, x1 = w - 62, y = 180;
    x.strokeStyle = C.ink; x.lineWidth = 2;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke();
    x.textAlign = 'center'; x.font = '12px "IBM Plex Mono", monospace';
    S.tokens.forEach((t, i) => {
      const px = x0 + (x1 - x0) * i / (S.tokens.length - 1);
      x.beginPath(); x.arc(px, y, 12, 0, Math.PI * 2);
      if (t.got) { x.fillStyle = C.ink; x.fill(); }
      else { x.fillStyle = '#e9dfca'; x.fill(); x.setLineDash([3, 3]); x.stroke(); x.setLineDash([]); }
      x.fillStyle = C.ink;
      x.fillText(t.r.at < 1787 ? 'TRAIL' : t.r.label, px, y + 30);
    });
    x.textAlign = 'left';
    x.font = '600 64px Fraunces, Georgia, serif'; x.fillText(n + ' / ' + total, 40, 276);
    const nw = x.measureText(n + ' / ' + total).width;
    x.font = '14px "IBM Plex Mono", monospace';
    x.fillText('RECORDS PUNCHED', 56 + nw, 286);
    x.textAlign = 'right'; x.fillText('NOT VALID FOR TRAVEL · GOOD FOR ONE CITY', w - 40, 286);
    // perforations
    x.fillStyle = C.paper;
    for (let py = 12; py < h; py += 24) { x.beginPath(); x.arc(0, py, 7, 0, Math.PI * 2); x.arc(w, py, 7, 0, Math.PI * 2); x.fill(); }
    $('save').href = c.toDataURL('image/png');
  }

  // ---------- loop and input ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.state === 'run') update(dt);
    if (S.state !== 'end') draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('button, a')) return;
    if (e.code === 'Space' || e.code === 'ArrowUp') { if (S.state === 'run' || S.state === 'card') { e.preventDefault(); act(); } }
    else if (e.code === 'KeyP' || e.code === 'Escape') pause(S.state === 'run');
  });
  $('stage').addEventListener('pointerdown', e => {
    if (e.target.closest('button, a')) return;
    act();
  });
  $('card-go').addEventListener('click', act);
  $('pause').addEventListener('click', () => pause(true));
  $('resume').addEventListener('click', () => pause(false));
  $('play-rush').addEventListener('click', () => reset('rush'));
  $('play-explore').addEventListener('click', () => reset('explore'));
  $('again').addEventListener('click', () => {
    $('after').hidden = true; S.state = 'menu'; S.d = 0; $('menu').hidden = false;
    window.scrollTo({ top: 0 });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

  // Test hook: lets the run be driven and inspected from the console.
  YP.game = { S, reset, update, finish };
})();
