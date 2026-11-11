// Toronto, c.1700: the ground before the town, as a 3D model you can look around.
//
// REAL (from data, see data/terrain.js and tools/build-terrain.js):
//   - the shape of the ground: today's elevation model, so the valleys, the old lake bluff and the
//     river courses are where they are now;
//   - the water's edge, the marsh and the creeks: the earliest maps that cover each place
//     (Chewett 1802, Chewett 1834, Browne 1851). Nothing was mapped in 1700; these are the nearest.
//   - where Teiaiagon stood (Baby Point, on the east bank of the Humber).
// NOT REAL, and said so on the page:
//   - the trees: where they stand, what kind they are and how thick they grow are an impression of
//     forest, apart from the oak savannah at High Park, which survives;
//   - the trail's exact line (it is known to have followed the Humber's east bank; the line here
//     simply keeps to that bank), and its width;
//   - the canoes and people, which are there for scale;
//   - heights, which are stretched 2.5 times, and trees, canoes and people, drawn 1.5 times life size.
// No dwellings are modelled: no source read for this project says what stood here in 1700 or where.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const YP = window.YP, T = YP.TERRAIN, H = YP.HISTORY;
const stage = document.getElementById('w17'), canvas = document.getElementById('w17-gl');
const EX = 2.5, BIG = 1.5; // vertical stretch; size of trees, canoes and people against life
const PHONE = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
const hash = (i, s) => { const x = Math.sin(i * 127.1 + (s || 0) * 311.7 + 74.7) * 43758.5453; return x - Math.floor(x); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); }
catch (e) { document.getElementById('w17-fail').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
const SKY = 0xe9e4d2;
const scene = new THREE.Scene();
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 9000, 30000);
const camera = new THREE.PerspectiveCamera(38, 16 / 9, 2, 60000);
scene.add(new THREE.HemisphereLight(0xfff6e4, 0x6f6a55, 1.35));
const sun = new THREE.DirectionalLight(0xffe9c4, 1.9);
sun.position.set(-6000, 5200, 5200); scene.add(sun);

// ---------- ground ----------
const { box, cell, nx, ny, maskCell, maskNx, maskNy } = T;
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
  if (k === 1) return h > 1.2 ? h - 0.6 : -6;   // a river above lake level keeps its bed; the lake and bay sit below the water sheet
  if (k === 2) return 0.25;                     // marsh, at the waterline
  return Math.max(h, 0.9);                      // land is never below the beach
}
const N = maskNx * maskNy, hs = new Float32Array(N), nearWater = new Uint8Array(N);
// What something standing or floating there rests on: the drawn surface (the same points the ground mesh joins up), or the water.
function groundY(x, y) {
  const fx = clamp((x - box.x0) / maskCell, 0, maskNx - 1.001), fy = clamp((y - box.y0) / maskCell, 0, maskNy - 1.001);
  const i = Math.floor(fx), j = Math.floor(fy), kx = fx - i, ky = fy - j, n = j * maskNx + i;
  return Math.max((hs[n] * (1 - kx) + hs[n + 1] * kx) * (1 - ky) + (hs[n + maskNx] * (1 - kx) + hs[n + maskNx + 1] * kx) * ky, 0) * EX;
}
const P = (x, y, lift) => new THREE.Vector3(x, groundY(x, y) + (lift || 0), -y);
for (let j = 0; j < maskNy; j++) for (let i = 0; i < maskNx; i++) hs[j * maskNx + i] = surface(box.x0 + i * maskCell, box.y0 + j * maskCell);
const isLake = n => T.kind[n] === '1' && hs[n] < 0;
for (let j = 0; j < maskNy; j++) for (let i = 0; i < maskNx; i++) { // within 150 m of the lake or bay
  let near = 0;
  for (let dj = -3; dj <= 3 && !near; dj++) for (let di = -3; di <= 3; di++) {
    const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= maskNx || jj >= maskNy) continue;
    if (isLake(jj * maskNx + ii)) { near = 1; break; }
  }
  nearWater[j * maskNx + i] = near;
}
const slopeAt = n => {
  const i = n % maskNx, j = (n - i) / maskNx; let s = 0;
  if (i > 0 && i < maskNx - 1) s = Math.max(s, Math.abs(hs[n + 1] - hs[n - 1]) / (2 * maskCell));
  if (j > 0 && j < maskNy - 1) s = Math.max(s, Math.abs(hs[n + maskNx] - hs[n - maskNx]) / (2 * maskCell));
  return s;
};
const isSand = n => T.kind[n] === '0' && hs[n] < 2.6 && nearWater[n];
{
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), c = new THREE.Color(), c2 = new THREE.Color();
  for (let j = 0; j < maskNy; j++) for (let i = 0; i < maskNx; i++) {
    const n = j * maskNx + i, k = T.kind[n], h = hs[n];
    pos[n * 3] = box.x0 + i * maskCell; pos[n * 3 + 1] = h * EX; pos[n * 3 + 2] = -(box.y0 + j * maskCell);
    if (k === '1') c.set(h < 0 ? '#2b6068' : '#4a93a0');
    else if (k === '2') c.set('#8f9c5c');
    else if (isSand(n)) c.set('#dfd2a8');
    else {
      c.set('#55704a').lerp(c2.set('#6f8552'), clamp(h / 90, 0, 1));
      const s = slopeAt(n); if (s > 0.16) c.lerp(c2.set('#a8956c'), clamp((s - 0.16) * 4, 0, 0.85)); // bare clay on bluffs and valley sides
      c.offsetHSL(0, 0, (hash(n, 5) - 0.5) * 0.03);
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
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));
}
// the lake and the bay: one sheet at the waterline, carried on past the south and east edges of the data
const W = box.x1 - box.x0, D = box.y1 - box.y0;
const water = new THREE.Mesh(new THREE.PlaneGeometry(W + 40000, D + 40000), new THREE.MeshPhongMaterial({ color: 0x3f8b98, shininess: 60, specular: 0x9fb8b8, transparent: true, opacity: 0.9 }));
water.rotation.x = -Math.PI / 2; water.position.set((box.x0 + box.x1) / 2 + 20000, 0, -(box.y0 + box.y1) / 2 + 20000);
scene.add(water);
{ // the same lake bed colour under the water beyond the data, so the sheet is one tone
  const bed = new THREE.Mesh(water.geometry, new THREE.MeshBasicMaterial({ color: 0x2b6068 })); bed.rotation.x = -Math.PI / 2; bed.position.copy(water.position); bed.position.y = -6 * EX - 0.5; scene.add(bed);
}
// the model is a cut tile: a plain skirt closes the land's north and west edges rather than inventing ground beyond them
{
  const skirt = new THREE.MeshLambertMaterial({ color: 0x8a7d62 });
  const wall = (pts) => {
    const v = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; v.push(a[0], a[1], a[2], b[0], b[1], b[2], b[0], -30, b[2], a[0], a[1], a[2], b[0], -30, b[2], a[0], -30, a[2]); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, skirt); m.material.side = THREE.DoubleSide; scene.add(m);
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
  scene.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x4a93a0 })));
}

// ---------- the Carrying Place: the trail up the Humber's east bank ----------
// Sourced: it began at the lake and followed the east bank, past Teiaiagon. Not sourced: this exact line.
const SITE = { x: (-79.494 - T.origin.lon) * Math.cos(T.origin.lat * Math.PI / 180) * 111320, y: (43.657 - T.origin.lat) * 110574 }; // Baby Point
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
  for (let pass = 0; pass < 3; pass++) for (let i = 1; i < trail.length - 1; i++) trail[i][0] = (trail[i - 1][0] + trail[i][0] * 2 + trail[i + 1][0]) / 4;
  const v = [], HALF = 2.2; // a footpath would be invisible from any height; this is drawn about 4 m wide
  for (let i = 0; i < trail.length - 1; i++) {
    const a = trail[i], b = trail[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), ox = -dy / len * HALF, oy = dx / len * HALF;
    const q = [P(a[0] - ox, a[1] - oy, 1.2), P(a[0] + ox, a[1] + oy, 1.2), P(b[0] + ox, b[1] + oy, 1.2), P(b[0] - ox, b[1] - oy, 1.2)];
    for (const k of [0, 1, 2, 0, 2, 3]) v.push(q[k].x, q[k].y, q[k].z);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals();
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xd2bd8e, side: THREE.DoubleSide })));
}
const trailAt = y => { for (let i = 0; i < trail.length - 1; i++) if (trail[i + 1][1] >= y) { const a = trail[i], b = trail[i + 1], k = (y - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * k, y]; } return trail[trail.length - 1]; };
const nearTrail = (x, y) => Math.abs(x - trailAt(clamp(y, trail[0][1], trail[trail.length - 1][1]))[0]) < 14 && y > trail[0][1] - 30;

// ---------- trees (an impression of forest, not a survey) ----------
{
  const STEP = PHONE ? 96 : 52, spots = [];
  const savannah = (x, y) => ((x + 6850) / 750) ** 2 + ((y - 1350) / 850) ** 2 < 1; // High Park, where black oak savannah survives
  let id = 0;
  for (let y = box.y0 + 30; y < box.y1; y += STEP) for (let x = box.x0 + 30; x < box.x1; x += STEP) {
    id++;
    const px = x + (hash(id, 1) - 0.5) * STEP * 0.9, py = y + (hash(id, 2) - 0.5) * STEP * 0.9;
    const i = Math.round((px - box.x0) / maskCell), j = Math.round((py - box.y0) / maskCell), n = j * maskNx + i;
    if (i < 1 || j < 1 || i >= maskNx - 1 || j >= maskNy - 1 || T.kind[n] !== '0') continue;
    if (isSand(n) && hash(id, 3) > 0.06) continue;                            // beaches and the sandbar are nearly bare
    if (slopeAt(n) > 0.45) continue;
    if (Math.hypot(px - SITE.x, py - SITE.y) < 360 && hash(id, 4) > 0.05) continue; // the clearing where Teiaiagon stood
    if (nearTrail(px, py)) continue;
    const oak = savannah(px, py);
    if (oak && hash(id, 6) > 0.3) continue;                                    // savannah: scattered trees over grass
    spots.push({ x: px, y: py, conifer: !oak && hash(id, 7) < 0.36, oak, id });
  }
  // the forest closes in along the trail, so that walking it at eye level is walking through trees
  for (let k = 0; k < trail.length - 1; k++) for (let q = 0; q < 10; q++) {
    id++;
    const a = trail[k], b = trail[k + 1], t = hash(id, 31), side = hash(id, 32) < 0.5 ? -1 : 1, off = 21 + hash(id, 33) * 55;
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), px = a[0] + dx * t - dy / len * off * side, py = a[1] + dy * t + dx / len * off * side;
    const n = Math.round((py - box.y0) / maskCell) * maskNx + Math.round((px - box.x0) / maskCell);
    if (T.kind[n] !== '0' || isSand(n) || Math.hypot(px - SITE.x, py - SITE.y) < 360) continue;
    spots.push({ x: px, y: py, conifer: hash(id, 7) < 0.36, oak: false, id });
  }
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.8, 1, 5, 1, true); trunkGeo.translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 7); coneGeo.translate(0, 0.5, 0);
  const roundGeo = new THREE.IcosahedronGeometry(1, 1);
  const nC = spots.filter(s => s.conifer).length, nR = spots.length - nC;
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x5c4a36 }), spots.length);
  const cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshLambertMaterial(), nC), rounds = new THREE.InstancedMesh(roundGeo, new THREE.MeshLambertMaterial(), nR);
  const d = new THREE.Object3D(), c = new THREE.Color(); let iC = 0, iR = 0;
  spots.forEach((s, k) => {
    const h = (s.conifer ? 30 + hash(s.id, 8) * 14 : s.oak ? 17 + hash(s.id, 8) * 7 : 21 + hash(s.id, 8) * 11) * BIG, base = groundY(s.x, s.y);
    const trunkH = s.conifer ? h * 0.28 : h * 0.4, r = s.conifer ? h * 0.2 : s.oak ? h * 0.46 : h * 0.4;
    d.rotation.set(0, hash(s.id, 9) * 6.28, 0);
    d.position.set(s.x, base, -s.y); d.scale.set(h * 0.035, trunkH, h * 0.035); d.updateMatrix(); trunks.setMatrixAt(k, d.matrix);
    if (s.conifer) {
      d.position.set(s.x, base + trunkH * 0.7, -s.y); d.scale.set(r, h - trunkH * 0.7, r); d.updateMatrix(); cones.setMatrixAt(iC, d.matrix);
      cones.setColorAt(iC++, c.set('#2f4f3a').offsetHSL((hash(s.id, 10) - 0.5) * 0.03, 0, (hash(s.id, 11) - 0.5) * 0.07));
    } else {
      d.position.set(s.x, base + trunkH + r * 0.55, -s.y); d.scale.set(r, r * (s.oak ? 0.62 : 0.8), r); d.updateMatrix(); rounds.setMatrixAt(iR, d.matrix);
      rounds.setColorAt(iR++, c.set(s.oak ? '#6c8a45' : '#4f7a44').offsetHSL((hash(s.id, 10) - 0.5) * 0.05, (hash(s.id, 12) - 0.5) * 0.1, (hash(s.id, 11) - 0.5) * 0.1));
    }
  });
  for (const m of [trunks, cones, rounds]) { m.frustumCulled = false; scene.add(m); }
  YP.w17trees = spots.length;
}
// reeds in the marsh
{
  const pts = [];
  for (let n = 0; n < N; n++) if (T.kind[n] === '2' && hash(n, 21) < 0.5) { const i = n % maskNx, j = (n - i) / maskNx; pts.push([box.x0 + (i + hash(n, 22) - 0.5) * maskCell, box.y0 + (j + hash(n, 23) - 0.5) * maskCell]); }
  const g = new THREE.ConeGeometry(1, 1, 5); g.translate(0, 0.5, 0);
  const reeds = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ color: 0xa9ad62 }), pts.length), d = new THREE.Object3D();
  pts.forEach((p, k) => { d.position.set(p[0], 0.25 * EX, -p[1]); d.scale.set(9, 5 + hash(k, 24) * 5, 9); d.updateMatrix(); reeds.setMatrixAt(k, d.matrix); });
  reeds.frustumCulled = false; scene.add(reeds);
}

// ---------- canoes and people, for scale (illustrative) ----------
const bark = new THREE.MeshLambertMaterial({ color: 0xd2a85e }), dark = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
const skin = new THREE.MeshLambertMaterial({ color: 0xb98a66 }), hide = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
function person(g, x, y, z, seated) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, seated ? 0.62 : 0.72, 0.26), hide); b.position.set(x, y + (seated ? 0.31 : 1.16), z); g.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), skin); h.position.set(x, y + (seated ? 0.78 : 1.68), z); g.add(h);
  if (!seated) for (const dx of [-0.11, 0.11]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.17), dark); l.position.set(x + dx, y + 0.4, z); g.add(l); }
}
function canoe(x, y, heading) { // a birchbark canoe, 5.5 m: the type checked against the references listed for the game
  const g = new THREE.Group(), s = new THREE.Shape();
  s.moveTo(-2.75, 0.62); s.quadraticCurveTo(-2.45, 0.08, -1.6, 0.04); s.lineTo(1.6, 0.04); s.quadraticCurveTo(2.45, 0.08, 2.75, 0.62);
  s.quadraticCurveTo(2.35, 0.36, 1.7, 0.34); s.lineTo(-1.7, 0.34); s.quadraticCurveTo(-2.35, 0.36, -2.75, 0.62);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.62, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 2 }); geo.translate(0, 0, -0.31);
  g.add(new THREE.Mesh(geo, bark));
  for (const z of [-0.44, 0.44]) { const r = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.07, 0.06), dark); r.position.set(0, 0.36, z); g.add(r); }
  person(g, -1.2, 0.2, 0, true); person(g, 1.1, 0.2, 0, true);
  g.scale.setScalar(BIG); g.position.set(x, -0.1, -y); g.rotation.y = heading;
  scene.add(g); return g;
}
const mouth = trail[0];
// a beach near the river mouth: the sand point nearest the trail's start that has open lake just south of it
let BEACH = [mouth[0] + 160, mouth[1] - 60], shoreY = mouth[1] - 110;
{
  let best = 1e9;
  for (let n = 0; n < N; n++) {
    if (!isSand(n)) continue;
    const i = n % maskNx, j = (n - i) / maskNx; if (j < 3 || j > maskNy - 2) continue;
    if (!isLake(n - 2 * maskNx) || !isLake(n - 3 * maskNx) || T.kind[n + maskNx] !== '0') continue;
    const x = box.x0 + i * maskCell, y = box.y0 + j * maskCell, d = Math.hypot(x - mouth[0] - 350, y - mouth[1]);
    if (d < best) { best = d; BEACH = [x, y]; shoreY = y - maskCell; }
  }
}
const canoes = [canoe(BEACH[0] - 120, shoreY - 45, 0.5), canoe(BEACH[0] - 210, shoreY - 95, 0.9), canoe(BEACH[0] + 420, shoreY - 260, 0.2), canoe(600, -900, 0.3), canoe(2300, 250, -0.6)];
for (const [dx, dy, r] of [[-26, -9, 1.15], [-44, -12, 1.5]]) { // two more drawn up on the sand
  const c = canoe(BEACH[0] + dx, BEACH[1] + dy, r); c.children.slice(-4).forEach(m => { m.visible = false; }); // nobody sitting in them
  c.position.y = groundY(BEACH[0] + dx, BEACH[1] + dy) + 0.2; c.userData.ashore = true;
}
{
  const g = new THREE.Group();
  for (const [dx, dy, r] of [[-18, 2, 2.2], [-22, 5, 2.6], [-66, 6, 1]]) { const f = new THREE.Group(); person(f, 0, 0, 0, false); f.scale.setScalar(BIG); f.position.copy(P(BEACH[0] + dx, BEACH[1] + dy, 0.1)); f.rotation.y = r; g.add(f); }
  [[0, 300], [4, 318], [-3, 760], [2, 1700]].forEach(([dx, y], k) => { const p = trailAt(trail[0][1] + y); const f = new THREE.Group(); person(f, 0, 0, 0, false); f.scale.setScalar(BIG); f.position.copy(P(p[0] + dx, p[1], 1.3)); f.rotation.y = k; g.add(f); });
  scene.add(g);
}

// ---------- labels ----------
const labelBox = document.getElementById('w17-labels');
const LABELS = [
  { name: 'Lake Ontario', x: -1500, y: -4700, water: true },
  { name: 'the bay', x: 1500, y: -900, water: true },
  { name: 'the peninsula', x: 1500, y: -2300, lift: 60 },
  { name: 'marsh', x: 5200, y: 1500, lift: 40 },
  { name: 'Humber River', x: mouth[0] - 260, y: mouth[1] + 500, water: true },
  { name: 'Don River', x: 2500, y: 3600, water: true },
  { name: 'Site of Teiaiagon', x: SITE.x, y: SITE.y, lift: 150 },
  { name: 'The Carrying Place', x: trailAt(1300)[0] + 120, y: 1300, lift: 110 }
];
for (const l of LABELS) {
  l.pos = P(l.x, l.y, l.lift || 20);
  l.el = document.createElement('span'); l.el.textContent = l.name; if (l.water) l.el.className = 'water';
  labelBox.append(l.el);
}
const v3 = new THREE.Vector3();
function placeLabels() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of LABELS) {
    v3.copy(l.pos).project(camera);
    const show = v3.z < 1 && Math.abs(v3.x) < 0.96 && Math.abs(v3.y) < 0.94 && camera.position.distanceTo(l.pos) > 500;
    l.el.style.display = show ? '' : 'none';
    if (show) l.el.style.transform = `translate(-50%, -50%) translate(${((v3.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v3.y) / 2 * h).toFixed(1)}px)`;
  }
}

// ---------- views ----------
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2 - 0.02; controls.minDistance = 20; controls.maxDistance = 26000;
const eye = (x, y, up) => { const p = P(x, y, up); return [p.x, p.y, p.z]; };
const tA = trailAt(1500), tB = trailAt(1760);
const VIEWS = [
  { name: 'Above the bay', sub: 'The harbour before the town', cap: 'The bay and the peninsula', pos: [6000, 2500, 5600], look: [200, 0, 900], turn: true },
  { name: 'Down to the shore', sub: 'At the mouth of the Humber', cap: 'On the beach at the Humber', pos: eye(BEACH[0] + 30, BEACH[1] + 16, 2.6), look: eye(BEACH[0] - 120, BEACH[1] - 110, 1) },
  { name: 'Along the trail', sub: 'At eye level', cap: 'Among the trees on the Carrying Place', pos: eye(tA[0], tA[1], 2.7), look: eye(tB[0], tB[1], 5) },
  { name: 'The Carrying Place', sub: 'Where Teiaiagon stood', cap: 'The trail and the site of Teiaiagon', pos: [SITE.x + 1900, 1050, -(SITE.y - 1700)], look: [SITE.x - 100, 60, -SITE.y], turn: true },
  { name: 'The mouth of the Humber', sub: 'Where the trail met the lake', cap: 'The Humber mouth', pos: [mouth[0] + 1500, 620, -(mouth[1] - 1500)], look: [mouth[0] - 300, 0, -(mouth[1] + 500)], turn: true },
  { name: 'As a map', sub: 'Rivers, shore and marsh from above', cap: 'Rivers and shore', pos: [-1250, 21500, -745], look: [-1250, 0, -750] }
];
let fly = null;
const still = () => document.documentElement.classList.contains('still');
function goTo(view, instant) {
  const p = new THREE.Vector3(...view.pos), t = new THREE.Vector3(...view.look);
  controls.autoRotate = !!view.turn; controls.autoRotateSpeed = 0.18;
  if (instant || still()) { camera.position.copy(p); controls.target.copy(t); fly = null; return; }
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p, t, start: performance.now() };
}
const viewBox = document.getElementById('w17-views'), tag = document.getElementById('w17-tag');
const cards = viewBox.classList.contains('cards');
const shown = viewBox.dataset.pick ? viewBox.dataset.pick.split(',').map(i => VIEWS[+i]) : VIEWS;
function choose(view) {
  goTo(view);
  [...viewBox.children].forEach((b, i) => b.classList.toggle('on', shown[i] === view));
  if (tag) tag.innerHTML = '<small>' + String(shown.indexOf(view) + 1).padStart(2, '0') + ' / ' + String(shown.length).padStart(2, '0') + '</small><b></b>', tag.lastChild.textContent = view.name;
}
shown.forEach((view, i) => {
  const b = document.createElement('button'); b.type = 'button';
  if (cards) {
    const n = document.createElement('small'), t = document.createElement('b'), d = document.createElement('span');
    n.textContent = String(i + 1).padStart(2, '0'); t.textContent = view.name; d.textContent = view.sub; b.append(n, t, d);
  } else b.textContent = view.name;
  b.addEventListener('click', () => choose(view));
  viewBox.append(b);
});
controls.addEventListener('start', () => { fly = null; controls.autoRotate = false; });
goTo(shown[0], true); choose(shown[0]); goTo(shown[0], true);

// ---------- loop ----------
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
  labelBox.style.height = h + 'px';
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas); resize();
let onScreen = true;
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(stage);
if (document.body.classList.contains('home')) { // on the home page a wheel or one-finger swipe scrolls the page
  controls.enableZoom = false;
  canvas.addEventListener('wheel', e => { controls.enableZoom = e.ctrlKey; }, { capture: true, passive: true });
}
renderer.setAnimationLoop(now => {
  if (!onScreen) return;
  if (fly) {
    const k = Math.min(1, (now - fly.start) / 1400), e = k * k * (3 - 2 * k);
    camera.position.lerpVectors(fly.p0, fly.p, e); controls.target.lerpVectors(fly.t0, fly.t, e);
    if (k === 1) fly = null;
  }
  // seen from far up, the near plane and the haze move out with the camera, so the water does not shimmer and the map view is not washed out
  const far = camera.position.distanceTo(controls.target);
  camera.near = Math.max(2, far / 300); camera.updateProjectionMatrix();
  scene.fog.near = 9000 + far * 1.2; scene.fog.far = 30000 + far * 4;
  const wasTurning = controls.autoRotate; if (still()) controls.autoRotate = false;
  controls.update(); controls.autoRotate = wasTurning;
  canoes.forEach((c, k) => { c.position.y = -0.1 + Math.sin(now / 900 + k) * 0.08; }); // the ones afloat rock a little
  renderer.render(scene, camera);
  placeLabels();
});

// A still picture of one view at a given size, for the gallery (tools/shoot-world.js collects them).
async function shot(i, w, h) {
  const v = VIEWS[i], keep = { p: camera.position.clone(), t: controls.target.clone(), a: camera.aspect };
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  camera.position.set(...v.pos); camera.lookAt(...v.look);
  const far = camera.position.distanceTo(new THREE.Vector3(...v.look));
  camera.near = Math.max(2, far / 300); camera.updateProjectionMatrix(); scene.fog.near = 9000 + far * 1.2; scene.fog.far = 30000 + far * 4;
  renderer.render(scene, camera);
  const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.86));
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
  camera.position.copy(keep.p); controls.target.copy(keep.t); resize();
  return blob;
}
YP.w17 = { scene, camera, controls, VIEWS, goTo, shot, groundY, trailAt, SITE };
