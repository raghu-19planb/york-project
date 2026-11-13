// Same place, three moments: one view of the harbour, held still, with three shores swapped under it.
//
// The view never moves. Under it go, in turn: the shore as it was first mapped (standing in for c.1700, when
// nobody mapped it), the shore on the map of 1834, the year York became the City of Toronto, and today's shore.
// A slider, or the Play button, fades from one to the next, so the eye stays on one place while the land moves
// out into the lake.
//
// The three pictures are rendered ahead of time in Blender, from one camera, by tools/blender/moments.py, out of
// the site's own data (tools/blender/export-moments.js says which). This file fades between them and lays the
// words on top. To put a word or a line on the picture it needs to know where the camera stood; Blender writes
// that to images/moments/view.json, and at() below repeats the camera's arithmetic.
//
// Two things are still worked out here, in the visitor's browser, from the same data: the size of the land that
// was water or marsh at first and is land now, and the first shore as a line to keep in view.
(function () {
  const root = document.getElementById('moments'), YP = window.YP = window.YP || {};
  if (!root) return;
  const $ = s => root.querySelector(s), el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const still = () => document.documentElement.classList.contains('still');
  const stage = $('.mo-stage'), canvas = $('canvas'), ctx = canvas.getContext('2d'), labelBox = $('.mo-labels');
  const APOS = String.fromCharCode(8217), DIR = 'images/moments/';
  const stamp = (document.currentScript && document.currentScript.src.split('?')[1]) || '', q = stamp ? '?' + stamp : '';
  const have = { history: 'HISTORY', terrain: 'TERRAIN', shoreline: 'SHORE' };
  const load = name => YP[have[name]] ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'data/' + name + '.js' + q; s.onload = ok; s.onerror = no; document.head.append(s); });
  const picture = name => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = DIR + 'moments-' + name + '-painted.jpg' + q; });

  let V = null, F = null, pics = null, shore = null, W = 0, Hh = 0, pos = 0, keep = true, made = null, labels = [], firstFrom = '';

  // ---------- where a place falls on the picture ----------
  // x and y are metres east and north of the project's origin, h metres above the lake. Returns [across, down],
  // each 0 to 1 over the picture. The same sum the camera does: how far the place is to the right of and above
  // the line of sight, divided by how far away it is, times the lens.
  let cam = null;
  function setCamera(v) {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], unit = a => { const l = Math.hypot(...a); return a.map(n => n / l); }, cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const f = unit(sub(v.aim, v.camera)), r = unit(cross(f, [0, 0, 1])), u = cross(r, f);
    cam = { c: v.camera, f, r, u, k: 2 * v.lens / v.sensor, shape: v.width / v.height, unit: v.unit, stretch: v.stretch };
  }
  function at(x, y, h) {
    const p = [x * cam.unit - cam.c[0], y * cam.unit - cam.c[1], (h || 0) * cam.stretch * cam.unit - cam.c[2]], dot = a => p[0] * a[0] + p[1] * a[1] + p[2] * a[2], far = dot(cam.f);
    return [0.5 + dot(cam.r) / far * cam.k / 2, 0.5 - dot(cam.u) / far * cam.k * cam.shape / 2];
  }

  // ---------- the first ground, for measuring and for the first shore ----------
  // data/terrain.js holds one mark every 50 m: land, water or marsh, from the earliest map that covers the spot
  // (the same ground as the 3D world of c.1700). Scaled up smoothly and cut at the half-way value, the marks
  // become shapes with rounded edges. Returns a plan at 10 m a dot: 1 where water, 2 where marsh.
  const CELL = 10, blank = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function firstGround(w, h) {
    const T = YP.TERRAIN, c = T.maskCell, i0 = Math.round((F.x0 - T.box.x0) / c), j1 = Math.round((F.y1 - T.box.y0) / c);
    const nx = Math.round((F.x1 - F.x0) / c) + 1, ny = Math.round((F.y1 - F.y0) / c) + 1, out = new Uint8Array(w * h);
    for (const [mark, value] of [['1', 1], ['2', 2]]) {
      const small = blank(nx, ny), sc = small.getContext('2d'), img = sc.createImageData(nx, ny);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const gi = i0 + i, gj = j1 - j, k = gi < 0 || gj < 0 || gi >= T.maskNx || gj >= T.maskNy ? '1' : T.kind[gj * T.maskNx + gi]; const o = (j * nx + i) * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = 255; img.data[o + 3] = String(k) === mark ? 255 : 0; }
      sc.putImageData(img, 0, 0);
      const big = blank(w, h), bc = big.getContext('2d', { willReadFrequently: true }); bc.imageSmoothingEnabled = true; bc.imageSmoothingQuality = 'high';
      const cw = w / (nx - 1), ch = h / (ny - 1); bc.drawImage(small, -cw / 2, -ch / 2, cw * nx, ch * ny); // each mark sits on a corner of the grid, not in the middle of a square
      const d = bc.getImageData(0, 0, w, h).data; for (let n = 0; n < out.length; n++) if (d[n * 4 + 3] > 127) out[n] = value;
    }
    return out;
  }
  function measure() {
    const mw = Math.ceil((F.x1 - F.x0) / CELL), mh = Math.ceil((F.y1 - F.y0) / CELL), kind = firstGround(mw, mh);
    const S = YP.SHORE, a = S.shore[0], z = S.shore[S.shore.length - 1], north = F.y1 + 400, X = x => (x - F.x0) / CELL, Y = y => (F.y1 - y) / CELL;
    const b = blank(mw, mh), bc = b.getContext('2d', { willReadFrequently: true });
    const ring = r => { bc.moveTo(X(r[0][0]), Y(r[0][1])); for (let i = 1; i < r.length; i++) bc.lineTo(X(r[i][0]), Y(r[i][1])); bc.closePath(); };
    bc.fillStyle = '#000'; bc.fillRect(0, 0, mw, mh); bc.fillStyle = '#fff'; bc.beginPath();
    ring(S.shore.concat([[z[0] + 400, z[1]], [z[0] + 400, north], [a[0] - 400, north], [a[0] - 400, a[1]]])); for (const r of S.islands) if (r.length > 2) ring(r); bc.fill(); // today's land: the mainland and every island
    const now = bc.getImageData(0, 0, mw, mh).data;
    let wet = 0, bog = 0;
    for (let i = 0; i < kind.length; i++) { const land = now[i * 4] > 127; if (land && kind[i] === 1) wet++; else if (land && kind[i] === 2) bog++; }
    const ha = n => n * CELL * CELL / 10000;
    made = { water: ha(wet), marsh: ha(bog), view: (F.x1 - F.x0) * (F.y1 - F.y0) / 10000 };
    // the first shore: every dot of water that has land or marsh beside it, as a place on the ground
    shore = [];
    for (let j = 1; j < mh - 1; j++) for (let i = 1; i < mw - 1; i++) { const n = j * mw + i; if (kind[n] === 1 && (kind[n - 1] !== 1 || kind[n + 1] !== 1 || kind[n - mw] !== 1 || kind[n + mw] !== 1)) shore.push([F.x0 + i * CELL, F.y1 - j * CELL]); }
    // which maps the first shore comes from, inside this view
    const T = YP.TERRAIN, used = new Set();
    for (let y = F.y0; y <= F.y1; y += 100) for (let x = F.x0; x <= F.x1; x += 100) { const k = +T.src[Math.round((y - T.box.y0) / T.maskCell) * T.maskNx + Math.round((x - T.box.x0) / T.maskCell)]; if (k) used.add(k - 1); }
    firstFrom = [...used].sort().map(k => T.maps[k]).join(', ');
  }
  function shoreLine() { // the first shore drawn once, at the size of the picture: a pale edge under a dark line
    const cv = blank(W, Hh), c = cv.getContext('2d'), r = Math.max(1, W / 1100);
    for (const [colour, size] of [['rgba(255,255,255,0.85)', r * 2.4], ['#12505e', r * 1.3]]) { c.fillStyle = colour; for (const p of shore) { const [u, v] = at(p[0], p[1], 0); c.fillRect(u * W - size / 2, v * Hh - size / 2, size, size); } }
    return cv;
  }

  // ---------- words on the picture ----------
  function setLabels() {
    labelBox.textContent = ''; labels = [];
    const add = (when, place, text, cls) => { const [u, v] = at(place[0], place[1], 0); if (u < 0.04 || u > 0.96 || v < 0.06 || v > 0.95) return; const n = el('span', 'mo-label' + (cls ? ' ' + cls : ''), text); n.style.left = (u * 100).toFixed(2) + '%'; n.style.top = (v * 100).toFixed(2) + '%'; labelBox.append(n); labels.push({ n, when }); };
    add([0, 1, 2], [-2350, -1500], 'Lake Ontario', 'water');
    add([0, 1], [300, -100], 'The bay', 'water'); add([2], [300, -350], 'Inner harbour', 'water');
    add([0], [900, -1450], 'The peninsula'); add([1], [1500, -1350], 'The peninsula'); add([2], [-300, -1650], 'Toronto Islands');
    add([0, 1], [3300, 1500], 'Marsh'); add([2], [3300, 900], 'Port lands');
  }

  const TEXT = [
    { stop: 'c.1700', tag: () => 'As first mapped: ' + firstFrom, h: 'Before the town', key: [['w', 'Water, paler in the shallows'], ['m', 'Marsh'], ['t', 'Forest (a drawing)']],
      p: 'Nobody mapped this shore in 1700. This is how it was first drawn, a century later and before any of it had been filled: a wide bay behind a long sand peninsula, marsh at the river mouths, and forest down to the water. It is the same ground as the 3D world above. The trees stand for forest; nothing records where each one stood.' },
    { stop: '1834', tag: () => 'William Chewett, City of Toronto and Liberties, 1834', h: 'A city on the bay', key: [['c', 'The city and its liberties, 1834'], ['f', 'The first shore'], ['t', 'Forest, thinned (a drawing)']],
      p: 'The year York became the City of Toronto. The red dashed line is the new city and its liberties, and the water is as William Chewett drew it that year. Where it differs from the first shore, some of that is the shore changing and some is two surveys drawing the same shore differently. How much forest had been cleared is not mapped here, so the thinner trees are a drawing.' },
    { stop: 'Today', tag: () => 'OpenStreetMap, ' + (YP.SHORE.osmTimestamp || '').slice(0, 10), h: 'The shore has moved', key: [['h', 'Was water or marsh at first'], ['f', 'The first shore'], ['b', 'Buildings, to their heights']],
      p: 'Today' + APOS + 's shore. Everything in orange is land now and was water or marsh when it was first mapped: a wide strip south of the old shore, and the port where the marsh was. The peninsula is a group of islands; a storm cut it from the mainland on 13 April 1858.' }
  ];

  // ---------- putting it on the page ----------
  function paint() {
    if (!pics) return;
    const i = Math.min(1, Math.floor(pos)), f = pos - i;
    ctx.globalAlpha = 1; ctx.drawImage(pics[i], 0, 0, W, Hh);
    if (f > 0) { ctx.globalAlpha = f; ctx.drawImage(pics[i + 1], 0, 0, W, Hh); }
    if (keep && pos > 0) { ctx.globalAlpha = Math.min(1, pos * 1.6); ctx.drawImage(pics[3], 0, 0); }
    ctx.globalAlpha = 1;
    for (const l of labels) l.n.style.opacity = Math.max(0, ...l.when.map(w => 1 - Math.abs(pos - w) * 2.2)).toFixed(2);
    const now = Math.round(pos), t = TEXT[now];
    if (paint.at !== now) {
      paint.at = now;
      $('.mo-tag b').textContent = t.stop; $('.mo-tag span').textContent = t.tag();
      $('.mo-about h3').textContent = t.h; $('.mo-about p').textContent = t.p;
      const key = $('.mo-key'); key.textContent = ''; for (const [c, text] of t.key) { const li = el('li'); li.append(el('i', 'k-' + c), text); key.append(li); }
      const ten = n => Math.round(n / 10) * 10;
      $('.mo-stat').textContent = now === 2 && made ? 'In this view, about ' + ten(made.water + made.marsh) + ' hectares of today' + APOS + 's land was water or marsh at first (' + ten(made.water) + ' water, ' + ten(made.marsh) + ' marsh), out of about ' + Math.round(made.view / 100) * 100 + ' hectares. That is today' + APOS + 's shore laid over maps drawn by hand, so read it as a rough size. The picture is cut a little closer than that at its edges.' : '';
      root.querySelectorAll('.mo-stops button').forEach((b, n) => b.setAttribute('aria-pressed', String(n === now)));
    }
  }
  function build() {
    const cssW = stage.clientWidth; if (!cssW) return;
    W = Math.round(Math.min(V.width, cssW * Math.min(2, window.devicePixelRatio || 1))); Hh = Math.round(W * V.height / V.width);
    canvas.width = W; canvas.height = Hh; stage.style.aspectRatio = V.width + ' / ' + V.height;
    pics[3] = shoreLine(); paint.at = -1; paint();
  }
  let tween = 0;
  const slider = $('.mo-slide');
  function go(to) { // slide to a moment
    cancelAnimationFrame(tween); const from = pos, t0 = performance.now(), dur = still() ? 0 : 900 * Math.max(0.5, Math.abs(to - from));
    const tick = now => { const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = k * k * (3 - 2 * k); pos = from + (to - from) * e; slider.value = Math.round(pos * 100); paint(); if (k < 1) tween = requestAnimationFrame(tick); };
    tick(t0);
  }
  // ---------- the animation: the three moments played through, with a pause on each ----------
  // Pressing Play is the only thing that starts it. It rests on the first shore, moves to 1834, rests, moves to
  // today and stops there. Touching the slider or a moment takes over and stops it.
  const HOLD = [1.6, 2.8], playBtn = $('.mo-play'), ease = k => k * k * (3 - 2 * k);
  let playing = false, clock = 0, lastTick = 0, raf = 0;
  const MOVE = () => still() ? 0.01 : 3.4, LENGTH = () => HOLD[0] + HOLD[1] + 2 * MOVE();
  function posAt(t) { const m = MOVE(); if (t < HOLD[0]) return 0; t -= HOLD[0]; if (t < m) return ease(t / m); t -= m; if (t < HOLD[1]) return 1; t -= HOLD[1]; return t < m ? 1 + ease(t / m) : 2; }
  function timeAt(p) { if (p >= 1.999) return 0; for (let t = 0; t < LENGTH(); t += 0.02) if (posAt(t) >= p - 0.001) return t; return 0; } // where in the animation a slider position is; at the end it starts again
  function setPlaying(on) {
    playing = on && !!pics; cancelAnimationFrame(raf); root.classList.toggle('playing', playing);
    playBtn.textContent = playing ? 'Pause' : pos >= 1.999 ? 'Play again' : 'Play'; playBtn.setAttribute('aria-pressed', String(playing));
    if (playing) { cancelAnimationFrame(tween); clock = timeAt(pos); lastTick = performance.now(); raf = requestAnimationFrame(run); }
  }
  function run(now) {
    if (!playing) return;
    clock += Math.min(0.1, (now - lastTick) / 1000); lastTick = now;
    pos = posAt(clock); slider.value = Math.round(pos * 100); paint();
    if (clock >= LENGTH()) setPlaying(false); else raf = requestAnimationFrame(run);
  }
  playBtn.addEventListener('click', () => setPlaying(!playing));
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPlaying(false); });
  slider.addEventListener('input', () => { cancelAnimationFrame(tween); if (playing) setPlaying(false); pos = slider.value / 100; paint(); playBtn.textContent = pos >= 1.999 ? 'Play again' : 'Play'; });
  root.querySelectorAll('.mo-stops button').forEach((b, n) => b.addEventListener('click', () => { if (playing) setPlaying(false); go(n); playBtn.textContent = n === 2 ? 'Play again' : 'Play'; }));
  $('.mo-keep').addEventListener('change', e => { keep = e.target.checked; paint(); });

  let started = false;
  function start() {
    if (started) return; started = true;
    Promise.all([fetch(DIR + 'view.json' + q).then(r => { if (!r.ok) throw new Error('view'); return r.json(); }), Promise.all(['first', 'city', 'today'].map(picture)), load('history'), load('terrain'), load('shoreline')]).then(([view, images]) => {
      V = view; F = view.frame; setCamera(view); pics = images;
      measure(); setLabels(); build(); root.classList.add('ready');
      const src = $('.mo-src'); if (src) src.textContent = YP.HISTORY.source.title + ', ' + YP.HISTORY.source.by + ' (' + YP.HISTORY.source.licence + ')';
      let w0 = stage.clientWidth; new ResizeObserver(() => { const w = stage.clientWidth; if (Math.abs(w - w0) > w0 * 0.08) { w0 = w; build(); } }).observe(stage);
    }).catch(() => { $('.mo-fail').hidden = false; });
  }
  new IntersectionObserver(es => { if (es[0].isIntersecting) start(); }, { rootMargin: '700px' }).observe(root);
  YP.moments = { go, start, setPlaying, at: (x, y, h) => at(x, y, h), get playing() { return playing; }, get state() { return { pos, ready: !!pics, W, Hh, made, firstFrom, shore: shore && shore.length }; } };
})();
