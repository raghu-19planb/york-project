// Carrying Place in 3D. This draws the same game state as the 2D canvas
// (game.js owns the rules; this file only renders), as a lit diorama seen
// from the side. World units match the game's pixels: x = distance along the
// timeline, y = up, z = toward the camera. A thing standing at x belongs to
// the year Y0 + x / PXPY, so landmarks sit exactly at their year.
//
// As in landscape.js: captioned things come from YP.SCENERY, growth is paced
// by census counts, and everything else is an illustration of the period.
// A full URL rather than an import map, so older iPhones (before iOS 16.4) can load it too.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const { Y0, Y1, PXPY } = YP.GEO;
const { dev, hash, sky, clamp, pick } = YP.land;
const C = YP.C;
const yearAt = x => Y0 + x / PXPY, xAt = year => (year - Y0) * PXPY;
const X_LAND = xAt(1861), X_END = xAt(Y1) + 1500;
const Z_SHORE = -125, Z_FRONT = -215, Z_BACK = -520;

const stage = document.getElementById('stage');
const canvas = document.getElementById('c3d');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
catch (e) { canvas.remove(); throw e; } // no WebGL: the 2D canvas stays in charge
// Phones get a lighter load: fewer pixels and a smaller shadow map.
const PHONE = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PHONE ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xefe8d8, 900, 2600);
const camera = new THREE.PerspectiveCamera(40, 16 / 9, 20, 6000);

const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8170, 1.25);
const sun = new THREE.DirectionalLight(0xfff0d0, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(PHONE ? 1024 : 2048, PHONE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -1100, right: 1100, top: 700, bottom: -500, near: 50, far: 2600 });
sun.shadow.bias = -0.0008;
scene.add(hemi, sun, sun.target);

// ---------- building blocks ----------
const mats = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial(Object.assign({ color }, extra)));
  return mats.get(key);
}
const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 16, 12),
  cone: new THREE.ConeGeometry(1, 1, 14),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cyl: new Map()
};
{ // unit triangular prism for pitched roofs: base 1 wide, 1 high, 1 deep
  const s = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  GEO.prism = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  GEO.prism.translate(0, 0, -0.5);
}
function put(p, geo, material, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; m.receiveShadow = true;
  p.add(m);
  return m;
}
// y is always the base of the shape, not its centre.
const box = (p, w, h, d, color, x, y, z) => put(p, GEO.box, typeof color === 'object' ? color : mat(color), x, y + h / 2, z, w, h, d);
const sph = (p, r, color, x, y, z, sy) => put(p, GEO.sph, typeof color === 'object' ? color : mat(color), x, y, z, r, r * (sy || 1), r);
const cone = (p, r, h, color, x, y, z, four) => {
  const m = put(p, four ? GEO.cone4 : GEO.cone, mat(color), x, y + h / 2, z, r, h, r);
  if (four) m.rotation.y = Math.PI / 4;
  return m;
};
function cyl(p, rTop, rBot, h, color, x, y, z) {
  const k = Math.round(rTop / rBot * 20) / 20;
  if (!GEO.cyl.has(k)) GEO.cyl.set(k, new THREE.CylinderGeometry(k, 1, 1, 16));
  return put(p, GEO.cyl.get(k), typeof color === 'object' ? color : mat(color), x, y + h / 2, z, rBot, h, rBot);
}
const roof = (p, w, h, d, color, x, y, z) => put(p, GEO.prism, mat(color), x, y, z, w, h, d);
const wheel = (p, r, x, z, color) => { const m = cyl(p, r, r, 3, color || '#1f2226', x, 0, z); m.rotation.x = Math.PI / 2; m.position.y = r; return m; };

// Window textures: one 64px tile = 32 world units, baked per wall colour.
const texes = new Map();
function wallTex(style, color) {
  const key = style + color;
  if (texes.has(key)) return texes.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 64, 64);
  if (style === 'brick') { g.fillStyle = 'rgba(243,236,221,0.85)'; g.fillRect(9, 16, 14, 24); g.fillRect(41, 16, 14, 24); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < 64; y += 8) g.fillRect(0, y, 64, 1); }
  else if (style === 'burnt') { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(9, 16, 14, 24); g.fillRect(41, 16, 14, 24); }
  else if (style === 'deco') { g.fillStyle = 'rgba(23,32,43,0.45)'; for (const x of [8, 28, 48]) g.fillRect(x, 14, 8, 30); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 52, 64, 3); }
  else if (style === 'slab') { g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(0, 18, 64, 20); g.fillStyle = 'rgba(0,0,0,0.15)'; for (let x = 0; x < 64; x += 16) g.fillRect(x, 0, 1.5, 64); }
  else if (style === 'condo') { g.fillStyle = 'rgba(255,255,255,0.65)'; g.fillRect(0, 6, 64, 7); g.fillRect(0, 38, 64, 7); g.fillStyle = 'rgba(23,32,43,0.18)'; g.fillRect(0, 13, 64, 12); g.fillRect(0, 45, 64, 12); }
  else if (style === 'wood') { g.fillStyle = 'rgba(23,32,43,0.16)'; for (let y = 0; y < 64; y += 10) g.fillRect(0, y, 64, 2); }
  else if (style === 'mies') { g.fillStyle = 'rgba(190,200,210,0.28)'; for (let x = 0; x < 64; x += 12) g.fillRect(x, 0, 2.5, 64); g.fillStyle = 'rgba(190,200,210,0.14)'; for (let y = 0; y < 64; y += 16) g.fillRect(0, y, 64, 1.5); }
  else if (style === 'stone') { g.fillStyle = 'rgba(60,45,35,0.55)'; for (const x of [10, 38]) { g.beginPath(); g.arc(x + 8, 22, 8, Math.PI, 0); g.fill(); g.fillRect(x, 22, 16, 22); } }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  texes.set(key, t);
  return t;
}
const wallMats = new Map();
function tbox(p, w, h, d, style, color, x, y, z) { // a box with windows on its four walls
  const key = style + color;
  if (!wallMats.has(key)) { const m = new THREE.MeshLambertMaterial({ map: wallTex(style, color) }); wallMats.set(key, [m, m, mat(color), mat(color), m, m]); }
  const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { // faces in order: +x -x +y -y +z -z, four vertices each
    const face = Math.floor(i / 4), span = face < 2 ? d : w;
    uv.setXY(i, uv.getX(i) * span / 32, uv.getY(i) * h / 32);
  }
  geo.userData.own = true;
  const m = new THREE.Mesh(geo, wallMats.get(key));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true;
  p.add(m);
  return m;
}
function label(p, text, x, y, z) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = '600 22px "IBM Plex Mono", monospace';
  const w = Math.ceil(g.measureText(text).width) + 20;
  c.width = w; c.height = 32;
  g.fillStyle = C.paper; g.fillRect(0, 0, w, 32); g.strokeStyle = C.ink; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, 29);
  g.font = '600 22px "IBM Plex Mono", monospace'; g.fillStyle = C.ink; g.textBaseline = 'middle'; g.fillText(text, 10, 17);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false }));
  s.scale.set(w * 0.5, 16, 1); s.position.set(x, y, z);
  s.userData.own = true;
  p.add(s);
  return s;
}
function smoke(g, x, y, z, size) { // three puffs that rise and fade, restarted forever
  const puffs = [0, 1, 2].map(() => sph(g, size, new THREE.MeshLambertMaterial({ color: 0x8a8580, transparent: true, opacity: 0.4 }), x, y, z));
  puffs.forEach(m => { m.castShadow = false; m.material.userData = { own: true }; });
  (g.userData.anim = g.userData.anim || []).push(t => puffs.forEach((m, k) => {
    const s = (t * 0.45 + k / 3 + x * 0.01) % 1;
    m.position.set(x + s * 22, y + s * 46, z); m.scale.setScalar(size * (1 + s * 1.6)); m.material.opacity = 0.42 * (1 - s);
  }));
}

// ---------- ground ----------
{
  const ground = new THREE.Group();
  const STEP = xAt(Y0 + 5), n = Math.ceil((X_END + 3000) / STEP);
  for (let k = 0; k < n; k++) {
    const x0 = -3000 + k * STEP, yr = yearAt(x0 + STEP / 2), dv = dev(yr);
    const land = new THREE.Color('#6f9a6a').lerp(new THREE.Color('#a8a092'), clamp(dv * 1.15));
    const a = box(ground, STEP + 1, 20, 1700, '#' + land.getHexString(), x0 + STEP / 2, -20, Z_SHORE - 850); a.castShadow = false;
    const front = yr < 1861 ? '#3f7f93' : yr < 1892 ? '#b08d5f' : yr < 1954 ? '#7d7468' : '#5a5f66';
    const b = box(ground, STEP + 1, 20, 900, front, x0 + STEP / 2, yr < 1861 ? -26 : -20, Z_SHORE + 450); b.castShadow = false;
    if (yr >= 1861) { const s = box(ground, STEP + 1, 3, 70, '#b9b2a3', x0 + STEP / 2, 0, Z_SHORE + 40); s.castShadow = false; } // sidewalk
    else { const s = box(ground, STEP + 1, 4, 60, '#d9c9a0', x0 + STEP / 2, -3, Z_SHORE - 26); s.castShadow = false; } // beach
  }
  box(ground, 30, 14, 900, '#6b4a2e', X_LAND, -8, Z_SHORE + 450); // the landing where the water ends
  const railLen = X_END - X_LAND;
  for (const z of [-11, 11]) box(ground, railLen, 2.5, 2.5, '#2a2f35', X_LAND + railLen / 2, 0, z);
  const ties = new THREE.InstancedMesh(GEO.box, mat('#4b3a2c'), Math.floor(railLen / 34));
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < ties.count; i++) { m4.makeScale(9, 1.5, 38); m4.setPosition(X_LAND + i * 34, 0.5, 0); ties.setMatrixAt(i, m4); }
  ties.receiveShadow = true; ground.add(ties);
  const w0 = xAt(1892), w1 = xAt(1954);
  box(ground, w1 - w0, 0.8, 0.8, '#17202b', (w0 + w1) / 2, 66, 0); // trolley wire
  for (let x = w0; x < w1; x += 320) { box(ground, 3, 72, 3, '#3a3530', x, 0, -34); box(ground, 3, 2, 36, '#3a3530', x, 68, -16); }
  box(ground, X_END - w1, 3, 3, '#e9b44c', (w1 + X_END) / 2, 2, 24); // third rail
  scene.add(ground);
}
// Sun and clouds ride along with the camera.
const skyRig = new THREE.Group();
skyRig.add(new THREE.Mesh(GEO.sph, new THREE.MeshBasicMaterial({ color: 0xfff4d6, fog: false, transparent: true, opacity: 0.85 })));
skyRig.children[0].scale.setScalar(70); skyRig.children[0].position.set(520, 640, -2200);
const clouds = [];
for (let k = 0; k < 7; k++) {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false, transparent: true, opacity: 0.8 });
  for (let b = 0; b < 4; b++) { const s = new THREE.Mesh(GEO.sph, m); s.scale.set(60 + hash(k * 9 + b, 31) * 50, 26 + hash(k * 9 + b, 32) * 14, 30); s.position.set(b * 55 - 80, hash(k * 9 + b, 33) * 14, 0); g.add(s); }
  g.userData.x0 = (hash(k, 34) - 0.5) * 3600; g.position.set(g.userData.x0, 480 + hash(k, 35) * 240, -2000 - hash(k, 36) * 300);
  clouds.push(g); skyRig.add(g);
}
scene.add(skyRig);

// ---------- ordinary buildings (illustrative) ----------
function conifers(g, i, big) {
  for (let k = 0; k < 2; k++) {
    const x = -18 + k * 34, th = (60 + hash(i * 2 + k, 1) * 70) * (big || 1), z = (hash(i * 2 + k, 8) - 0.5) * 50;
    cyl(g, 3, 4, th * 0.2, '#5a4332', x, 0, z);
    cone(g, th * 0.26, th * 0.55, k ? '#3f6b52' : '#2f5a45', x, th * 0.16, z); cone(g, th * 0.19, th * 0.5, k ? '#4a7a5d' : '#3a6850', x, th * 0.5, z);
  }
}
function streetTree(g) { cyl(g, 2.5, 3, 24, '#5a4332', 0, 0, 20); sph(g, 17, '#5f8f63', 0, 36, 20, 0.9); sph(g, 11, '#4f7f57', -11, 28, 24); }
function cabin(g, h2) {
  tbox(g, 44, 24, 34, 'wood', '#7a5a3a', 0, 0, 0); roof(g, 52, 18, 40, '#4b3a2c', 0, 24, 0);
  box(g, 7, 22, 7, '#5a5148', 14, 22, -6); box(g, 9, 14, 1, '#3a2c20', -4, 0, 17.5);
  if (h2 > 0.4) smoke(g, 14, 48, -6, 4);
}
function house(g, h, h2) {
  const bh = 30 + h2 * 24, col = h > 0.6 ? '#d9c9a8' : h > 0.3 ? '#9c7a55' : '#a85f4b';
  tbox(g, 46, bh, 36, 'wood', col, 0, 0, 0); roof(g, 54, 20, 42, '#4b3a2c', 0, bh, 0);
  for (const x of [-12, 12]) box(g, 9, 11, 1, C.paper, x, bh * 0.45, 18.5);
  box(g, 9, 15, 1, '#4b3a2c', 0, 0, 18.5);
  if (h2 > 0.9) cone(g, 7, 52, '#4b3a2c', 0, bh + 12, 0, true);
}
function brick(g, i, h, h2, dv, yr) {
  const bh = 46 + dv * 150 * (0.45 + h * 0.55), burnt = Math.abs(yr - 1904.3) < 0.9;
  const whole = tbox(g, 58, bh, 44, 'brick', pick(['#8c4a3a', '#a0604a', '#6f4034', '#b07a5a'], h2), 0, 0, 0);
  const charred = burnt ? tbox(g, 58.4, bh, 44.4, 'burnt', '#3a2e2a', 0, 0, 0) : null;
  box(g, 62, 3, 48, '#4b3a2c', 0, bh, 0);
  if (burnt) {
    const flames = [0, 1, 2, 3].map(k => cone(g, 9, 30, k % 2 ? '#e8762c' : '#f2b233', -22 + k * 15, bh, (k % 2) * 14 - 7));
    flames.forEach(f => { f.castShadow = false; });
    (g.userData.anim = g.userData.anim || []).push((t, year) => { charred.visible = year >= 1904.25; whole.visible = !charred.visible; }); // standing until the night of the fire
    (g.userData.anim = g.userData.anim || []).push((t, year) => flames.forEach((f, k) => {
      f.visible = year >= 1904.25 && year < 1906.2; f.scale.y = 22 + Math.abs(Math.sin(t * 9 + k * 2)) * 30; f.position.y = bh + f.scale.y / 2;
    }));
    smoke(g, 0, bh + 30, 0, 12);
  } else if (h2 > 0.5 && yr < 1965) { box(g, 9, 28, 9, '#4b3a2c', 16, bh, -8); smoke(g, 16, bh + 32, -8, 6); }
}
function deco(g, h, h2, dv) {
  const bh = 90 + dv * 190 * h, col = pick(['#cbbf9f', '#d6ccb2', '#bcae8e'], h2);
  tbox(g, 56, bh * 0.62, 44, 'deco', col, 0, 0, 0); tbox(g, 40, bh * 0.27, 32, 'deco', col, 0, bh * 0.62, 0); tbox(g, 24, bh * 0.11, 20, 'deco', col, 0, bh * 0.89, 0);
}
function slab(g, h, h2, dv) {
  const bh = 110 + dv * 200 * h;
  tbox(g, 50, bh, 40, 'slab', pick(['#5d7f93', '#44627a', '#7fa3b3', '#2f4658', '#8a8f86'], h2), 0, 0, 0);
}
function condo(g, i, h, h2) {
  const bh = 150 + 170 * h;
  tbox(g, 42, bh, 36, 'condo', pick(['#9fc0cc', '#b8cdd2', '#7e9fae', '#c9d6d4'], h2), 0, 0, 0);
  box(g, 12, 10, 12, '#6b7780', 0, bh, 0);
  if (hash(i, 7) > 0.86) { box(g, 2.5, bh + 44, 2.5, '#d9a21e', 30, 0, 0); box(g, 70, 2.5, 2.5, '#d9a21e', 14, bh + 42, 0); box(g, 0.8, 26, 0.8, C.ink, 44, bh + 16, 0); }
}

// ---------- dated landmarks (YP.SCENERY). Each returns its height. ----------
const LANDMARK = {
  fort(g) {
    for (let k = 0; k < 13; k++) { box(g, 6, 20, 5, '#7a5a3a', -60 + k * 8, 0, 26); cone(g, 3.6, 7, '#7a5a3a', -60 + k * 8, 20, 26, true); }
    tbox(g, 30, 30, 30, 'wood', '#6b4a2e', 0, 0, 0); tbox(g, 40, 18, 40, 'wood', '#7a5a3a', 0, 30, 0); cone(g, 31, 18, '#4b3a2c', 0, 48, 0, true);
    cyl(g, 1, 1.2, 96, C.ink, 40, 0, 0);
    const flag = box(g, 22, 13, 0.6, C.red, 52, 82, 0);
    (g.userData.anim = g.userData.anim || []).push(t => { flag.rotation.y = Math.sin(t * 4) * 0.25; });
    return 104;
  },
  windmill(g) {
    cyl(g, 9, 16, 78, '#b9a27e', 0, 0, 0); cone(g, 12, 16, '#4b3a2c', 0, 78, 0); box(g, 8, 18, 1, '#4b3a2c', 0, 0, 16);
    const hub = new THREE.Group(); hub.position.set(0, 80, 13); g.add(hub);
    for (let k = 0; k < 4; k++) { const arm = new THREE.Group(); arm.rotation.z = k * Math.PI / 2; hub.add(arm); box(arm, 2.5, 46, 1.5, C.ink, 0, 0, 0); box(arm, 10, 32, 0.8, C.paper, 6, 12, 0); }
    (g.userData.anim = g.userData.anim || []).push(t => { hub.rotation.z = t * 0.8; });
    return 134;
  },
  oldcityhall(g) {
    tbox(g, 84, 60, 56, 'stone', '#c9a57c', 0, 0, 0); roof(g, 90, 18, 60, '#6f5a48', 0, 60, 0);
    tbox(g, 22, 150, 22, 'deco', '#c9a57c', 0, 0, 22); cone(g, 17, 36, '#6f5a48', 0, 150, 22, true);
    const clock = cyl(g, 7, 7, 1.2, C.paper, 0, 0, 33.4); clock.rotation.x = Math.PI / 2; clock.position.y = 132;
    box(g, 1, 6, 0.6, C.ink, 0, 132, 34.4); box(g, 4, 1, 0.6, C.ink, 2, 132, 34.4);
    return 192;
  },
  royalyork(g) {
    tbox(g, 76, 90, 50, 'deco', '#cbbf9f', 0, 0, 0); tbox(g, 44, 40, 34, 'deco', '#cbbf9f', 0, 90, 0);
    cone(g, 30, 30, '#6f9a86', 0, 130, 0, true); cone(g, 9, 12, '#6f9a86', -32, 90, 0, true); cone(g, 9, 12, '#6f9a86', 32, 90, 0, true);
    return 166;
  },
  commerce(g) {
    tbox(g, 52, 110, 44, 'deco', '#d2c6a8', 0, 0, 0); tbox(g, 36, 60, 32, 'deco', '#d2c6a8', 0, 110, 0); tbox(g, 22, 36, 20, 'deco', '#d2c6a8', 0, 170, 0);
    box(g, 12, 10, 12, '#a89a78', 0, 206, 0);
    return 222;
  },
  cityhall(g) {
    const tower = (h, x, start) => {
      const geo = new THREE.CylinderGeometry(34, 34, h, 20, 1, false, start, Math.PI * 0.62); geo.userData.own = true;
      const m = new THREE.Mesh(geo, mat('#e8e2d2')); m.position.set(x, h / 2, 0); m.castShadow = m.receiveShadow = true; g.add(m);
      for (let y = 8; y < h - 4; y += 8) { const band = new THREE.Mesh(geo, mat('#8f9aa3')); band.scale.set(1.01, 2.2 / h, 1.01); band.position.set(x, y, 0); g.add(band); }
    };
    tower(128, -6, Math.PI * 1.02); tower(102, 6, Math.PI * 0.02);
    sph(g, 17, '#d6cfbd', 0, 16, 0, 0.42); cyl(g, 4, 4, 12, '#b9b2a3', 0, 0, 0);
    return 136;
  },
  td(g) { tbox(g, 46, 232, 40, 'mies', '#22262b', 0, 0, 0); return 240; },
  cntower(g) {
    cyl(g, 5, 15, 290, '#8b949c', 0, 0, 0); cyl(g, 14, 10, 14, '#3d4750', 0, 290, 0); cyl(g, 16, 14, 10, '#3d4750', 0, 304, 0);
    cyl(g, 3.5, 5, 80, '#8b949c', 0, 314, 0); cyl(g, 0.8, 2.2, 76, '#8b949c', 0, 394, 0);
    return 476;
  },
  skydome(g) {
    cyl(g, 62, 62, 26, '#c9c4b8', 0, 0, 0);
    const geo = new THREE.SphereGeometry(62, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2); geo.userData.own = true;
    const dome = new THREE.Mesh(geo, mat('#f1eee6')); dome.scale.y = 0.55; dome.position.y = 26; dome.castShadow = true; g.add(dome);
    return 70;
  }
};
const SLF = 82, landmarkAt = {}, byId = {};
for (const s of YP.SCENERY) {
  byId[s.id] = s;
  if (!LANDMARK[s.id]) continue;
  let i = Math.round(xAt(s.at) / SLF);
  while (landmarkAt[i]) i++;
  landmarkAt[i] = s;
}

function frontSlot(i) {
  const g = new THREE.Group(), x = i * SLF, yr = yearAt(x), h2 = hash(i, 2), dv = dev(yr);
  g.position.set(x, 0, Z_FRONT);
  const lm = landmarkAt[i];
  if (lm) { const top = LANDMARK[lm.id](g); label(g, lm.title + ' · ' + lm.label, 0, Math.min(top + 16, 400), 30); g.scale.setScalar(1.05); return g; }
  g.scale.setScalar(1.05);
  if (hash(i) < clamp(1 - (yr - 1790) / 75, 0.07, 1)) { yr < 1865 ? conifers(g, i) : streetTree(g); return g; }
  const t = yr + (hash(i, 3) - 0.5) * 30; // styles overlap by about a generation
  if (t < 1822) cabin(g, h2);
  else if (t < 1862) house(g, hash(i, 4), h2);
  else if (t < 1912) brick(g, i, hash(i, 4), h2, dv, yr);
  else if (t < 1960) (hash(i, 4) > 0.45 ? deco(g, hash(i, 5), h2, dv) : brick(g, i, hash(i, 5), h2, dv, yr));
  else if (t < 2002) (hash(i, 4) > 0.25 ? slab(g, hash(i, 5), h2, dv) : deco(g, hash(i, 5), h2, dv));
  else (hash(i, 4) > 0.4 ? condo(g, i, hash(i, 5), h2) : slab(g, hash(i, 5), h2, dv));
  return g;
}
const SLB = 104;
function backSlot(i) { // the far row: forest at first, then the skyline behind the street
  const g = new THREE.Group(), x = i * SLB + 40, yr = yearAt(x), dv = dev(yr), k = i + 5000;
  g.position.set(x, 0, Z_BACK - hash(k, 9) * 160);
  if (hash(k) < clamp(1 - (yr - 1800) / 90, 0.1, 1)) { conifers(g, k, 1.45); return g; }
  g.scale.setScalar(1.3);
  const t = yr + (hash(k, 3) - 0.5) * 30, h = hash(k, 5), h2 = hash(k, 2);
  if (t < 1862) house(g, hash(k, 4), h2);
  else if (t < 1912) brick(g, k, h, h2, dv, 0);
  else if (t < 1960) (hash(k, 4) > 0.5 ? deco(g, h, h2, dv) : brick(g, k, h, h2, dv, 0));
  else if (t < 2002) slab(g, h, h2, dv);
  else (hash(k, 4) > 0.5 ? condo(g, k, h, h2) : slab(g, h, h2, dv));
  return g;
}

// ---------- street life (illustrative, except the lamps) ----------
function person(g, x, z, yr, k) {
  const early = yr < 1793, soldier = !early && yr < 1816 && k > 0.6, skirt = !early && !soldier && k < 0.45 && yr < 1925;
  const body = early ? '#6b4a2e' : soldier ? C.red : yr < 1900 ? pick(['#3a3530', '#5a4636', '#6f4034', '#2f4658'], k)
    : yr < 1960 ? pick(['#3a3530', '#6b5a46', '#44627a', '#7a3b3b'], k) : pick(['#b8232f', '#2f6f8f', '#e9b44c', '#3a3530', '#4f7f57', '#8a5fa0'], k);
  if (skirt) cone(g, 6.5, 18, body, x, 0, z);
  else { box(g, 2.4, 9, 2.6, '#2a2f35', x - 1.6, 0, z); box(g, 2.4, 9, 2.6, '#2a2f35', x + 1.6, 0, z); box(g, 7, 10, 4, body, x, 9, z); }
  sph(g, 3.2, '#d9b79a', x, 22, z);
  if (early) return;
  if (soldier) cyl(g, 2.8, 2.8, 6, C.ink, x, 24.5, z);
  else if (!skirt && yr < 1915) { cyl(g, 2.6, 2.6, 6, C.ink, x, 24.5, z); cyl(g, 4.6, 4.6, 0.8, C.ink, x, 24.5, z); }
  else if (yr < 1962) { cyl(g, 4.6, 4.6, 0.8, skirt ? '#7a3b3b' : C.ink, x, 24.5, z); cyl(g, 2.8, 2.8, 2.6, skirt ? '#7a3b3b' : C.ink, x, 25, z); }
  else if (k > 0.7) box(g, 3, 8, 3, '#44627a', x - 5, 10, z);
}
function horse(g, x, z, col) {
  const legs = [];
  box(g, 26, 11, 9, col, x, 12, z); const neck = box(g, 7, 15, 6, col, x + 13, 18, z); neck.rotation.z = -0.5; box(g, 11, 6, 5.5, col, x + 20, 28, z);
  for (const lx of [-10, -5, 6, 11]) { const leg = box(g, 2.6, 13, 2.6, col, x + lx, 0, z + (lx % 2 ? 2.5 : -2.5)); legs.push(leg); }
  box(g, 2, 10, 2, '#3a2c20', x - 14, 9, z);
  return legs;
}
function cart(g, x, z, k) {
  box(g, 30, 9, 16, '#8a5a33', x, 9, z); for (const wx of [-9, 9]) for (const wz of [-9, 9]) wheel(g, 7, x + wx, z + wz, '#3a2c20');
  horse(g, x + 36, z, '#6b4526');
  if (k > 0.5) box(g, 20, 10, 12, '#c79a66', x, 18, z);
}
function car(g, x, z, yr, k) {
  const wheels = (a, b, r) => { for (const wx of [a, b]) for (const wz of [-9.5, 9.5]) wheel(g, r, x + wx, z + wz); };
  if (yr < 1936) { box(g, 36, 9, 17, '#1f2226', x, 6, z); box(g, 18, 13, 16, '#1f2226', x + 5, 15, z); box(g, 12, 7, 16.6, '#cfe0e4', x + 5, 19, z); wheels(-11, 12, 6); }
  else if (yr < 1960) { const c = pick(['#6f2f2f', '#2f5a45', '#d9c9a8', '#2f4658'], k); sph(g, 23, c, x, 11, z, 0.36).scale.z = 9.5; sph(g, 12, c, x, 17, z, 0.6).scale.z = 9; box(g, 16, 5, 18.4, '#cfe0e4', x, 18, z); wheels(-13, 13, 5); }
  else if (yr < 1990) { const c = pick(['#c79a2a', '#7a4a2a', '#3f6f8f', '#b8232f', '#d9d2c2'], k); box(g, 54, 8, 19, c, x, 5, z); box(g, 28, 8, 18, c, x, 13, z); box(g, 22, 6, 18.6, '#cfe0e4', x, 14, z); wheels(-17, 17, 5); }
  else { const c = pick(['#b9bec4', '#f1eee6', '#b8232f', '#3d4750', '#2f6f8f'], k); box(g, 48, 10, 19, c, x, 5, z); box(g, 26, 9, 18, c, x + 2, 15, z); box(g, 20, 7, 18.6, '#cfe0e4', x + 2, 16, z); wheels(-14, 14, 5.5); }
}
function bike(g, x, z, k) {
  for (const wx of [-10, 10]) { const w = put(g, new THREE.TorusGeometry(7, 0.9, 6, 18), mat(C.ink), x + wx, 7, z, 1, 1, 1); w.geometry.userData.own = true; }
  const f = box(g, 20, 1.2, 1.2, C.ink, x, 13, z); f.rotation.z = 0.25;
  box(g, 6, 12, 4, pick(['#b8232f', '#2f6f8f', '#e9b44c'], k), x - 2, 17, z); sph(g, 3.2, '#d9b79a', x - 1, 32, z);
}
function ship(g, x, z, yr, k) {
  if (yr > 1832 && k > 0.5) { // steamer
    box(g, 78, 12, 22, '#2a2f35', x, -4, z); box(g, 46, 12, 18, C.paper, x, 8, z); cyl(g, 4.5, 4.5, 24, C.red, x, 20, z); cyl(g, 4.7, 4.7, 5, C.ink, x, 40, z);
    smoke(g, x, 48, z, 6);
    if (yr < 1900) { const p = cyl(g, 11, 11, 5, '#6b4526', x, 0, z + 13); p.rotation.x = Math.PI / 2; p.position.y = 4; }
  } else { // schooner
    const hull = sph(g, 36, '#4b3a2c', x, 0, z, 0.24); hull.scale.z = 9;
    for (const [mx, mh] of [[-10, 66], [14, 54]]) {
      cyl(g, 0.9, 1.1, mh, C.ink, x + mx, 4, z);
      const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, mh - 12), new THREE.Vector2(19, 0)]);
      const geo = new THREE.ShapeGeometry(s); geo.userData.own = true;
      const sail = new THREE.Mesh(geo, mat(C.paper, { side: THREE.DoubleSide })); sail.position.set(x + mx + 1.5, 12, z); sail.castShadow = true; g.add(sail);
    }
  }
}
function lamp(g, x, z, yr) {
  if (yr < 1883) { cyl(g, 0.9, 1.1, 30, C.ink, x, 0, z); box(g, 6, 8, 6, C.ink, x, 30, z); sph(g, 2.6, new THREE.MeshBasicMaterial({ color: 0xf2c14e }), x, 34, z).castShadow = false; }
  else if (yr < 1950) { // arc lamp: tall wooden pole, long bracket arm, globe hanging from its end (King Street photo, c. 1890)
    cyl(g, 1.3, 1.8, 74, '#5a4332', x, 0, z); const arm = box(g, 26, 1.3, 1.3, '#3a3530', x + 11, 76, z); arm.rotation.z = 0.5; box(g, 0.6, 9, 0.6, '#3a3530', x + 22, 72, z);
    sph(g, 3.6, new THREE.MeshBasicMaterial({ color: 0xfff6d6 }), x + 22, 69, z).castShadow = false; box(g, 12, 1.2, 1.2, '#5a4332', x, 62, z);
  }
  else { cyl(g, 1, 1.2, 62, '#8a9096', x, 0, z); box(g, 18, 1.6, 1.6, '#8a9096', x + 8, 61, z); box(g, 8, 2.4, 4, '#f1eee6', x + 15, 59, z); }
}
const SLL = 96;
const even = n => n + (((n % 2) + 2) % 2);
const gasSlot = even(Math.round(xAt(byId.gaslamps.at) / SLL)), arcSlot = even(Math.round(xAt(byId.arclamps.at) / SLL));
function lifeSlot(j) {
  const g = new THREE.Group(), x = j * SLL, yr = yearAt(x), r = hash(j, 11), k = hash(j, 12), q = hash(j, 13);
  const onLand = yr >= 1861, zWalk = onLand ? Z_SHORE + 40 : Z_SHORE - 30, zKerb = onLand ? Z_SHORE + 70 : Z_SHORE - 8;
  g.position.set(x, 0, 0);
  if (j >= gasSlot && j % 2 === 0) {
    lamp(g, 40, zKerb, yr);
    const first = j === gasSlot ? byId.gaslamps : j === arcSlot ? byId.arclamps : null;
    if (first) label(g, first.title + ' · ' + first.label, 40, 84, zKerb);
  }
  if (!onLand && hash(j, 21) > 0.4) { const f = box(g, 40 + k * 50, 0.6, 3, '#dfeef0', k * 60, -5.4, 90 + hash(j, 22) * 260); f.castShadow = false; } // a line of foam
  if (yr < 1793) { if (r < 0.12) { const c = sph(g, 24, C.wood, 10, -1, zWalk + 14, 0.2); c.scale.z = 6; person(g, 52, zWalk, yr, k); } return g; }
  if (r > 0.25 + dev(yr) * 0.6) return g; // streets get busier as the city grows
  if (!onLand && q < 0.22 && yr > 1800) ship(g, 30, Z_SHORE + 42, yr, k);
  else if (yr < 1925 && q < 0.42) cart(g, 10, zWalk, k);
  else if (yr >= 1908 && q < 0.6) car(g, 30, onLand ? Z_SHORE + 96 : zWalk, yr, k);
  else if ((yr > 1890 && yr < 1905 || yr > 1995) && q < 0.72) bike(g, 30, zWalk + 8, k);
  else { person(g, 24, zWalk, yr, k); if (k > 0.35) person(g, 38, zWalk - 8, yr, hash(j, 14)); if (k > 0.8 && yr > 1850) person(g, 56, zWalk + 6, yr, hash(j, 15)); }
  return g;
}

// Slots are built as they come into view and removed once they are behind.
function dispose(g) {
  g.traverse(o => {
    if (o.geometry && o.geometry.userData.own) o.geometry.dispose();
    if (o.material && !Array.isArray(o.material) && (o.userData.own || (o.material.userData && o.material.userData.own))) { if (o.material.map && o.userData.own) o.material.map.dispose(); o.material.dispose(); }
  });
  scene.remove(g);
}
function makePool(size, build, reach) {
  const live = new Map();
  return function update(camX, t, year) {
    const a = Math.floor((camX - reach) / size), b = Math.ceil((camX + reach) / size);
    for (const [i, g] of live) if (i < a || i > b) { dispose(g); live.delete(i); }
    for (let i = a; i <= b; i++) if (!live.has(i)) { const g = build(i); live.set(i, g); scene.add(g); }
    for (const g of live.values()) if (g.userData.anim) for (const fn of g.userData.anim) fn(t, year);
  };
}
const pools = [makePool(SLF, frontSlot, 1150), makePool(SLB, backSlot, 1500), makePool(SLL, lifeSlot, 1000)];

// ---------- one-off moments ----------
const train = new THREE.Group();
{
  const b = cyl(train, 10, 10, 44, '#1f2226', -6, 0, 0); b.rotation.z = Math.PI / 2; b.position.y = 18;
  box(train, 20, 30, 22, '#1f2226', 24, 6, 0); cyl(train, 5, 3.5, 16, '#1f2226', -20, 26, 0); cone(train, 9, 12, '#1f2226', -36, 4, 0).rotation.z = Math.PI / 2;
  for (const wx of [-18, -2, 22]) for (const wz of [-11, 11]) wheel(train, 8, wx, wz, C.red);
  for (let c = 0; c < 2; c++) { const cx = 70 + c * 66; tbox(train, 58, 26, 22, 'brick', '#7a4a2a', cx, 8, 0); box(train, 60, 3, 24, C.ink, cx, 34, 0); for (const wx of [-18, 18]) for (const wz of [-11, 11]) wheel(train, 5.5, cx + wx, wz); }
  smoke(train, -20, 46, 0, 9);
  label(train, byId.train.title + ' · 16 May ' + byId.train.label, 40, 76, 0);
  train.visible = false; scene.add(train);
}
const blast = new THREE.Group();
{
  const fortX = +Object.keys(landmarkAt).find(i => landmarkAt[i].id === 'fort') * SLF;
  blast.position.set(fortX + 20, 0, Z_FRONT);
  for (let n = 0; n < 7; n++) sph(blast, 16, new THREE.MeshLambertMaterial({ color: 0x46403c, transparent: true }), 0, 0, 0).castShadow = false;
  sph(blast, 26, new THREE.MeshBasicMaterial({ color: 0xf2b233, transparent: true }), 0, 40, 0).castShadow = false;
  blast.visible = false; scene.add(blast);
}

// ---------- the four rides ----------
// Shapes follow the images listed in references.js. Where the reference is a
// black-and-white photograph, the colours are a guess and are flagged there.
const rides = {};
{
  const spin = [], g1 = new THREE.Group(), g2 = new THREE.Group(), g3 = new THREE.Group(), g4 = new THREE.Group();
  const wheels = (g, xs, r, zs) => { for (const x of xs) for (const z of zs) spin.push(wheel(g, r, x, z)); };
  const windows = (g, x0, x1, y, h, n, z, gap) => { const s = gap || 3, w = (x1 - x0 - (n - 1) * s) / n; for (let i = 0; i < n; i++) for (const k of [1, -1]) box(g, w, h, 0.8, '#dfeef0', x0 + w / 2 + i * (w + s), y, k * z); };
  // A clerestory ("monitor") roof: a raised strip along the middle, as on both street railway cars.
  const clerestory = (g, x0, x1, y, w) => {
    const cx = (x0 + x1) / 2, len = x1 - x0;
    box(g, len, 2.5, w, '#3a3530', cx, y, 0); box(g, len * 0.82, 4.5, w * 0.5, '#d9d2c2', cx, y + 2.5, 0); box(g, len * 0.86, 1.6, w * 0.58, '#3a3530', cx, y + 7, 0);
  };
  const crew = (g, x, y, coat) => { box(g, 5, 11, 4.5, coat, x, y, 0); sph(g, 3, '#d9b79a', x, y + 14, 0); cyl(g, 3.3, 3.3, 2.2, C.ink, x, y + 15.6, 0); };

  // Canoe: a birchbark canoe. Pale bark hull, upswept pointed ends, dark gunwales, thwarts across.
  const prof = new THREE.Shape();
  prof.moveTo(0, 20); prof.quadraticCurveTo(5, 4, 22, 2); prof.lineTo(74, 2); prof.quadraticCurveTo(91, 4, 96, 20);
  prof.quadraticCurveTo(89, 11.5, 76, 11); prof.lineTo(20, 11); prof.quadraticCurveTo(7, 11.5, 0, 20);
  const hullGeo = new THREE.ExtrudeGeometry(prof, { depth: 11, bevelEnabled: true, bevelSize: 2.2, bevelThickness: 2.2, bevelSegments: 3 });
  hullGeo.translate(0, 0, -5.5);
  put(g1, hullGeo, mat('#d2a85e'), 0, 0, 0, 1, 1, 1);
  for (const z of [-7.9, 7.9]) box(g1, 60, 1.6, 1.2, '#5a3a22', 48, 10.4, z);
  for (const x of [28, 48, 68]) box(g1, 1.8, 1.2, 15, '#8a6a3a', x, 10, 0);
  box(g1, 8, 13, 7, '#7a5a3a', 46, 9, 0); sph(g1, 4.6, '#c99872', 46, 26, 0); sph(g1, 4.8, '#1f1a16', 45.4, 27.2, 0, 0.8);
  const paddle = new THREE.Group(); paddle.position.set(50, 21, 6); g1.add(paddle);
  box(paddle, 1.8, 32, 1.8, '#c79a66', 0, -30, 0); box(paddle, 5.5, 13, 1.1, '#c79a66', 0, -37, 0);
  rides.canoe = { g: g1, anim: t => { g1.position.y += Math.sin(t * 3) * 1.5 - 7; g1.rotation.z = Math.sin(t * 3 + 1) * 0.02; paddle.rotation.z = -0.5 + Math.sin(t * 5) * 0.45; paddle.rotation.x = 0.35; } };

  // Horsecar: short enclosed body, clerestory roof carried out over open end platforms, driver standing in front.
  box(g2, 64, 2, 24, C.ink, 32, 9, 0);
  box(g2, 44, 12, 24, C.red, 32, 11, 0); box(g2, 44, 17, 24, C.sun, 32, 23, 0);
  windows(g2, 12, 52, 26, 11, 6, 12.2, 2.4);
  for (const x of [1.2, 62.8]) { box(g2, 2, 11, 22, C.red, x, 11, 0); for (const z of [-11, 11]) box(g2, 1.2, 29, 1.2, C.ink, x, 11, z); }
  clerestory(g2, -1, 65, 40, 27);
  crew(g2, 59, 11, '#3a3530');
  wheels(g2, [22, 42], 6, [-10, 10]);
  const legs = horse(g2, 88, 0, C.wood); box(g2, 12, 1.1, 1.1, C.ink, 70, 20, 0);
  rides.horsecar = { g: g2, anim: t => legs.forEach((l, k) => { l.rotation.z = Math.sin(t * 12 + (k % 2) * Math.PI) * 0.6; }) };

  // Electric streetcar: a single-truck closed car. Wheels close together under the middle,
  // clerestory roof, large windows, end platforms, trolley pole trailing up to the wire.
  box(g3, 98, 2, 26, C.ink, 49, 9, 0);
  box(g3, 70, 13, 26, C.red, 49, 11, 0); box(g3, 70, 17, 26, C.paper, 49, 24, 0);
  windows(g3, 16, 82, 27, 12, 7, 13.2);
  for (const x of [5, 93]) { box(g3, 10, 13, 24, C.red, x, 11, 0); for (const z of [-11.5, 11.5]) box(g3, 1.3, 30, 1.3, C.ink, x + (x < 49 ? -4 : 4), 11, z); }
  clerestory(g3, -2, 100, 41, 29);
  const pole = box(g3, 34, 1.3, 1.3, C.ink, 33, 57, 0); pole.rotation.z = -0.5;
  crew(g3, 92, 11, '#2a2f35');
  sph(g3, 2.6, new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 98.6, 17, 0).castShadow = false;
  const fender = box(g3, 11, 1.1, 22, C.ink, 103, 5, 0); fender.rotation.z = 0.35;
  box(g3, 34, 5, 20, '#2a2f35', 49, 4, 0); wheels(g3, [38, 60], 7, [-11, 11]);
  rides.streetcar = { g: g3 };

  // Subway: the 1954 red cars. Red sides, thin yellow lines at the belt and under the roof,
  // grey roof, paired windows, flat end with three windows and a destination sign.
  box(g4, 98, 33, 30, C.red, 49, 10, 0); box(g4, 96, 4, 27, '#7d848a', 49, 43, 0);
  for (const y of [23.4, 40.6]) box(g4, 98.5, 1.1, 30.5, C.sun, 49, y, 0);
  for (const x0 of [8, 34, 60]) windows(g4, x0, x0 + 15, 27, 11, 2, 15.2, 1.6);
  for (const x of [28.5, 54.5, 80.5]) for (const k of [1, -1]) { box(g4, 7, 27, 0.8, '#9a1f29', x, 12, k * 15.2); box(g4, 4, 9, 0.9, '#dfeef0', x, 28, k * 15.3); }
  for (const z of [-9.5, 0, 9.5]) box(g4, 0.8, z ? 11 : 13, 6, '#dfeef0', 98.2, z ? 27 : 25, z);
  box(g4, 0.8, 4, 12, C.ink, 98.3, 39.5, 0);
  for (const z of [-11, 11]) sph(g4, 1.8, new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 98.6, 41, z).castShadow = false;
  box(g4, 6, 5, 8, '#2a2f35', 100, 5, 0); box(g4, 90, 5, 22, '#2a2f35', 49, 5, 0);
  wheels(g4, [16, 30, 68, 82], 6, [-12, 12]);
  rides.subway = { g: g4 };

  rides.spin = spin;
  for (const id of ['canoe', 'horsecar', 'streetcar', 'subway']) { rides[id].g.visible = false; scene.add(rides[id].g); }
}

// ---------- tokens and obstacles (rebuilt when a run starts) ----------
let runGroup = null, tokenRef = null, tokenMeshes = [];
function buildRun(S) {
  if (runGroup) dispose(runGroup);
  runGroup = new THREE.Group(); tokenMeshes = []; tokenRef = S.tokens;
  for (const t of S.tokens || []) {
    const g = new THREE.Group();
    box(g, 40, 26, 3, C.paper, 0, -13, 0); box(g, 40, 7, 3.4, C.red, 0, 6, 0); box(g, 41, 27, 1.6, C.ink, 0, -13.5, 0);
    const l = label(g, t.r.at < 1787 ? 'TRAIL' : t.r.label, 0, -4, 3); l.scale.multiplyScalar(0.62);
    g.position.set(t.d0 + 46, t.high ? 128 : 34, 0);
    runGroup.add(g); tokenMeshes.push(g);
  }
  for (const o of S.obstacles || []) {
    const g = new THREE.Group(), yr = yearAt(o.d0);
    if (yr < 1861) {
      if (o.k < 0.5) { const r = put(g, new THREE.DodecahedronGeometry(20, 0), mat('#6f7a80'), 15, 8, 0, 1, 1.2, 1); r.geometry.userData.own = true; }
      else { const l = cyl(g, 11, 11, 46, '#6b4526', 15, 0, 0); l.rotation.x = Math.PI / 2; l.position.y = 8; }
    } else if (yr < 1954) {
      if (o.k < 0.5) { cyl(g, 13, 13, 34, '#8a5a33', 15, 0, 0); cyl(g, 13.6, 13.6, 3, C.ink, 15, 8, 0); cyl(g, 13.6, 13.6, 3, C.ink, 15, 23, 0); }
      else { box(g, 32, 32, 32, '#c79a66', 16, 0, 0); box(g, 34, 3, 34, '#8a5a33', 16, 14, 0); }
    } else if (o.k < 0.5) { cone(g, 13, 36, '#e8762c', 15, 0, 0); box(g, 30, 2, 30, '#e8762c', 15, 0, 0); cyl(g, 7.4, 9.2, 5, C.paper, 15, 14, 0); }
    else { box(g, 36, 14, 4, C.paper, 17, 16, 0); for (const x of [8, 25]) box(g, 7, 14, 4.4, C.red, x, 16, 0); for (const x of [3, 30]) box(g, 3, 16, 12, C.ink, x, 0, 0); }
    g.position.set(o.d0 + 46, 0, 0);
    runGroup.add(g);
  }
  scene.add(runGroup);
}

// ---------- frame ----------
const banner = document.getElementById('banner');
let skyKey = null;
const col = new THREE.Color();
let lead = 370; // how far ahead of the ride the camera sits
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  const aspect = w / h;
  camera.aspect = aspect;
  // On a tall or square stage (a phone held upright) keep a fixed width of track in view:
  // enough to see what is coming, close enough that the ride is not tiny.
  if (aspect < 1.5) { const half = 300; camera.fov = 2 * Math.atan(half / aspect / 735) * 180 / Math.PI; lead = half * 0.6; }
  else { camera.fov = 40; lead = 370; }
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

YP.view = {
  draw(S, d, yearF) {
    const t = S.state === 'menu' ? performance.now() / 1000 : S.t;
    if ((S.tokens || null) !== tokenRef) buildRun(S);
    const camX = d + lead;
    camera.position.set(camX, 165, 730); camera.lookAt(camX, 132, -70);
    sun.position.set(camX - 420, 760, 520); sun.target.position.set(camX, 0, -120);
    skyRig.position.x = camX;
    for (const c of clouds) c.position.x = ((c.userData.x0 - d * 0.02 + t * 6) % 3600 + 5400) % 3600 - 1800;

    // sky: a CSS gradient behind the transparent canvas, plus matching fog
    const key = Math.floor(yearF * 2);
    if (key !== skyKey) {
      skyKey = key;
      const [top, bot] = sky(yearF), glow = clamp(1 - Math.abs(yearF - 1904.3) / 1.6);
      canvas.style.background = glow > 0
        ? `linear-gradient(rgba(226,96,32,${glow * 0.55}), rgba(226,96,32,${glow * 0.3})), linear-gradient(${top}, ${bot} 62%)`
        : `linear-gradient(${top}, ${bot} 62%)`;
      scene.fog.color.set(bot); if (glow > 0) scene.fog.color.lerp(col.set('#e2743a'), glow * 0.5);
    }
    for (const p of pools) p(camX, t, yearF);

    // the ride
    const id = S.state === 'menu' ? 'canoe' : S.ride;
    for (const k of ['canoe', 'horsecar', 'streetcar', 'subway']) rides[k].g.visible = k === id && !(S.safe > 0 && Math.floor(t * 12) % 2);
    const r = rides[id];
    r.g.position.set(d, S.jy || 0, 0);
    if (r.anim) r.anim(t);
    for (const w of rides.spin) w.rotation.y = -t * 9;

    // tokens
    (S.tokens || []).forEach((tk, i) => {
      const g = tokenMeshes[i];
      g.visible = !tk.got;
      g.position.y = (tk.high ? 128 : 34) + Math.sin(t * 4 + tk.d0) * 4; g.rotation.y = Math.sin(t * 2 + i) * 0.35; g.rotation.z = -0.1;
    });

    // one-off moments
    const tk = (yearF - (byId.train.at - 0.5)) / 1.9;
    train.visible = tk > 0 && tk < 1;
    if (train.visible) { train.position.set(camX + 900 - tk * 1900, 0, Z_SHORE - 62); train.userData.anim.forEach(fn => fn(t)); }
    const bk = (yearF - 1813.25) / 1.2;
    blast.visible = bk > 0 && bk < 1;
    if (blast.visible) blast.children.forEach((m, n) => {
      if (n < 7) { m.position.set(Math.sin(n * 2.4) * 34 * bk, 40 + n * 24 * bk + bk * 70, 0); m.scale.setScalar(16 + n * 5 * bk + bk * 18); m.material.opacity = 0.6 * (1 - bk); }
      else { m.visible = bk < 0.25; m.scale.setScalar(30 * (1 - bk * 3)); }
    });

    // the "now riding" banner
    const show = S.banner && S.state !== 'menu' && S.t < S.banner.until;
    if (banner.hidden === !!show) banner.hidden = !show;
    if (show && banner.textContent !== S.banner.text) banner.textContent = S.banner.text;

    renderer.render(scene, camera);
  }
};
document.getElementById('c').style.visibility = 'hidden'; // 3D is up: retire the 2D canvas
