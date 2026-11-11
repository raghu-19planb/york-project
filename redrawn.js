// Toronto, redrawn: a short film drawn in code.
// Every outline is real geometry from data/boundaries.js: the 1834 city, the
// annexations in the order they happened, then the six municipalities of
// 1967 that became one city in 1998. The film is a pure function of time,
// so it can be scrubbed; sound is a few notes made with Web Audio.
(function () {
  const B = YP.BOUNDARIES, A = B.annexations, F = B.former;
  const canvas = document.getElementById('film-canvas'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const C = { paper: '#f3ecdd', ink: '#17202b', red: '#b8232f', sun: '#e9b44c' };
  const clamp = v => Math.max(0, Math.min(1, v));
  const ease = k => k * k * (3 - 2 * k);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const P = hex(a), Q = hex(b); return 'rgb(' + P.map((v, i) => Math.round(v + (Q[i] - v) * k)).join(',') + ')'; };

  // ---------- geometry: paths in world metres, north up (so y is negated) ----------
  function shape(rings) {
    const path = new Path2D(); let longest = 0, cx = 0, cy = 0, big = 0;
    for (const r of rings) {
      let per = 0, sx = 0, sy = 0;
      r.forEach((p, i) => {
        if (i) path.lineTo(p[0], -p[1]); else path.moveTo(p[0], -p[1]);
        const q = r[(i + 1) % r.length]; per += Math.hypot(q[0] - p[0], q[1] - p[1]); sx += p[0]; sy += p[1];
      });
      path.closePath();
      longest = Math.max(longest, per);
      if (per > big) { big = per; cx = sx / r.length; cy = sy / r.length; }
    }
    return { path, per: longest, cx, cy };
  }
  const bounds = list => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const f of list) for (const r of f.rings) for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    return { x0, x1, y0, y1 };
  };
  A.forEach(a => Object.assign(a, shape(a.rings)));
  F.forEach(f => Object.assign(f, shape(f.rings), { label: f.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) }));
  const NEAR = bounds(A), FAR = bounds(F);

  // ---------- timeline (seconds) ----------
  const T_1834 = 1.2, T_ANNEX = 4.6, STEP = 0.42, DRAW = 0.9;
  A.forEach((a, i) => { a.t = i === 0 ? T_1834 : T_ANNEX + (i - 1) * STEP; a.dur = i === 0 ? 3 : DRAW; });
  const T_ZOOM = A[A.length - 1].t + DRAW + 0.4, T_METRO = T_ZOOM + 2, T_SIX = T_METRO + 4, T_ONE = T_SIX + 3.5, TOTAL = T_ONE + 5.5;
  const mixHex = (a, b, k) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, '0')).join('');
  const settled = year => mixHex('#7f1a23', '#e6ab9d', clamp((year - 1834) / (1967 - 1834))); // older land is darker

  function caption(t) {
    if (t < T_1834) return { year: '', text: 'Toronto, redrawn', sub: '1834 to 1998' };
    if (t < T_ZOOM) {
      let a = A[0]; for (const x of A) if (x.t <= t) a = x;
      return { year: a.year, text: a.name, sub: a.num === 1 ? 'The city is incorporated' : 'Annexation ' + a.num + ' of 50 · ' + a.date };
    }
    if (t < T_SIX) return { year: 1954, text: 'Metropolitan Toronto', sub: 'Thirteen municipalities under one regional government' };
    if (t < T_ONE) return { year: 1967, text: 'Thirteen become six', sub: 'The City of Toronto and five boroughs' };
    return { year: 1998, text: 'One City of Toronto', sub: '1 January 1998' };
  }

  // ---------- drawing ----------
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    render(now);
  }
  function fit(b, pad) {
    const w = b.x1 - b.x0, h = b.y1 - b.y0, s = Math.min(W / w, H / h) * (1 - pad);
    return { s, x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 };
  }
  function render(t) {
    if (!W) return;
    const a = fit(NEAR, 0.14), b = fit(FAR, 0.1), k = ease(clamp((t - T_ZOOM) / 3));
    const s = Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * k), cx = a.x + (b.x - a.x) * k, cy = a.y + (b.y - a.y) * k;
    const px = 1 / s; // one screen pixel in world units
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (W / 2 - cx * s), dpr * (H / 2 + cy * s));
    ctx.lineJoin = 'round';

    // The six municipalities: dashed in 1954, solid in 1967, one shape in 1998.
    const metro = clamp((t - T_METRO) / 3), six = clamp((t - T_SIX) / 1.2), one = ease(clamp((t - T_ONE) / 2.5));
    if (metro > 0) {
      if (one > 0) { ctx.strokeStyle = C.ink; ctx.lineWidth = 4 * px; ctx.setLineDash([]); for (const f of F) ctx.stroke(f.path); }
      for (const f of F) {
        ctx.fillStyle = one > 0 ? mix('#efe2cf', C.red, one) : 'rgba(184,35,47,' + 0.07 * metro + ')';
        ctx.fill(f.path);
        if (one > 0) { ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5 * px; ctx.setLineDash([]); ctx.stroke(f.path); }
      }
      if (one < 1) {
        ctx.globalAlpha = 1 - one; ctx.strokeStyle = C.ink; ctx.lineWidth = (1 + six) * px;
        for (const f of F) {
          if (six >= 1) ctx.setLineDash([]);
          else if (metro >= 1) ctx.setLineDash([7 * px, 5 * px]);
          else ctx.setLineDash([f.per * metro, f.per * 2]); // the outline draws itself
          ctx.stroke(f.path);
        }
        ctx.globalAlpha = 1;
      }
    }
    // The 1834 city and the annexations, each drawing itself and then settling into its colour.
    ctx.globalAlpha = 1 - one;
    for (const x of A) {
      const p = clamp((t - x.t) / x.dur);
      if (p <= 0) continue;
      const fresh = clamp(1 - (t - x.t - x.dur) / 1.3);
      ctx.globalAlpha = (1 - one) * ease(p);
      ctx.fillStyle = fresh > 0 ? mix(settled(x.year), C.sun, fresh) : settled(x.year); // newly added land flashes yellow
      ctx.fill(x.path);
      ctx.globalAlpha = 1 - one;
      ctx.strokeStyle = C.ink; ctx.lineWidth = (fresh > 0 ? 2 : 0.8) * px;
      ctx.setLineDash(p < 1 ? [x.per * p, x.per * 2] : []);
      ctx.stroke(x.path);
    }
    ctx.globalAlpha = 1; ctx.setLineDash([]);

    // Names, in screen space.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = x => W / 2 + (x - cx) * s, sy = y => H / 2 - (y - cy) * s;
    const size = Math.max(9, Math.min(13, W / 60));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (six > 0 && one < 1) {
      ctx.globalAlpha = six * (1 - one); ctx.font = '600 ' + size + 'px "IBM Plex Mono", monospace'; ctx.fillStyle = C.ink;
      for (const f of F) if (f.name !== 'TORONTO') ctx.fillText(f.label.toUpperCase(), sx(f.cx), sy(f.cy));
    }
    if (one > 0) {
      ctx.globalAlpha = one; ctx.fillStyle = C.paper; ctx.font = '600 ' + Math.round(size * 2.6) + 'px Fraunces, Georgia, serif';
      ctx.fillText('Toronto', sx((FAR.x0 + FAR.x1) / 2), sy((FAR.y0 + FAR.y1) / 2 + 2500));
    }
    ctx.globalAlpha = 1;

    const c = caption(t);
    $('film-year').textContent = c.year; $('film-text').textContent = c.text; $('film-sub').textContent = c.sub;
  }

  // ---------- sound ----------
  let ac = null, muted = false;
  function note(freq, dur, vol, type) {
    if (!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain(), at = ac.currentTime;
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + dur + 0.05);
  }
  const SCALE = [293.66, 329.63, 369.99, 440, 493.88]; // D major pentatonic
  const cues = A.map((a, i) => ({ t: a.t, play: () => i === 0 ? [146.83, 220].forEach(f => note(f, 3.2, 0.09, 'sine')) : note(SCALE[(i * 2) % 5] * (i % 10 < 5 ? 0.5 : 1), 0.9, 0.07) }));
  cues.push({ t: T_METRO, play: () => [146.83, 220, 293.66].forEach(f => note(f, 3.5, 0.06, 'sine')) });
  cues.push({ t: T_SIX, play: () => SCALE.forEach((f, i) => setTimeout(() => note(f, 1.2, 0.06), i * 110)) });
  cues.push({ t: T_ONE, play: () => [146.83, 220, 293.66, 369.99, 440].forEach(f => note(f, 5, 0.06, 'sine')) });

  // ---------- transport ----------
  const POSTER = T_ZOOM - 0.2; // before Play: the city as it stood after the annexations
  let now = POSTER, playing = false, last = 0;
  const mmss = t => '00:' + String(Math.floor(t)).padStart(2, '0');
  function ui() {
    $('film-seek').value = Math.round(now / TOTAL * 1000);
    $('film-time').textContent = mmss(now) + ' / ' + mmss(TOTAL);
    $('film-play').textContent = playing ? 'Pause' : now >= TOTAL ? 'Replay' : now === POSTER ? 'Play with sound' : 'Play';
  }
  function frame(ts) {
    if (!playing) return;
    const dt = Math.min(0.1, (ts - last) / 1000), before = now; last = ts;
    now = Math.min(TOTAL, now + dt);
    for (const c of cues) if (c.t > before && c.t <= now) c.play();
    render(now); ui();
    if (now >= TOTAL) { playing = false; ui(); return; }
    requestAnimationFrame(frame);
  }
  $('film-play').addEventListener('click', () => {
    if (playing) { playing = false; ui(); return; }
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
    if (ac && ac.state === 'suspended') ac.resume();
    if (now >= TOTAL || now === POSTER) now = 0;
    playing = true; last = performance.now(); ui(); requestAnimationFrame(frame);
  });
  $('film-mute').addEventListener('click', () => {
    muted = !muted;
    $('film-mute').textContent = muted ? 'Sound off' : 'Sound on';
    $('film-mute').setAttribute('aria-pressed', String(muted));
  });
  $('film-seek').addEventListener('input', e => { now = e.target.value / 1000 * TOTAL; render(now); ui(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) { playing = false; ui(); } });

  // ---------- sources ----------
  const src = $('film-sources');
  for (const k of ['annexations', 'former']) {
    const s = B.sources[k], li = document.createElement('li'), a = document.createElement('a');
    a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.title;
    li.append(a, ' · ' + s.by + ' · ' + s.licence);
    src.append(li);
  }
  $('film-length').textContent = Math.round(TOTAL) + ' seconds';

  new ResizeObserver(resize).observe(canvas);
  resize(); ui();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => render(now));
  YP.film = { render, TOTAL, get now() { return now; } };
})();
