// Toronto, c.1700: the ground before the town, as a 3D model you can look around.
//
// REAL (from data, see data/terrain.js and tools/build-terrain.js):
//   - the shape of the ground: today's elevation model, so the valleys, the old lake bluff and the
//     river courses are where they are now;
//   - the water's edge, the marsh and the creeks: the earliest maps that cover each place
//     (Chewett 1802, Chewett 1834, Browne 1851). Nothing was mapped in 1700; these are the nearest.
//   - where Teiaiagon stood (Baby Point, on the east bank of the Humber).
// NOT REAL, and said so on the page:
//   - the trees and undergrowth: where they stand, what kind they are and how thick they grow are an
//     impression of forest, apart from the oak savannah at High Park, which survives;
//   - the trail's exact line (it is known to have followed the Humber's east bank; the line here
//     simply keeps to that bank), and its width;
//   - the canoes and people, which are there for scale;
//   - the light, the sky, the waves and the foam;
//   - heights, which are stretched 2.5 times, and trees, canoes and people, drawn 1.5 times life size.
// The village of Teiaiagon is modelled as it stood about 1680, from what is recorded of it and of Seneca towns of
// those years; where each house stood is not known, and that is said on the page. The people's dress follows the
// 1710 portraits by John Verelst and written accounts. Around 1700 the village had been left; no camp of the
// Anishinaabe, who then held this country, is modelled, because nothing read for this project says where one stood.
//
// How it is drawn: a low afternoon sun with soft shadows that follow the camera; a ground with a fine
// grain over its colours and a shoreline smoothed across the 50 m data points; a water surface that is
// clear in the shallows, darker over depth, with moving ripples and foam at the beach; and two versions
// of every tree, a detailed one near the camera and a simple one for the forest seen from far off.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const YP = window.YP, T = YP.TERRAIN, H = YP.HISTORY;
const stage = document.getElementById('w17'), canvas = document.getElementById('w17-gl');
const EX = 2.5, BIG = 1.5; // vertical stretch; size of trees, canoes and people against life
const PHONE = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const hash = (i, s) => { const x = Math.sin(i * 127.1 + (s || 0) * 311.7 + 74.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const still = () => document.documentElement.classList.contains('still');

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); }
catch (e) { document.getElementById('w17-fail').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const HAZE = new THREE.Color('#f3e9d6'), ZENITH = new THREE.Color('#c3d3d9'); // a warm, bright haze: late-summer light, not a clear blue day
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(HAZE.getHex(), 9000, 30000);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 2, 90000);
const SUN = new THREE.Vector3(-0.68, 0.56, 0.47).normalize(); // toward the sun: low in the south-west
scene.add(new THREE.HemisphereLight(0xf4eee2, 0xa8956f, 1.8));
const sun = new THREE.DirectionalLight(0xffe4bc, 2.7);
sun.castShadow = true; sun.shadow.mapSize.set(PHONE ? 1024 : 2048, PHONE ? 1024 : 2048); sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
{ // the sky: warm haze at the horizon rising to a pale blue, with a soft glow round the sun
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uHaze: { value: HAZE }, uZenith: { value: ZENITH }, uSun: { value: SUN } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uHaze, uZenith, uSun; varying vec3 vDir;
      void main() { vec3 d = normalize(vDir); float up = pow(clamp(d.y, 0.0, 1.0), 0.85);
        vec3 c = mix(uHaze, uZenith, up); float g = max(dot(d, uSun), 0.0);
        c += vec3(1.0, 0.86, 0.6) * (pow(g, 220.0) * 0.9 + pow(g, 12.0) * 0.16);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  scene.userData.sky = sky;
}

// ---------- small painted textures ----------
function texture(size, draw, repeat) {
  const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.repeat.set(repeat, repeat);
  return t;
}
let seed = 1700; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const grain = texture(512, (g, s) => { // a light grain, laid over the ground's own colours
  g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 26000; i++) { const v = rnd(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,' + (0.04 + rnd() * 0.12) + ')' : 'rgba(255,255,255,' + (0.04 + rnd() * 0.14) + ')'; const r = 0.4 + rnd() * 1.1; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, r, r * (0.5 + rnd()), rnd() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,' + (0.015 + rnd() * 0.03) + ')'; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, 20 + rnd() * 60, 14 + rnd() * 40, rnd() * 3, 0, 7); g.fill(); }
});
const leafy = texture(256, (g, s) => { // leaves as dabs of light and dark, for the crowns near the camera
  g.fillStyle = '#b9b9b9'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) { const v = rnd(); g.fillStyle = v < 0.45 ? 'rgba(20,30,10,' + (0.25 + rnd() * 0.4) + ')' : 'rgba(255,255,235,' + (0.25 + rnd() * 0.5) + ')'; const r = 2 + rnd() * 5; g.beginPath(); g.ellipse(rnd() * s, rnd() * s, r, r * 0.55, rnd() * 3, 0, 7); g.fill(); }
}, 3);
const barky = texture(128, (g, s) => {
  g.fillStyle = '#c4c4c4'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) { g.fillStyle = rnd() < 0.6 ? 'rgba(0,0,0,' + (0.15 + rnd() * 0.35) + ')' : 'rgba(255,255,255,' + (0.1 + rnd() * 0.25) + ')'; g.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 3, 10 + rnd() * 50); }
});

// ---------- ground ----------
const { box, cell, nx, ny, maskCell, maskNx, maskNy } = T;
if (typeof T.kind === 'string') T.kind = T.kind.split(''); // one character per point, made editable (see the sandbar, below)
const rawAt = (x, y) => { // today's height above the lake, metres, bilinear
  const fx = clamp((x - box.x0) / cell, 0, nx - 1.001), fy = clamp((y - box.y0) / cell, 0, ny - 1.001);
  const i = Math.floor(fx), j = Math.floor(fy), kx = fx - i, ky = fy - j, n = j * nx + i;
  return ((T.h[n] * (1 - kx) + T.h[n + 1] * kx) * (1 - ky) + (T.h[n + nx] * (1 - kx) + T.h[n + nx + 1] * kx) * ky) / 10;
};
const kindAt = (x, y) => {
  const i = Math.round((x - box.x0) / maskCell), j = Math.round((y - box.y0) / maskCell);
  return i < 0 || j < 0 || i >= maskNx || j >= maskNy ? 1 : +T.kind[j * maskNx + i];
};
// Height of the model's surface above the lake, metres (before the vertical stretch).
function surface(x, y) {
  const k = kindAt(x, y), h = rawAt(x, y);
  if (k === 1) return h > 1.2 ? h - 0.6 : -6;   // a river above lake level keeps its bed; the lake and bay sit below the water
  if (k === 2) return 0.25;                     // marsh, at the waterline
  return Math.max(h, 0.9);                      // land is never below the beach
}
const N = maskNx * maskNy, hs = new Float32Array(N), lake = new Uint8Array(N), nearWater = new Uint8Array(N), lone = new Uint8Array(N);
for (let j = 0; j < maskNy; j++) for (let i = 0; i < maskNx; i++) { const n = j * maskNx + i; hs[n] = surface(box.x0 + i * maskCell, box.y0 + j * maskCell); lake[n] = T.kind[n] === '1' && hs[n] < 0 ? 1 : 0; }
// Where the maps draw water but today's ground stands above the lake, it is either a river running down to the lake
// or land made since (the modern waterfront, the spit, the airport). Made land lies against the lake; a river only
// climbs above lake level well inland. So raised "water" within about a kilometre of the lake, going by water, is lake.
{
  let edge = []; for (let n = 0; n < N; n++) if (lake[n]) edge.push(n);
  for (let step = 0; step < 22 && edge.length; step++) {
    const next = [];
    for (const n of edge) { const i = n % maskNx, j = (n - i) / maskNx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue; const m = jj * maskNx + ii; if (T.kind[m] === '1' && !lake[m]) { lake[m] = 1; hs[m] = -6; next.push(m); } } }
    edge = next;
  }
}
const isLake = n => lake[n] === 1;
// A few specks of "land" stand alone in open water where two map sheets disagree. A speck smaller than about three
// hectares with no other land within 400 m is taken out; pieces of the sandbar are close to each other and stay.
{
  const comp = new Int32Array(N).fill(-1), sizes = [], members = [];
  for (let n0 = 0; n0 < N; n0++) {
    if (T.kind[n0] !== '0' || comp[n0] >= 0) continue;
    const id = sizes.length, stack = [n0], list = []; comp[n0] = id;
    while (stack.length) {
      const n = stack.pop(), i = n % maskNx, j = (n - i) / maskNx; list.push(n);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue; const m = jj * maskNx + ii; if (T.kind[m] === '0' && comp[m] < 0) { comp[m] = id; stack.push(m); } }
    }
    sizes.push(list.length); members.push(list);
  }
  members.forEach((list, id) => {
    if (list.length >= 12) return;
    for (const n of list) { const i = n % maskNx, j = (n - i) / maskNx;
      for (let dj = -8; dj <= 8; dj++) for (let di = -8; di <= 8; di++) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue; const m = jj * maskNx + ii; if (T.kind[m] === '0' && comp[m] !== id) return; } }
    for (const n of list) { hs[n] = -6; lake[n] = 1; lone[n] = 1; }
  });
}
// The sandbar. On the maps it is one strip from the mainland to its hooked end, and it is recorded as joined to the
// shore until the storm of 1858. Sampled every 50 m it comes out in pieces. Each piece is joined to the nearest other
// land or marsh across any gap of up to a kilometre with a low strip of sand two points wide, so it is one bar again.
for (let pass = 0; pass < 4; pass++) { // pieces join pieces first; the joined bar then reaches the shore
  const dry = n => (T.kind[n] === '0' && !lone[n]) || T.kind[n] === '2'; // marsh counts as shore here
  const comp = new Int32Array(N).fill(-1); let count = 0; const members = [];
  for (let n0 = 0; n0 < N; n0++) {
    if (!dry(n0) || comp[n0] >= 0) continue;
    const stack = [n0], list = []; comp[n0] = count;
    while (stack.length) { const n = stack.pop(), i = n % maskNx, j = (n - i) / maskNx; list.push(n);
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue; const m = jj * maskNx + ii; if (dry(m) && comp[m] < 0) { comp[m] = count; stack.push(m); } } }
    members.push(list); count++;
  }
  if (count < 2) break;
  const main = members.reduce((a, b, k) => b.length > members[a].length ? k : a, 0);
  const nearMarsh = list => list.some(n => { const i = n % maskNx, j = (n - i) / maskNx; for (let dj = -4; dj <= 4; dj++) for (let di = -4; di <= 4; di++) { const m = (j + dj) * maskNx + i + di; if (m >= 0 && m < N && T.kind[m] === '2') return true; } return false; });
  members.map((list, id) => ({ list, id })).filter(c => c.id !== main && !nearMarsh(c.list)).sort((a, b) => b.list.length - a.list.length).forEach(({ list, id }) => { // hummocks in the marsh are not the bar
    let best = null;
    for (const n of list) { const i = n % maskNx, j = (n - i) / maskNx;
      for (let dj = -20; dj <= 20; dj++) for (let di = -20; di <= 20; di++) {
        const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue;
        const m = jj * maskNx + ii; if (!dry(m) || comp[m] === id) continue;
        const d = Math.hypot(di, dj); if (!best || d < best.d) best = { d, i, j, ii, jj };
      } }
    if (!best || best.d < 1.5) return;
    for (let k = 0; k <= best.d * 2; k++) { const t = k / (best.d * 2), x = Math.round(best.i + (best.ii - best.i) * t), y = Math.round(best.j + (best.jj - best.j) * t);
      for (const [di, dj] of [[0, 0], [1, 0], [0, 1]]) { const m = (y + dj) * maskNx + x + di; if (T.kind[m] === '1') { T.kind[m] = '0'; hs[m] = 0.9; lake[m] = 0; } } }
  });
}
// The data says "land" or "water" point by point, which draws a coast in 50 m steps. Along the lake and the bay
// the heights are averaged with their neighbours a few times, so the beach slopes into the water and the
// waterline runs smoothly between the points. Rivers and marsh are left as they are.
for (let pass = 0; pass < 3; pass++) {
  const src = hs.slice();
  for (let j = 1; j < maskNy - 1; j++) for (let i = 1; i < maskNx - 1; i++) {
    const n = j * maskNx + i; if (T.kind[n] === '2' || lone[n] || (T.kind[n] === '1' && !lake[n])) continue;
    let lo = 1e9, hi = -1e9, sum = 0, cnt = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const m = n + dj * maskNx + di; if (T.kind[m] === '1' && !lake[m]) continue; const v = Math.min(src[m], 6); lo = Math.min(lo, v); hi = Math.max(hi, v); sum += v; cnt++; }
    if (lo < 0 && hi > 0 && src[n] < 7) hs[n] = sum / cnt;
  }
}
// What something standing or floating there rests on: the drawn surface (the same points the ground mesh joins up), or the water.
function meshY(x, y) {
  const fx = clamp((x - box.x0) / maskCell, 0, maskNx - 1.001), fy = clamp((y - box.y0) / maskCell, 0, maskNy - 1.001);
  const i = Math.floor(fx), j = Math.floor(fy), kx = fx - i, ky = fy - j, n = j * maskNx + i;
  return (hs[n] * (1 - kx) + hs[n + 1] * kx) * (1 - ky) + (hs[n + maskNx] * (1 - kx) + hs[n + maskNx + 1] * kx) * ky;
}
const groundY = (x, y) => Math.max(meshY(x, y), 0) * EX;
const P = (x, y, lift) => new THREE.Vector3(x, groundY(x, y) + (lift || 0), -y);
for (let j = 0; j < maskNy; j++) for (let i = 0; i < maskNx; i++) { // within 150 m of the lake or bay
  let near = 0;
  for (let dj = -3; dj <= 3 && !near; dj++) for (let di = -3; di <= 3; di++) {
    const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue;
    if (lake[jj * maskNx + ii]) { near = 1; break; }
  }
  nearWater[j * maskNx + i] = near;
}
const slopeAt = n => {
  const i = n % maskNx, j = (n - i) / maskNx; let s = 0;
  if (i > 0 && i < maskNx - 1) s = Math.max(s, Math.abs(hs[n + 1] - hs[n - 1]) / (2 * maskCell));
  if (j > 0 && j < maskNy - 1) s = Math.max(s, Math.abs(hs[n + maskNx] - hs[n - maskNx]) / (2 * maskCell));
  return s;
};
const isSand = n => T.kind[n] === '0' && !lone[n] && hs[n] < 2.6 && nearWater[n];
const SITE = { x: (-79.494 - T.origin.lon) * Math.cos(T.origin.lat * Math.PI / 180) * 111320, y: (43.657 - T.origin.lat) * 110574 }; // Baby Point
const openness = (x, y) => clamp((1 - (((x + 6850) / 800) ** 2 + ((y - 1350) / 900) ** 2)) * 2.2, 0, 1); // High Park, where black oak savannah survives: 1 at its heart, 0 outside
const savannah = (x, y) => openness(x, y) > 0.5;
const cleared = (x, y) => clamp((1 - Math.hypot(x - SITE.x, y - SITE.y) / 380) * 3, 0, 1); // the old village clearing, fading into the forest at its edge
// ---------- the town page: the same ground, followed from 1700 to 1850 ----------
// town.html sets data-world="town" on its body. Everything for it is drawn further down (search: "the town, 1700").
const TOWN = document.body.dataset.world === 'town';
const TO = [540, 1548], TE = [0.958, 0.287], TN = [-0.287, 0.958]; // George and Front streets; the way Front Street runs; the way up from the lake
const toUV = (x, y) => [(x - TO[0]) * TE[0] + (y - TO[1]) * TE[1], (x - TO[0]) * TN[0] + (y - TO[1]) * TN[1]];
// year, west, east, north (metres along and up from Front Street): how far the cleared ground had reached. The
// first two rows follow the record (ten blocks in 1793; west to Peter Street in 1797). The rest are drawn to keep
// pace with the population, not taken from a survey.
const REACH = [[1793, -150, 760, 480], [1797, -1900, 800, 600], [1813, -2000, 900, 750], [1825, -2400, 1100, 950], [1834, -2900, 1500, 1300], [1842, -3300, 1800, 1900], [1850, -3700, 2100, 2600]];
const FORT = [-2054, 442], ROUILLE = [-3760, -475]; // Fort York; the Fort Rouillé monument at Exhibition Place
function clearYear(x, y, rough) { // the year the forest at this point was cut; 9999 if it still stood in 1850
  const j = rough ? (hash(Math.round(x) * 7 + Math.round(y) * 131, 150) - 0.5) * 9 : 0;
  if (Math.hypot(x - ROUILLE[0], y - ROUILLE[1]) < 130) return 1751;
  if (Math.hypot(x - FORT[0], y - FORT[1]) < 260) return 1793 + Math.max(0, j);
  const [u, v] = toUV(x, y); if (v < -700) return 9999;
  for (let i = 0; i < REACH.length; i++) {
    const r = REACH[i];
    if (u > r[1] && u < r[2] && v < r[3]) { // inside this stage: when did its edge pass, between the stage before and this one?
      if (i === 0) return 1793 + Math.max(0, j);
      const p = REACH[i - 1], k = Math.max(u < p[1] ? (p[1] - u) / (p[1] - r[1]) : 0, u > p[2] ? (u - p[2]) / (r[2] - p[2]) : 0, v > p[3] ? (v - p[3]) / (r[3] - p[3]) : 0);
      return Math.min(1850, Math.max(1793, p[0] + (r[0] - p[0]) * k + j));
    }
  }
  return 9999;
}
const townTrees = [];
{
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), uv = new Float32Array(N * 2), c = new THREE.Color(), c2 = new THREE.Color();
  for (let j = 0; j < maskNy; j++) for (let i = 0; i < maskNx; i++) {
    const n = j * maskNx + i, k = T.kind[n], h = hs[n], x = box.x0 + i * maskCell, y = box.y0 + j * maskCell;
    pos[n * 3] = x; pos[n * 3 + 1] = h * EX; pos[n * 3 + 2] = -y; uv[n * 2] = x / 17; uv[n * 2 + 1] = y / 17;
    if (k === '1' && !lake[n]) c.set('#5aa0aa');                                        // a river above the lake
    else if (k === '2') c.set('#a3ab68');                                               // marsh
    else if (h < 0.5) c.set('#e9dcb2').lerp(c2.set('#6f9a96'), clamp(-h / 7, 0, 1));    // sand running out under the water
    else if (isSand(n)) c.set('#eadcae').lerp(c2.set('#d8c592'), hash(n, 4));
    else {
      c.set('#55583a').lerp(c2.set('#646b44'), clamp(h / 90, 0, 1));                      // the forest floor, in shade
      c.lerp(c2.set('#a3a868'), 0.6 * openness(x, y));                                   // grass under the scattered oaks
      c.lerp(c2.set('#a9a36a'), 0.7 * cleared(x, y));                                    // the old clearing
      if (((x - SITE.x) / 172) ** 2 + ((y - SITE.y) / 142) ** 2 < 1) c.lerp(c2.set('#c4b08a'), 0.55); // ground worn bare where the houses stood
      else if (cleared(x, y) > 0.5) c.lerp(c2.set('#8c7650'), 0.6);                       // turned soil in the fields
      const s = slopeAt(n); if (s > 0.16) c.lerp(c2.set('#b9a67c'), clamp((s - 0.16) * 4, 0, 0.85)); // bare clay on bluffs and valley sides
      c.offsetHSL((hash(n, 6) - 0.5) * 0.02, 0, (hash(n, 5) - 0.5) * 0.05);
    }
    col[n * 3] = c.r; col[n * 3 + 1] = c.g; col[n * 3 + 2] = c.b;
  }
  const idx = new Uint32Array((maskNx - 1) * (maskNy - 1) * 6);
  let q = 0;
  for (let j = 0; j < maskNy - 1; j++) for (let i = 0; i < maskNx - 1; i++) {
    const a = j * maskNx + i, b = a + 1, d = a + maskNx, e = d + 1;
    idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = b; idx[q++] = e; idx[q++] = d;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, bumpMap: grain, bumpScale: 0.5, roughness: 1, metalness: 0 }));
  ground.receiveShadow = true; scene.add(ground); scene.userData.ground = ground;
}

// ---------- the lake and the bay ----------
// One sheet at the waterline. It reads the ground's height under it: clear over the shallows, darker over depth,
// with ripples that catch the sun and lines of foam running in at the beach.
const W = box.x1 - box.x0, D = box.y1 - box.y0;
const waterMat = new THREE.ShaderMaterial({
  transparent: true, fog: true,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uDepth: { value: null }, uBox: { value: new THREE.Vector4(box.x0, box.y0, W, D) }, uSun: { value: SUN.clone() }, uSky: { value: new THREE.Color('#a9c8d4') } }]),
  vertexShader: `varying vec3 vWorld;
    #include <fog_pars_vertex>
    void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }`,
  fragmentShader: `uniform float uTime; uniform sampler2D uDepth; uniform vec4 uBox; uniform vec3 uSun, uSky; varying vec3 vWorld;
    #include <common>
    #include <fog_pars_fragment>
    float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec2 uv = vec2((vWorld.x - uBox.x) / uBox.z, (-vWorld.z - uBox.y) / uBox.w);
      float bed = texture2D(uDepth, clamp(uv, 0.0, 1.0)).r * 8.0 - 6.0; // the ground's height here, metres above the lake
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) bed = -6.0; // beyond the data: open lake
      float d = max(-bed, 0.0), t = uTime; vec2 p = vWorld.xz;
      float dist = distance(cameraPosition, vWorld), calm = clamp(500.0 / dist, 0.12, 1.0); // ripples flatten with distance, so they do not shimmer
      float k1 = dot(p, vec2(0.031, 0.052)) + t * 0.9, k2 = dot(p, vec2(-0.092, 0.056)) + t * 1.3;
      vec3 n = normalize(vec3((0.10 * cos(k1) - 0.12 * cos(k2) + (vn(p * 0.11 + t * 0.25) - 0.5) * 0.5) * calm, 1.0, (0.14 * cos(k1) + 0.08 * cos(k2) + (vn(p * 0.11 + 9.0 - t * 0.2) - 0.5) * 0.5) * calm));
      vec3 v = normalize(cameraPosition - vWorld);
      vec3 col = mix(vec3(0.36, 0.72, 0.68), vec3(0.05, 0.27, 0.40), smoothstep(0.0, 4.2, d));
      col = mix(col, uSky, pow(1.0 - max(dot(n, v), 0.0), 4.0) * 0.26);
      col += vec3(1.0, 0.92, 0.78) * pow(max(dot(reflect(-uSun, n), v), 0.0), 80.0) * 0.7;
      float band = smoothstep(0.42, 0.02, d);
      float lines = smoothstep(0.35, 0.9, sin(d * 26.0 - t * 1.3 + vn(p * 0.07) * 6.0));
      float foam = band * (0.25 + 0.75 * lines) * smoothstep(0.0, 0.05, d + 0.03);
      float caps = smoothstep(0.985, 1.0, sin(dot(p, vec2(0.021, 0.047)) + t * 0.7 + vn(p * 0.018) * 5.0)) * smoothstep(1.5, 5.0, d) * 0.2 * smoothstep(700.0, 150.0, dist);
      col = mix(col, vec3(0.97, 0.96, 0.91), clamp(foam + caps, 0.0, 0.92));
      float alpha = max(mix(0.62, 0.97, smoothstep(0.0, 1.8, d)), foam);
      gl_FragColor = vec4(col, alpha);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }`
});
{
  const depth = new Uint8Array(N); for (let n = 0; n < N; n++) depth[n] = Math.round(clamp((hs[n] + 6) / 8, 0, 1) * 255);
  const tex = new THREE.DataTexture(depth, maskNx, maskNy, THREE.RedFormat); tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  waterMat.uniforms.uDepth.value = tex;
  const water = new THREE.Mesh(new THREE.PlaneGeometry(W + 60000, D + 60000), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set((box.x0 + box.x1) / 2 + 30000, 0, -(box.y0 + box.y1) / 2 + 30000); water.renderOrder = 2;
  scene.add(water);
  const bed = new THREE.Mesh(water.geometry, new THREE.MeshBasicMaterial({ color: 0x1f4f5e })); // the lake floor beyond the data, so the water is one tone
  bed.rotation.x = -Math.PI / 2; bed.position.copy(water.position); bed.position.y = -6 * EX - 0.5; scene.add(bed);
}
// the model is a cut tile: a plain skirt closes the land's north and west edges rather than inventing ground beyond them
{
  const skirt = new THREE.MeshLambertMaterial({ color: 0x8a7d62, side: THREE.DoubleSide });
  const wall = pts => {
    const v = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; v.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], -30, b[2], a[0], a[1], a[2], b[0], -30, b[2], a[0], -30, a[2]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); scene.add(new THREE.Mesh(g, skirt));
  };
  const north = [], west = [];
  for (let i = 0; i < maskNx; i++) north.push([box.x0 + i * maskCell, hs[(maskNy - 1) * maskNx + i] * EX, -box.y1]);
  for (let j = 0; j < maskNy; j++) west.push([box.x0, hs[j * maskNx] * EX, -(box.y0 + j * maskCell)]);
  wall(north); wall(west);
}

// ---------- creeks, as the 1802 and 1851 maps drew them ----------
{
  const v = [];
  for (const [year, by] of [[1802, 'William Chewett'], [1851, 'J.O. Browne']]) {
    const m = H.maps.find(q => q.year === year && q.by === by);
    for (const l of m.creeks) for (let i = 0; i < l.length - 1; i++) {
      const a = l[i], b = l[i + 1];
      if (a[0] < box.x0 || a[0] > box.x1 || a[1] < box.y0 || a[1] > box.y1) continue;
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 600) continue; // a long straight run is a sheet edge, not a creek
      const pa = P(a[0], a[1], 2.5), pb = P(b[0], b[1], 2.5); v.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x5aa0aa })));
}

// ---------- the Carrying Place: the trail up the Humber's east bank ----------
// Sourced: it began at the lake and followed the east bank, past Teiaiagon. Not sourced: this exact line.
const trail = [];
{
  const riverX = (y, guess) => { // the Humber's channel in this row, nearest to where it was in the last one
    let best = null;
    for (let x = guess - 900; x <= guess + 900; x += maskCell) if (kindAt(x, y) === 1 && rawAt(x, y) < 40) { if (best === null || Math.abs(x - guess) < Math.abs(best - guess)) best = x; }
    return best;
  };
  let gx = -7700;
  for (let y = -150; y <= box.y1 - 100; y += 150) {
    // below the village the river swings far to the west; look for it along the line from the mouth to the village
    const lead = y <= SITE.y ? -7700 + (SITE.x - 250 + 7700) * clamp((y + 150) / (SITE.y + 150), 0, 1) : gx;
    const rx = riverX(y, lead); gx = rx !== null ? rx : lead;
    let x = gx + 230; // keep to the east bank, on ground that is land
    for (let k = 0; k < 8 && kindAt(x, y) !== 0; k++) x += maskCell;
    trail.push([x, y]);
  }
  for (const p of trail) { const w = Math.exp(-(((p[1] - SITE.y) / 420) ** 2)); p[0] += (SITE.x + 30 - p[0]) * w; } // the village stood on the trail: bend the line to pass it
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < trail.length - 1; i++) trail[i][0] = (trail[i - 1][0] + trail[i][0] * 2 + trail[i + 1][0]) / 4;
  for (const p of trail) { const w = Math.exp(-(((p[1] - SITE.y) / 300) ** 2)); p[0] += (SITE.x + 30 - p[0]) * w; } // and again after smoothing, so it goes in at the gate
}
const trailAt = y => { for (let i = 0; i < trail.length - 1; i++) if (trail[i + 1][1] >= y) { const a = trail[i], b = trail[i + 1], k = (y - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * k, y]; } return trail[trail.length - 1]; };
const nearTrail = (x, y, gap) => Math.abs(x - trailAt(clamp(y, trail[0][1], trail[trail.length - 1][1]))[0]) < (gap || 16) && y > trail[0][1] - 30;
{
  const v = [], uvs = [], HALF = 1.5; // a footpath would be invisible from any height; this is drawn about 3 m wide
  for (let y = trail[0][1]; y < trail[trail.length - 1][1] - 20; y += 20) {
    const a = trailAt(y), b = trailAt(y + 20), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ox = -dy / len * HALF, oy = dx / len * HALF;
    const q = [P(a[0] - ox, a[1] - oy, 0.35), P(a[0] + ox, a[1] + oy, 0.35), P(b[0] + ox, b[1] + oy, 0.35), P(b[0] - ox, b[1] - oy, 0.35)];
    for (const k of [0, 1, 2, 0, 2, 3]) { v.push(q[k].x, q[k].y, q[k].z); uvs.push(q[k].x / 6, q[k].z / 6); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
  const path = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xbda57c, map: grain, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
  path.receiveShadow = true; scene.add(path);
}

// ---------- trees (an impression of forest, not a survey) ----------
// Each tree has two shapes. Far from the camera it is a few faces, enough for a canopy. Near the camera it is a trunk
// with bark and a crown built from several lumps or tiers with leaves dabbed on, standing in ferns and brush.
const tmpV = new THREE.Vector3(), tmpC = new THREE.Color();
const shade = (geo, dark, light, y0, y1) => { // darker underneath, lighter where the sun reaches
  const p = geo.attributes.position, c = new Float32Array(p.count * 3), a = new THREE.Color(dark), b = new THREE.Color(light);
  for (let i = 0; i < p.count; i++) { tmpC.copy(a).lerp(b, clamp((p.getY(i) - y0) / (y1 - y0), 0, 1)); c[i * 3] = tmpC.r; c[i * 3 + 1] = tmpC.g; c[i * 3 + 2] = tmpC.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
};
const lump = (r, detail, sd, sx, sy, sz, ox, oy, oz) => { // a ball pushed in and out a little, so no two crowns are round
  const g = mergeVertices(new THREE.IcosahedronGeometry(r, detail)), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    tmpV.fromBufferAttribute(p, i);
    const k = 1 + (hash(Math.round(tmpV.x * 40) * 7 + Math.round(tmpV.y * 40) * 131 + Math.round(tmpV.z * 40) * 1013, sd) - 0.5) * 0.34;
    p.setXYZ(i, tmpV.x * k * sx + ox, tmpV.y * k * sy + oy, tmpV.z * k * sz + oz);
  }
  g.computeVertexNormals(); return g;
};
const tier = (r, h, y, seg) => { const g = new THREE.ConeGeometry(r, h, seg, 1, true); g.translate(0, y + h / 2, 0); return g; };
const GEO = (() => { // every shape is one unit tall, standing on y = 0
  const broadHi = mergeGeometries([lump(0.3, 1, 1, 1, 0.82, 1, 0, 0.68, 0), lump(0.2, 1, 2, 1, 0.8, 1, 0.2, 0.6, 0.06), lump(0.19, 1, 3, 1, 0.8, 1, -0.17, 0.62, 0.14), lump(0.18, 1, 4, 1, 0.8, 1, -0.05, 0.6, -0.2), lump(0.17, 1, 5, 1, 0.75, 1, 0.08, 0.86, -0.02)]);
  const conHi = mergeGeometries([tier(0.2, 0.22, 0.22, 9), tier(0.185, 0.22, 0.33, 9), tier(0.165, 0.22, 0.44, 9), tier(0.14, 0.22, 0.55, 9), tier(0.115, 0.22, 0.65, 9), tier(0.09, 0.2, 0.75, 9), tier(0.06, 0.18, 0.83, 9)]);
  const trunkLo = new THREE.CylinderGeometry(0.018, 0.03, 0.5, 4, 1, true); trunkLo.translate(0, 0.25, 0);
  const broadLo = mergeGeometries([shade(mergeVertices(trunkLo.clone()), '#3b2d21', '#4d3b2c', 0, 0.5), shade(lump(0.34, 1, 6, 1, 1.02, 1, 0, 0.62, 0), '#34502a', '#7d9c50', 0.32, 0.98)]);
  const conLo = mergeGeometries([shade(mergeVertices(trunkLo.clone()), '#3b2d21', '#4d3b2c', 0, 0.5), shade(mergeVertices(tier(0.21, 0.5, 0.2, 6)), '#254530', '#4a7450', 0.2, 0.7), shade(mergeVertices(tier(0.14, 0.48, 0.52, 6)), '#2c5036', '#55805a', 0.52, 1)]);
  const trunk = new THREE.CylinderGeometry(0.5, 0.82, 1, 8, 3); trunk.translate(0, 0.5, 0);
  { const p = trunk.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) < 0.01) p.setXYZ(i, p.getX(i) * 1.5, 0, p.getZ(i) * 1.5); trunk.computeVertexNormals(); } // the trunk flares at the root
  return { broadHi: shade(broadHi, '#3a5a2c', '#93b45a', 0.42, 1.02), conHi: shade(conHi, '#24442e', '#55825c', 0.16, 1), broadLo, conLo, trunk, bush: shade(lump(1, 1, 8, 1, 0.55, 1, 0, 0.42, 0), '#3f5c30', '#9ab862', 0, 0.9), rock: lump(1, 0, 9, 1, 0.6, 1, 0, 0.3, 0) };
})();
const MAT = {
  lo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
  crown: new THREE.MeshStandardMaterial({ vertexColors: true, map: leafy, roughness: 1, metalness: 0 }),
  conCrown: new THREE.MeshStandardMaterial({ vertexColors: true, map: leafy, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x8a735c, map: barky, roughness: 1, metalness: 0 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x8f8a7e, roughness: 1, metalness: 0 })
};
const CHUNK = 1600, chunks = new Map();
{
  const STEP = PHONE ? 92 : 47;
  let id = 0;
  const add = (x, y, conifer, oak) => {
    id++;
    const key = Math.floor((x - box.x0) / CHUNK) + ',' + Math.floor((y - box.y0) / CHUNK);
    if (!chunks.has(key)) chunks.set(key, { trees: [], cx: 0, cy: 0, lo: [], hi: null });
    const h = (conifer ? 30 + hash(id, 8) * 14 : oak ? 17 + hash(id, 8) * 7 : 22 + hash(id, 8) * 11) * BIG;
    chunks.get(key).trees.push({ x, y, conifer, oak, id, h, base: groundY(x, y) });
  };
  for (let y = box.y0 + 30; y < box.y1; y += STEP) for (let x = box.x0 + 30; x < box.x1; x += STEP) {
    const k = id + 1, px = x + (hash(k, 1) - 0.5) * STEP * 0.9, py = y + (hash(k, 2) - 0.5) * STEP * 0.9;
    const i = Math.round((px - box.x0) / maskCell), j = Math.round((py - box.y0) / maskCell), n = j * maskNx + i;
    id++; // every grid point uses one id, whether or not a tree grows there, so the forest is the same each visit
    if (i < 1 || j < 1 || i >= maskNx - 1 || j >= maskNy - 1 || T.kind[n] !== '0' || hs[n] < 0.7) continue;
    if (isSand(n) && hash(k, 3) > 0.06) continue;                              // beaches and the sandbar are nearly bare
    if (slopeAt(n) > 0.45) continue;
    if (cleared(px, py) > 0.3 || hash(k, 4) < cleared(px, py) * 0.97) continue; // the clearing where Teiaiagon stood: no tree inside it
    if (nearTrail(px, py)) continue;
    const oak = savannah(px, py);
    if (TOWN && clearYear(px, py) < 9999) { townTrees.push({ x: px, y: py, conifer: hash(k, 7) < 0.24, id: k, cy: hash(k, 153) < 0.07 ? 9999 : clearYear(px, py, true) }); continue; }
    if (hash(k, 6) < openness(px, py) * 0.72) continue;                        // savannah: scattered trees over grass
    id--; add(px, py, !oak && hash(k, 7) < 0.24, oak);
  }
  // the forest closes in along the trail, so that walking it at eye level is walking through trees
  for (let k = 0; k < trail.length - 1; k++) for (let q = 0; q < 12; q++) {
    const s = 900000 + k * 20 + q, a = trail[k], b = trail[k + 1], t = hash(s, 31), side = hash(s, 32) < 0.5 ? -1 : 1, off = 17 + hash(s, 33) * 60;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), px = a[0] + dx * t - dy / len * off * side, py = a[1] + dy * t + dx / len * off * side;
    const n = Math.round((py - box.y0) / maskCell) * maskNx + Math.round((px - box.x0) / maskCell);
    if (T.kind[n] !== '0' || isSand(n) || cleared(px, py) > 0.05) continue;
    add(px, py, hash(s, 7) < 0.22, false);
  }
  const d = new THREE.Object3D();
  let total = 0;
  for (const [key, ch] of chunks) {
    const [ci, cj] = key.split(',').map(Number);
    ch.cx = box.x0 + (ci + 0.5) * CHUNK; ch.cy = box.y0 + (cj + 0.5) * CHUNK; ch.cz = groundY(ch.cx, ch.cy);
    total += ch.trees.length;
    for (const conifer of [true, false]) {
      const list = ch.trees.filter(t => t.conifer === conifer); if (!list.length) continue;
      const m = new THREE.InstancedMesh(conifer ? GEO.conLo : GEO.broadLo, MAT.lo, list.length);
      list.forEach((t, k) => {
        const w = t.h * (conifer ? 1.05 : t.oak ? 1.35 : 1.12); // a little wide, so the canopy closes when seen from far off
        d.position.set(t.x, t.base, -t.y); d.rotation.set(0, hash(t.id, 9) * 6.28, 0); d.scale.set(w, t.h, w); d.updateMatrix(); m.setMatrixAt(k, d.matrix);
        const v = 0.82 + hash(t.id, 11) * 0.42; m.setColorAt(k, tmpC.setRGB(v * (1.08 + hash(t.id, 10) * 0.22), v * 0.98, v * (0.7 + hash(t.id, 12) * 0.2))); // toward olive: leaves in haze, not signal green
      });
      m.castShadow = !PHONE; m.receiveShadow = false; m.computeBoundingSphere(); scene.add(m); ch.lo.push(m);
    }
  }
  YP.w17trees = total;
}
function detail(ch) { // the close-up version of one patch of forest, built the first time the camera comes near
  const g = new THREE.Group(), d = new THREE.Object3D(), n = ch.trees.length;
  const trunks = new THREE.InstancedMesh(GEO.trunk, MAT.trunk, n);
  const cons = ch.trees.filter(t => t.conifer), broads = ch.trees.filter(t => !t.conifer);
  const conM = new THREE.InstancedMesh(GEO.conHi, MAT.conCrown, Math.max(1, cons.length)), broadM = new THREE.InstancedMesh(GEO.broadHi, MAT.crown, Math.max(1, broads.length));
  conM.count = cons.length; broadM.count = broads.length;
  const place = (m, k, t, w) => {
    d.position.set(t.x, t.base, -t.y); d.rotation.set((hash(t.id, 14) - 0.5) * 0.06, hash(t.id, 9) * 6.28, (hash(t.id, 15) - 0.5) * 0.06); d.scale.set(w, t.h, w); d.updateMatrix(); m.setMatrixAt(k, d.matrix);
    const v = 0.85 + hash(t.id, 11) * 0.4; m.setColorAt(k, tmpC.setRGB(v * (1.08 + hash(t.id, 10) * 0.22), v * 0.98, v * (0.7 + hash(t.id, 12) * 0.2)));
  };
  ch.trees.forEach((t, k) => {
    const girth = t.h * (t.conifer ? 0.016 : t.oak ? 0.03 : 0.022), up = t.h * (t.conifer ? 0.34 : 0.56);
    d.position.set(t.x, t.base - 0.3, -t.y); d.rotation.set(0, hash(t.id, 9) * 6.28, 0); d.scale.set(girth, up, girth); d.updateMatrix(); trunks.setMatrixAt(k, d.matrix);
  });
  cons.forEach((t, k) => place(conM, k, t, t.h * 0.92)); broads.forEach((t, k) => place(broadM, k, t, t.h * (t.oak ? 1.3 : 1.05)));
  // ferns and brush round the trunks, and a few stones
  const spots = [];
  for (const t of ch.trees) for (let q = 0; q < (t.oak ? 2 : 9); q++) {
    const a = hash(t.id, 40 + q) * 6.28, r = 2 + hash(t.id, 50 + q) * 26, x = t.x + Math.cos(a) * r, y = t.y + Math.sin(a) * r;
    if (nearTrail(x, y, 4) || kindAt(x, y) !== 0 || meshY(x, y) < 0.8) continue;
    spots.push({ x, y, s: 0.35 + hash(t.id, 60 + q) * 0.6, id: t.id * 11 + q });
  }
  const bushes = new THREE.InstancedMesh(GEO.bush, MAT.crown, Math.max(1, spots.length)); bushes.count = spots.length;
  spots.forEach((s, k) => {
    d.position.set(s.x, groundY(s.x, s.y) - 0.15, -s.y); d.rotation.set(0, hash(s.id, 3) * 6.28, 0); d.scale.set(s.s * 1.5, s.s * (0.7 + hash(s.id, 4) * 0.7), s.s * 1.5); d.updateMatrix(); bushes.setMatrixAt(k, d.matrix);
    const v = 0.8 + hash(s.id, 5) * 0.5; bushes.setColorAt(k, tmpC.setRGB(v * (0.9 + hash(s.id, 6) * 0.3), v, v * 0.8));
  });
  const stones = spots.filter(s => hash(s.id, 7) < 0.06), rocks = new THREE.InstancedMesh(GEO.rock, MAT.rock, Math.max(1, stones.length)); rocks.count = stones.length;
  stones.forEach((s, k) => { const x = s.x + 2.5, y = s.y - 1.5; d.position.set(x, groundY(x, y) - 0.1, -y); d.rotation.set(0, hash(s.id, 8) * 6.28, 0); d.scale.setScalar(0.25 + hash(s.id, 9) * 0.55); d.updateMatrix(); rocks.setMatrixAt(k, d.matrix); });
  for (const m of [trunks, conM, broadM, bushes, rocks]) { m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); g.add(m); }
  scene.add(g); return g;
}
// Ferns and grass, only where the camera is close to the ground: flat cut-outs standing crossed, built a tile at a time.
const frond = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 17; i++) {
    const a = -1.25 + (i / 16) * 2.5 + (rnd() - 0.5) * 0.2, len = 70 + rnd() * 50, bend = (rnd() - 0.5) * 30;
    const x1 = 64 + Math.sin(a) * len, y1 = 126 - Math.cos(a) * len;
    g.strokeStyle = ['#3f6a2e', '#5a8a3a', '#79a64c', '#4d7a34', '#8fb85a'][i % 5]; g.lineWidth = 3 + rnd() * 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(64, 127); g.quadraticCurveTo(64 + Math.sin(a) * len * 0.5 + bend, 126 - Math.cos(a) * len * 0.6, x1, y1); g.stroke();
    for (let k = 3; k < 9; k++) { const px = 64 + (x1 - 64) * k / 9, py = 127 + (y1 - 127) * k / 9; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9 - 3); g.moveTo(px, py); g.lineTo(px - Math.cos(a) * 9, py - Math.sin(a) * 9 - 3); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const frondGeo = (() => { const a = new THREE.PlaneGeometry(1, 1); a.translate(0, 0.5, 0); const b = a.clone(); b.rotateY(Math.PI / 2); return mergeGeometries([a, b]); })();
const frondMat = new THREE.MeshStandardMaterial({ map: frond, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1, metalness: 0 });
const TILE = 150, tiles = new Map();
function tile(ix, iy) {
  const pts = [], x0 = box.x0 + ix * TILE, y0 = box.y0 + iy * TILE, STEP = PHONE ? 7.5 : 4.6;
  for (let y = y0; y < y0 + TILE; y += STEP) for (let x = x0; x < x0 + TILE; x += STEP) {
    const id = Math.round(x * 3) * 7919 + Math.round(y * 3) * 104729; if (hash(id, 70) < 0.28) continue;
    const px = x + (hash(id, 71) - 0.5) * STEP, py = y + (hash(id, 72) - 0.5) * STEP;
    if (kindAt(px, py) !== 0 || meshY(px, py) < 1.4 || nearTrail(px, py, 5) || cleared(px, py) > 0.45) continue; // the clearing has its own cover
    pts.push([px, py, id]);
  }
  const m = new THREE.InstancedMesh(frondGeo, frondMat, Math.max(1, pts.length)), d = new THREE.Object3D(); m.count = pts.length;
  pts.forEach(([x, y, id], k) => {
    const w = (0.6 + hash(id, 73) * 1.0) * BIG, grass = savannah(x, y);
    d.position.set(x, groundY(x, y) - 0.05, -y); d.rotation.set(0, hash(id, 74) * 3.14, 0); d.scale.set(w, w * (grass ? 0.45 : 0.75), w); d.updateMatrix(); m.setMatrixAt(k, d.matrix);
    const v = 0.75 + hash(id, 75) * 0.5; m.setColorAt(k, grass ? tmpC.setRGB(v * 1.15, v, v * 0.6) : tmpC.setRGB(v * 0.95, v, v * 0.85));
  });
  m.receiveShadow = true; m.computeBoundingSphere(); scene.add(m); return m;
}
function brush() {
  const cx = Math.floor((camera.position.x - box.x0) / TILE), cy = Math.floor((-camera.position.z - box.y0) / TILE);
  const low = camera.position.y - groundY(camera.position.x, -camera.position.z) < 260;
  for (const [key, m] of tiles) { const [ix, iy] = key.split(',').map(Number); m.visible = low && Math.abs(ix - cx) <= 2 && Math.abs(iy - cy) <= 2; }
  if (!low) return;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const key = (cx + dx) + ',' + (cy + dy); if (!tiles.has(key)) tiles.set(key, tile(cx + dx, cy + dy)); }
}
const NEAR = PHONE ? 1000 : 1700;
function forest() { // show each patch in its close or far version, by how near the camera is
  for (const ch of chunks.values()) {
    const close = Math.hypot(camera.position.x - ch.cx, camera.position.z + ch.cy, camera.position.y - ch.cz) < NEAR;
    if (close && !ch.hi) ch.hi = detail(ch);
    if (ch.hi) ch.hi.visible = close;
    for (const m of ch.lo) m.visible = !close;
  }
}
// reeds in the marsh
{
  const pts = [];
  for (let n = 0; n < N; n++) if (T.kind[n] === '2') for (let q = 0; q < 2; q++) if (hash(n, 21 + q) < 0.6) { const i = n % maskNx, j = (n - i) / maskNx; pts.push([box.x0 + (i + hash(n, 22 + q) - 0.5) * maskCell, box.y0 + (j + hash(n, 26 + q) - 0.5) * maskCell]); }
  const g = shade(mergeVertices(tier(1, 1, 0, 5)), '#6f7a3a', '#c9c27a', 0, 1);
  const reeds = new THREE.InstancedMesh(g, MAT.lo, pts.length), d = new THREE.Object3D();
  pts.forEach((p, k) => { d.position.set(p[0], 0.2 * EX, -p[1]); d.rotation.set(0, hash(k, 25) * 6, 0); d.scale.set(5 + hash(k, 27) * 5, 4 + hash(k, 24) * 5, 5 + hash(k, 28) * 5); d.updateMatrix(); reeds.setMatrixAt(k, d.matrix); reeds.setColorAt(k, tmpC.setScalar(0.8 + hash(k, 29) * 0.4)); });
  reeds.frustumCulled = false; scene.add(reeds);
}

// ---------- canoes and people, for scale (illustrative) ----------
const bark = new THREE.MeshStandardMaterial({ color: 0xd9b46e, roughness: 0.9 }), dark = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 1 });
const skin = new THREE.MeshStandardMaterial({ color: 0xb07f5c, roughness: 0.9 }), hide = new THREE.MeshStandardMaterial({ color: 0xa88560, roughness: 1 });
const hair = new THREE.MeshStandardMaterial({ color: 0x1f1813, roughness: 1 }), legging = new THREE.MeshStandardMaterial({ color: 0x7a6248, roughness: 1 });
const part = (g, geo, m, x, y, z, rx, rz) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; if (rz) o.rotation.z = rz; o.castShadow = true; g.add(o); return o; };
// Dress. What is known, and where from (see references.js):
//   - John Verelst's portraits of three Mohawk leaders and one Mohican, painted in 1710: white linen shirts to the
//     thigh, a patterned woven sash at the waist, a wide scarlet cloth cloak over the shoulders, moccasins with a
//     wrapped ankle, dark hair cut short, bare lower legs. They were painted in London, dressed to meet the Queen.
//   - Written accounts: men in moccasins, leggings and a short kilt; women in a skirt, with a cape-like upper garment;
//     men's hair shaved to a tuft on the crown, a married woman's in one braid; hide first, then red and blue trade
//     cloth, which had become the usual material by the 1700s.
// So: hide and trade cloth together, as it was in these decades. No two figures are dressed quite alike.
const cloth = hex => new THREE.MeshStandardMaterial({ color: hex, roughness: 1, metalness: 0, side: THREE.DoubleSide });
const DRESS = {
  linen: cloth(0xe9e2d0), scarlet: cloth(0x8e2f26), blue: cloth(0x2f4a6b), hide: cloth(0xb08d63), hideDark: cloth(0x8a6a48),
  sash: cloth(0x6a2f2a), moc: cloth(0x9a6b3e), cuff: cloth(0xc5552f), basket: cloth(0xb9995e)
};
// A figure 1.7 m tall, built like a body: hips, knees, a spine, shoulders, elbows and a neck, each a joint that
// turns, so a figure can stand with its weight on one leg, bend to the corn, sit in a canoe or walk. k picks who
// it is, so the same figure is the same on every visit. It faces +z.
const GEOS = new Map(), geo = (key, make) => { if (!GEOS.has(key)) GEOS.set(key, make()); return GEOS.get(key); };
const hang = (r0, r1, len) => geo('h' + r0 + '/' + r1 + '/' + len, () => { const g = new THREE.CylinderGeometry(r0, r1, len, 10, 1); g.translate(0, -len / 2, 0); return g; }); // a limb, hanging from its joint
const lathed = (key, prof, flat, a0, aLen, folds) => geo(key, () => { // cloth and trunk shapes, turned on a lathe, pressed flatter front to back, with folds if asked
  const g = new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0], p[1])), 18, a0 || 0, aLen || Math.PI * 2);
  if (folds) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), k = 1 + Math.sin(Math.atan2(z, x) * folds) * 0.05; p.setX(i, x * k); p.setZ(i, z * k); } }
  g.scale(1, 1, flat); g.computeVertexNormals(); return g;
});
const SKINS = [0xa9764f, 0x9a6844, 0xb58560].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
function person(seated, k, pose) {
  const id = k == null ? 0 : k, r = n => hash(id * 13 + 5, n);
  pose = seated ? 'sit' : pose || 'stand';
  const woman = !seated && r(1) < 0.45, sk = SKINS[Math.floor(r(9) * 3) % 3];
  const wrap = pose === 'sit' || pose === 'work' ? null : r(2) < 0.3 ? DRESS.scarlet : r(2) < 0.5 ? DRESS.blue : null; // a cloth cloak or blanket, or none
  const bare = !woman && r(3) < 0.25;                                          // some men in warm weather: no shirt
  const top = woman ? (r(6) < 0.6 ? DRESS.linen : DRESS.hideDark) : bare ? sk : DRESS.linen;
  const legMat = woman ? DRESS.hide : r(4) < 0.35 ? sk : r(4) < 0.72 ? DRESS.hide : DRESS.blue; // leggings of hide or cloth, or bare legs as in the portraits
  const g = new THREE.Group(), body = new THREE.Group(), J = { body }; g.add(body);
  const add = (parent, geom, mat, x, y, z) => { const m = new THREE.Mesh(geom, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = true; parent.add(m); return m; };
  const pivot = (parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); return j; };
  for (const sd of [-1, 1]) { // legs: thigh, knee, shin, a moccasin with its cuff wrapped at the ankle
    const hip = pivot(body, sd * 0.088, 0.9, 0), knee = pivot(hip, 0, -0.43, 0);
    add(hip, hang(0.078, 0.056, 0.43), legMat); add(knee, hang(0.054, 0.038, 0.4), legMat);
    add(knee, geo('kneecap', () => new THREE.SphereGeometry(0.056, 10, 8)), legMat);
    if (legMat !== sk) add(knee, geo('garter', () => new THREE.CylinderGeometry(0.058, 0.056, 0.035, 10)), DRESS.cuff, 0, -0.06, 0); // leggings are tied below the knee
    add(knee, geo('cuff', () => new THREE.CylinderGeometry(0.05, 0.045, 0.07, 10)), DRESS.moc, 0, -0.37, 0);
    add(knee, geo('foot', () => { const f = new THREE.SphereGeometry(0.06, 10, 8); f.scale(0.75, 0.55, 2); return f; }), DRESS.moc, 0, -0.415, 0.055);
    J[sd < 0 ? 'hipL' : 'hipR'] = hip; J[sd < 0 ? 'kneeL' : 'kneeR'] = knee;
  }
  const spine = pivot(body, 0, 0.9, 0); J.spine = spine; // trunk: hips, waist, chest, shoulders, neck
  add(spine, lathed('torso', [[0.001, -0.07], [0.15, -0.05], [0.168, 0.03], [0.142, 0.17], [0.158, 0.33], [0.178, 0.46], [0.15, 0.545], [0.062, 0.585], [0.05, 0.66]], 0.62), top);
  add(spine, geo('neck', () => new THREE.CylinderGeometry(0.047, 0.052, 0.1, 10)), sk, 0, 0.625, 0);
  const head = pivot(spine, 0, 0.735, 0.012); J.head = head;
  add(head, geo('head', () => { const h = new THREE.SphereGeometry(0.1, 14, 12); h.scale(0.9, 1.14, 1); return h; }), sk);
  add(head, geo('nose', () => { const n = new THREE.SphereGeometry(0.02, 8, 6); n.scale(0.8, 1.4, 1); return n; }), sk, 0, -0.012, 0.094);
  if (woman) { // hair drawn back into one braid
    const cap = add(head, geo('hairW', () => { const h = new THREE.SphereGeometry(0.106, 14, 10, 0, Math.PI * 2, 0, 1.8); h.scale(0.92, 1.14, 1.02); return h; }), hair); cap.rotation.x = -0.42;
    add(head, hang(0.03, 0.018, 0.46), hair, 0, -0.03, -0.1).rotation.x = -0.08;
  } else if (r(7) < 0.5) add(head, geo('lock', () => new THREE.CylinderGeometry(0.03, 0.05, 0.11, 8)), hair, 0, 0.115, -0.02); // shaved to a tuft on the crown
  else add(head, geo('hairM', () => { const h = new THREE.SphereGeometry(0.105, 14, 10, 0, Math.PI * 2, 0, 1.45); h.scale(0.92, 1.14, 1.02); return h; }), hair).rotation.x = -0.3; // or cut short, as in the portraits
  for (const sd of [-1, 1]) { // arms: shoulder, elbow, hand
    const sh = pivot(spine, sd * 0.205, 0.49, 0), el = pivot(sh, 0, -0.29, 0); sh.rotation.z = sd * 0.09;
    add(sh, geo('shoulder', () => new THREE.SphereGeometry(0.056, 10, 8)), top); add(sh, hang(0.05, 0.042, 0.29), top);
    add(el, hang(0.042, 0.033, 0.26), top);
    add(el, geo('hand', () => { const h = new THREE.SphereGeometry(0.042, 8, 6); h.scale(0.7, 1.25, 0.45); return h; }), sk, 0, -0.3, 0);
    J[sd < 0 ? 'armL' : 'armR'] = sh; J[sd < 0 ? 'elbowL' : 'elbowR'] = el;
  }
  if (woman) { // a wrapped skirt to the calf, an overdress or shirt to the hip
    add(body, lathed('skirt', [[0.168, 0.1], [0.2, -0.18], [0.232, -0.5], [0.238, -0.57]], 0.78, 0, 0, 7), r(5) < 0.5 ? DRESS.hide : DRESS.blue, 0, 0.9, 0);
    add(body, lathed('hemW', [[0.172, 0.07], [0.205, -0.2]], 0.74), top, 0, 0.9, 0);
  } else if (bare) { // a breechcloth hanging front and back from a belt
    const flap = geo('flap', () => new THREE.BoxGeometry(0.17, 0.34, 0.012)), m = r(5) < 0.5 ? DRESS.hide : r(5) < 0.8 ? DRESS.blue : DRESS.scarlet;
    add(body, flap, m, 0, 0.77, 0.112); add(body, flap, m, 0, 0.77, -0.112);
    add(body, geo('belt', () => { const c = new THREE.CylinderGeometry(0.168, 0.168, 0.035, 16); c.scale(1, 1, 0.66); return c; }), DRESS.hideDark, 0, 0.94, 0);
  } else { // a linen shirt to the thigh, tied with a woven sash whose ends hang at the side
    add(body, lathed('tail', [[0.17, 0.07], [0.19, -0.12], [0.206, -0.36]], 0.72, 0, 0, 6), DRESS.linen, 0, 0.9, 0);
    add(spine, geo('sash', () => { const c = new THREE.CylinderGeometry(0.174, 0.174, 0.07, 16); c.scale(1, 1, 0.66); return c; }), DRESS.sash, 0, 0.09, 0);
    add(spine, geo('sashEnd', () => new THREE.BoxGeometry(0.035, 0.26, 0.02)), DRESS.sash, 0.17, -0.04, 0.03);
  }
  if (wrap) add(spine, lathed('cloak', [[0.075, 0.6], [0.2, 0.535], [0.235, 0.3], [0.262, -0.1], [0.29, -0.45]], 0.74, Math.PI * 0.24, Math.PI * 1.52, 9), wrap); // over both shoulders, open at the front, to the knee
  if (woman && r(8) < 0.5) add(spine, geo('basket', () => new THREE.CylinderGeometry(0.17, 0.12, 0.34, 10)), DRESS.basket, 0, 0.3, wrap ? -0.3 : -0.2); // a burden basket on the back
  // how it is standing
  const set = (j, x) => { J[j].rotation.x = x; };
  if (pose === 'sit') { body.position.y = -0.62; set('hipL', -1.45); set('hipR', -1.45); set('kneeL', 1.35); set('kneeR', 1.35); set('armL', -0.8); set('armR', -0.8); set('elbowL', -0.5); set('elbowR', -0.5); }
  else if (pose === 'work') { // bent to the hill of corn, a digging stick in both hands
    body.position.y = -0.04; set('spine', 0.78); set('hipL', -0.42); set('hipR', -0.2); set('kneeL', 0.55); set('kneeR', 0.4); set('armL', -1.25); set('armR', -1.15); set('elbowL', -0.25); set('elbowR', -0.35); J.head.rotation.x = -0.35;
    const stick = add(body, geo('stick', () => new THREE.CylinderGeometry(0.016, 0.02, 1.05, 6)), dark, 0.04, 0.43, 0.6); stick.rotation.x = 0.28;
  } else if (pose === 'stand') { // weight on one leg, arms easy
    const lean = r(10) < 0.5 ? 1 : -1; set('hipL', lean * 0.07); set('hipR', -lean * 0.07); set('kneeL', lean > 0 ? 0.14 : 0.02); set('kneeR', lean > 0 ? 0.02 : 0.14);
    set('armL', 0.05 - r(11) * 0.25); set('armR', 0.05 - r(12) * 0.25); set('elbowL', -0.15 - r(13) * 0.6); set('elbowR', -0.15 - r(14) * 0.3); J.head.rotation.y = (r(15) - 0.5) * 0.9; body.rotation.z = lean * 0.025;
  }
  g.userData = { J, cloaked: !!wrap, phase: r(16) * 6.28 };
  if (pose === 'walk') stride(g, g.userData.phase);
  return g;
}
function stride(g, ph) { // one walking step: legs swing from the hip, the knee bends as its leg comes forward, the arms swing against the legs
  const J = g.userData.J, s = Math.sin(ph), c = Math.cos(ph), arm = g.userData.cloaked ? 0.1 : 0.4;
  J.hipL.rotation.x = -s * 0.46; J.hipR.rotation.x = s * 0.46;
  J.kneeL.rotation.x = 0.1 + 0.7 * Math.max(0, c); J.kneeR.rotation.x = 0.1 + 0.7 * Math.max(0, -c);
  J.armL.rotation.x = s * arm; J.armR.rotation.x = -s * arm;
  J.elbowL.rotation.x = -0.25 - 0.25 * Math.max(0, -s); J.elbowR.rotation.x = -0.25 - 0.25 * Math.max(0, s);
  J.body.position.y = Math.abs(c) * 0.025 - 0.02; J.spine.rotation.x = 0.06;
}
// Figures that stay where they are are joined into one mesh for each group they belong to, so a village of people
// costs one draw. Figures that walk stay jointed.
const CROWDS = new Map();
function settle(fig, parent) {
  if (!CROWDS.has(parent)) CROWDS.set(parent, []);
  fig.updateMatrixWorld(true);
  fig.traverse(o => {
    if (!o.isMesh) return;
    const gm = o.geometry.clone().applyMatrix4(o.matrixWorld), n = gm.attributes.position.count, col = new Float32Array(n * 3), c = o.material.color;
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    gm.setAttribute('color', new THREE.BufferAttribute(col, 3)); CROWDS.get(parent).push(gm);
  });
}
function gather() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  for (const [parent, list] of CROWDS) { if (!list.length) continue; const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = true; m.frustumCulled = false; parent.add(m); list.length = 0; }
}
// People who walk: each goes back and forth along a line of points, at a walking pace, and keeps to the ground.
const walkers = [];
function walker(pts, k, parent, start) {
  const fig = person(false, k, 'walk'); fig.scale.setScalar(BIG); parent.add(fig);
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  walkers.push({ fig, pts, cum, total: cum[cum.length - 1], off: (start || 0) * cum[cum.length - 1], pace: 1.75 + hash(k, 140) * 0.5 });
}
function walk(t) {
  for (const w of walkers) {
    let d = (w.off + t * w.pace) % (2 * w.total); const back = d > w.total; if (back) d = 2 * w.total - d;
    let i = 1; while (i < w.cum.length - 1 && w.cum[i] < d) i++;
    const a = w.pts[i - 1], b = w.pts[i], k = (d - w.cum[i - 1]) / ((w.cum[i] - w.cum[i - 1]) || 1), x = a[0] + (b[0] - a[0]) * k, y = a[1] + (b[1] - a[1]) * k;
    w.fig.position.copy(P(x, y, 0)); w.fig.rotation.y = Math.atan2((b[0] - a[0]) * (back ? -1 : 1), -(b[1] - a[1]) * (back ? -1 : 1));
    stride(w.fig, w.fig.userData.phase + (w.off + t * w.pace) / (1.6 * BIG) * Math.PI * 2);
  }
}
function canoe(x, y, heading, crew) { // a birchbark canoe, 5.5 m: the type checked against the references listed for the game
  const g = new THREE.Group(), s = new THREE.Shape();
  s.moveTo(-2.75, 0.62); s.quadraticCurveTo(-2.45, 0.08, -1.6, 0.04); s.lineTo(1.6, 0.04); s.quadraticCurveTo(2.45, 0.08, 2.75, 0.62);
  s.quadraticCurveTo(2.35, 0.36, 1.7, 0.34); s.lineTo(-1.7, 0.34); s.quadraticCurveTo(-2.35, 0.36, -2.75, 0.62);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3, curveSegments: 10 }); geo.translate(0, 0, -0.31);
  part(g, geo, bark, 0, 0, 0);
  for (const z of [-0.44, 0.44]) part(g, new THREE.BoxGeometry(3.6, 0.07, 0.06), dark, 0, 0.36, z);
  for (const px of [-1.1, 0, 1.1]) part(g, new THREE.BoxGeometry(0.07, 0.05, 0.86), dark, px, 0.33, 0);
  if (crew) for (const [px, r] of [[-1.25, 1], [1.05, -1]]) {
    const p = person(true, Math.round(x * 3 + px * 7)); p.position.set(px, 0.12, 0); p.rotation.y = Math.PI / 2; g.add(p);
    const paddle = part(g, new THREE.BoxGeometry(0.05, 1.5, 0.05), dark, px + 0.25, 0.62, r * 0.55, 0, 0); paddle.rotation.x = r * 0.5;
    part(g, new THREE.BoxGeometry(0.03, 0.5, 0.2), dark, px + 0.25, 0.05, r * 0.86);
  }
  g.scale.setScalar(BIG); g.position.set(x, -0.12, -y); g.rotation.y = heading;
  scene.add(g); return g;
}
const mouth = trail[0];
// a beach near the river mouth: the sand point nearest the trail's start that has open lake just south of it
let BEACH = [mouth[0] + 160, mouth[1] - 60], shoreY = mouth[1] - 110;
{
  let best = 1e9;
  for (let n = 0; n < N; n++) {
    if (!isSand(n) || hs[n] < 0.7) continue;
    const i = n % maskNx, j = (n - i) / maskNx; if (j < 4 || j > maskNy - 2) continue;
    if (!isLake(n - 2 * maskNx) || !isLake(n - 3 * maskNx) || T.kind[n + maskNx] !== '0') continue;
    const x = box.x0 + i * maskCell, y = box.y0 + j * maskCell, d = Math.hypot(x - mouth[0] - 350, y - mouth[1]);
    if (d < best) { best = d; BEACH = [x, y]; }
  }
  shoreY = BEACH[1]; while (shoreY > box.y0 && meshY(BEACH[0], shoreY) > 0) shoreY -= 2; // where the water starts, straight south
}
const canoes = [canoe(BEACH[0] - 70, shoreY - 40, 0.5, true), canoe(BEACH[0] - 150, shoreY - 85, 0.9, true), canoe(BEACH[0] + 420, shoreY - 260, 0.2, true), canoe(600, -900, 0.3, true), canoe(2300, 250, -0.6, true)];
const onBeach = (dx, up) => [BEACH[0] + dx, shoreY + up]; // a point `up` metres above the waterline
for (const [dx, up, r] of [[-22, 7, 1.15], [-38, 9, 1.5]]) { // two more drawn up on the sand
  const [x, y] = onBeach(dx, up), c = canoe(x, y, r, false); c.position.y = groundY(x, y) + 0.1; c.rotation.z = 0.12;
}
{
  let folk = 0;
  const stand = (x, y, r, into, pose) => { const f = person(false, ++folk, pose); f.scale.setScalar(BIG); f.position.copy(P(x, y, 0)); f.rotation.y = r; settle(f, into || scene); };
  YP.w17stand = stand;
  for (const [dx, up, r] of [[-14, 12, 2.2], [-18, 15, 2.6], [-52, 16, 1]]) { const [x, y] = onBeach(dx, up); stand(x, y, r); }
  for (const [dx, y, r] of [[0, 300, 0], [1.2, 318, 0.4], [-1, 760, 3], [0.9, SITE.y - 196 - trail[0][1], 3.3], [-1.6, SITE.y - 186 - trail[0][1], 0.5], [1.3, SITE.y - 150 - trail[0][1], 2.9], [-1.8, SITE.y - 128 - trail[0][1], 1.2]]) { const p = trailAt(trail[0][1] + y); stand(p[0] + dx, p[1], r); }
}

// ---------- Teiaiagon, as it stood about 1680 ----------
// What the record gives (references.js): 20 to 30 buildings and 500 to 800 people by one estimate; traces of a
// palisade found in the 1800s, the notes since lost; fields all round it; a burial ground in its middle.
// What the longhouses are built from: the usual size of a Haudenosaunee longhouse (about 24 m long, 5.5 m wide and
// high, some far longer), its making (a frame of poles, sheets of bark lapped like shingles, a door at each end,
// smoke holes along the roof), and the Seneca longhouse rebuilt at Ganondagan, which has straight walls and a
// pitched roof. Palisade posts are 4 m, as a visitor measured at a Seneca town in 1669.
// What is NOT known and is therefore arranged by hand: where each house stood. No plan or picture of the village
// survives. The middle is left as open ground and nothing is drawn there.
const village = new THREE.Group(); village.name = 'Teiaiagon c.1680'; scene.add(village);
{
  const sheets = texture(256, (g, sz) => { // bark in lapped sheets, with the poles that hold them down
    g.fillStyle = '#8a7a66'; g.fillRect(0, 0, sz, sz);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) {
      const v = 105 + Math.floor(rnd() * 50), x = col * 86 + (row % 2 ? 40 : 0) - 20, y = row * 64;
      g.fillStyle = 'rgb(' + (v + 14) + ',' + (v + 2) + ',' + (v - 14) + ')'; g.fillRect(x, y, 84, 62);
      g.fillStyle = 'rgba(40,28,18,0.45)'; g.fillRect(x, y + 60, 84, 4); g.fillRect(x + 82, y, 3, 62);
      for (let q = 0; q < 26; q++) { g.fillStyle = 'rgba(' + (rnd() < 0.5 ? '30,20,12' : '230,215,190') + ',' + (0.05 + rnd() * 0.12) + ')'; g.fillRect(x + rnd() * 80, y + rnd() * 58, 1 + rnd() * 2, 4 + rnd() * 16); }
    }
    g.fillStyle = 'rgba(50,34,20,0.7)'; for (const y of [30, 94, 158, 222]) g.fillRect(0, y, sz, 3);
  });
  sheets.repeat.set(0.25, 0.25); // one tile is about four metres
  const barkMat = new THREE.MeshStandardMaterial({ map: sheets, roughness: 1, metalness: 0 }), darkMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 1 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x7a644c, map: barky, roughness: 1 });
  const WIDE = 5.6, WALL = 3.1, RIDGE = 5.5; // metres, before the 1.5 times that everything in this world is drawn at
  function house(len) { // one longhouse, length along x, standing on y = 0
    const sec = new THREE.Shape([[-WIDE / 2, 0], [WIDE / 2, 0], [WIDE / 2, WALL], [0, RIDGE], [-WIDE / 2, WALL]].map(p => new THREE.Vector2(p[0], p[1])));
    const body = new THREE.ExtrudeGeometry(sec, { depth: len, bevelEnabled: false }); body.rotateY(Math.PI / 2); body.translate(-len / 2, 0, 0);
    const g = new THREE.Group(), m = new THREE.Mesh(body, barkMat); m.castShadow = m.receiveShadow = true; g.add(m);
    for (const e of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.75, 1.0), darkMat); d.position.set(e * (len / 2 + 0.02), 0.88, 0); g.add(d); } // a door at each end
    for (let x = -len / 2 + 4; x < len / 2 - 2; x += 5.5) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.8), darkMat); h.position.set(x, RIDGE - 0.12, 0); g.add(h); } // smoke holes along the ridge
    for (const y of [1.0, 2.1]) for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(len, 0.09, 0.09), postMat); p.position.set(0, y, z * (WIDE / 2 + 0.04)); g.add(p); } // poles lashed along the walls
    return g;
  }
  // The houses stand in clusters of three or four, side by side, the clusters turned different ways round the open
  // middle. Twenty-four in all, inside the 20 to 30 of the estimate. This grouping is a choice, not a finding.
  const RX = 125, RY = 100, houses = [];
  for (let c = 0; c < 6; c++) {
    const ca = [-0.9, 0, 0.9, Math.PI - 0.9, Math.PI, Math.PI + 0.9][c], // three clusters each side of the trail, which runs north through the middle
      cx = SITE.x + Math.cos(ca) * RX * 0.72, cy = SITE.y + Math.sin(ca) * RY * 0.72, turn = ca + Math.PI / 2 + (hash(c, 90) - 0.5) * 0.5;
    const n = 4;
    for (let k = 0; k < n && houses.length < 24; k++) {
      const id = c * 10 + k, len = [24.4, 30, 24.4, 38, 20, 27, 33][id % 7] + (hash(id, 91) - 0.5) * 4, off = (k - (n - 1) / 2) * 15.5;
      const x = cx + Math.cos(turn + Math.PI / 2) * off + (hash(id, 92) - 0.5) * 6, y = cy + Math.sin(turn + Math.PI / 2) * off + (hash(id, 93) - 0.5) * 6;
      const h = house(len); h.scale.setScalar(BIG); h.position.copy(P(x, y, 0)); h.rotation.y = turn + (hash(id, 94) - 0.5) * 0.12; // long side along the cluster's line, so the four stand side by side
      village.add(h); houses.push({ x, y, a: -h.rotation.y, len: len * BIG });
    }
  }
  // smoke rising from the hearths, through the holes in each roof
  {
    const puffMat = new THREE.MeshBasicMaterial({ color: 0xd9d4c8, transparent: true, opacity: 0.22, depthWrite: false });
    const puffGeo = new THREE.SphereGeometry(1, 8, 6), puffs = [];
    houses.forEach((h, k) => { for (let q = -1; q <= 1; q++) for (let n = 0; n < 4; n++) {
      const off = q * h.len * 0.28, x = h.x + Math.cos(h.a) * off, y = h.y - Math.sin(h.a) * off, m = new THREE.Mesh(puffGeo, puffMat);
      m.userData = { base: P(x, y, RIDGE * BIG), ph: hash(k * 31 + q * 7 + n, 99) }; village.add(m); puffs.push(m);
    } });
    YP.w17smoke = t => { for (const m of puffs) { const u = (t * 0.07 + m.userData.ph) % 1; m.position.copy(m.userData.base); m.position.y += u * 16; m.position.x += u * u * 9; m.scale.setScalar(0.5 + u * 3.2); m.visible = u < 0.96; } };
  }
  // the palisade: one line of posts round the houses, open where the trail comes in and goes out
  {
    const post = new THREE.CylinderGeometry(0.11, 0.14, 4, 6); post.translate(0, 2, 0);
    const pts = [], PX = RX + 45, PY = RY + 40;
    for (let a = 0; a < Math.PI * 2; a += 0.0052) {
      const x = SITE.x + Math.cos(a) * PX, y = SITE.y + Math.sin(a) * PY;
      if (Math.abs(x - trailAt(y)[0]) < 5) continue; // the gates
      pts.push([x, y, a]);
    }
    const m = new THREE.InstancedMesh(post, postMat, pts.length), d = new THREE.Object3D();
    pts.forEach(([x, y, a], k) => { d.position.copy(P(x, y, -0.4)); d.rotation.set((hash(k, 95) - 0.5) * 0.06, a, (hash(k, 96) - 0.5) * 0.06); d.scale.set(BIG, BIG * (0.92 + hash(k, 97) * 0.16), BIG); d.updateMatrix(); m.setMatrixAt(k, d.matrix); });
    m.castShadow = true; m.computeBoundingSphere(); village.add(m);
    YP.w17palisade = { PX, PY };
  }
  // the fields: corn in hills, beans climbing it, squash between, outside the palisade to the edge of the clearing
  {
    const corn = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
      g.strokeStyle = '#6f8a3a'; g.lineWidth = 4; g.beginPath(); g.moveTo(32, 128); g.lineTo(32, 14); g.stroke();
      for (let i = 0; i < 9; i++) { const y = 112 - i * 11, sd = i % 2 ? 1 : -1; g.strokeStyle = ['#5f8a34', '#86a544', '#a3b24e'][i % 3]; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(32, y); g.quadraticCurveTo(32 + sd * 20, y - 16, 32 + sd * 28, y + 4); g.stroke(); }
      g.fillStyle = '#d2bd6a'; g.beginPath(); g.ellipse(32, 10, 5, 11, 0, 0, 7); g.fill(); g.fillStyle = '#c9b25a'; g.beginPath(); g.ellipse(40, 62, 4, 9, 0.3, 0, 7); g.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const cornMat = new THREE.MeshStandardMaterial({ map: corn, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 });
    const stalk = (() => { const a = new THREE.PlaneGeometry(1.5, 2.4); a.translate(0, 1.2, 0); const b = a.clone(); b.rotateY(Math.PI / 3); const c = a.clone(); c.rotateY(-Math.PI / 3); return mergeGeometries([a, b, c]); })();
    const pts = [], STEP = PHONE ? 7 : 4.2, PX = RX + 53, PY = RY + 48;
    for (let y = SITE.y - 380; y < SITE.y + 380; y += STEP) for (let x = SITE.x - 380; x < SITE.x + 380; x += STEP) {
      const id = Math.round(x) * 131 + Math.round(y) * 7, px = x + (hash(id, 81) - 0.5) * STEP * 0.7, py = y + (hash(id, 82) - 0.5) * STEP * 0.7;
      if (((px - SITE.x) / PX) ** 2 + ((py - SITE.y) / PY) ** 2 < 1 || cleared(px, py) < 0.5 || kindAt(px, py) !== 0 || nearTrail(px, py, 4) || hash(id, 83) < 0.12) continue;
      pts.push([px, py, id]);
    }
    const m = new THREE.InstancedMesh(stalk, cornMat, Math.max(1, pts.length)), d = new THREE.Object3D(); m.count = pts.length;
    pts.forEach(([x, y, id], k) => { d.position.copy(P(x, y, 0)); d.rotation.set(0, hash(id, 84) * 3.14, 0); const sc = BIG * (0.85 + hash(id, 85) * 0.35); d.scale.set(sc, sc, sc); d.updateMatrix(); m.setMatrixAt(k, d.matrix); m.setColorAt(k, tmpC.setScalar(0.8 + hash(id, 86) * 0.4)); });
    m.receiveShadow = true; m.computeBoundingSphere(); village.add(m);
    // the hill each clump grows from, covered by the beans and squash planted with it: this is what shows from above
    const hill = new THREE.SphereGeometry(1.25, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2); hill.scale(1, 0.45, 1);
    const hills = new THREE.InstancedMesh(hill, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), Math.max(1, pts.length)); hills.count = pts.length;
    pts.forEach(([x, y, id], k) => { d.position.copy(P(x, y, -0.05)); d.rotation.set(0, hash(id, 87) * 6.28, 0); const sc = BIG * (0.75 + hash(id, 88) * 0.5); d.scale.set(sc, sc, sc); d.updateMatrix(); hills.setMatrixAt(k, d.matrix); hills.setColorAt(k, tmpC.set(hash(id, 89) < 0.3 ? '#7d9440' : '#5f8236').multiplyScalar(0.85 + hash(id, 86) * 0.3)); });
    hills.receiveShadow = true; hills.computeBoundingSphere(); village.add(hills);
    YP.w17corn = pts.length;
  }
  // people about the village: at the doors, between the houses, in the fields, at the gate
  houses.forEach((h, k) => { for (let q = 0; q < 2; q++) {
    const off = (q ? 1 : -1) * (h.len / 2 + 2.5 + hash(k, 98 + q) * 6), x = h.x + Math.cos(h.a) * off + (hash(k, 100 + q) - 0.5) * 8, y = h.y - Math.sin(h.a) * off + (hash(k, 102 + q) - 0.5) * 8;
    if (hash(k, 104 + q) < 0.75) YP.w17stand(x, y, hash(k, 106 + q) * 6.28, village);
  } });
  for (let k = 0; k < 30; k++) { const a = hash(k, 110) * 6.28, r = 190 + hash(k, 111) * 120, x = SITE.x + Math.cos(a) * r, y = SITE.y + Math.sin(a) * r * 0.85; if (kindAt(x, y) === 0 && cleared(x, y) > 0.5) YP.w17stand(x, y, a, village, hash(k, 112) < 0.7 ? 'work' : 'stand'); }
  // people walking: in and out by the south gate, across the open middle, travellers on the trail in either year, and on the beach
  {
    const line = (y0, y1, dx) => { const pts = []; for (let y = y0; y <= y1; y += 15) { const p = trailAt(y); pts.push([p[0] + dx, y]); } return pts; };
    for (let k = 0; k < 4; k++) walker(line(SITE.y - 330, SITE.y + 30, (k - 1.5) * 1.3), 300 + k, village, k / 4 + 0.07);
    for (let k = 0; k < 2; k++) walker(line(SITE.y - 520, SITE.y + 260, k ? 1.4 : -1.2), 320 + k, scene, k * 0.45 + 0.2);
    const inner = houses.filter((h, i) => i % 4 === 3), door = h => [h.x + Math.cos(h.a) * (h.len / 2 + 5), h.y - Math.sin(h.a) * (h.len / 2 + 5)];
    for (let k = 0; k < 8; k++) { const h1 = inner[k % inner.length], h2 = inner[(k * 2 + 3) % inner.length]; if (h1 === h2) continue; walker([door(h1), [SITE.x + 30 + (hash(k, 141) - 0.5) * 50, SITE.y + (hash(k, 142) - 0.5) * 60], door(h2)], 340 + k, village, hash(k, 143)); }
    for (let k = 0; k < 3; k++) walker([onBeach(-64 + k * 6, 9 + k * 3), onBeach(-20, 11 + k * 3), onBeach(30 + k * 8, 10 + k * 2)], 360 + k, scene, k * 0.3 + 0.1);
  }
  gather();
  YP.w17walk = walk;
}

// About 1700, twenty years on: the houses are gone and the clearing is going back to brush.
const after = new THREE.Group(); after.name = 'the clearing c.1700'; after.visible = false; scene.add(after);
{
  const pts = [];
  for (let k = 0; k < (PHONE ? 500 : 1400); k++) { const a = hash(k, 120) * 6.28, r = Math.sqrt(hash(k, 121)) * 360, x = SITE.x + Math.cos(a) * r, y = SITE.y + Math.sin(a) * r; if (kindAt(x, y) === 0 && !nearTrail(x, y, 4)) pts.push([x, y, k]); }
  const m = new THREE.InstancedMesh(GEO.bush, MAT.crown, pts.length), d = new THREE.Object3D();
  pts.forEach(([x, y, k], n) => { const sc = 0.8 + hash(k, 122) * 2.4; d.position.copy(P(x, y, -0.2)); d.rotation.set(0, hash(k, 123) * 6.28, 0); d.scale.set(sc * 1.3, sc * (0.8 + hash(k, 124)), sc * 1.3); d.updateMatrix(); m.setMatrixAt(n, d.matrix); m.setColorAt(n, tmpC.setRGB(0.9 + hash(k, 125) * 0.4, 0.95, 0.7)); });
  m.castShadow = m.receiveShadow = true; m.computeBoundingSphere(); after.add(m);
}

// ---------- the town, 1700 to 1850 (only on the town page) ----------
// The same ground as the c.1700 world, followed for a hundred and fifty years.
// Sourced (references.js): the dates; the counts of people; that the town began as ten blocks near the Don and a
// garrison at the harbour mouth; roughly where the forts, parliament, market, church and lighthouse stood.
// Drawn: every ordinary house and street. The houses go up at the pace of the population (one drawn house for a
// fixed number of people, so the last goes up in 1850), on a regular grid the real streets only partly followed. The
// pace of clearing, the wharves and the ships are drawn too. The page says all this.
const town = { year: 1700, set: () => {}, tick: () => {}, ERAS: [] };
if (TOWN) {
  const tc = new THREE.Color(), tc2 = new THREE.Color(), o = new THREE.Object3D(), S = BIG;
  const xy = (u, v) => [TO[0] + u * TE[0] + v * TN[0], TO[1] + u * TE[1] + v * TN[1]];
  const land = (x, y) => kindAt(x, y) === 0 && meshY(x, y) > 0.5;
  const ANG = Math.atan2(TE[1], TE[0]);
  const ontoLand = (x, y) => { for (let r = 0; r < 500; r += 25) for (let a = 0; a < 6.28; a += 0.4) { const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (land(px, py)) return [px, py]; } return [x, y]; };
  const POP = [[1793, 3], [1799, 240], [1808, 500], [1813, 720], [1825, 1600], [1830, 2860], [1832, 5500], [1834, 9250], [1851, 30000]]; // as counted or estimated; see the page for where each is from
  const popAt = y => { if (y < POP[0][0]) return 0; for (let i = 1; i < POP.length; i++) if (y <= POP[i][0]) { const a = POP[i - 1], b = POP[i], k = (y - a[0]) / (b[0] - a[0]); return Math.exp(Math.log(a[1]) + (Math.log(b[1]) - Math.log(a[1])) * k); } return POP[POP.length - 1][1]; };
  town.popAt = popAt;
  const updaters = [];

  // the forest inside the town's reach: each tree stands until its year
  for (const conifer of [true, false]) {
    const list = townTrees.filter(t => t.conifer === conifer); if (!list.length) continue;
    const m = new THREE.InstancedMesh(conifer ? GEO.conLo : GEO.broadLo, MAT.lo, list.length), state = new Float32Array(list.length).fill(-1);
    list.forEach((t, k) => { t.h = (conifer ? 30 + hash(t.id, 8) * 14 : 22 + hash(t.id, 8) * 11) * BIG; t.base = groundY(t.x, t.y); const v = 0.82 + hash(t.id, 11) * 0.42; m.setColorAt(k, tc.setRGB(v * (1.08 + hash(t.id, 10) * 0.22), v * 0.98, v * (0.7 + hash(t.id, 12) * 0.2))); });
    m.castShadow = !PHONE; m.frustumCulled = false; scene.add(m);
    updaters.push(year => {
      let dirty = false;
      list.forEach((t, k) => {
        const s = clamp(t.cy - year, 0, 1); if (s === state[k]) return; state[k] = s; dirty = true;
        const w = t.h * (conifer ? 1.05 : 1.12) * s; o.position.set(t.x, t.base, -t.y); o.rotation.set(0, hash(t.id, 9) * 6.28, 0); o.scale.set(w, t.h * s, w); o.updateMatrix(); m.setMatrixAt(k, o.matrix);
      });
      if (dirty) m.instanceMatrix.needsUpdate = true;
    });
  }
  YP.w17townTrees = townTrees.length;

  // the ground itself: forest floor turns to field, and to trodden earth where the town is thickest
  {
    const ground = scene.userData.ground, col = ground.geometry.attributes.color, verts = [];
    for (let n = 0; n < N; n++) {
      if (T.kind[n] !== '0' || isSand(n) || hs[n] < 0.5) continue;
      const i = n % maskNx, j = (n - i) / maskNx, x = box.x0 + i * maskCell, y = box.y0 + j * maskCell, cy = clearYear(x, y, true); if (cy > 1850) continue;
      const [u, v] = toUV(x, y), dense = clamp(1 - Math.hypot((u + 300) / 1900, (v - 250) / 700), 0, 1);
      const parcel = Math.floor(u / 230) * 53 + Math.floor(v / 190) * 17, kind = hash(parcel, 152);
      tc.set(kind < 0.34 ? '#98a45c' : kind < 0.58 ? '#aaae68' : kind < 0.82 ? '#c3b272' : '#8f7a52').lerp(tc2.set('#c7b490'), clamp(dense * 1.5, 0, 1)).offsetHSL(0, 0, (hash(n, 151) - 0.5) * 0.04);
      verts.push({ n, cy, r0: col.getX(n), g0: col.getY(n), b0: col.getZ(n), r1: tc.r, g1: tc.g, b1: tc.b, k: -1 });
    }
    updaters.push(year => {
      let dirty = false;
      for (const p of verts) { const k = clamp((year - p.cy) / 4, 0, 1); if (k === p.k) continue; p.k = k; dirty = true; col.setXYZ(p.n, p.r0 + (p.r1 - p.r0) * k, p.g0 + (p.g1 - p.g0) * k, p.b0 + (p.b1 - p.b0) * k); }
      if (dirty) col.needsUpdate = true;
    });
  }

  // streets: a regular grid inside the cleared ground, and Yonge Street cut north through the forest
  {
    const segs = [], LEN = 55;
    const lay = (u0, v0, u1, v1, yr, wide) => {
      const n = Math.max(1, Math.round(Math.hypot(u1 - u0, v1 - v0) / LEN));
      for (let i = 0; i < n; i++) { const [x, y] = xy(u0 + (u1 - u0) * (i + 0.5) / n, v0 + (v1 - v0) * (i + 0.5) / n); if (!land(x, y)) continue; let cy = yr || clearYear(x, y); if (cy > 1850) continue; if (!yr && cy > 1797) cy = Math.min(1850, cy + 10); segs.push({ x, y, len: Math.hypot(u1 - u0, v1 - v0) / n, across: u0 === u1, yr: cy, wide: wide || 6 }); }
    };
    let line = 0;
    for (let u = -3740; u <= 2100; u += 110, line++) { lay(u, -650, u, 1150); if (line % 4 === 0) lay(u, 1150, u, 2600); }
    line = 0;
    for (let v = -620; v <= 2600; v += 95, line++) if (v < 1150 || line % 4 === 0) lay(-3740, v, 2100, v);
    lay(-480, 0, -480, 9500, 1795, 9); // Yonge Street
    const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2);
    const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xbda77f, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), segs.length), state = new Int8Array(segs.length).fill(-1);
    m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
    updaters.push(year => {
      let dirty = false;
      segs.forEach((s, k) => { const on = year >= s.yr ? 1 : 0; if (on === state[k]) return; state[k] = on; dirty = true; o.position.copy(P(s.x, s.y, 0.7)); o.rotation.set(0, ANG + (s.across ? Math.PI / 2 : 0), 0); o.scale.set(s.len * on, 1, s.wide * on); o.updateMatrix(); m.setMatrixAt(k, o.matrix); });
      if (dirty) m.instanceMatrix.needsUpdate = true;
    });
  }

  // houses: as many as the people of each year would fill, the oldest nearest the first ten blocks
  {
    const lots = [];
    for (let bu = -3740; bu < 2100; bu += 110) for (let bv = -620; bv < 2600; bv += 95) for (let lu = bu + 14; lu < bu + 100; lu += 15) for (const lv of [bv + 14, bv + 81]) {
      const id = Math.round(lu) * 37 + Math.round(lv) * 911; if (hash(id, 160) < 0.12) continue;
      const [x, y] = xy(lu + (hash(id, 161) - 0.5) * 4, lv + (hash(id, 162) - 0.5) * 5); if (!land(x, y)) continue;
      const cy = clearYear(x, y); if (cy > 1850) continue;
      if (Math.hypot(x - FORT[0], y - FORT[1]) < 300) continue; // the garrison's ground
      lots.push({ x, y, id, u: lu, v: lv, cy, key: cy + Math.abs(lv - 200) / 55 + Math.abs(lu + 300) / 260 + hash(id, 163) * 9 });
    }
    lots.sort((a, b) => a.key - b.key);
    const COUNT = Math.min(lots.length, PHONE ? 2300 : 4600), PER = 30000 / (COUNT + 1); // people to a drawn house, so the last house goes up in 1850
    const built = lots.slice(0, COUNT);
    { let yr = 1793; built.forEach((b, k) => { while (yr < 1850 && popAt(yr) / PER < k + 1) yr += 0.1; b.yr = Math.max(yr, Math.min(b.cy, 1849)); }); }
    const sec = new THREE.Shape([[-0.5, 0], [0.5, 0], [0.5, 1], [0, 1.42], [-0.5, 1]].map(p => new THREE.Vector2(p[0], p[1])));
    let geom = new THREE.ExtrudeGeometry(sec, { depth: 1, bevelEnabled: false }); geom.translate(0, 0, -0.5); geom = geom.toNonIndexed(); geom.computeVertexNormals();
    { const p = geom.attributes.position, nrm = geom.attributes.normal, c = new Float32Array(p.count * 3); // the roof is darker than the walls
      for (let i = 0; i < p.count; i++) { const roof = nrm.getY(i) > 0.3 && p.getY(i) > 0.99; c[i * 3] = roof ? 0.42 : 1; c[i * 3 + 1] = roof ? 0.38 : 1; c[i * 3 + 2] = roof ? 0.34 : 1; }
      geom.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    const m = new THREE.InstancedMesh(geom, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), COUNT), state = new Float32Array(COUNT).fill(-1);
    const WOOD = ['#8f7a5c', '#a18a68', '#7c6a52', '#b19c7a'], PAINT = ['#ddd5c2', '#cfc5ad', '#e4dccb', '#b9a98a'], BRICK = ['#96483a', '#a5553f', '#8a4034', '#c9b488', '#d3c095'];
    built.forEach((b, k) => {
      const r = n => hash(b.id, n), core = Math.abs(b.v - 200) < 240 && b.u > -1700 && b.u < 800;
      const era = b.yr < 1815 ? 0 : b.yr < 1834 ? 1 : 2;
      b.w = (era === 2 && core ? 11 + r(164) * 4 : 7 + r(164) * 3) * S; b.d = (7 + r(165) * 4) * S;
      b.h = (era === 0 ? 2.8 + r(166) * 1.4 : era === 1 ? 3.4 + r(166) * 3 : core ? 7 + r(166) * 4.5 : 3.6 + r(166) * 3.2) * S;
      b.turn = ANG + (r(167) < 0.25 ? Math.PI / 2 : 0); b.base = groundY(b.x, b.y) - 0.3;
      const pal = era === 0 ? WOOD : era === 1 ? (r(168) < 0.25 ? BRICK : r(168) < 0.6 ? PAINT : WOOD) : (r(168) < (core ? 0.75 : 0.4) ? BRICK : PAINT);
      m.setColorAt(k, tc.set(pal[Math.floor(r(169) * pal.length)]).offsetHSL(0, 0, (r(170) - 0.5) * 0.06));
    });
    m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; scene.add(m);
    const FIRE = xy(-230, 180); // the market block, burned 7 April 1849 and built again
    updaters.push(year => {
      let dirty = false;
      built.forEach((b, k) => {
        let s = clamp((year - b.yr) / 1.2, 0, 1);
        if (year >= 1849.27 && year < 1850.6 && b.yr < 1849 && Math.hypot(b.x - FIRE[0], b.y - FIRE[1]) < 120) s = clamp((year - 1849.9) / 0.7, 0, 1) * 0.6;
        if (s === state[k]) return; state[k] = s; dirty = true;
        o.position.set(b.x, b.base, -b.y); o.rotation.set(0, b.turn, 0); o.scale.set(b.w * (s > 0 ? 1 : 0), b.h * s, b.d * (s > 0 ? 1 : 0)); o.updateMatrix(); m.setMatrixAt(k, o.matrix);
      });
      if (dirty) m.instanceMatrix.needsUpdate = true;
    });
    town.houses = year => built.filter(b => b.yr <= year).length; town.PER = PER; town.fire = FIRE;
  }

  // the places with a date: each stands from its year, and some come down again
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 1 });
  const M = { log: mat(0x7d6549), earth: mat(0x9c8a63), brick: mat(0x97493a), stone: mat(0xcfc8b6), roof: mat(0x4f443a), white: mat(0xe6dfcf), plank: mat(0x8a7252), sail: new THREE.MeshStandardMaterial({ color: 0xf1ead8, roughness: 1, side: THREE.DoubleSide }), hull: mat(0x4a3a2c) };
  const block = (g, w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x || 0, (y || 0) + h / 2, z || 0); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  const gable = (g, w, h, d, m, x, z, roof) => { block(g, w, h, d, m, x, 0, z); const rg = new THREE.CylinderGeometry(0.001, d * 0.72, h * 0.45, 4, 1); rg.rotateY(Math.PI / 4); const r = new THREE.Mesh(rg, roof || M.roof); r.scale.set(w / (d * 1.02), 1, 1); r.position.set(x || 0, h + h * 0.225, z || 0); r.castShadow = true; g.add(r); };
  const places = [];
  const place = (at, from, to, build) => { const [x, y] = ontoLand(at[0], at[1]), g = new THREE.Group(); g.position.copy(P(x, y, 0)); g.rotation.y = ANG; g.scale.setScalar(S); build(g); g.visible = false; scene.add(g); const p = { g, from, to: to || 9999, x, y }; places.push(p); return p; };
  const fence = (g, w, d, h, m) => { for (const [a, b, c, e] of [[w, 0.5, 0, -d / 2], [w, 0.5, 0, d / 2], [0.5, d, -w / 2, 0], [0.5, d, w / 2, 0]]) block(g, a, h, b, m, c, 0, e); };
  place(ROUILLE, 1751, 1759.5, g => { fence(g, 46, 46, 3.6, M.log); gable(g, 12, 3.2, 7, M.log, -8, -8); gable(g, 10, 3, 6, M.log, 9, -9); gable(g, 14, 3.2, 6, M.log, 0, 10); }); // a small palisaded post; its plan here is not from a survey
  place(FORT, 1793, 1813.32, g => { fence(g, 120, 80, 3.4, M.log); for (let i = 0; i < 7; i++) gable(g, 13, 3, 6.5, M.log, -44 + (i % 4) * 28, i < 4 ? -22 : 20); block(g, 0.4, 14, 0.4, M.plank, 0, 0, 0); });
  place(FORT, 1813.6, 0, g => { fence(g, 150, 100, 2.6, M.earth); for (const b of g.children) b.scale.x *= b.geometry.parameters.width < 1 ? 9 : 1, b.scale.z *= b.geometry.parameters.depth < 1 ? 9 : 1; // earth walls, thick and low
    for (const [x, z] of [[-48, -24], [46, 22]]) { block(g, 9, 4, 9, M.log, x, 0, z); block(g, 10.6, 3.6, 10.6, M.log, x, 4, z); const r = new THREE.Mesh(new THREE.ConeGeometry(8, 3.4, 4), M.roof); r.rotation.y = Math.PI / 4; r.position.set(x, 9.3, z); g.add(r); } // two blockhouses, the upper floor overhanging
    for (let i = 0; i < 6; i++) gable(g, 22, 3.4, 7, i % 2 ? M.brick : M.log, -40 + (i % 3) * 40, i < 3 ? -4 : 30); block(g, 0.4, 16, 0.4, M.plank, 10, 0, -30); });
  const PARL = xy(640, 60), MARKET = xy(-40, 20), CHURCH = xy(-250, 200);
  place(PARL, 1797, 1813.33, g => { gable(g, 18, 6, 9, M.brick, -13, 0); gable(g, 18, 6, 9, M.brick, 13, 0); block(g, 8, 3.5, 5, M.white, 0, 0, 0); });
  place(MARKET, 1803, 0, g => { gable(g, 34, 3.2, 9, M.plank, 0, 0); });
  const church = g => { gable(g, 11, 7, 22, M.white, 0, 0); block(g, 5, 14, 5, M.white, 0, 0, -13); const sp = new THREE.Mesh(new THREE.ConeGeometry(3.4, 9, 4), M.roof); sp.rotation.y = Math.PI / 4; sp.position.set(0, 18.5, -13); sp.castShadow = true; g.add(sp); };
  place(CHURCH, 1807, 1849.27, church); place(CHURCH, 1850.7, 0, g => { church(g); g.scale.multiplyScalar(0.55); }); // 1850: the new cathedral is only begun
  const LIGHT = [-587, -2359];
  const tower = h => g => { const t = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.6, h, 6), M.stone); t.position.y = h / 2; t.castShadow = true; g.add(t); const l = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 2.4, 6), M.roof); l.position.y = h + 1.2; g.add(l); const c = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.8, 6), M.brick); c.position.y = h + 3.3; g.add(c); };
  place(LIGHT, 1809, 1832, tower(16)); place(LIGHT, 1832, 0, tower(25)); // 52 feet, raised to 82 in 1832

  // wharves reach into the bay, a few at first and then many (how many, and where, is drawn)
  [[-60, 1797, 70], [-420, 1803, 60], [330, 1813, 80], [-900, 1820, 90], [-230, 1826, 120], [120, 1830, 110], [-1250, 1833, 100], [-650, 1836, 150], [520, 1839, 120], [-1500, 1842, 130], [-1050, 1844, 160], [-320, 1846, 170], [-1750, 1848, 120], [760, 1850, 110]].forEach(([u, yr, len]) => {
    let v = 120; while (v > -900 && land(...xy(u, v))) v -= 6; if (v <= -900) return;
    const [x, y] = xy(u, v - len / 2 + 8), g = new THREE.Group(); g.position.set(x, 0, -y); g.rotation.y = ANG; block(g, 9, 1.6, len, M.plank, 0, -0.5, 0); if (yr > 1825) block(g, 8, 4, 16, M.plank, 0, 1, -len / 2 + 14);
    g.visible = false; scene.add(g); places.push({ g, from: yr, to: 9999, x, y });
  });
  // sailing vessels at anchor: more as the harbour grows busier
  const ships = [];
  [[-300, -420, 1794], [200, -520, 1800], [-900, -480, 1815], [500, -380, 1826], [-1400, -560, 1832], [-100, -700, 1838], [-650, -330, 1843], [850, -600, 1847], [-1100, -820, 1849]].forEach(([u, v, yr], k) => {
    const [x, y] = xy(u, v); if (kindAt(x, y) === 0) return;
    const g = new THREE.Group(); block(g, 5.5, 2.4, 22, M.hull, 0, -0.6, 0);
    for (const z of [-5, 5]) { block(g, 0.35, 20, 0.35, M.plank, 0, 1, z); const s = new THREE.Mesh(new THREE.PlaneGeometry(9, 13), M.sail); s.position.set(0.4, 11, z + 0.3); s.rotation.y = Math.PI / 2 + 0.25; s.castShadow = true; g.add(s); }
    g.position.set(x, 0, -y); g.rotation.y = ANG + 1.2 + k; g.scale.setScalar(S); g.visible = false; scene.add(g); places.push({ g, from: yr, to: 9999, x, y }); ships.push(g);
  });

  // smoke on the three days the record gives a fire
  const fires = [];
  { const puffMat = new THREE.MeshBasicMaterial({ color: 0x4a443e, transparent: true, opacity: 0.34, depthWrite: false }), geoP = new THREE.SphereGeometry(1, 8, 6);
    const burn = (at, from, size) => { const [x, y] = ontoLand(at[0], at[1]), base = P(x, y, 4), puffs = []; for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(geoP, puffMat); m.visible = false; scene.add(m); puffs.push(m); } fires.push({ base, from, to: from + 0.6, size, puffs }); };
    burn(ROUILLE, 1759.4, 22); burn(FORT, 1813.32, 46); burn(PARL, 1813.33, 34); burn(town.fire, 1849.27, 52); }

  // labels that come and go with their years
  town.labels = [
    { name: 'Fort Rouillé', note: 'a French trading fort, 1751 to 1759', x: ROUILLE[0], y: ROUILLE[1], lift: 70, from: 1751, to: 1760 },
    { name: 'The garrison', note: 'Fort York, from 1793', x: FORT[0], y: FORT[1], lift: 80, from: 1793 },
    { name: 'York', note: 'ten blocks, laid out in 1793', x: xy(300, 250)[0], y: xy(300, 250)[1], lift: 110, from: 1793, to: 1834 },
    { name: 'Toronto', note: 'a city from 6 March 1834', x: xy(-500, 500)[0], y: xy(-500, 500)[1], lift: 150, from: 1834 },
    { name: 'Parliament', note: 'met from 1797; destroyed 1813', x: PARL[0], y: PARL[1], lift: 60, from: 1797, to: 1814 },
    { name: 'Yonge Street', note: 'cut north in the 1790s', x: xy(-480, 2300)[0], y: xy(-480, 2300)[1], lift: 60, from: 1795 },
    { name: 'Lighthouse', note: 'Gibraltar Point, lit 1809', x: LIGHT[0], y: LIGHT[1], lift: 70, from: 1809 }
  ];

  // the story, by year: what the page says beside the picture
  const REAL = 'Real: the dates, the counts of people, and roughly where the forts, parliament, market, church and lighthouse stood. Drawn: every ordinary house and street, the pace of clearing, the wharves and the ships.';
  town.ERAS = [
    { at: 1700, title: 'Before the town', what: 'No town. Forest runs down to a bay behind a long bar of sand. The Seneca villages of the 1670s are gone, and the Anishinaabe, whom the French called Mississaugas, hold this shore.', real: 'Real: the shore, the bar and the creeks, from the earliest maps. Drawn: the forest. Nobody’s camp is shown; nothing read for this project says where one stood.' },
    { at: 1720, title: 'The French come to trade', what: 'In 1720 the French built a storehouse on the Humber, west of this view, and gave it up within a few years. In 1750 they traded there again, and the next year they built on this shore.', real: REAL },
    { at: 1751, title: 'Fort Rouillé', what: 'A small French trading fort stands on the shore from 1751, where the Exhibition grounds are now. In 1759, with Fort Niagara lost to the British, its garrison burned it and withdrew to Montreal.', real: 'Real: the fort, its years and its place. Drawn: its plan, which is not from a survey.' },
    { at: 1760, title: 'Thirty quiet years', what: 'The fort is ash and nothing is built on the bay for a generation. In 1787 the British made the Toronto Purchase with the Mississaugas; its terms were revised in 1805 and the claim was only settled in 2010.', real: REAL },
    { at: 1793, title: 'York is founded', what: 'On 27 August 1793 John Graves Simcoe founded York: a garrison at the mouth of the harbour, and a town plot of ten blocks between today’s Front and Adelaide streets. In the mid-1790s soldiers cut Yonge Street north through the forest.', real: REAL },
    { at: 1797, title: 'A capital of a few hundred', what: 'Parliament first met here in June 1797, and the town was extended west to Peter Street. A public market began in 1803. The first church and the first brick house came in 1807, and the lighthouse on the peninsula was lit in 1809. About 500 people lived here in 1808.', real: REAL },
    { at: 1813, title: 'The Battle of York', what: 'On 27 April 1813 an American fleet landed its troops. The retreating British blew up the fort’s powder magazine, and the parliament buildings were destroyed. About 720 people were counted that year. The fort was built again.', real: REAL },
    { at: 1815, title: 'The town fills in', what: 'About 1,600 people in 1825, 2,860 in 1830, 5,500 in 1832. The forest is cut back, wharves reach into the bay, and the streets run west and north.', real: REAL },
    { at: 1834, title: 'York becomes Toronto', what: 'On 6 March 1834 the town, now about 9,250 people, was incorporated as the City of Toronto. Gas street lamps were lit in 1841.', real: REAL },
    { at: 1849, title: 'The Cathedral Fire', what: 'On 7 April 1849 fire destroyed the market block, St James’ and part of the city hall. They were built again.', real: REAL },
    { at: 1850, title: 'A city of thirty thousand', what: 'About 30,000 people by 1851. In a hundred and fifty years, forest to the water’s edge has become a city on a working harbour. The railways come in the 1850s.', real: REAL }
  ];
  const eraAt = y => { let e = town.ERAS[0]; for (const k of town.ERAS) if (y >= k.at) e = k; return e; };

  const yearEl = document.getElementById('town-year'), popEl = document.getElementById('town-pop'), range = document.getElementById('town-range');
  let shownEra = null;
  town.set = (year, quiet) => {
    year = clamp(year, 1700, 1850); town.year = year;
    for (const u of updaters) u(year);
    for (const p of places) p.g.visible = year >= p.from && year < p.to;
    if (yearEl) yearEl.textContent = String(Math.floor(year));
    if (popEl) { const p = popAt(year); popEl.textContent = year < 1793 ? 'No town' : p < 10 ? 'A garrison and a survey' : 'About ' + (p < 1000 ? Math.round(p / 10) * 10 : Math.round(p / 100) * 100).toLocaleString('en-CA') + ' people'; }
    if (range && !quiet) range.value = String(Math.round(year));
    const e = eraAt(year);
    if (e !== shownEra) {
      shownEra = e;
      if (about) { about.innerHTML = '<h3></h3><p></p><p class="real"></p>'; about.children[0].textContent = e.title + ' · ' + (e.at === 1700 ? 'c.1700' : e.at); about.children[1].textContent = e.what; about.children[2].textContent = e.real; }
      const cur = Math.max(...town.CARDS.filter(c => c <= e.at)); document.querySelectorAll('#town-eras button').forEach(b => b.classList.toggle('on', +b.dataset.year === cur));
    }
  };
  // the timelapse: ninety years of forest pass quickly, then sixty years of town take their time
  const LAPSE = [[0, 1700], [2.5, 1745], [6, 1765], [8, 1790], [34, 1850], [38, 1850]];
  const lapse = { on: false, t: 0 };
  const yearAtT = t => { for (let i = 1; i < LAPSE.length; i++) if (t <= LAPSE[i][0]) { const a = LAPSE[i - 1], b = LAPSE[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); } return 1850; };
  const tAtYear = y => { for (let i = 1; i < LAPSE.length - 1; i++) if (y <= LAPSE[i][1]) { const a = LAPSE[i - 1], b = LAPSE[i]; return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return LAPSE[LAPSE.length - 2][0]; };
  town.lapse = lapse; town.jump = y => { lapse.t = tAtYear(y); town.set(y); };
  town.tick = (dt, clock) => {
    if (lapse.on) { lapse.t += dt; if (lapse.t >= LAPSE[LAPSE.length - 1][0]) lapse.t = 0; town.set(yearAtT(lapse.t)); }
    ships.forEach((g, k) => { g.position.y = Math.sin(clock * 0.9 + k * 1.7) * 0.25; g.rotation.z = Math.sin(clock * 0.7 + k) * 0.03; });
    for (const f of fires) { const live = town.year >= f.from && town.year < f.to; f.puffs.forEach((m, i) => { m.visible = live; if (!live) return; const u = (clock * 0.16 + i / f.puffs.length) % 1; m.position.copy(f.base); m.position.y += u * f.size * 5; m.position.x += u * u * f.size * 2.4 + Math.sin(i * 2.1) * f.size * 0.4; m.position.z += Math.cos(i * 1.7) * f.size * 0.4; m.scale.setScalar(f.size * (0.35 + u * 1.3)); }); }
    if (track) track.firstChild.style.transform = 'scaleX(' + ((town.year - 1700) / 150).toFixed(4) + ')';
  };
  town.CARDS = [1700, 1751, 1793, 1813, 1834, 1850];
  const eras = document.getElementById('town-eras');
  if (eras) town.CARDS.forEach(y => { const e = town.ERAS.find(k => k.at === y), b = document.createElement('button'), n = document.createElement('small'), t = document.createElement('b'), d = document.createElement('span'); b.type = 'button'; b.dataset.year = y; n.textContent = y === 1700 ? 'c.1700' : y; t.textContent = e.title; d.textContent = e.what.split('. ')[0] + '.'; b.append(n, t, d); b.addEventListener('click', () => { setPlaying(false); town.jump(y + (y === 1813 ? 0.5 : y === 1849 ? 0.5 : 0)); }); eras.append(b); });
  if (range) range.addEventListener('input', () => { setPlaying(false); lapse.t = tAtYear(+range.value); town.set(+range.value, true); });
}

// ---------- labels ----------
const labelBox = document.getElementById('w17-labels');
const LABELS = [
  // every label says what the thing is, not only what it is called
  { name: 'Lake Ontario', x: -1500, y: -4700, water: true },
  { name: 'The bay', note: 'the harbour the town would be built on', x: 1500, y: -900, water: true },
  { name: 'The peninsula', note: 'a sandbar, joined to the shore until 1858', x: 1500, y: -2300, lift: 60 },
  { name: 'Marsh', note: 'at the mouth of the Don', x: 5200, y: 1500, lift: 40 },
  { name: 'Humber River', x: mouth[0] - 260, y: mouth[1] + 500, water: true },
  { name: 'Don River', x: 2500, y: 3600, water: true },
  { name: 'Teiaiagon', note: 'a Seneca village on the trail', then: 'a Seneca village on the trail', after: 'where the Seneca village stood, left by 1701', x: SITE.x, y: SITE.y, lift: 70 },
  { name: 'The Carrying Place', note: 'the trail north to Lake Simcoe', x: trailAt(1100)[0] + 60, y: 1100, lift: 90 },
  ...(TOWN ? town.labels : [])
];
for (const l of LABELS) {
  l.pos = P(l.x, l.y, l.lift || 20);
  l.el = document.createElement('span'); l.el.textContent = l.name; if (l.water) l.el.className = 'water';
  if (l.note) { const s = document.createElement('small'); s.textContent = l.note; l.el.append(s); }
  labelBox.append(l.el);
}
const v3 = new THREE.Vector3();
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of LABELS) {
    v3.copy(l.pos).project(camera);
    const show = v3.z < 1 && Math.abs(v3.x) < 0.96 && Math.abs(v3.y) < 0.94 && camera.position.distanceTo(l.pos) > 220 && (!l.from || (town.year >= l.from && town.year < (l.to || 9999)));
    l.el.style.display = show ? '' : 'none';
    if (show) l.el.style.transform = `translate(-50%, -50%) translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px)`;
  }
}

// ---------- views ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 20; controls.maxDistance = 26000;
const eye = (x, y, up) => { const p = P(x, y, up); return [p.x, p.y, p.z]; };
const tA = trailAt(SITE.y - 215), tB = trailAt(SITE.y - 120); // the walk comes up the trail to the clearing where Teiaiagon stood
const VIEWS = [
  { name: 'Above the bay', sub: 'The harbour before the town', pos: [6000, 2500, 5600], look: [200, 0, 900] },
  { name: 'Down to the shore', sub: 'Where the carry began', pos: eye(...onBeach(6, 15), 2.5), look: eye(...onBeach(-34, 8), 1.6) },
  { name: 'On the trail', sub: 'Walking in to Teiaiagon', pos: eye(tA[0], tA[1], 2.7), look: eye(tB[0], tB[1], 4) },
  { name: 'Teiaiagon', sub: 'Where the village stood', pos: [SITE.x + 205, groundY(SITE.x, SITE.y) + 92, -(SITE.y - 275)], look: [SITE.x - 10, groundY(SITE.x, SITE.y) + 6, -(SITE.y + 10)] },
  { name: 'The mouth of the Humber', sub: 'River, sand and the trail’s start', pos: [mouth[0] + 1500, 620, -(mouth[1] - 1500)], look: [mouth[0] - 300, 0, -(mouth[1] + 500)] },
  { name: 'As a map', sub: 'Two rivers, a bay, a marsh', pos: [-1250, 21500, -745], look: [-1250, 0, -750] }
];
if (TOWN) VIEWS.splice(0, VIEWS.length,
  { name: 'Over the harbour', sub: 'The whole town, from above the bay', pos: [-450, 1250, 2350], look: [-450, 0, -1350] },
  { name: 'Over the old town', sub: 'The first ten blocks, close', pos: [1500, 330, -620], look: [560, 0, -1760] }
);

// What each view is for. The words live in gallery.js, so the recording and the snapshots cannot disagree.
for (const g of (YP.GALLERY || [])) if (VIEWS[g.view]) Object.assign(VIEWS[g.view], { what: g.what, real: g.real, what1700: g.what1700, real1700: g.real1700 });

// ---------- two moments ----------
// About 1680 the village stands, with its fields. About 1700 it has been left and the clearing is going back to
// brush. Everything else in the model is the same in both. The switch is on the picture.
let when = 1680;
function setWhen(year) {
  when = year; village.visible = year === 1680; after.visible = year === 1700;
  for (const l of LABELS) if (l.then) l.el.lastChild.textContent = year === 1680 ? l.then : l.after;
  document.querySelectorAll('#w17-when button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.year === year)));
  tour.at = -1; // the captions are about the moment too
}

// ---------- the recording ----------
// One camera move through every view, in order, drawn live each time it plays (it is not a video file).
// Each view is held for a few seconds while the camera drifts, walks or sinks a little; then it flies to the next.
const HOLD = 8, FLY = 3.2, LEG = HOLD + FLY, TOUR = VIEWS.length * LEG;
const turned = (v, deg, closer) => { // the same view from a little further round, and a little nearer
  const t = new THREE.Vector3(...v.look), d = new THREE.Vector3(...v.pos).sub(t);
  d.applyAxisAngle(new THREE.Vector3(0, 1, 0), deg * Math.PI / 180).multiplyScalar(closer || 1);
  return t.add(d).toArray();
};
{
  const tA2 = trailAt(SITE.y - 172), tB2 = trailAt(SITE.y - 80); // about 80 m further on, the clearing opening ahead
  if (TOWN) for (const v of VIEWS) v.end = { pos: v.pos };
  else {
  VIEWS[0].end = { pos: turned(VIEWS[0], -14, 0.86) };
  VIEWS[1].end = { pos: eye(...onBeach(-2, 19), 2.5), look: eye(...onBeach(-40, 4), 1.4) };
  VIEWS[2].end = { pos: eye(tA2[0], tA2[1], 2.7), look: eye(tB2[0], tB2[1], 4) };
  VIEWS[3].end = { pos: turned(VIEWS[3], 34, 0.72) };
  VIEWS[4].end = { pos: turned(VIEWS[4], -14, 0.88) };
  VIEWS[5].end = { pos: [VIEWS[5].pos[0], 17500, VIEWS[5].pos[2]] };
  }
  for (const v of VIEWS) { v.p0 = new THREE.Vector3(...v.pos); v.l0 = new THREE.Vector3(...v.look); v.p1 = new THREE.Vector3(...v.end.pos); v.l1 = new THREE.Vector3(...(v.end.look || v.look)); }
}
const tour = { on: !still() && !TOWN, t: 0, at: -1 };
const lookAtNow = new THREE.Vector3();
function pose(t) { // where the camera is, and what it looks at, t seconds into the recording
  const i = Math.floor(t / LEG) % VIEWS.length, u = t - Math.floor(t / LEG) * LEG, v = VIEWS[i];
  if (u < HOLD) { camera.position.lerpVectors(v.p0, v.p1, u / HOLD); lookAtNow.lerpVectors(v.l0, v.l1, u / HOLD); }
  else {
    const next = VIEWS[(i + 1) % VIEWS.length], k = (u - HOLD) / FLY, e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(v.p1, next.p0, e); lookAtNow.lerpVectors(v.l1, next.l0, e);
    camera.position.y += Math.sin(Math.PI * e) * Math.min(1600, v.p1.distanceTo(next.p0) * 0.1); // rise over the trees on the way
  }
  controls.target.copy(lookAtNow); camera.lookAt(lookAtNow);
  return i;
}

const viewBox = document.getElementById('w17-views'), tag = document.getElementById('w17-tag');
const track = document.getElementById('w17-track'), playBtn = document.getElementById('w17-play'), about = document.getElementById('w17-about');
const cards = viewBox.classList.contains('cards');
const shown = viewBox.dataset.pick ? viewBox.dataset.pick.split(',').map(i => VIEWS[+i]) : VIEWS;
function mark(i) { // show which view the recording is on
  const view = VIEWS[i];
  [...viewBox.children].forEach((btn, k) => btn.classList.toggle('on', shown[k] === view));
  if (tag) { tag.innerHTML = '<small></small><b></b>'; tag.firstChild.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(VIEWS.length).padStart(2, '0'); tag.lastChild.textContent = view.name; }
  if (about && !TOWN) { // what this view shows, and what in it is real
    about.innerHTML = '<h3></h3><p></p><p class="real"></p>';
    about.children[0].textContent = view.name + ' · c.' + when;
    about.children[1].textContent = (when === 1700 && view.what1700) || view.what || ''; about.children[2].textContent = (when === 1700 && view.real1700) || view.real || '';
  }
}
function setPlaying(on) {
  if (TOWN) town.lapse.on = on; else tour.on = on;
  if (playBtn) { playBtn.textContent = on ? 'Pause' : TOWN ? 'Play the timelapse' : 'Play the recording'; playBtn.setAttribute('aria-pressed', String(on)); }
  stage.classList.toggle('playing', on);
}
function goTo(view, instant) { // jump the recording to a view; it plays on from there unless motion is switched off
  tour.t = VIEWS.indexOf(view) * LEG + 0.001; tour.at = -1; // a hair past the start: 3 * 11.2 / 11.2 rounds down to view 2
  if (instant) pose(tour.t);
}
shown.forEach(view => {
  const btn = document.createElement('button'); btn.type = 'button';
  if (cards) {
    const n = document.createElement('small'), t = document.createElement('b'), d = document.createElement('span');
    n.textContent = String(VIEWS.indexOf(view) + 1).padStart(2, '0'); t.textContent = view.name; d.textContent = view.sub; btn.append(n, t, d);
  } else btn.textContent = view.name;
  btn.addEventListener('click', () => { goTo(view, true); if (!TOWN) setPlaying(!still()); });
  viewBox.append(btn);
});
if (playBtn) playBtn.addEventListener('click', () => setPlaying(TOWN ? !town.lapse.on : !tour.on));
controls.addEventListener('start', () => { if (!TOWN) setPlaying(false); }); // taking hold of the model stops the recording; Play picks it up again
window.addEventListener('yp-motion', () => setPlaying(!still()));
const playingNow = () => TOWN ? town.lapse.on : tour.on;
document.querySelectorAll('#w17-when button').forEach(b => b.addEventListener('click', () => setWhen(+b.dataset.year)));
pose(0); if (TOWN) { setWhen(1700); town.set(still() ? 1850 : 1700); if (still()) town.jump(1850); setPlaying(!still()); } else { setPlaying(tour.on); setWhen(1680); }

// ---------- loop ----------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  labelBox.style.height = h + 'px';
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas); resize();
let onScreen = true, lastNow = 0, clock = 0;
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(stage);
if (document.body.classList.contains('home')) { // on the home page a wheel or one-finger swipe scrolls the page
  controls.enableZoom = false;
  canvas.addEventListener('wheel', e => { controls.enableZoom = e.ctrlKey; }, { capture: true, passive: true });
}
const mid = new THREE.Vector3();
function dress() { // everything that depends on where the camera is: haze, shadows, which trees are detailed
  const far = camera.position.distanceTo(controls.target);
  camera.near = Math.max(1, far / 400); camera.updateProjectionMatrix();
  scene.fog.near = 5000 + far * 1.2; scene.fog.far = 26000 + far * 4;
  scene.userData.sky.position.copy(camera.position);
  // the shadow covers the ground between the camera and what it looks at, no more, so shadows stay sharp up close
  const ext = clamp(far * 0.8, 70, 7000), sc = sun.shadow.camera;
  mid.lerpVectors(camera.position, controls.target, far < 800 ? 0.45 : 1); mid.y = Math.max(0, Math.min(mid.y, 200));
  sun.target.position.copy(mid); sun.position.copy(mid).addScaledVector(SUN, ext * 3 + 400);
  sc.left = sc.bottom = -ext; sc.right = sc.top = ext; sc.near = 10; sc.far = ext * 6 + 1500; sc.updateProjectionMatrix();
  sun.shadow.normalBias = ext / 500;
  forest(); brush();
}
renderer.setAnimationLoop(now => {
  const dt = Math.min(0.5, (now - lastNow) / 1000); lastNow = now;
  if (!onScreen) return;
  let i;
  if (tour.on) { tour.t = (tour.t + dt) % TOUR; i = pose(tour.t); }
  else { controls.update(); i = Math.floor(tour.t / LEG) % VIEWS.length; }
  if (i !== tour.at) { tour.at = i; mark(i); }
  if (track && !TOWN) track.firstChild.style.transform = 'scaleX(' + (tour.t / TOUR).toFixed(4) + ')';
  if (!still()) clock += dt; // the water keeps still when Motion is off
  waterMat.uniforms.uTime.value = clock;
  if (YP.w17smoke) YP.w17smoke(clock + 40);
  if (YP.w17walk) YP.w17walk(clock + 20);
  if (TOWN) town.tick(still() ? 0 : dt, clock);
  canoes.forEach((c, k) => { c.position.y = -0.12 + Math.sin(clock * 1.1 + k) * 0.07; c.rotation.z = Math.sin(clock * 0.9 + k * 2) * 0.03; }); // the ones afloat rock a little
  dress();
  renderer.render(scene, camera);
  placeLabels();
});

// A still picture of one view at a given size, for the gallery (tools/shoot-world.js collects them).
async function shot(i, w, h, year) {
  const was = TOWN ? town.year : when; if (year) (TOWN ? town.set(year) : setWhen(year));
  const v = VIEWS[i], keep = { p: camera.position.clone(), t: controls.target.clone() };
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(...v.pos); controls.target.set(...v.look); camera.lookAt(controls.target);
  dress(); renderer.render(scene, camera); renderer.render(scene, camera); // twice: the first pass builds any close-up forest and its shadows
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.88));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
  camera.position.copy(keep.p); controls.target.copy(keep.t); camera.lookAt(keep.t); resize();
  if (year) (TOWN ? town.set(was) : setWhen(was));
  return blob;
}
YP.w17 = { scene, camera, controls, VIEWS, goTo, shot, setWhen, groundY, trailAt, SITE, tour, pose, setPlaying, TOUR, LEG, town };
