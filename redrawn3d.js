// Toronto, redrawn: the city's limits laid down in maple leaves, in 3D.
//
// What is real: every outline (data/boundaries.js), the shore and creeks of each
// historical map (data/history.js), today's shoreline (data/shoreline.js) and
// today's rivers, roads and railways (data/today.js).
// What is drawing: the leaves themselves (one leaf stands for a patch of ground
// inside a mapped limit), their colours, the height of the terraces, the music.
//
// The film is a pure function of time, so it can be scrubbed. If WebGL or the
// 3D library is unavailable, index.html falls back to the flat film in redrawn.js.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const YP = window.YP;
const B = YP.BOUNDARIES, A = B.annexations, F = B.former;
const HIST = YP.HISTORY, TODAY = YP.TODAY, SHORE = YP.SHORE;
const $ = id => document.getElementById(id);
const canvas = $('film-canvas'), stage = $('film');

const C = { stage: 0x2a1512, soil: 0x4a2a22, chalk: 0xfff6e5, water: 0x7fc4c9, marsh: 0x8fae7a, gold: 0xe9b44c, red: 0xc21f2e };
const clamp = v => Math.max(0, Math.min(1, v));
const ease = k => k * k * (3 - 2 * k);
const lerp = (a, b, k) => a + (b - a) * k;

// A small seeded generator, so the leaves land in the same places on every visit.
let seed = 20261111;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

// ---------- geometry helpers (data is [east, north] in metres; scene is x east, y up, z south) ----------
const ringArea = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
function inside(x, y, rings) { // even-odd across every ring, so a hole inside a polygon reads as outside
  let c = false;
  for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
const boundsOf = lists => {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const r of lists) for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { x0, x1, y0, y1 };
};
const centre = rings => { // centre of the largest ring
  let best = rings[0], big = 0;
  for (const r of rings) { const a = ringArea(r); if (a > big) { big = a; best = r; } }
  let sx = 0, sy = 0; for (const p of best) { sx += p[0]; sy += p[1]; }
  return [sx / best.length, sy / best.length];
};
function hexPoints(rings, spacing) {
  const b = boundsOf(rings), out = [], dy = spacing * 0.866;
  let row = 0;
  for (let y = b.y0; y <= b.y1; y += dy, row++)
    for (let x = b.x0 + (row % 2 ? spacing / 2 : 0); x <= b.x1; x += spacing) {
      const px = x + (rnd() - 0.5) * spacing * 0.5, py = y + (rnd() - 0.5) * spacing * 0.5;
      if (inside(px, py, rings)) out.push([px, py]);
    }
  return out;
}

// ---------- the story, in seconds ----------
const MAP_AT = [[1802, 'William Chewett', 2.5], [1834, 'William Chewett', 6], [1842, 'James Cane', 10.5], [1851, 'J.O. Browne', 12.3], [1857, 'Waterlow & Sons', 14.1], [1872, 'Wadsworth & Unwin', 15.9], [1878, 'Hart & Rawlinson', 17.7]];
const MAPS = MAP_AT.map(([year, by, t]) => Object.assign({ t }, HIST.maps.find(m => m.year === year && m.by === by)));
const T_1834 = 6, T_ANNEX = 19.8, STEP = 0.45, FALL = 0.9;
A.forEach((a, i) => { a.t = i === 0 ? T_1834 : T_ANNEX + (i - 1) * STEP; a.spread = i === 0 ? 2.2 : 0.7; });
const T_ZOOM = A[A.length - 1].t + 1.6, T_METRO = T_ZOOM + 2, T_SIX = T_METRO + 4, T_ONE = T_SIX + 3.5, T_FILL = T_ONE + 5.2, TOTAL = T_FILL + 5.5;
const THIS_YEAR = +(SHORE.osmTimestamp || '').slice(0, 4) || new Date().getFullYear();

// year <-> time, for the timeline under the film
const KEYS = [[0, 1795], [MAPS[0].t, 1802], ...A.filter((a, i) => i === 0 || a.year !== A[i - 1].year).map(a => [a.t, a.year]), [T_METRO, 1954.5], [T_SIX, 1967.5], [T_ONE, 1998], [T_FILL, THIS_YEAR], [TOTAL, THIS_YEAR + 4]]
  .sort((p, q) => p[0] - q[0]).filter((k, i, all) => i === 0 || k[1] > all[i - 1][1]);
function across(v, from, to) {
  for (let i = 1; i < KEYS.length; i++) if (v <= KEYS[i][from]) {
    const p = KEYS[i - 1], q = KEYS[i];
    return lerp(p[to], q[to], clamp((v - p[from]) / (q[from] - p[from] || 1)));
  }
  return KEYS[KEYS.length - 1][to];
}
const yearAt = t => across(t, 0, 1), timeAt = year => across(year, 1, 0);

const CHAPTERS = [
  { t: MAPS[0].t, year: '1802', name: 'Before the city' },
  { t: T_1834, year: '1834', name: 'City and Liberties' },
  { t: MAPS[2].t, year: '1842', name: 'The shore on five maps' },
  { t: T_ANNEX, year: '1883', name: 'The annexations begin' },
  { t: A.find(a => a.year >= 1903).t, year: '1903', name: 'The great wave' },
  { t: T_METRO, year: '1954', name: 'Metropolitan Toronto' },
  { t: T_ONE, year: '1998', name: 'One city' },
  { t: T_FILL, year: 'Today', name: 'The shore has moved' }
];

// ---------- colour: each leaf is coloured by the year its ground joined the city ----------
const ERAS = [
  { to: 1834, label: '1834', hex: 0x8a1722 },
  { to: 1893, label: '1883 to 1893', hex: 0xc0392b },
  { to: 1909, label: '1903 to 1909', hex: 0xd9662b },
  { to: 1914, label: '1910 to 1914', hex: 0xe59a35 },
  { to: 1967, label: '1920 to 1967', hex: 0xefc968 }
];
const eraOf = year => ERAS.find(e => year <= e.to) || ERAS[ERAS.length - 1];
const SUMMER = 0x6f8f5a; // the boroughs before 1998: leaves that have not turned yet
const heightOf = year => 30 + 190 * Math.pow(1 - clamp((year - 1834) / 133), 1.2); // terraces: older ground stands higher

// ---------- renderer ----------
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false }); }
catch (e) { window.dispatchEvent(new Event('yp-film-fallback')); throw e; }
const coarse = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(C.stage);
scene.fog = new THREE.Fog(C.stage, 60000, 160000);
const camera = new THREE.PerspectiveCamera(32, 16 / 10, 100, 250000);
scene.add(new THREE.HemisphereLight(0xfff1e0, 0x3a1c16, 1.35));
const sun = new THREE.DirectionalLight(0xffe2b8, 1.9);
sun.position.set(-9000, 7000, 6000);
scene.add(sun);

// the stage floor: one flat field, as on a model table. Nothing outside the city limits is drawn as land or lake.
const floor = new THREE.Mesh(new THREE.PlaneGeometry(400000, 400000), new THREE.MeshLambertMaterial({ color: 0x321a16 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -2;
scene.add(floor);

const lineMats = [];
function fat(lines, o) {
  const pos = [];
  for (const l of lines) {
    const n = l.length;
    for (let i = 0; i < (o.closed ? n : n - 1); i++) {
      const a = l[i], b = l[(i + 1) % n];
      if (o.maxSeg && Math.hypot(b[0] - a[0], b[1] - a[1]) > o.maxSeg) continue;
      pos.push(a[0], o.y || 0, -a[1], b[0], o.y || 0, -b[1]);
    }
  }
  const g = new LineSegmentsGeometry();
  g.setPositions(pos.length ? pos : [0, 0, 0, 0, 0, 0]);
  const m = new LineMaterial({ color: o.color, linewidth: o.width || 1, transparent: true, opacity: o.opacity == null ? 1 : o.opacity, depthTest: false, dashed: !!o.dash, dashSize: o.dash || 1, gapSize: o.gap || 1 });
  lineMats.push(m);
  const obj = new LineSegments2(g, m);
  if (o.dash) obj.computeLineDistances();
  obj.renderOrder = o.order || 2;
  obj.frustumCulled = false;
  scene.add(obj);
  return obj;
}

// ---------- today's ground, for orientation ----------
const roads = fat(TODAY.roads.filter(r => r.cls !== 'secondary').flatMap(r => r.lines), { color: C.chalk, width: 1, opacity: 0.2, order: 3 });
const lanes = fat(TODAY.roads.filter(r => r.cls === 'secondary').flatMap(r => r.lines), { color: C.chalk, width: 1, opacity: 0.1, order: 3 });
const rail = fat(TODAY.rail.flatMap(r => r.lines), { color: C.chalk, width: 1, opacity: 0.16, dash: 160, gap: 120, order: 3 });
const rivers = fat(TODAY.rivers.flatMap(r => r.lines), { color: C.water, width: 1.6, opacity: 0.55, order: 4 });

// ---------- the shore and creeks, map by map ----------
// Outlines only. Long straight runs are the edge of the old map sheet, not shore, and are left out.
for (const m of MAPS) {
  m.shoreLine = fat(m.water, { color: C.water, width: 2.2, closed: true, maxSeg: 650, opacity: 0, order: 6 });
  m.marshLine = fat(m.marsh, { color: C.marsh, width: 1.6, closed: true, opacity: 0, dash: 90, gap: 70, order: 6 });
  m.creekLine = fat(m.creeks, { color: C.water, width: 1.5, opacity: 0, order: 6 });
}
const nowShore = fat([SHORE.shore], { color: C.gold, width: 2.4, opacity: 0, order: 7 });
const nowIsles = fat(SHORE.islands, { color: C.gold, width: 2, opacity: 0, closed: true, order: 7 });

// ---------- land: terraces for the annexations, low slabs for the boroughs ----------
function slab(rings, h) {
  const shapes = rings.map(r => new THREE.Shape(r.map(p => new THREE.Vector2(p[0], p[1]))));
  const g = new THREE.ExtrudeGeometry(shapes, { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: C.soil }));
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}
const BORO_H = 12;
const boroughs = F.filter(f => f.name !== 'TORONTO');
let cumulative = 0;
A.forEach(a => {
  a.h = heightOf(a.year);
  a.km2 = a.rings.reduce((s, r) => s + ringArea(r), 0) / 1e6;
  cumulative += a.km2; a.total = cumulative;
  if (!a.rings.length) return;
  a.slab = slab(a.rings, a.h);
  a.edge = fat(a.rings, { color: C.chalk, width: 1.2, closed: true, y: a.h, opacity: 0, order: 8 });
  [a.cx, a.cy] = centre(a.rings);
});
boroughs.forEach(f => {
  f.slab = slab(f.rings, BORO_H);
  [f.cx, f.cy] = centre(f.rings);
  f.label = f.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
});
const OLD_KM2 = cumulative;
const ALL_KM2 = F.reduce((s, f) => s + f.rings.reduce((n, r) => n + ringArea(r), 0), 0) / 1e6;
const limitsDash = fat(F.flatMap(f => f.rings), { color: C.chalk, width: 1.2, closed: true, opacity: 0.2, dash: 420, gap: 320, y: BORO_H, order: 5 });
const limitsLine = fat(F.flatMap(f => f.rings), { color: C.chalk, width: 1.6, closed: true, opacity: 0, y: BORO_H, order: 5 });

// ---------- leaves ----------
// One leaf per patch of ground inside a mapped limit. In the 1834 city, ground that Chewett's map
// shows as water gets no leaf, unless today's shoreline puts it on land: those leaves are the made land.
const LEAF_PTS = [50, 2, 57, 17, 65, 13, 61, 37, 75, 25, 78, 34, 92, 31, 87, 45, 96, 52, 73, 68, 76, 78, 53, 74, 54, 98, 46, 98, 47, 74, 24, 78, 27, 68, 4, 52, 13, 45, 8, 31, 22, 34, 25, 25, 39, 37, 35, 13, 43, 17];
const leafShape = new THREE.Shape();
for (let i = 0; i < LEAF_PTS.length; i += 2) leafShape[i ? 'lineTo' : 'moveTo']((LEAF_PTS[i] - 50) / 100, (50 - LEAF_PTS[i + 1]) / 100);
const leafGeo = new THREE.ShapeGeometry(leafShape);
leafGeo.rotateX(-Math.PI / 2);

const SP_CITY = coarse ? 250 : 210, SP_BORO = coarse ? 600 : 500;
const water1834 = MAPS[1].water, box1834 = boundsOf(water1834);
const mainlandNow = SHORE.shore.concat([[SHORE.shore[SHORE.shore.length - 1][0], 9000], [SHORE.shore[0][0], 9000]]);
const nowX0 = SHORE.shore[0][0], nowX1 = SHORE.shore[SHORE.shore.length - 1][0];
const landNow = (x, y) => x > nowX0 && x < nowX1 && (inside(x, y, [mainlandNow]) || SHORE.islands.some(r => inside(x, y, [r])));
const wet1834 = (x, y) => x > box1834.x0 && x < box1834.x1 && y > box1834.y0 && y < box1834.y1 && inside(x, y, water1834);

const leaves = [], groups = [], wet = [];
function addGroup(points, o) {
  const g = Object.assign({ start: leaves.length, state: -1 }, o);
  let far = 1;
  for (const p of points) far = Math.max(far, Math.hypot(p[0] - o.cx, p[1] - o.cy));
  const col = new THREE.Color();
  for (const p of points) {
    col.setHex(o.hex).offsetHSL((rnd() - 0.5) * 0.035, (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 0.12);
    leaves.push({
      x: p[0], z: -p[1], y: o.h + 3 + rnd() * 10, size: o.size * (0.85 + rnd() * 0.5),
      yaw: rnd() * Math.PI * 2, tx: (rnd() - 0.5) * 0.5, tz: (rnd() - 0.5) * 0.5,
      delay: Math.hypot(p[0] - o.cx, p[1] - o.cy) / far * 0.8 + rnd() * 0.2,
      wave: Math.hypot(p[0], p[1] - 1500), r: col.r, g: col.g, b: col.b, turns: o.turns
    });
  }
  g.count = leaves.length - g.start;
  groups.push(g);
  return g;
}
const made = [];
A.forEach(a => {
  if (!a.rings.length) return;
  const pts = [];
  for (const p of hexPoints(a.rings, SP_CITY)) {
    if (!wet1834(p[0], p[1])) { pts.push(p); continue; }
    wet.push({ x: p[0], z: -p[1], a });
    if (landNow(p[0], p[1])) made.push(p);
  }
  a.leaves = addGroup(pts, { t: a.t, spread: a.spread, h: a.h, cx: a.cx, cy: a.cy, hex: eraOf(a.year).hex, size: SP_CITY * 1.55, turns: true });
});
boroughs.forEach(f => { f.leaves = addGroup(hexPoints(f.rings, SP_BORO), { t: T_METRO, spread: 2.6, h: BORO_H, cx: f.cx, cy: f.cy, hex: SUMMER, size: SP_BORO * 1.5, turns: true }); });
addGroup(made, { t: T_FILL + 0.4, spread: 2.4, h: heightOf(1834) + 8, cx: 0, cy: -400, hex: C.gold, size: SP_CITY * 1.55, turns: false });
const MADE_LEAVES = made.length;
let waveFar = 1; for (const l of leaves) waveFar = Math.max(waveFar, l.wave);

const mesh = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), leaves.length);
mesh.frustumCulled = false;
mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(mesh);
const dummy = new THREE.Object3D(), col = new THREE.Color(), RED = new THREE.Color(C.red), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
for (let i = 0; i < leaves.length; i++) { mesh.setMatrixAt(i, ZERO); mesh.setColorAt(i, col.setRGB(leaves[i].r, leaves[i].g, leaves[i].b)); }

// Inside the limits but under water on Chewett's 1834 map: flat teal tiles instead of leaves.
const tiles = new THREE.InstancedMesh(new THREE.CircleGeometry(SP_CITY * 0.6, 6).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x235a60 }), Math.max(1, wet.length));
tiles.frustumCulled = false; tiles.count = wet.length;
scene.add(tiles);
function placeTiles(t) {
  for (let i = 0; i < wet.length; i++) {
    const w = wet[i], up = ease(clamp((t - w.a.t) / 0.9));
    dummy.position.set(w.x, w.a.h * up + 1.5, w.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(up > 0 ? 1 : 0); dummy.updateMatrix();
    tiles.setMatrixAt(i, dummy.matrix);
  }
  tiles.instanceMatrix.needsUpdate = true;
}

function placeLeaves(t) {
  let moved = false;
  for (const g of groups) {
    const state = t < g.t ? 0 : t > g.t + g.spread + FALL ? 2 : 1;
    if (state === g.state && state !== 1) continue;
    g.state = state; moved = true;
    for (let i = g.start; i < g.start + g.count; i++) {
      const l = leaves[i], p = state === 2 ? 1 : state === 0 ? 0 : clamp((t - g.t - l.delay * g.spread) / FALL);
      if (p <= 0) { mesh.setMatrixAt(i, ZERO); continue; }
      const air = 1 - p, drop = air * air;
      dummy.position.set(l.x + Math.sin(l.yaw + air * 5) * drop * 260, l.y + drop * 1500, l.z + Math.cos(l.yaw * 2 + air * 4) * drop * 260);
      dummy.rotation.set(l.tx + air * 5.5, l.yaw + air * 3, l.tz + air * 4.2);
      dummy.scale.setScalar(l.size * Math.min(1, p * 3));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
  }
  if (moved) mesh.instanceMatrix.needsUpdate = true;
}
let wavePhase = -1;
function colourLeaves(t) { // 1998: every leaf turns the same red, spreading out from the old city
  const phase = t < T_ONE ? 0 : t > T_ONE + 4.2 ? 2 : 1;
  if (phase === wavePhase && phase !== 1) return;
  wavePhase = phase;
  for (let i = 0; i < leaves.length; i++) {
    const l = leaves[i], k = !l.turns ? 0 : phase === 0 ? 0 : phase === 2 ? 1 : ease(clamp((t - T_ONE - l.wave / waveFar * 2.8) / 1.2));
    col.setRGB(l.r, l.g, l.b);
    if (k > 0) col.lerp(RED, k * 0.86);
    mesh.setColorAt(i, col);
  }
  mesh.instanceColor.needsUpdate = true;
}

// ---------- labels ----------
const labelBox = $('film-labels');
function label(text, x, y, h, cls) {
  const el = document.createElement('span');
  el.textContent = text; if (cls) el.className = cls;
  labelBox.append(el);
  return { el, pos: new THREE.Vector3(x, h || 0, -y), a: 0 };
}
const riverMid = name => { // put a river's name on the river: the middle of its longest mapped line
  const g = TODAY.rivers.find(r => r.name === name); if (!g) return null;
  const l = g.lines.reduce((p, q) => q.length > p.length ? q : p), p = l[Math.floor(l.length / 2)];
  return label(name, p[0], p[1], 0, 'water');
};
const L = {
  lake: label('Lake Ontario', 1500, -4700, 0, 'water'),
  harbour: label('The harbour', 300, -900, 0, 'water'),
  don: riverMid('Don River'), humber: riverMid('Humber River'), rouge: riverMid('Rouge River'),
  fresh: label('', 0, 0, 0, 'fresh'),
  city: label('Toronto', 0, 9000, 400, 'city'),
  made: label('Land made since 1834', 600, -1500, 300, 'fresh'),
  boroughs: boroughs.map(f => label(f.label, f.cx, f.cy, 60, 'boro'))
};
const v3 = new THREE.Vector3();
function placeLabel(l, alpha) {
  if (!l) return;
  v3.copy(l.pos).project(camera);
  const show = alpha > 0.02 && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
  l.el.style.opacity = show ? alpha : 0;
  if (show) l.el.style.transform = `translate(-50%, -50%) translate(${((v3.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v3.y) / 2 * H).toFixed(1)}px)`;
}

// ---------- camera: three framings, eased between, with a slow drift ----------
const pad = (b, k) => ({ x0: b.x0 - (b.x1 - b.x0) * k, x1: b.x1 + (b.x1 - b.x0) * k, y0: b.y0 - (b.y1 - b.y0) * k, y1: b.y1 + (b.y1 - b.y0) * k });
const CORE = pad(boundsOf(A[0].rings), 0.04), NEAR = pad(boundsOf(A.flatMap(a => a.rings)), 0.03), FAR = pad(boundsOf(F.flatMap(f => f.rings)), 0.02);
let W = 0, H = 0, userAz = 0, userEl = 0;
// How far back the camera must stand for a box to sit inside the picture, found by trying.
const probe = new THREE.PerspectiveCamera(), corner = new THREE.Vector3();
function frame(b, el, az) {
  const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2;
  probe.fov = camera.fov; probe.aspect = camera.aspect; probe.near = 100; probe.far = 400000; probe.updateProjectionMatrix();
  let dist = Math.max(b.x1 - b.x0, b.y1 - b.y0) * 0.6;
  for (let i = 0; i < 60; i++, dist *= 1.05) {
    probe.position.set(x + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -y + Math.cos(az) * Math.cos(el) * dist);
    probe.lookAt(x, 0, -y); probe.updateMatrixWorld(); probe.matrixWorldInverse.copy(probe.matrixWorld).invert();
    let fits = true;
    for (const [cx, cy] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
      corner.set(cx, 0, -cy).project(probe);
      if (Math.abs(corner.x) > 0.9 || corner.y > 0.72 || corner.y < -0.9) { fits = false; break; }
    }
    if (fits) break;
  }
  return { x, y, dist };
}
function aim(t) {
  // in on the 1834 city, out to the annexed city, out to the six municipalities, then back in for the shore
  const back = 1 - ease(clamp((t - T_FILL + 0.6) / 3));
  const k1 = ease(clamp((t - T_ANNEX + 1) / 4)) * back, k2 = ease(clamp((t - T_ZOOM) / 3.2)) * back;
  const el = lerp(lerp(0.74, 0.86, k1), 0.98, k2) + userEl;
  const az = Math.sin(t * 0.11) * 0.09 + userAz;
  const a = frame(CORE, el, az), b = frame(NEAR, el, az), c = frame(FAR, el, az);
  const mixf = key => lerp(lerp(a[key], b[key], k1), c[key], k2);
  const dist = Math.exp(lerp(lerp(Math.log(a.dist), Math.log(b.dist), k1), Math.log(c.dist), k2));
  const cx = mixf('x'), cy = mixf('y');
  camera.position.set(cx + Math.sin(az) * Math.cos(el) * dist, Math.sin(el) * dist, -cy + Math.cos(az) * Math.cos(el) * dist);
  camera.lookAt(cx, 0, -cy);
  return { k1, k2 };
}

// ---------- caption ----------
function caption(t) {
  if (t < MAPS[0].t) return { year: '', text: 'Toronto, redrawn', sub: 'In maple leaves · 1802 to today' };
  if (t < T_1834) return { year: 1802, text: 'Before the city', sub: 'Shore, marsh and creeks from William Chewett’s plan of 1802' };
  if (t < MAPS[2].t) return { year: 1834, text: 'City and Liberties', sub: 'Toronto is incorporated · shore from Chewett’s 1834 map' };
  if (t < T_ANNEX) { let m = MAPS[2]; for (const x of MAPS) if (x.t <= t) m = x; return { year: m.year, text: 'The shore, redrawn', sub: 'Shore and creeks from ' + m.by + '’s map of ' + m.year }; }
  if (t < T_ZOOM) { let a = A[1]; for (const x of A) if (x.t <= t) a = x; return { year: a.year, text: a.name, sub: 'Annexation ' + a.num + ' of 50 · ' + a.date }; }
  if (t < T_SIX) return { year: 1954, text: 'Metropolitan Toronto', sub: 'Thirteen municipalities under one regional government' };
  if (t < T_ONE) return { year: 1967, text: 'Thirteen become six', sub: 'The City of Toronto and five boroughs' };
  if (t < T_FILL) return { year: 1998, text: 'One City of Toronto', sub: '1 January 1998' };
  return { year: THIS_YEAR, text: 'The shore has moved', sub: 'Gold: today’s shoreline, and the land made since 1834' };
}
function areaAt(t) {
  if (t < T_1834) return null;
  if (t >= T_ONE) return ALL_KM2;
  let km = 0; for (const a of A) if (a.t <= t) km = a.total;
  return km;
}

// ---------- one frame ----------
let now = 0;
const setOpacity = (obj, o) => { obj.material.opacity = o; obj.visible = o > 0.01; };
function render(t) {
  now = t;
  if (!W) return;
  const { k1, k2 } = aim(t);
  placeLeaves(t); colourLeaves(t); placeTiles(t);

  const metro = clamp((t - T_METRO) / 2.5), six = clamp((t - T_SIX) / 1.2), one = ease(clamp((t - T_ONE) / 2.5)), fill = ease(clamp((t - T_FILL) / 1.5));
  for (const a of A) {
    if (!a.slab) continue;
    const up = ease(clamp((t - a.t) / 0.9)), fresh = clamp(1 - (t - a.t - 0.3) / 1.6);
    a.slab.visible = up > 0; a.slab.scale.y = Math.max(0.001, up);
    a.edge.position.y = a.h * (up - 1);
    a.edge.material.color.setHex(C.chalk).lerp(col.setHex(C.gold), t >= a.t ? fresh : 0);
    a.edge.material.linewidth = t >= a.t && fresh > 0 ? 2.6 : 1.1;
    setOpacity(a.edge, up * lerp(0.75, 0.18, one));
  }
  for (const f of boroughs) { const up = ease(clamp((t - T_METRO) / 1.2)); f.slab.visible = up > 0; f.slab.scale.y = Math.max(0.001, up); }
  setOpacity(limitsDash, lerp(0.2, 0.75, metro) * (1 - six));
  setOpacity(limitsLine, six * lerp(0.9, 0.3, one));

  // one historical map at a time; the last (1878) stays on, faintly, until today's shore replaces it
  MAPS.forEach((m, i) => {
    const next = MAPS[i + 1], into = clamp((t - m.t) / 0.7), out = next ? clamp((t - next.t) / 0.7) : 0;
    let o = into * (1 - out);
    if (!next) o *= lerp(1, 0.45, clamp((t - T_ANNEX) / 2)) * (1 - fill);
    setOpacity(m.shoreLine, o); setOpacity(m.marshLine, o * 0.9); setOpacity(m.creekLine, o * 0.95);
  });
  setOpacity(nowShore, fill); setOpacity(nowIsles, fill);
  const streets = layer.streets ? 1 : 0, water = layer.rivers ? 1 : 0;
  setOpacity(roads, 0.2 * streets); setOpacity(lanes, lerp(0.11, 0.05, k2) * streets); setOpacity(rail, 0.16 * streets);
  setOpacity(rivers, lerp(0.4, 0.6, k2) * water);

  renderer.render(scene, camera);

  // labels
  placeLabel(L.lake, 0.8); placeLabel(L.harbour, (1 - k1) * clamp((t - MAPS[0].t) / 1));
  placeLabel(L.don, water * 0.75 * (1 - one * k2)); placeLabel(L.humber, water * 0.75 * Math.max(k1, 0)); placeLabel(L.rouge, water * 0.75 * k2);
  L.boroughs.forEach(l => placeLabel(l, six * (1 - one)));
  placeLabel(L.city, one * k2);
  placeLabel(L.made, MADE_LEAVES ? clamp((t - T_FILL - 1.2) / 1) : 0);
  let fresh = null; if (t >= T_ANNEX - 0.2 && t < T_ZOOM) for (const a of A) if (a.slab && a.t <= t && a.num > 1) fresh = a;
  if (fresh) { L.fresh.el.textContent = fresh.year + ' · ' + fresh.name; L.fresh.pos.set(fresh.cx, fresh.h + 250, -fresh.cy); }
  placeLabel(L.fresh, fresh ? clamp(1 - (t - fresh.t - 1.4) / 0.6) : 0);

  const c = caption(t), km = areaAt(t);
  $('film-year').textContent = c.year; $('film-text').textContent = c.text; $('film-sub').textContent = c.sub;
  $('film-stat').textContent = km == null ? '' : (km < 100 ? km.toFixed(1) : Math.round(km)) + ' km² inside the limits';
  drawLine(t);
}

// ---------- the timeline under the film ----------
const lineCv = $('film-line'), lx = lineCv.getContext('2d');
const Y0 = 1795, Y1 = THIS_YEAR + 4;
const perYear = new Map(); A.forEach(a => perYear.set(a.year, (perYear.get(a.year) || 0) + a.km2));
function drawLine(t) {
  const w = lineCv.clientWidth, h = lineCv.clientHeight, d = Math.min(window.devicePixelRatio || 1, 2);
  if (!w) return;
  if (lineCv.width !== Math.round(w * d)) { lineCv.width = Math.round(w * d); lineCv.height = Math.round(h * d); }
  lx.setTransform(d, 0, 0, d, 0, 0); lx.clearRect(0, 0, w, h);
  const X = y => 8 + (y - Y0) / (Y1 - Y0) * (w - 16), base = h - 20, yr = yearAt(t);
  lx.strokeStyle = 'rgba(255,246,229,.35)'; lx.lineWidth = 1; lx.beginPath(); lx.moveTo(8, base + .5); lx.lineTo(w - 8, base + .5); lx.stroke();
  lx.font = '500 11px "Anek Latin", Arial, sans-serif'; lx.textAlign = 'center'; lx.textBaseline = 'top';
  for (let y = 1800; y <= Y1; y += w < 520 ? 50 : 25) { lx.fillStyle = 'rgba(255,246,229,.55)'; lx.fillText(y, X(y), base + 6); lx.fillRect(X(y), base - 3, 1, 6); }
  const top = Math.sqrt(Math.max(...perYear.values()));
  for (const [y, km] of perYear) { // one bar per year with an annexation; height is the square root of the area added
    const bh = Math.max(3, Math.sqrt(km) / top * (base - 8));
    lx.fillStyle = y <= yr ? '#' + eraOf(y).hex.toString(16).padStart(6, '0') : 'rgba(255,246,229,.22)';
    lx.fillRect(X(y) - 1.5, base - bh, 3, bh);
  }
  for (const m of MAPS) { lx.fillStyle = m.year <= yr ? '#7fc4c9' : 'rgba(127,196,201,.35)'; lx.beginPath(); lx.arc(X(m.year), base + 0.5, 3, 0, 7); lx.fill(); }
  for (const y of [1954, 1967, 1998]) { lx.fillStyle = y <= yr ? '#fff6e5' : 'rgba(255,246,229,.3)'; lx.fillRect(X(y) - 1, base - 16, 2, 16); }
  lx.fillStyle = '#e9b44c'; lx.fillRect(X(yr) - 1, 2, 2, base - 2);
  lx.beginPath(); lx.moveTo(X(yr) - 5, 0); lx.lineTo(X(yr) + 5, 0); lx.lineTo(X(yr), 7); lx.fill();
}

// ---------- sound: a few notes made with Web Audio ----------
let ac = null, muted = false;
function note(freq, dur, vol, type) {
  if (!ac || muted || !watching) return;
  const o = ac.createOscillator(), g = ac.createGain(), at = ac.currentTime;
  o.type = type || 'triangle'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(ac.destination); o.start(at); o.stop(at + dur + 0.05);
}
const SCALE = [293.66, 329.63, 369.99, 440, 493.88]; // D major pentatonic
const cues = A.map((a, i) => ({ t: a.t, play: () => i === 0 ? [146.83, 220].forEach(f => note(f, 3.2, 0.09, 'sine')) : note(SCALE[(i * 2) % 5] * (i % 10 < 5 ? 0.5 : 1), 0.9, 0.07) }));
MAPS.forEach((m, i) => { if (i !== 1) cues.push({ t: m.t, play: () => note(i === 0 ? 110 : 587.33 + i * 40, i === 0 ? 3 : 1.4, 0.05, 'sine') }); });
cues.push({ t: T_METRO, play: () => [146.83, 220, 293.66].forEach(f => note(f, 3.5, 0.06, 'sine')) });
cues.push({ t: T_SIX, play: () => SCALE.forEach((f, i) => setTimeout(() => note(f, 1.2, 0.06), i * 110)) });
cues.push({ t: T_ONE, play: () => [146.83, 220, 293.66, 369.99, 440].forEach(f => note(f, 5, 0.06, 'sine')) });
cues.push({ t: T_FILL, play: () => [220, 329.63, 493.88].forEach((f, i) => setTimeout(() => note(f, 3, 0.06, 'sine'), i * 260)) });

// ---------- transport ----------
// Before Play, the film runs as a silent glimpse while it is on screen. Play starts it from the top with sound.
const layer = { streets: true, rivers: true };
let playing = false, watching = false, last = 0, visible = false, dirty = true;
const motionOn = () => !document.documentElement.classList.contains('still');
const mmss = t => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(Math.floor(t % 60)).padStart(2, '0');
function ui() {
  $('film-seek').value = Math.round(now / TOTAL * 1000);
  $('film-time').textContent = mmss(now) + ' / ' + mmss(TOTAL);
  stage.classList.toggle('watching', watching);
  $('film-pause').hidden = !watching;
  $('film-pause').textContent = playing ? 'Pause' : now >= TOTAL ? 'Replay' : 'Resume';
  $('film-note').textContent = watching ? caption(now).text : 'A silent glimpse. Play the film to hear the notes.';
  document.querySelectorAll('#film-chapters button').forEach((b, i) => b.classList.toggle('on', now >= CHAPTERS[i].t && (i === CHAPTERS.length - 1 || now < CHAPTERS[i + 1].t)));
}
function tick(ts) {
  requestAnimationFrame(tick);
  const dt = Math.min(0.5, (ts - last) / 1000); last = ts; // keeps real time even on a slow phone
  const run = watching ? playing : visible && motionOn();
  if (run) {
    const before = now;
    let t = now + dt;
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
$('film-mute').addEventListener('click', () => {
  muted = !muted;
  $('film-mute').textContent = muted ? 'Sound off' : 'Sound on';
  $('film-mute').setAttribute('aria-pressed', String(muted));
});
$('film-seek').addEventListener('input', e => { watching = true; playing = false; seek(e.target.value / 1000 * TOTAL); });
lineCv.addEventListener('click', e => {
  const r = lineCv.getBoundingClientRect(), year = Y0 + (e.clientX - r.left - 8) / (r.width - 16) * (Y1 - Y0);
  watching = true; playing = false; seek(timeAt(Math.max(Y0, Math.min(Y1, year))));
});
const chapBox = $('film-chapters');
CHAPTERS.forEach(c => {
  const b = document.createElement('button');
  b.type = 'button'; b.innerHTML = '<b></b><span></span>';
  b.firstChild.textContent = c.year; b.lastChild.textContent = c.name;
  // A chapter plays from its start. On a phone the buttons sit below the film, so bring the film back into view.
  b.addEventListener('click', () => {
    unlock(); watching = true; playing = true; seek(c.t);
    const r = stage.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight) window.scrollTo({ top: window.scrollY + r.top - 76, behavior: motionOn() ? 'smooth' : 'auto' });
  });
  chapBox.append(b);
});
for (const key of Object.keys(layer)) {
  const box = $('film-layer-' + key);
  box.addEventListener('change', () => { layer[key] = box.checked; dirty = true; });
}
// drag to turn the model
let drag = null;
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, az: userAz, el: userEl }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  userAz = drag.az - (e.clientX - drag.x) * 0.006;
  userEl = Math.max(-0.5, Math.min(0.45, drag.el + (e.clientY - drag.y) * 0.004));
  dirty = true;
});
['pointerup', 'pointercancel'].forEach(n => canvas.addEventListener(n, () => { drag = null; }));
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) { playing = false; ui(); } });
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.15 }).observe(stage);
window.addEventListener('yp-motion', () => { dirty = true; });

// ---------- key, sources, sizes ----------
const key = $('film-key');
const swatch = (hex, text) => { const d = document.createElement('div'), i = document.createElement('i'); i.style.background = '#' + hex.toString(16).padStart(6, '0'); d.append(i, text); key.append(d); };
ERAS.forEach(e => swatch(e.hex, e.label));
swatch(SUMMER, 'Boroughs, 1954 to 1997');
swatch(C.red, 'One city, 1998');
swatch(C.gold, 'Land made since 1834');
const src = $('film-sources');
const cite = (s, extra) => { const li = document.createElement('li'), a = document.createElement('a'); a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = s.title; li.append(a, ' · ' + s.by + ' · ' + s.licence + (extra || '')); src.append(li); };
cite(B.sources.annexations); cite(B.sources.former);
cite(HIST.source, '. Maps used: ' + MAPS.map(m => m.by + ' ' + m.year).join(', ') + '.');
cite({ url: TODAY.sourceUrl, title: 'OpenStreetMap', by: 'today’s shoreline, rivers, main roads and railways', licence: 'ODbL' });
$('film-length').textContent = Math.round(TOTAL) + ' seconds';
$('film-leaves').textContent = leaves.length.toLocaleString('en-CA');
$('film-made').textContent = MADE_LEAVES.toLocaleString('en-CA');
$('film-ha').textContent = (SP_CITY * SP_CITY * 0.866 / 10000).toFixed(1);
$('film-ha2').textContent = Math.round(SP_BORO * SP_BORO * 0.866 / 10000);
$('film-old').textContent = OLD_KM2.toFixed(0);
$('film-all').textContent = ALL_KM2.toFixed(0);

function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  if (!W || !H) return;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  for (const m of lineMats) m.resolution.set(W, H);
  dirty = true;
}
new ResizeObserver(resize).observe(canvas);
resize();
// A still frame for visitors who have motion turned off: the six municipalities, just before they become one.
if (!motionOn()) now = T_ONE - 0.3;
ui();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { dirty = true; });
requestAnimationFrame(tick);
YP.film = { seek, render, TOTAL, CHAPTERS, get now() { return now; }, leaves: leaves.length };
