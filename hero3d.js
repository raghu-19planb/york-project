// The picture behind the home page title: downtown from the lake at dusk, drawn live in 3D.
//
// Real: the shoreline and islands (data/shoreline.js), every building footprint and its
// height where one is recorded (data/buildings.js), the CN Tower's position and height.
// Not real: the light, the colours, and the maple leaves blowing past. They are decoration.
import * as THREE from 'three';

const YP = window.YP, D = YP.SHORE, B = YP.BUILDINGS;
const canvas = document.getElementById('hero-gl'), band = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
const coarse = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

const HORIZON = 0xc8602f;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(HORIZON, 2500, 15000);
const camera = new THREE.PerspectiveCamera(30, 2, 5, 40000);
scene.add(new THREE.HemisphereLight(0xffb27a, 0x2a1512, 1.25));
const sun = new THREE.DirectionalLight(0xff9a52, 2.4);
sun.position.set(-6000, 900, -2500); // low in the west
scene.add(sun);

// water: a dark sheet that fades into the horizon colour
const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshLambertMaterial({ color: 0x1d4a50 }));
water.rotation.x = -Math.PI / 2;
scene.add(water);

// land and islands, as low dark slabs
const LAND_H = 6;
function slab(points, color) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1]))), { depth: LAND_H, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color })));
}
const first = D.shore[0], last = D.shore[D.shore.length - 1], north = (D.box.n - D.origin.lat) * D.metresPerDegree.lat;
slab(D.shore.concat([[last[0], north], [first[0], north]]), 0x2a1a17);
for (const ring of D.islands) slab(ring, 0x1f2a22);

// buildings: one merged mesh, flat-shaded so the low sun picks out the west faces
if (B) {
  const pos = [];
  for (const [, height, flat] of B.items) {
    const n = flat.length / 2, y0 = LAND_H, y1 = LAND_H + height, ring = [];
    for (let i = 0; i < n; i++) ring.push(new THREE.Vector2(flat[i * 2], flat[i * 2 + 1]));
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      pos.push(a.x, y0, -a.y, b.x, y0, -b.y, b.x, y1, -b.y, a.x, y0, -a.y, b.x, y1, -b.y, a.x, y1, -a.y);
    }
    for (const tri of THREE.ShapeUtils.triangulateShape(ring, [])) for (const i of tri) pos.push(ring[i].x, y1, -ring[i].y);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0xa9705c, side: THREE.DoubleSide })));
}
// CN Tower marker: position and 553.33 m height are real, the shape is simplified (as on the shoreline page)
{
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0x7a4f44 });
  const part = (rTop, rBot, y0, y1) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, 16), mat); c.position.y = (y0 + y1) / 2; g.add(c); };
  part(10, 26, 0, 335); part(24, 18, 335, 362); part(6, 9, 362, 450); part(1.5, 4, 450, 553.33);
  g.position.set((-79.3871 - D.origin.lon) * D.metresPerDegree.lon, LAND_H, -(43.6426 - D.origin.lat) * D.metresPerDegree.lat);
  scene.add(g);
}

// maple leaves on the wind
const PTS = [50, 2, 57, 17, 65, 13, 61, 37, 75, 25, 78, 34, 92, 31, 87, 45, 96, 52, 73, 68, 76, 78, 53, 74, 54, 98, 46, 98, 47, 74, 24, 78, 27, 68, 4, 52, 13, 45, 8, 31, 22, 34, 25, 25, 39, 37, 35, 13, 43, 17];
const shape = new THREE.Shape();
for (let i = 0; i < PTS.length; i += 2) shape[i ? 'lineTo' : 'moveTo']((PTS[i] - 50) / 100, (50 - PTS[i + 1]) / 100);
const leafMat = new THREE.MeshStandardMaterial({ color: 0xc21f2e, roughness: 0.6, metalness: 0, side: THREE.DoubleSide, fog: false, emissive: 0x3a0508 });
const big = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }), leafMat);
const rig = new THREE.Group(); // leaves live in camera space, so they keep their place in the frame
camera.add(rig); scene.add(camera);
rig.add(big);
const N = coarse ? 14 : 26, small = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape), leafMat, N), drift = [];
let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
for (let i = 0; i < N; i++) drift.push({ x: rnd(), y: rnd(), z: 6 + rnd() * 22, size: 0.25 + rnd() * 0.45, spin: 0.4 + rnd() * 1.2, phase: rnd() * 6.28, speed: 0.012 + rnd() * 0.02 });
small.frustumCulled = false;
rig.add(small);
const leafLight = new THREE.PointLight(0xffc48a, 30, 0, 1.6);
leafLight.position.set(-3, 2, -4); rig.add(leafLight);
const dummy = new THREE.Object3D();

let W = 0, H = 0, time = 0, lastTs = 0, onScreen = true, dirty = true;
function draw() {
  const wide = camera.aspect > 1.15, sway = Math.sin(time * 0.07);
  camera.position.set(700 + sway * 260, 150 + Math.sin(time * 0.05) * 18, 4300);
  camera.lookAt(wide ? -1700 : -650, wide ? 150 : 300, -900);
  // the large leaf sits where the title leaves room: right of centre when wide, upper right on a phone
  const halfH = Math.tan(camera.fov * Math.PI / 360) * 9, halfW = halfH * camera.aspect;
  big.position.set(wide ? halfW * 0.6 : halfW * 0.5, (wide ? 0.42 : 0.62) * halfH + Math.sin(time * 0.5) * 0.1, -9);
  big.scale.setScalar(wide ? halfH * 0.62 : halfW * 0.55);
  big.rotation.set(-0.5 + Math.sin(time * 0.33) * 0.15, 0.5 + Math.sin(time * 0.21) * 0.6, 0.35 + Math.sin(time * 0.27) * 0.12);
  for (let i = 0; i < N; i++) {
    const d = drift[i], hh = Math.tan(camera.fov * Math.PI / 360) * d.z, hw = hh * camera.aspect;
    const u = ((d.x + time * d.speed) % 1 + 1) % 1; // 0..1 across the frame, left to right
    dummy.position.set((u * 2.4 - 1.2) * hw, (d.y * 1.6 - 0.6) * hh - u * hh * 0.35 + Math.sin(time * 0.8 + d.phase) * 0.25, -d.z);
    dummy.rotation.set(time * d.spin + d.phase, time * d.spin * 0.7, d.phase + time * 0.3);
    dummy.scale.setScalar(d.size);
    dummy.updateMatrix(); small.setMatrixAt(i, dummy.matrix);
  }
  small.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  if (!W || !H) return;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  dirty = true;
}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(band);
window.addEventListener('yp-motion', () => { dirty = true; });
resize();
band.classList.add('live');
document.getElementById('hero-note').hidden = false;
renderer.setAnimationLoop(ts => {
  const dt = Math.min(0.1, (ts - lastTs) / 1000); lastTs = ts;
  const moving = onScreen && !document.documentElement.classList.contains('still');
  if (moving) time += dt;
  if (moving || dirty) { draw(); dirty = false; }
});
YP.hero = { scene, camera };
