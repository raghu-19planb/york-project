// Same place, three moments: one view of the harbour, held still, with three shores swapped under it.
//
// The view never moves. Under it go, in turn: the shore as it was first mapped (standing in for c.1700, when
// nobody mapped it), the shore on the map of 1834, the year York became the City of Toronto, and today's shore.
// A slider fades from one to the next, so the eye stays on one place while the land moves out into the lake.
//
// What is real: the first moment is the same ground as the 3D world of c.1700 (data/terrain.js: each spot takes
// the earliest map that covers it, by the rules in tools/build-terrain.js); the second is William Chewett's map
// of 1834 (data/history.js, from the University of Toronto's Historical Hydrography of Toronto) with that year's
// city limits (data/boundaries.js); the third is today's shore, rivers, main roads and building footprints
// (OpenStreetMap: data/shoreline.js, today.js, buildings.js). Worked out from those: the land that was water or
// marsh at first and is land now, and its size. What is drawing: the trees, the colours, and the tilt of the
// view. It is a flat map seen from the south with heights standing up from it; the ground has no relief here.
(function () {
  const root = document.getElementById('moments'), YP = window.YP = window.YP || {};
  if (!root) return;
  const $ = s => root.querySelector(s), el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const still = () => document.documentElement.classList.contains('still');
  const stage = $('.mo-stage'), canvas = $('canvas'), ctx = canvas.getContext('2d'), labelBox = $('.mo-labels');
  const F = { x0: -3100, x1: 4650, y0: -2850, y1: 3300 }; // the piece of the city in view, in metres from the project's origin
  const INK = '#28231f', WATER = '#9cc3cc', MARSH = '#b4c49a', CREEK = '#5f9aa8', FIRST = '#1f5d6b';
  const LAND = ['#d7dcbd', '#e3ddc3', '#efe7d2'];
  const APOS = String.fromCharCode(8217);

  // ---------- the data, fetched only when the section is near ----------
  const stamp = (document.currentScript && document.currentScript.src.split('?')[1]) || '';
  const have = { history: 'HISTORY', terrain: 'TERRAIN', shoreline: 'SHORE', boundaries: 'BOUNDARIES', today: 'TODAY', buildings: 'BUILDINGS' };
  const load = name => YP[have[name]] ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'data/' + name + '.js' + (stamp ? '?' + stamp : ''); s.onload = ok; s.onerror = no; document.head.append(s); });

  let m02, m34, W = 0, Hh = 0, s = 1, K = 0.72, layers = null, pos = 0, keep = true, made = null, trees = null, labels = [], firstFrom = '';
  const HZ = 0.95; // how tall a metre of height stands, against a metre across
  const OBL = { x: x => (x - F.x0) * s, y: (y, h) => (F.y1 - y) * s * K - (h || 0) * s * HZ };
  const CELL = 10, PLAN = { x: x => (x - F.x0) / CELL, y: y => (F.y1 - y) / CELL }; // a plain plan at 10 m a dot, for measuring

  const ring = (c, P, r, h) => { c.moveTo(P.x(r[0][0]), P.y(r[0][1], h)); for (let i = 1; i < r.length; i++) c.lineTo(P.x(r[i][0]), P.y(r[i][1], h)); c.closePath(); };
  const line = (c, P, r) => { c.moveTo(P.x(r[0][0]), P.y(r[0][1])); for (let i = 1; i < r.length; i++) c.lineTo(P.x(r[i][0]), P.y(r[i][1])); };
  const rect = (c, P, b) => c.rect(P.x(b[0]), P.y(b[3]), P.x(b[2]) - P.x(b[0]), P.y(b[1]) - P.y(b[3])); // b = [west, south, east, north]
  const fillRings = (c, P, rings) => { c.beginPath(); for (const r of rings) if (r.length > 2) ring(c, P, r); c.fill(); };
  const strokeLines = (c, P, lines) => { c.beginPath(); for (const l of lines) if (l.length > 1) line(c, P, l); c.stroke(); };
  const blank = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const hash = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };

  // ---------- the first shore: the ground of the c.1700 world, cut to this view ----------
  // data/terrain.js holds one mark every 50 m: land, water or marsh, from the earliest map that covers the spot.
  // Scaled up smoothly and cut at the half-way value, the marks become shapes with rounded edges. Nothing finer
  // than 50 m is in it. Returns, for a picture w by h whose rows are squeezed by k: 1 where water, 2 where marsh.
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
  function tint(ground, w, h, value, colour) { // a picture of one kind of ground in one colour, clear elsewhere
    const cv = blank(w, h), c = cv.getContext('2d'), img = c.createImageData(w, h), n = parseInt(colour.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    for (let i = 0; i < ground.length; i++) if (value ? ground[i] === value : ground[i]) { const o = i * 4; img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255; }
    c.putImageData(img, 0, 0); return cv;
  }
  const todayLand = (c, P) => { // one path: the mainland (the shore closed along the north) and every island
    const S = YP.SHORE, a = S.shore[0], z = S.shore[S.shore.length - 1], north = F.y1 + 400;
    c.beginPath(); ring(c, P, S.shore.concat([[z[0] + 400, z[1]], [z[0] + 400, north], [a[0] - 400, north], [a[0] - 400, a[1]]]));
    for (const r of S.islands) if (r.length > 2) ring(c, P, r);
  };
  // a sheet's shore as lines: its water outlines, without the straight cuts where the sheet itself ends
  function runsOf(m) {
    const b = m.box, edge = p => Math.abs(p[0] - b[0]) < 3 || Math.abs(p[0] - b[2]) < 3 || Math.abs(p[1] - b[1]) < 3 || Math.abs(p[1] - b[3]) < 3, out = [];
    for (const r of m.water) {
      let run = [];
      for (let i = 0; i < r.length; i++) {
        const a = r[i], q = r[(i + 1) % r.length];
        if ((edge(a) && edge(q)) || Math.hypot(a[0] - q[0], a[1] - q[1]) > 700) { if (run.length > 1) out.push(run); run = []; } else { if (!run.length) run.push(a); run.push(q); }
      }
      if (run.length > 1) out.push(run);
    }
    return out;
  }

  // ---------- measuring: what was water or marsh at first and is land today ----------
  function measure() {
    const mw = Math.ceil((F.x1 - F.x0) / CELL), mh = Math.ceil((F.y1 - F.y0) / CELL), kind = firstGround(mw, mh);
    const b = blank(mw, mh), bc = b.getContext('2d', { willReadFrequently: true });
    bc.fillStyle = '#000'; bc.fillRect(0, 0, mw, mh); bc.fillStyle = '#fff'; todayLand(bc, PLAN); bc.fill();
    const now = bc.getImageData(0, 0, mw, mh).data;
    let wet = 0, bog = 0;
    for (let i = 0; i < kind.length; i++) { const land = now[i * 4] > 127; if (land && kind[i] === 1) wet++; else if (land && kind[i] === 2) bog++; }
    const ha = n => n * CELL * CELL / 10000;
    made = { water: ha(wet), marsh: ha(bog), view: (F.x1 - F.x0) * (F.y1 - F.y0) / 10000 };
    // the forest: a tree every so often on what was dry land at first; thin on the sand bar. A drawing.
    trees = [];
    const STEP = 88;
    for (let y = F.y1; y > F.y0; y -= STEP) for (let x = F.x0; x < F.x1; x += STEP) {
      const i = Math.round(x / STEP), j = Math.round(y / STEP), tx = x + (hash(i, j) - 0.5) * STEP * 0.9, ty = y + (hash(j, i + 7) - 0.5) * STEP * 0.9;
      const cx = Math.floor(PLAN.x(tx)), cy = Math.floor(PLAN.y(ty)); if (cx < 0 || cy < 0 || cx >= mw || cy >= mh || kind[cy * mw + cx]) continue;
      if (ty < 100 && hash(i + 3, j + 5) > 0.22) continue;
      trees.push([tx, ty, 26 + hash(i + 11, j) * 16, hash(i, j + 13)]);
    }
    trees.sort((p, q) => q[1] - p[1]);
    // which maps the first shore comes from, inside this view
    const T = YP.TERRAIN, used = new Set();
    for (let y = F.y0; y <= F.y1; y += 100) for (let x = F.x0; x <= F.x1; x += 100) { const n = Math.round((y - T.box.y0) / T.maskCell) * T.maskNx + Math.round((x - T.box.x0) / T.maskCell), k = +T.src[n]; if (k) used.add(k - 1); }
    firstFrom = [...used].sort().map(k => T.maps[k]).join(', ');
  }

  // ---------- the three pictures, drawn once each at the size of the box ----------
  function drawTrees(c, share, wet) {
    for (const t of trees) {
      if (t[3] > share) continue;
      const x = OBL.x(t[0]), y = OBL.y(t[1]), r = t[2] * s;
      if (wet && wet[Math.min(Hh - 1, Math.max(0, Math.round(y))) * W + Math.min(W - 1, Math.max(0, Math.round(x)))]) continue;
      c.fillStyle = t[3] * 7 % 1 > 0.5 ? '#5d7a52' : '#6c8a5c';
      c.beginPath(); c.moveTo(x, y - r * 2.3); c.lineTo(x + r * 0.78, y); c.lineTo(x - r * 0.78, y); c.closePath(); c.fill();
    }
  }
  function first(ground) { // moment 0
    const cv = blank(W, Hh), c = cv.getContext('2d');
    c.fillStyle = LAND[0]; c.fillRect(0, 0, W, Hh);
    c.drawImage(tint(ground, W, Hh, 2, MARSH), 0, 0); c.drawImage(tint(ground, W, Hh, 1, WATER), 0, 0);
    c.strokeStyle = CREEK; c.lineWidth = Math.max(1, 1.4 * W / 1600); c.lineJoin = c.lineCap = 'round';
    c.save(); c.beginPath(); rect(c, OBL, [F.x0 - 500, F.y0 - 500, F.x1 + 500, F.y1 + 500]); rect(c, OBL, m02.box); c.clip('evenodd'); strokeLines(c, OBL, m34.creeks); c.restore();
    c.save(); c.beginPath(); rect(c, OBL, m02.box); c.clip(); strokeLines(c, OBL, m02.creeks); c.restore();
    c.drawImage(edgeOf(ground, 'rgba(40,35,31,0.5)', Math.max(1, Math.round(W / 1600))), 0, 0);
    drawTrees(c, 1);
    return cv;
  }
  function city() { // moment 1: the map of 1834, which draws the whole lake
    const cv = blank(W, Hh), c = cv.getContext('2d');
    c.fillStyle = LAND[1]; c.fillRect(0, 0, W, Hh);
    c.fillStyle = MARSH; fillRings(c, OBL, m34.marsh);
    c.fillStyle = WATER; fillRings(c, OBL, m34.water);
    c.strokeStyle = CREEK; c.lineWidth = Math.max(1, 1.4 * W / 1600); c.lineJoin = c.lineCap = 'round'; strokeLines(c, OBL, m34.creeks);
    c.strokeStyle = INK; c.globalAlpha = 0.55; c.lineWidth = Math.max(0.8, W / 1600); strokeLines(c, OBL, runsOf(m34)); c.globalAlpha = 1;
    const wet = new Uint8Array(W * Hh), d = c.getImageData(0, 0, W, Hh).data, lr = parseInt(LAND[1].slice(1, 3), 16); // no tree where this map shows water or marsh
    for (let i = 0; i < wet.length; i++) if (Math.abs(d[i * 4] - lr) > 12) wet[i] = 1;
    drawTrees(c, 0.38, wet);
    if (YP.BOUNDARIES) { // the city and its liberties, 1834
      const a = YP.BOUNDARIES.annexations.find(x => +x.num === 1);
      if (a) { c.strokeStyle = '#b8232f'; c.lineWidth = Math.max(1.5, 2.6 * W / 1600); c.setLineDash([9 * W / 1600, 6 * W / 1600]); c.beginPath(); for (const r of a.rings) ring(c, OBL, r); c.stroke(); c.setLineDash([]); }
    }
    return cv;
  }
  function today(ground) { // moment 2
    const cv = blank(W, Hh), c = cv.getContext('2d'), k = W / 1600;
    c.fillStyle = WATER; c.fillRect(0, 0, W, Hh);
    c.fillStyle = LAND[2]; todayLand(c, OBL); c.fill();
    // land that was water or marsh at first: hatched
    const t = tint(ground, W, Hh, 0, '#000000'), tc = t.getContext('2d');
    const hp = blank(10, 10), hc = hp.getContext('2d'); hc.fillStyle = '#f3cfa6'; hc.fillRect(0, 0, 10, 10); hc.strokeStyle = '#cf5a24'; hc.lineWidth = 2; hc.beginPath(); hc.moveTo(-2, 12); hc.lineTo(12, -2); hc.moveTo(-7, 7); hc.lineTo(7, -7); hc.moveTo(3, 17); hc.lineTo(17, 3); hc.stroke();
    tc.globalCompositeOperation = 'source-in'; tc.fillStyle = tc.createPattern(hp, 'repeat'); todayLand(tc, OBL); tc.fill();
    c.drawImage(t, 0, 0);
    c.lineJoin = c.lineCap = 'round';
    if (YP.TODAY) {
      c.strokeStyle = '#7fb0bc'; c.lineWidth = 3 * k; for (const r of YP.TODAY.rivers) if (r.cls === 'river') strokeLines(c, OBL, r.lines);
      for (const r of YP.TODAY.roads) { const big = r.cls === 'motorway' || r.cls === 'trunk'; c.strokeStyle = big ? '#c2b085' : '#d8ccb0'; c.lineWidth = (big ? 2.4 : r.cls === 'primary' ? 1.4 : 0.8) * k; strokeLines(c, OBL, r.lines); }
      c.strokeStyle = '#8c8475'; c.lineWidth = k; c.setLineDash([5 * k, 3 * k]); for (const r of YP.TODAY.rail || []) strokeLines(c, OBL, r.lines); c.setLineDash([]);
    }
    c.strokeStyle = INK; c.globalAlpha = 0.6; c.lineWidth = Math.max(0.8, k); c.beginPath(); line(c, OBL, YP.SHORE.shore); for (const r of YP.SHORE.islands) if (r.length > 2) ring(c, OBL, r); c.stroke(); c.globalAlpha = 1;
    const B = YP.BUILDINGS;
    if (B) { // each footprint stood up to its height; the far ones first, so the near ones cover them
      const ROOF = { h: '#fbf7ee', l: '#e6d2ac', n: '#d2ccbd' }, WALL = { h: '#c9c0ad', l: '#b79f76', n: '#a39c8d' };
      const list = B.items.map(it => { const f = it[2]; let top = -1e9, x0 = 1e9, x1 = -1e9; for (let i = 0; i < f.length; i += 2) { top = Math.max(top, f[i + 1]); x0 = Math.min(x0, f[i]); x1 = Math.max(x1, f[i]); } return { it, top, x0, x1 }; })
        .filter(b => b.x1 > F.x0 && b.x0 < F.x1 && b.top > F.y0 && b.top < F.y1 + 200).sort((p, q) => q.top - p.top);
      c.lineWidth = Math.max(0.5, 0.6 * k);
      for (const b of list) {
        const f = b.it[2], h = b.it[1] || B.defaultHeight, n = f.length / 2;
        c.fillStyle = WALL[b.it[0]] || WALL.n; c.beginPath();
        for (let i = 0; i < n; i++) { const j = (i + 1) % n, ax = OBL.x(f[i * 2]), bx = OBL.x(f[j * 2]); c.moveTo(ax, OBL.y(f[i * 2 + 1])); c.lineTo(bx, OBL.y(f[j * 2 + 1])); c.lineTo(bx, OBL.y(f[j * 2 + 1], h)); c.lineTo(ax, OBL.y(f[i * 2 + 1], h)); c.closePath(); }
        c.fill();
        c.fillStyle = ROOF[b.it[0]] || ROOF.n; c.strokeStyle = 'rgba(40,35,31,0.45)'; c.beginPath(); c.moveTo(OBL.x(f[0]), OBL.y(f[1], h)); for (let i = 1; i < n; i++) c.lineTo(OBL.x(f[i * 2]), OBL.y(f[i * 2 + 1], h)); c.closePath(); c.fill(); c.stroke();
      }
      const bx = B.box, O = B.origin, M = YP.SHORE.metresPerDegree, bb = [(bx.w - O.lon) * M.lon, (bx.s - O.lat) * M.lat, (bx.e - O.lon) * M.lon, (bx.n - O.lat) * M.lat];
      c.strokeStyle = 'rgba(40,35,31,0.5)'; c.lineWidth = Math.max(0.8, k); c.setLineDash([3 * k, 5 * k]); c.beginPath(); rect(c, OBL, bb); c.stroke(); c.setLineDash([]);
      today.box = bb;
    }
    return cv;
  }
  function edgeOf(ground, colour, r) { // the line where water meets land or marsh, r dots thick
    const cv = blank(W, Hh), c = cv.getContext('2d'), img = c.createImageData(W, Hh), m = /(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(colour) || [0, 31, 93, 107, 1];
    for (let y = r; y < Hh - r; y++) for (let x = r; x < W - r; x++) {
      const n = y * W + x, a = ground[n] === 1; if (!a) continue;
      if (ground[n - r] !== 1 || ground[n + r] !== 1 || ground[n - r * W] !== 1 || ground[n + r * W] !== 1) { const o = n * 4; img.data[o] = +m[1]; img.data[o + 1] = +m[2]; img.data[o + 2] = +m[3]; img.data[o + 3] = Math.round((m[4] == null ? 1 : +m[4]) * 255); }
    }
    c.putImageData(img, 0, 0); return cv;
  }
  function firstShore(ground) { // the first shore as a line, to keep in view over the later moments
    const cv = blank(W, Hh), c = cv.getContext('2d'), k = Math.max(1, Math.round(W / 1600));
    c.drawImage(edgeOf(ground, 'rgba(255,255,255,0.9)', k * 3), 0, 0); c.drawImage(edgeOf(ground, 'rgba(31,93,107,1)', k * 2), 0, 0);
    return cv;
  }

  // ---------- words on the picture ----------
  const centre = r => { let x = 0, y = 0; for (const p of r) { x += p[0]; y += p[1]; } return [x / r.length, y / r.length]; };
  function setLabels() {
    labelBox.textContent = ''; labels = [];
    const add = (when, at, text, cls) => { const n = el('span', 'mo-label' + (cls ? ' ' + cls : ''), text); labelBox.append(n); labels.push({ n, when, at }); };
    const inView = p => p[0] > F.x0 + 300 && p[0] < F.x1 - 300 && p[1] > F.y0 + 200 && p[1] < F.y1 - 200;
    add([0, 1, 2], [-2300, -2350], 'Lake Ontario', 'water');
    add([0, 1], [150, -250], 'The bay', 'water'); add([2], [150, -420], 'Inner harbour', 'water');
    add([0, 1], [1250, -1500], 'The peninsula'); add([2], [-150, -1750], 'Toronto Islands');
    for (const p of m34.marsh.filter(r => r.length > 8).map(centre).filter(inView).slice(0, 2)) add([0, 1], p, 'Marsh');
    if (today.box) add([2], [today.box[2], today.box[1]], 'Buildings are drawn inside the dotted box only', 'note');
    placeLabels();
  }
  function placeLabels() {
    const k = (stage.clientWidth || 1) / (W || 1);
    for (const l of labels) l.n.style.transform = 'translate(' + (OBL.x(l.at[0]) * k).toFixed(0) + 'px,' + (OBL.y(l.at[1]) * k).toFixed(0) + 'px)' + (l.n.classList.contains('note') ? ' translate(-100%, 2px)' : ' translate(-50%,-50%)');
  }

  const TEXT = [
    { stop: 'c.1700', tag: () => 'As first mapped: ' + firstFrom, h: 'Before the town', key: [['w', 'Water'], ['m', 'Marsh'], ['t', 'Forest (a drawing)']],
      p: 'Nobody mapped this shore in 1700. This is how it was first drawn, a century later and before any of it had been filled: a wide bay behind a long sand peninsula, marsh at the river mouths, and creeks running down to the water. It is the same ground as the 3D world above. The trees stand for forest; nothing records where each one stood.' },
    { stop: '1834', tag: () => 'William Chewett, City of Toronto and Liberties, 1834', h: 'A city on the bay', key: [['c', 'The city and its liberties, 1834'], ['f', 'The first shore'], ['t', 'Forest, thinned (a drawing)']],
      p: 'The year York became the City of Toronto. The red dashed line is the new city and its liberties, and the water is as William Chewett drew it that year. Where it differs from the first shore, some of that is the shore changing and some is two surveys drawing the same shore differently. How much forest had been cleared is not mapped here, so the thinner trees are a drawing.' },
    { stop: 'Today', tag: () => 'OpenStreetMap, ' + (YP.SHORE.osmTimestamp || '').slice(0, 10), h: 'The shore has moved', key: [['h', 'Was water or marsh at first'], ['f', 'The first shore'], ['b', 'Buildings, to their heights']],
      p: 'Today' + APOS + 's shore. Everything hatched in orange is land now and was water or marsh when it was first mapped: a wide strip south of the old shore, and the port where the marsh was. The peninsula is a group of islands; a storm cut it from the mainland on 13 April 1858.' }
  ];

  // ---------- putting it on the page ----------
  function paint() {
    if (!layers) return;
    const i = Math.min(1, Math.floor(pos)), f = pos - i;
    ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, Hh); ctx.drawImage(layers[i], 0, 0);
    if (f > 0) { ctx.globalAlpha = f; ctx.drawImage(layers[i + 1], 0, 0); }
    if (keep && pos > 0) { ctx.globalAlpha = Math.min(1, pos * 1.6); ctx.drawImage(layers[3], 0, 0); }
    ctx.globalAlpha = 1;
    for (const l of labels) l.n.style.opacity = Math.max(0, ...l.when.map(w => 1 - Math.abs(pos - w) * 2.2)).toFixed(2);
    const at = Math.round(pos), t = TEXT[at];
    if (paint.at !== at) {
      paint.at = at;
      $('.mo-tag b').textContent = t.stop; $('.mo-tag span').textContent = t.tag();
      $('.mo-about h3').textContent = t.h; $('.mo-about p').textContent = t.p;
      const key = $('.mo-key'); key.textContent = ''; for (const [c, text] of t.key) { const li = el('li'); li.append(el('i', 'k-' + c), text); key.append(li); }
      const ten = n => Math.round(n / 10) * 10;
      $('.mo-stat').textContent = at === 2 && made ? 'In this view, about ' + ten(made.water + made.marsh) + ' hectares of today' + APOS + 's land was water or marsh at first (' + ten(made.water) + ' water, ' + ten(made.marsh) + ' marsh), out of about ' + Math.round(made.view / 100) * 100 + ' hectares in view. That is today' + APOS + 's shore laid over maps drawn by hand, so read it as a rough size.' : '';
      root.querySelectorAll('.mo-stops button').forEach((b, n) => b.setAttribute('aria-pressed', String(n === at)));
    }
  }
  let ground = null;
  function build() {
    const cssW = stage.clientWidth; if (!cssW) return;
    K = cssW < 560 ? 0.95 : 0.72;
    W = Math.round(Math.min(2000, cssW * Math.min(2, window.devicePixelRatio || 1))); s = W / (F.x1 - F.x0); Hh = Math.round((F.y1 - F.y0) * s * K);
    canvas.width = W; canvas.height = Hh; stage.style.aspectRatio = W + ' / ' + Hh;
    ground = firstGround(W, Hh);
    layers = [first(ground), city(), today(ground), firstShore(ground)];
    setLabels(); paint.at = -1; paint();
  }
  let tween = 0;
  const slider = $('.mo-slide');
  function go(to) { // slide to a moment
    cancelAnimationFrame(tween); const from = pos, t0 = performance.now(), dur = still() ? 0 : 900 * Math.max(0.5, Math.abs(to - from));
    const tick = now => { const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = k * k * (3 - 2 * k); pos = from + (to - from) * e; slider.value = Math.round(pos * 100); paint(); if (k < 1) tween = requestAnimationFrame(tick); };
    tick(t0);
  }
  slider.addEventListener('input', () => { cancelAnimationFrame(tween); pos = slider.value / 100; paint(); });
  root.querySelectorAll('.mo-stops button').forEach((b, n) => b.addEventListener('click', () => go(n)));
  $('.mo-keep').addEventListener('change', e => { keep = e.target.checked; paint(); });

  let started = false;
  function start() {
    if (started) return; started = true;
    Promise.all(['history', 'terrain', 'shoreline', 'boundaries', 'today'].map(load)).then(() => {
      m02 = YP.HISTORY.maps.find(m => +m.year === 1802); m34 = YP.HISTORY.maps.find(m => +m.year === 1834);
      if (!m02 || !m34 || !YP.SHORE || !YP.TERRAIN) throw new Error('maps');
      measure(); build(); root.classList.add('ready');
      const src = $('.mo-src'); if (src) src.textContent = YP.HISTORY.source.title + ', ' + YP.HISTORY.source.by + ' (' + YP.HISTORY.source.licence + ')';
      let w0 = stage.clientWidth; new ResizeObserver(() => { const w = stage.clientWidth; if (Math.abs(w - w0) > w0 * 0.08) { w0 = w; build(); } else placeLabels(); }).observe(stage);
      return load('buildings').then(() => { layers[2] = today(ground); setLabels(); paint(); }); // the footprints are large: they arrive last and are drawn in when they do
    }).catch(() => { $('.mo-fail').hidden = false; });
  }
  new IntersectionObserver(es => { if (es[0].isIntersecting) start(); }, { rootMargin: '700px' }).observe(root);
  YP.moments = { go, start, get state() { return { pos, ready: !!layers, W, Hh, made, firstFrom, trees: trees && trees.length, buildings: !!YP.BUILDINGS }; } };
})();
