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
// No dwellings are modelled: no source read for this project says what stood here in 1700 or where.
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
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const HAZE = new THREE.Color('#efe4cc'), ZENITH = new THREE.Color('#9fbccb');
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(HAZE.getHex(), 9000, 30000);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 2, 90000);
const SUN = new THREE.Vector3(-0.68, 0.56, 0.47).normalize(); // toward the sun: low in the south-west
scene.add(new THREE.HemisphereLight(0xe6eef2, 0x9a8f72, 1.75));
const sun = new THREE.DirectionalLight(0xffe2b4, 2.5);
sun.castShadow = true; sun.shadow.mapSize.set(PHONE ? 1024 : 2048, PHONE ? 1024 : 2048); sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);
{ // the sky: warm haze at the horizon rising to a pale blue, with a soft glow round the sun
  const sky = new THREE.Mesh(new THREE.SphereGeometry(60000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uHaze: { value: HAZE }, uZenith: { value: ZENITH }, uSun: { value: SUN } },
    vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uHaze, uZenith, uSun; varying vec3 vDir;
      void main() { vec3 d = normalize(vDir); float up = pow(clamp(d.y, 0.0, 1.0), 0.55);
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
  ground.receiveShadow = true; scene.add(ground);
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
    const rx = riverX(y, gx); if (rx !== null) gx = rx;
    let x = gx + 230; // keep to the east bank, on ground that is land
    for (let k = 0; k < 8 && kindAt(x, y) !== 0; k++) x += maskCell;
    trail.push([x, y]);
  }
  for (const p of trail) { const w = Math.exp(-(((p[1] - SITE.y) / 420) ** 2)); p[0] += (SITE.x + 30 - p[0]) * w; } // the village stood on the trail: bend the line to pass it
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < trail.length - 1; i++) trail[i][0] = (trail[i - 1][0] + trail[i][0] * 2 + trail[i + 1][0]) / 4;
}
const trailAt = y => { for (let i = 0; i < trail.length - 1; i++) if (trail[i + 1][1] >= y) { const a = trail[i], b = trail[i + 1], k = (y - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * k, y]; } return trail[trail.length - 1]; };
const nearTrail = (x, y, gap) => Math.abs(x - trailAt(clamp(y, trail[0][1], trail[trail.length - 1][1]))[0]) < (gap || 16) && y > trail[0][1] - 30;
{
  const v = [], uvs = [], HALF = 2.2; // a footpath would be invisible from any height; this is drawn about 4 m wide
  for (let y = trail[0][1]; y < trail[trail.length - 1][1] - 20; y += 20) {
    const a = trailAt(y), b = trailAt(y + 20), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ox = -dy / len * HALF, oy = dx / len * HALF;
    const q = [P(a[0] - ox, a[1] - oy, 0.35), P(a[0] + ox, a[1] + oy, 0.35), P(b[0] + ox, b[1] + oy, 0.35), P(b[0] - ox, b[1] - oy, 0.35)];
    for (const k of [0, 1, 2, 0, 2, 3]) { v.push(q[k].x, q[k].y, q[k].z); uvs.push(q[k].x / 6, q[k].z / 6); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.computeVertexNormals();
  const path = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xcdb78a, map: grain, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
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
  trunk: new THREE.MeshStandardMaterial({ color: 0x6a5240, map: barky, roughness: 1, metalness: 0 }),
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
    if (hash(k, 4) < cleared(px, py) * 0.97) continue;                         // the clearing where Teiaiagon stood
    if (nearTrail(px, py)) continue;
    const oak = savannah(px, py);
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
        const v = 0.82 + hash(t.id, 11) * 0.42; m.setColorAt(k, tmpC.setRGB(v * (0.95 + hash(t.id, 10) * 0.2), v, v * (0.85 + hash(t.id, 12) * 0.2)));
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
    const v = 0.85 + hash(t.id, 11) * 0.4; m.setColorAt(k, tmpC.setRGB(v * (0.95 + hash(t.id, 10) * 0.2), v, v * (0.85 + hash(t.id, 12) * 0.2)));
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
    spots.push({ x, y, s: 0.45 + hash(t.id, 60 + q) * 1.1, id: t.id * 11 + q });
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
    if (kindAt(px, py) !== 0 || meshY(px, py) < 1.4 || nearTrail(px, py, 5)) continue;
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
function person(seated) { // a figure 1.7 m tall, standing or sitting
  const g = new THREE.Group(), up = seated ? 0.3 : 0.82;
  part(g, new THREE.CapsuleGeometry(0.16, 0.36, 4, 10), hide, 0, up + 0.36, 0);
  part(g, new THREE.SphereGeometry(0.115, 12, 10), skin, 0, up + 0.78, 0);
  part(g, new THREE.SphereGeometry(0.122, 12, 10, 0, 6.3, 0, 1.9), hair, 0, up + 0.8, -0.012);
  for (const s of [-1, 1]) {
    part(g, new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), skin, s * 0.21, up + 0.33, seated ? 0.12 : 0, seated ? -0.9 : 0, s * 0.12);
    if (seated) part(g, new THREE.CapsuleGeometry(0.07, 0.34, 4, 8), legging, s * 0.09, 0.3, 0.2, Math.PI / 2);
    else part(g, new THREE.CapsuleGeometry(0.075, 0.66, 4, 8), legging, s * 0.09, 0.41, 0);
  }
  return g;
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
    const p = person(true); p.position.set(px, 0.12, 0); p.rotation.y = Math.PI / 2; g.add(p);
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
  const stand = (x, y, r) => { const f = person(false); f.scale.setScalar(BIG); f.position.copy(P(x, y, 0)); f.rotation.y = r; scene.add(f); };
  for (const [dx, up, r] of [[-14, 12, 2.2], [-18, 15, 2.6], [-52, 16, 1]]) { const [x, y] = onBeach(dx, up); stand(x, y, r); }
  for (const [dx, y, r] of [[0, 300, 0], [1.2, 318, 0.4], [-1, 760, 3], [0.6, SITE.y - 250 - trail[0][1], 0.2], [-1.4, SITE.y - 242 - trail[0][1], 0.5]]) { const p = trailAt(trail[0][1] + y); stand(p[0] + dx, p[1], r); }
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
  { name: 'Teiaiagon', note: 'a Seneca village on the trail, left by 1701', x: SITE.x, y: SITE.y, lift: 70 },
  { name: 'The Carrying Place', note: 'the trail north to Lake Simcoe', x: trailAt(1100)[0] + 60, y: 1100, lift: 90 }
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
    const show = v3.z < 1 && Math.abs(v3.x) < 0.96 && Math.abs(v3.y) < 0.94 && camera.position.distanceTo(l.pos) > 220;
    l.el.style.display = show ? '' : 'none';
    if (show) l.el.style.transform = `translate(-50%, -50%) translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px)`;
  }
}

// ---------- views ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 20; controls.maxDistance = 26000;
const eye = (x, y, up) => { const p = P(x, y, up); return [p.x, p.y, p.z]; };
const tA = trailAt(SITE.y - 350), tB = trailAt(SITE.y + 60); // the walk comes up the trail to the clearing where Teiaiagon stood
const VIEWS = [
  { name: 'Above the bay', sub: 'The harbour before the town', pos: [6000, 2500, 5600], look: [200, 0, 900] },
  { name: 'Down to the shore', sub: 'Where the carry began', pos: eye(...onBeach(26, 20), 2.6), look: eye(...onBeach(-90, -34), 1) },
  { name: 'On the trail', sub: 'Walking in to Teiaiagon', pos: eye(tA[0], tA[1], 2.7), look: eye(tB[0], tB[1], 4) },
  { name: 'Teiaiagon', sub: 'Where the village stood', pos: [SITE.x + 1250, 760, -(SITE.y - 1150)], look: [SITE.x - 60, 70, -SITE.y] },
  { name: 'The mouth of the Humber', sub: 'River, sand and the trail’s start', pos: [mouth[0] + 1500, 620, -(mouth[1] - 1500)], look: [mouth[0] - 300, 0, -(mouth[1] + 500)] },
  { name: 'As a map', sub: 'Two rivers, a bay, a marsh', pos: [-1250, 21500, -745], look: [-1250, 0, -750] }
];

// What each view is for. The words live in gallery.js, so the recording and the snapshots cannot disagree.
for (const g of (YP.GALLERY || [])) if (VIEWS[g.view]) { VIEWS[g.view].what = g.what; VIEWS[g.view].real = g.real; }

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
  const tA2 = trailAt(SITE.y - 255), tB2 = trailAt(SITE.y + 120); // about 80 m further on, the clearing opening ahead
  VIEWS[0].end = { pos: turned(VIEWS[0], -14, 0.86) };
  VIEWS[1].end = { pos: eye(...onBeach(10, 24), 2.6), look: eye(...onBeach(-110, -20), 1) };
  VIEWS[2].end = { pos: eye(tA2[0], tA2[1], 2.7), look: eye(tB2[0], tB2[1], 4) };
  VIEWS[3].end = { pos: turned(VIEWS[3], 16, 0.9) };
  VIEWS[4].end = { pos: turned(VIEWS[4], -14, 0.88) };
  VIEWS[5].end = { pos: [VIEWS[5].pos[0], 17500, VIEWS[5].pos[2]] };
  for (const v of VIEWS) { v.p0 = new THREE.Vector3(...v.pos); v.l0 = new THREE.Vector3(...v.look); v.p1 = new THREE.Vector3(...v.end.pos); v.l1 = new THREE.Vector3(...(v.end.look || v.look)); }
}
const tour = { on: !still(), t: 0, at: -1 };
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
  if (about) { // what this view shows, and what in it is real
    about.innerHTML = '<h3></h3><p></p><p class="real"></p>';
    about.children[0].textContent = view.name; about.children[1].textContent = view.what || ''; about.children[2].textContent = view.real || '';
  }
}
function setPlaying(on) {
  tour.on = on;
  if (playBtn) { playBtn.textContent = on ? 'Pause' : 'Play the recording'; playBtn.setAttribute('aria-pressed', String(on)); }
  stage.classList.toggle('playing', on);
}
function goTo(view, instant) { // jump the recording to a view; it plays on from there unless motion is switched off
  tour.t = VIEWS.indexOf(view) * LEG; tour.at = -1;
  if (instant) pose(tour.t);
}
shown.forEach(view => {
  const btn = document.createElement('button'); btn.type = 'button';
  if (cards) {
    const n = document.createElement('small'), t = document.createElement('b'), d = document.createElement('span');
    n.textContent = String(VIEWS.indexOf(view) + 1).padStart(2, '0'); t.textContent = view.name; d.textContent = view.sub; btn.append(n, t, d);
  } else btn.textContent = view.name;
  btn.addEventListener('click', () => { goTo(view, true); setPlaying(!still()); });
  viewBox.append(btn);
});
if (playBtn) playBtn.addEventListener('click', () => setPlaying(!tour.on));
controls.addEventListener('start', () => setPlaying(false)); // taking hold of the model stops the recording; Play picks it up again
window.addEventListener('yp-motion', () => setPlaying(!still()));
pose(0); setPlaying(tour.on);

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
  if (track) track.firstChild.style.transform = 'scaleX(' + (tour.t / TOUR).toFixed(4) + ')';
  if (!still()) clock += dt; // the water keeps still when Motion is off
  waterMat.uniforms.uTime.value = clock;
  canoes.forEach((c, k) => { c.position.y = -0.12 + Math.sin(clock * 1.1 + k) * 0.07; c.rotation.z = Math.sin(clock * 0.9 + k * 2) * 0.03; }); // the ones afloat rock a little
  dress();
  renderer.render(scene, camera);
  placeLabels();
});

// A still picture of one view at a given size, for the gallery (tools/shoot-world.js collects them).
async function shot(i, w, h) {
  const v = VIEWS[i], keep = { p: camera.position.clone(), t: controls.target.clone() };
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(...v.pos); controls.target.set(...v.look); camera.lookAt(controls.target);
  dress(); renderer.render(scene, camera); renderer.render(scene, camera); // twice: the first pass builds any close-up forest and its shadows
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.88));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
  camera.position.copy(keep.p); controls.target.copy(keep.t); camera.lookAt(keep.t); resize();
  return blob;
}
YP.w17 = { scene, camera, controls, VIEWS, goTo, shot, groundY, trailAt, SITE, tour, pose, setPlaying, TOUR, LEG };
