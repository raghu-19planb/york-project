// The shoreline, today: layer 01 of the 3D world.
// Scene units are metres. x = east, y = up, z = south (so north is -z).
// All geometry comes from data/shoreline.js; see tools/build-shoreline.js.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const D = window.YP.SHORE;
const INK = 0x28231f, PAPER = 0xf2e9d7;
const LAND_H = 6; // slab thickness, not a surveyed elevation

// lat/lon -> scene position, using the same projection as the build script.
const at = (lat, lon, y = 0) => new THREE.Vector3(
  (lon - D.origin.lon) * D.metresPerDegree.lon, y,
  -(lat - D.origin.lat) * D.metresPerDegree.lat);

const stage = document.getElementById('world3d');
const canvas = document.getElementById('gl');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.getElementById('glfail').hidden = false;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, matchMedia('(max-width: 820px), (pointer: coarse)').matches ? 1.5 : 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAPER);
scene.fog = new THREE.Fog(PAPER, 16000, 45000);

const camera = new THREE.PerspectiveCamera(42, 16 / 9, 10, 60000);
const controls = new OrbitControls(camera, canvas);
// OrbitControls switches off the browser's own touch scrolling on the canvas (it sets touch-action: none on it,
// which beats the stylesheet). On a phone the model can fill the screen, and then a finger on it could only turn
// the model and the page could not be moved at all. So an up-or-down swipe is given back to the page: a sideways
// swipe turns the model, and two fingers tilt and zoom it. The story frame has no page to scroll and keeps every gesture.
if (!document.documentElement.classList.contains('short')) { canvas.style.touchAction = 'pan-y'; controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE; }
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI / 2 - 0.04;
controls.minDistance = 150;
controls.maxDistance = 16000;

scene.add(new THREE.HemisphereLight(0xffffff, 0xb9ad94, 1.5));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
sun.position.set(-4000, 6000, 5000);
scene.add(sun);

// ---------- water ----------
// The model is a cut tile, like a model on a table: it stops where the data
// stops, rather than inventing shoreline outside the box that was fetched.
const TILE = {
  w: D.shore[0][0], e: D.shore[D.shore.length - 1][0],
  s: (D.box.s - D.origin.lat) * D.metresPerDegree.lat,
  n: (D.box.n - D.origin.lat) * D.metresPerDegree.lat
};
const water = new THREE.Mesh(
  new THREE.BoxGeometry(TILE.e - TILE.w, 60, TILE.n - TILE.s),
  new THREE.MeshLambertMaterial({ color: 0x74a9b8 }));
water.position.set((TILE.w + TILE.e) / 2, -30, -(TILE.n + TILE.s) / 2);
scene.add(water);

// ---------- land ----------
function slab(points, color) {
  const shape = new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1])));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: LAND_H, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // shape (east, north) -> ground plane, extruded upward
  return new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }));
}
function outline(points, closed) {
  const pts = points.map(p => new THREE.Vector3(p[0], LAND_H + 0.6, -p[1]));
  if (closed) pts.push(pts[0].clone());
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: INK }));
}

// The mainland is the shore line closed off along the north edge of the box.
const north = TILE.n;
const first = D.shore[0], last = D.shore[D.shore.length - 1];
const mainland = D.shore.concat([[last[0], north], [first[0], north]]);
scene.add(slab(mainland, 0xe0d3b6));
scene.add(outline(D.shore, false));
for (const ring of D.islands) {
  scene.add(slab(ring, 0x8fb8a4));
  scene.add(outline(ring, true));
}

// ---------- CN Tower marker (position and height real, shape simplified) ----------
const CN = { lat: 43.6426, lon: -79.3871, h: 553.33 };
{
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x8b949c });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3d4750 });
  const part = (rTop, rBot, y0, y1, m) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, 20), m);
    c.position.y = (y0 + y1) / 2;
    g.add(c);
  };
  part(10, 26, 0, 335, mat);
  part(24, 18, 335, 362, dark);
  part(6, 9, 362, 450, mat);
  part(1.5, 4, 450, CN.h, mat);
  g.position.copy(at(CN.lat, CN.lon, LAND_H));
  scene.add(g);
}

// ---------- buildings ----------
// One merged mesh per height source, so measured and estimated heights are
// visibly different: 'h' tagged height, 'l' storeys x 3.2 m, 'n' unknown.
const B = window.YP.BUILDINGS;
const BUILDING_COLORS = { h: 0xfbf7ee, l: 0xd8bd92, n: 0xb7b0a1 };
if (B) {
  const pos = { h: [], l: [], n: [] };
  for (const [kind, height, flat] of B.items) {
    const out = pos[kind], n = flat.length / 2, y0 = LAND_H, y1 = LAND_H + height;
    const ring = [];
    for (let i = 0; i < n; i++) ring.push(new THREE.Vector2(flat[i * 2], flat[i * 2 + 1]));
    for (let i = 0; i < n; i++) { // walls
      const a = ring[i], b = ring[(i + 1) % n];
      out.push(a.x, y0, -a.y, b.x, y0, -b.y, b.x, y1, -b.y, a.x, y0, -a.y, b.x, y1, -b.y, a.x, y1, -a.y);
    }
    for (const tri of THREE.ShapeUtils.triangulateShape(ring, [])) // roof
      for (const i of tri) out.push(ring[i].x, y1, -ring[i].y);
  }
  for (const kind of Object.keys(pos)) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos[kind], 3));
    geo.computeVertexNormals(); // non-indexed, so this gives flat faces
    scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: BUILDING_COLORS[kind], side: THREE.DoubleSide })));
  }
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const fmt = n => n.toLocaleString('en-CA');
  set('b-total', fmt(B.items.length));
  set('b-h', fmt(B.counts.h)); set('b-l', fmt(B.counts.l)); set('b-n', fmt(B.counts.n));
  set('k-h', fmt(B.counts.h)); set('k-l', fmt(B.counts.l)); set('k-n', fmt(B.counts.n));
}

// ---------- labels ----------
const LABELS = [
  { name: 'CN Tower', lat: CN.lat, lon: CN.lon, y: CN.h + 40 },
  { name: 'Inner Harbour', lat: 43.6335, lon: -79.3745, water: true },
  { name: 'Toronto Islands', lat: 43.6205, lon: -79.3780 },
  { name: 'Island airport', lat: 43.6285, lon: -79.3960 },
  { name: 'Ontario Place', lat: 43.6290, lon: -79.4152 },
  { name: 'Leslie Street Spit', lat: 43.6152, lon: -79.3431 },
  { name: 'Lake Ontario', lat: 43.6060, lon: -79.3900, water: true }
];
const labelBox = document.getElementById('labels');
for (const l of LABELS) {
  l.pos = at(l.lat, l.lon, l.y || 30);
  l.el = document.createElement('span');
  l.el.textContent = l.name;
  if (l.water) l.el.className = 'water';
  labelBox.append(l.el);
}
const v = new THREE.Vector3();
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of LABELS) {
    v.copy(l.pos).project(camera);
    const show = v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
    l.el.style.display = show ? '' : 'none';
    if (show) l.el.style.transform = `translate(-50%, -50%) translate(${(v.x + 1) / 2 * w}px, ${(1 - v.y) / 2 * h}px)`;
  }
}

// ---------- camera views ----------
const VIEWS = [
  { name: 'Over the harbour', sub: 'The lake edge from above', pos: [-2600, 2600, 4600], look: [0, 0, 300] },
  { name: 'From the lake', sub: 'The skyline across the islands', pos: [300, 260, 3900], look: [-400, 150, -700] },
  { name: 'Into downtown', sub: 'Over the towers', pos: [1500, 620, 900], look: [-350, 90, -1350] },
  { name: 'On the water', sub: 'From the harbour, at boat height', pos: [500, 60, 350], look: [-733, 230, -840] },
  { name: 'Straight down', sub: 'As a map', pos: [0, 9500, 420], look: [0, 0, 400] },
  { name: 'Along the shore', sub: 'West to east, low over the lake', pos: [-4600, 520, 1300], look: [200, 0, 100] }
];
let fly = null;
function goTo(view, instant) {
  const p = new THREE.Vector3(...view.pos), t = new THREE.Vector3(...view.look);
  if (instant || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    camera.position.copy(p); controls.target.copy(t); fly = null; return;
  }
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p, t, start: performance.now() };
}
// A page can show a few views as cards (data-pick="0,3,5") instead of the full row of buttons.
const viewBox = document.getElementById('views');
const cards = viewBox.classList.contains('cards');
const shown = viewBox.dataset.pick ? viewBox.dataset.pick.split(',').map(i => VIEWS[+i]) : VIEWS;
shown.forEach((view, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  if (cards) {
    const n = document.createElement('small'), t = document.createElement('b'), d = document.createElement('span');
    n.textContent = String(i + 1).padStart(2, '0'); t.textContent = view.name; d.textContent = view.sub;
    b.append(n, t, d);
  } else b.textContent = view.name;
  b.addEventListener('click', () => {
    goTo(view);
    viewBox.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  });
  if (i === 0) b.classList.add('on');
  viewBox.append(b);
});
controls.addEventListener('start', () => { fly = null; });
goTo(shown[0], true);

// ---------- source notes ----------
if (document.getElementById('src-link')) { // the notes exist on the full page only
  document.getElementById('src-link').href = D.sourceUrl;
  document.getElementById('src-date').textContent = 'data as of ' + (D.osmTimestamp || '').slice(0, 10);
  const islandPts = D.islands.reduce((n, r) => n + r.length, 0);
  document.getElementById('src-count').textContent =
    D.shore.length + ' points of mainland shore and ' + D.islands.length + ' island outlines (' + islandPts + ' points)';
}

// ---------- loop ----------
function resize() {
  // Sized from the canvas, not its container: on phones the legend and view buttons sit below it.
  const w = canvas.clientWidth, h = canvas.clientHeight;
  labelBox.style.height = h + 'px';
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

// Draw only while the model is on screen: the home page has two other 3D scenes.
let onScreen = true;
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(stage);
// On the home page a wheel or one-finger swipe scrolls the page; zoom is a pinch or ctrl+wheel there.
if (document.body.classList.contains('home')) {
  controls.enableZoom = false;
  canvas.addEventListener('wheel', e => { controls.enableZoom = e.ctrlKey; }, { capture: true, passive: true });
}
renderer.setAnimationLoop(now => {
  if (!onScreen) return;
  if (fly) {
    const k = Math.min(1, (now - fly.start) / 1100), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(fly.p0, fly.p, e);
    controls.target.lerpVectors(fly.t0, fly.t, e);
    if (k === 1) fly = null;
  }
  controls.update();
  renderer.render(scene, camera);
  placeLabels();
});

// Test hook
window.YP.shore = { scene, camera, controls, LABELS, VIEWS, goTo };
