// Toronto, redrawn: one unbroken line, drawn by a maple leaf.
//
// The leaf is the pen. It travels over the dark ground and leaves a chalk line behind it: the shore and creeks of
// 1802, the city limits of 1834, every annexation in the order it happened, the six municipalities, and today's
// shore. Nothing is erased; later lines cross earlier ones. At the end the whole drawing is the shape of the city.
//
// What is real: every solid line. Shore and creeks are from data/history.js (William Chewett's map of 1802),
// limits from data/boundaries.js, today's shore from data/shoreline.js.
// What is drawing: the order the leaf takes within a year, the dotted strokes where it crosses from one outline to
// the next (they are the leaf travelling, not anything on a map), the colours, the leaf itself and the notes.
//
// The film is a pure function of time, so it can be scrubbed. Plain 2D canvas; no library.
(function () {
  const YP = window.YP, B = YP.BOUNDARIES, HIST = YP.HISTORY, SHORE = YP.SHORE;
  const $ = id => document.getElementById(id);
  const canvas = $('film-canvas'), stage = $('film');
  if (!canvas || !B || !HIST || !SHORE) return;
  const ctx = canvas.getContext('2d');
  const clamp = v => Math.max(0, Math.min(1, v)), ease = k => k * k * (3 - 2 * k), lerp = (a, b, k) => a + (b - a) * k;
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const INK = { shore: '#a6d8da', creek: '#86c2c8', limit: '#fff6e5', boro: '#f1dcb4', today: '#e9b44c', red: '#e2493f' };

  // ---------- the line ----------
  const segs = [];
  let pen = null;
  const lengthOf = pts => { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; };
  function put(pts, kind, meta) {
    if (pen && dist(pen, pts[0]) > 1) segs.push({ kind: 'travel', pts: [pen, pts[0]], chapter: meta.chapter }); // the leaf crossing over
    segs.push(Object.assign({ kind, pts }, meta)); pen = pts[pts.length - 1];
  }
  function ring(r, kind, meta) { // a closed outline, begun at the corner nearest the leaf and brought back to it
    let pts = r.slice(); if (dist(pts[0], pts[pts.length - 1]) < 1) pts.pop();
    let k = 0; if (pen) { let best = 1e18; pts.forEach((p, i) => { const d = dist(pen, p); if (d < best) { best = d; k = i; } }); }
    pts = pts.slice(k).concat(pts.slice(0, k)); pts.push(pts[0]);
    put(pts, kind, meta);
  }
  function lines(list, kind, meta) { // open lines, each begun at its nearer end, nearest line first
    const left = list.filter(l => l.length > 1).map(l => l.slice());
    while (left.length) {
      let bi = 0, flip = false, best = 1e18;
      if (pen) left.forEach((l, i) => { const a = dist(pen, l[0]), b = dist(pen, l[l.length - 1]); if (a < best) { best = a; bi = i; flip = false; } if (b < best) { best = b; bi = i; flip = true; } });
      const l = left.splice(bi, 1)[0]; put(flip ? l.reverse() : l, kind, meta);
    }
  }
  // A map's water is drawn as shapes cut off at the edge of the sheet. Only the edge that is shore is wanted, so
  // the straight runs along the sheet's edge are dropped and what is left is kept as open lines. The sheets lie at
  // an angle, so an edge is also known by its length: a traced shore has no single straight run of 700 m.
  function shoreLines(m) {
    const all = [].concat(...m.water), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), E = 40;
    const edge = p => p[0] < x0 + E || p[0] > x1 - E || p[1] < y0 + E || p[1] > y1 - E, out = [];
    for (const r of m.water) {
      let run = [];
      for (let i = 0; i <= r.length; i++) {
        const a = r[i % r.length], b = r[(i + 1) % r.length];
        if ((edge(a) && edge(b)) || dist(a, b) > 700) { if (run.length > 1) out.push(run); run = []; } else { if (!run.length) run.push(a); run.push(b); }
      }
      if (run.length > 1) out.push(run);
    }
    return out.filter(l => lengthOf(l) > 400);
  }

  const m1802 = HIST.maps.find(m => m.year === 1802);
  const A = B.annexations, F = B.former;
  const CH = [ // the story: what the leaf draws, and for how long
    { id: 'shore', year: '1802', name: 'The shore', dur: 8, text: 'The shore, as William Chewett mapped it', sub: 'A bay behind a long bar of sand. No city yet.' },
    { id: 'creeks', year: '1802', name: 'The creeks', dur: 5, text: 'The creeks on the same map', sub: 'Most of them are buried under the city now.' },
    { id: 'city', year: '1834', name: 'City and Liberties', dur: 5, text: 'York becomes the City of Toronto', sub: 'The first limits: the city and its liberties.' },
    { id: 'annex', year: '1883', name: 'The annexations', dur: 22, text: 'The city takes in its neighbours' },
    { id: 'metro', year: '1954', name: 'Six municipalities', dur: 12, text: 'Metropolitan Toronto', sub: 'By 1967: Toronto, York, East York, North York, Etobicoke, Scarborough.' },
    { id: 'one', year: '1998', name: 'One city', dur: 4.5, text: 'One city', sub: 'The six are joined. Every line the leaf drew is still here.' },
    { id: 'today', year: 'Today', name: 'The shore has moved', dur: 7, text: 'Today’s shore, over the shore of 1802', sub: 'The gold line is the water’s edge now. The land between was made.' },
    { id: 'end', year: 'Today', name: 'Toronto', dur: 4.5, text: 'Toronto, redrawn', sub: 'One line, one leaf.' }
  ];
  const chap = id => CH.find(c => c.id === id);
  lines(shoreLines(m1802), 'shore', { chapter: 'shore', year: '1802' });
  lines(m1802.creeks, 'creek', { chapter: 'creeks', year: '1802' });
  A.forEach((a, i) => a.rings.forEach(r => ring(r, 'limit', { chapter: i === 0 ? 'city' : 'annex', year: String(a.year), label: a.name, date: a.date, n: i })));
  F.forEach(f => f.rings.forEach(r => ring(r, 'boro', { chapter: 'metro', year: '1967', label: f.name.charAt(0) + f.name.slice(1).toLowerCase().replace(/ (.)/g, (s, c) => ' ' + c.toUpperCase()) })));
  lines([SHORE.shore].concat(SHORE.islands.map(r => r.concat([r[0]]))), 'today', { chapter: 'today', year: 'Today' });

  // time: within a chapter the leaf keeps one speed over the lines, and moves faster where it only travels
  let T = 0;
  for (const c of CH) {
    c.t = T; c.segs = segs.filter(s => s.chapter === c.id);
    let W = 0; for (const s of c.segs) { s.len = lengthOf(s.pts); s.w = s.len * (s.kind === 'travel' ? 0.3 : 1); W += s.w; }
    let acc = 0; for (const s of c.segs) { s.t0 = T + c.dur * acc / W; acc += s.w; s.t1 = T + c.dur * acc / W; }
    T += c.dur;
  }
  const TOTAL = T, T_ONE = chap('one').t, T_END = chap('end').t;
  for (const s of segs) { s.cum = [0]; for (let i = 1; i < s.pts.length; i++) s.cum.push(s.cum[i - 1] + dist(s.pts[i - 1], s.pts[i])); }
  const drawn = segs.filter(s => s.kind !== 'travel');

  // ---------- the camera: frames each chapter, and leans a little toward the leaf ----------
  const boxOf = list => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const s of list) for (const p of s.pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 }; };
  const whole = boxOf(segs.filter(s => s.kind === 'boro'));
  const FRAMES = CH.map(c => ({ t: c.t, box: c.id === 'one' || c.id === 'end' ? whole : c.id === 'creeks' ? boxOf(chap('shore').segs.concat(c.segs)) : boxOf(c.segs) }));
  function frameAt(t) {
    let i = 0; while (i < FRAMES.length - 1 && t >= FRAMES[i + 1].t - 0.6) i++;
    const b = FRAMES[i].box, a = (FRAMES[i - 1] || FRAMES[i]).box, k = ease(clamp((t - (FRAMES[i].t - 0.6)) / 2.6));
    return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) };
  }

  // ---------- drawing ----------
  let W = 0, H = 0, dpr = 1, now = 0, grain = null;
  function pointAt(s, d) { // the point d metres along a segment, and the way the line is heading there
    const c = s.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
    const a = s.pts[i - 1], b = s.pts[i], k = clamp((d - c[i - 1]) / ((c[i] - c[i - 1]) || 1));
    return { p: [lerp(a[0], b[0], k), lerp(a[1], b[1], k)], i, dir: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  // a maple leaf, tip up, about one unit tall: half the outline, mirrored
  const HALF = [[0, 1], [0.1, 0.74], [0.27, 0.82], [0.24, 0.52], [0.5, 0.62], [0.44, 0.42], [0.72, 0.46], [0.6, 0.25], [0.88, 0.13], [0.58, -0.02], [0.63, -0.2], [0.3, -0.15], [0.07, -0.2]];
  function leaf(x, y, size, turn, alpha) {
    ctx.save(); ctx.translate(x, y);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2.4);
    glow.addColorStop(0, 'rgba(255, 190, 120, ' + 0.5 * alpha + ')'); glow.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, size * 2.4, 0, 7); ctx.fill();
    ctx.rotate(turn); ctx.scale(size, -size); ctx.translate(0, -0.25); ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.moveTo(HALF[0][0], HALF[0][1]);
    for (let i = 1; i < HALF.length; i++) ctx.lineTo(HALF[i][0], HALF[i][1]);
    for (let i = HALF.length - 1; i > 0; i--) ctx.lineTo(-HALF[i][0], HALF[i][1]);
    ctx.closePath(); ctx.fillStyle = '#d8342c'; ctx.fill();
    ctx.lineWidth = 0.035; ctx.strokeStyle = '#7d1512'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 214, 190, 0.75)'; ctx.lineWidth = 0.03; ctx.beginPath(); // veins, and the stem
    ctx.moveTo(0, -0.62); ctx.lineTo(0, 0.86); ctx.moveTo(0, 0.02); ctx.lineTo(0.58, 0.36); ctx.moveTo(0, 0.02); ctx.lineTo(-0.58, 0.36);
    ctx.moveTo(0, -0.12); ctx.lineTo(0.42, -0.1); ctx.moveTo(0, -0.12); ctx.lineTo(-0.42, -0.1); ctx.stroke();
    ctx.restore();
  }
  function render(t) {
    now = t; if (!W || !H) return;
    // where the leaf is
    let cur = null; for (const s of segs) if (t >= s.t0 && t < s.t1) { cur = s; break; }
    const tip = cur ? pointAt(cur, cur.len * (t - cur.t0) / (cur.t1 - cur.t0)) : null;
    const rest = segs[segs.length - 1].pts, at = tip ? tip.p : t < segs[0].t0 ? segs[0].pts[0] : pen || rest[rest.length - 1];
    const f = frameAt(t), lean = 0.22 * (1 - ease(clamp((t - T_ONE) / 2)));
    const sc = Math.min(W / (f.w * 1.3), H / (f.h * 1.3)), cx = lerp(f.cx, at[0], lean), cy = lerp(f.cy, at[1], lean);
    const X = p => (p[0] - cx) * sc + W / 2, Y = p => (cy - p[1]) * sc + H / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const bg = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    bg.addColorStop(0, '#3a1a14'); bg.addColorStop(1, '#22100d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    if (grain) { ctx.globalAlpha = 0.5; ctx.drawImage(grain, 0, 0, W, H); ctx.globalAlpha = 1; }

    const one = ease(clamp((t - T_ONE) / 2.2)), u = Math.max(1, W / 1100) ;
    ctx.lineJoin = ctx.lineCap = 'round';
    const stroke = (kind, style, width, alpha, dash) => {
      ctx.beginPath(); let any = false;
      for (const s of segs) {
        if (s.kind !== kind || t < s.t0) continue; any = true;
        const end = t >= s.t1 ? null : tip;
        ctx.moveTo(X(s.pts[0]), Y(s.pts[0]));
        const n = end ? end.i : s.pts.length;
        for (let i = 1; i < n; i++) ctx.lineTo(X(s.pts[i]), Y(s.pts[i]));
        if (end) ctx.lineTo(X(end.p), Y(end.p));
      }
      if (!any) return;
      ctx.setLineDash(dash || []); ctx.globalAlpha = alpha; ctx.strokeStyle = style; ctx.lineWidth = width * u; ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    stroke('travel', '#fff6e5', 1, 0.2 * (1 - one * 0.7), [1.5 * u, 6 * u]);
    stroke('creek', INK.creek, 1.3, 0.8);
    stroke('shore', INK.shore, 2, 0.95);
    stroke('limit', INK.limit, 1.5, lerp(0.92, 0.38, one));                 // in 1998 the old limits fall back
    stroke('boro', one > 0 ? INK.red : INK.boro, lerp(1.8, 2.8, one), 1);   // and the six outlines turn red, as one shape
    stroke('today', INK.today, 2.2, 1);

    // the name of what was just drawn, beside it
    if (cur && cur.label && cur.kind !== 'travel') { labelAt(cur, 1); }
    function labelAt(s, a) {
      let sx = 0, sy = 0; for (const p of s.pts) { sx += p[0]; sy += p[1]; }
      const x = X([sx / s.pts.length, sy / s.pts.length]), y = Y([sx / s.pts.length, sy / s.pts.length]);
      ctx.globalAlpha = a; ctx.font = '600 ' + Math.round(11 * u) + 'px "Anek Latin", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 4 * u; ctx.strokeStyle = 'rgba(34, 16, 13, 0.85)'; ctx.strokeText(s.label.toUpperCase(), x, y); ctx.fillStyle = '#fff6e5'; ctx.fillText(s.label.toUpperCase(), x, y); ctx.globalAlpha = 1;
    }
    if (t >= chap('metro').t) { // the six names stay once their outlines are drawn
      const seen = new Set();
      for (const s of segs) if (s.kind === 'boro' && t >= s.t1 && !seen.has(s.label) && s.len > 20000) { seen.add(s.label); labelAt(s, 0.85 * (1 - ease(clamp((t - T_END) / 1.5)))); }
    }
    if (t >= T_END) { // the last frame: the city's name
      const a = ease(clamp((t - T_END) / 1.6));
      ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff6e5';
      ctx.font = '550 ' + Math.round(Math.min(W * 0.085, 84 * u)) + 'px Fraunces, Georgia, serif'; ctx.textAlign = 'right'; ctx.fillText('Toronto', W * 0.96, H * 0.9);
      ctx.globalAlpha = 1;
    }
    // the leaf: its tip leads along the line; it flutters a little, and rests at the end
    const size = 22 * u * (cur && cur.kind === 'travel' ? 0.9 : 1), heading = tip ? Math.PI / 2 - tip.dir : 0;
    leaf(X(at), Y(at), size, heading + Math.sin(t * 7) * 0.12, 1);
    caption(t, cur);
  }
  let capKey = '';
  function caption(t, cur) {
    let c = CH[0]; for (const k of CH) if (t >= k.t) c = k;
    const year = cur && cur.kind !== 'travel' && cur.year ? cur.year : cur && cur.kind === 'travel' ? (segs[segs.indexOf(cur) + 1] || cur).year || c.year : c.year;
    const live = cur && cur.kind === 'travel' ? segs[segs.indexOf(cur) + 1] : cur;
    const sub = c.id === 'annex' && live && live.label ? live.label + ' · ' + live.date : c.sub || '';
    const stat = c.id === 'annex' && live && live.n ? 'Annexation ' + live.n + ' of ' + (A.length - 1) : '';
    const key = year + '|' + c.id + '|' + sub + '|' + stat; if (key === capKey) return; capKey = key;
    $('film-year').textContent = year; $('film-text').textContent = c.text; $('film-sub').textContent = sub; $('film-stat').textContent = stat;
  }

  // ---------- sound: a note as each outline begins, a low chord at each chapter ----------
  let ac = null, muted = false;
  function note(freq, dur, vol, type) {
    if (!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain(), at = ac.currentTime;
    o.type = type || 'triangle'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + dur + 0.05);
  }
  const SCALE = [293.66, 329.63, 369.99, 440, 493.88]; // D major pentatonic
  const cues = drawn.map((s, i) => ({ t: s.t0, play: () => note(SCALE[(i * 2) % 5] * (s.kind === 'creek' ? 2 : s.kind === 'boro' ? 0.5 : 1), s.kind === 'creek' ? 0.5 : 1.1, 0.06) }));
  CH.forEach((c, i) => cues.push({ t: c.t + 0.01, play: () => [146.83, 220, i > 4 ? 369.99 : 293.66].forEach(f => note(f, 3.4, 0.05, 'sine')) }));

  // ---------- transport ----------
  // Before Play, the film runs as a silent glimpse while it is on screen. Play starts it from the top with sound.
  let playing = false, watching = false, last = 0, visible = false, dirty = true;
  const motionOn = () => !document.documentElement.classList.contains('still');
  const mmss = t => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  function ui() {
    $('film-seek').value = Math.round(now / TOTAL * 1000);
    $('film-time').textContent = mmss(now) + ' / ' + mmss(TOTAL);
    stage.classList.toggle('watching', watching);
    $('film-pause').hidden = !watching;
    $('film-pause').textContent = playing ? 'Pause' : now >= TOTAL ? 'Replay' : 'Resume';
    $('film-note').textContent = watching ? $('film-text').textContent : 'A silent glimpse. Play the film to hear the notes.';
    document.querySelectorAll('#film-chapters button').forEach((b, i) => b.classList.toggle('on', now >= CH[i].t && (i === CH.length - 1 || now < CH[i + 1].t)));
  }
  function tick(ts) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.5, (ts - last) / 1000); last = ts;
    const run = watching ? playing : visible && motionOn();
    if (run) {
      const before = now; let t = now + dt;
      if (t >= TOTAL) { if (watching) { t = TOTAL; playing = false; } else t = 0; }
      if (watching) for (const c of cues) if (c.t > before && c.t <= t) c.play();
      render(t); ui();
    } else if (dirty) render(now);
    dirty = false;
  }
  function seek(t) { now = Math.max(0, Math.min(TOTAL, t)); dirty = true; ui(); }
  function unlock() { // sound may only start from a tap or click
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
    if (ac && ac.state === 'suspended') ac.resume();
  }
  $('film-play').addEventListener('click', () => { unlock(); watching = true; playing = true; seek(0); });
  $('film-pause').addEventListener('click', () => { if (now >= TOTAL) seek(0); playing = !playing; ui(); });
  $('film-mute').addEventListener('click', () => { muted = !muted; $('film-mute').textContent = muted ? 'Sound off' : 'Sound on'; $('film-mute').setAttribute('aria-pressed', String(muted)); });
  $('film-seek').addEventListener('input', e => { watching = true; playing = false; seek(e.target.value / 1000 * TOTAL); });
  const chapBox = $('film-chapters');
  CH.forEach(c => {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = '<b></b><span></span>';
    b.firstChild.textContent = c.year; b.lastChild.textContent = c.name;
    b.addEventListener('click', () => { // a chapter plays from its start; on a phone, bring the film back into view
      unlock(); watching = true; playing = true; seek(c.t);
      const r = stage.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight) window.scrollTo({ top: window.scrollY + r.top - 76, behavior: motionOn() ? 'smooth' : 'auto' });
    });
    chapBox.append(b);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) { playing = false; ui(); } });
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.15 }).observe(stage);
  window.addEventListener('yp-motion', () => { dirty = true; });

  // ---------- key, sources, sizes ----------
  const key = $('film-key');
  if (key) [[INK.shore, 'Shore and creeks, 1802'], [INK.limit, 'City limits, 1834 to 1967'], [INK.red, 'One city, 1998'], [INK.today, 'Today’s shore']].forEach(([c, text]) => { const d = document.createElement('div'), i = document.createElement('i'); i.style.background = c; d.append(i, text); key.append(d); });
  const src = $('film-sources');
  const cite = (s, extra) => { const li = document.createElement('li'), a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.title; li.append(a, ' · ' + s.by + ' · ' + s.licence + (extra || '')); src.append(li); };
  if (src) {
    cite(B.sources.annexations); cite(B.sources.former);
    cite(HIST.source, '. Map used: ' + m1802.by + ', ' + m1802.year + '.');
    cite({ url: SHORE.sourceUrl, title: 'OpenStreetMap', by: 'today’s shoreline', licence: 'ODbL' });
  }
  const set = (id, v) => { const n = $(id); if (n) n.textContent = v; };
  set('film-length', Math.round(TOTAL) + ' seconds');
  set('film-km', Math.round(drawn.reduce((s, x) => s + x.len, 0) / 1000).toLocaleString('en-CA'));
  set('film-outlines', String(drawn.length));

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.round(canvas.clientWidth * dpr); H = Math.round(canvas.clientHeight * dpr);
    if (!W || !H) return;
    canvas.width = W; canvas.height = H;
    grain = document.createElement('canvas'); grain.width = 256; grain.height = Math.round(256 * H / W); // a little tooth in the ground, like a chalked floor
    const g = grain.getContext('2d'); let sd = 7;
    for (let i = 0; i < 2600; i++) { sd = (sd * 1664525 + 1013904223) >>> 0; const x = sd % 256, y = (sd >>> 9) % grain.height; g.fillStyle = (sd >>> 20) % 2 ? 'rgba(255,230,200,0.05)' : 'rgba(0,0,0,0.09)'; g.fillRect(x, y, 1, 1); }
    dirty = true;
  }
  new ResizeObserver(resize).observe(canvas); resize();
  if (!motionOn()) now = TOTAL; // with motion off: the finished drawing
  render(now); ui();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; });
  requestAnimationFrame(tick);
  YP.film = { seek, render, TOTAL, CHAPTERS: CH, segs, get now() { return now; } };
})();
