// The picture behind the home page title: downtown from the lake at dusk, drawn live in 3D
// and then put through a filter so that it reads as an oil painting on canvas.
//
// Real: the shoreline and islands (data/shoreline.js), every building footprint and its
// height where one is recorded (data/buildings.js), the CN Tower's position and height.
// Not real: the sky, the light, the colours, the brushwork and the maple leaves blowing past.
// It is a painted LOOK made by a filter. It is not a period painting and copies none.
import * as THREE from 'three';

const YP = window.YP, D = YP.SHORE, B = YP.BUILDINGS;
const canvas = document.getElementById('hero-gl'), band = canvas.parentElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
const coarse = matchMedia('(max-width: 820px), (pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2));

let s = 7; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

const HORIZON = 0xd9955a;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x3b1d1a);
scene.fog = new THREE.Fog(HORIZON, 2500, 16000);
const camera = new THREE.PerspectiveCamera(30, 2, 5, 60000);
scene.add(new THREE.HemisphereLight(0xffc89a, 0x3a2a26, 1.35));
const sun = new THREE.DirectionalLight(0xffb070, 2.3);
sun.position.set(-6000, 900, -2500); // low in the west
scene.add(sun);

// ---------- sky: a painted backdrop that drifts ----------
function paint(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const skyTex = paint(2048, 1024, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2f4148'); g.addColorStop(0.28, '#56686a'); g.addColorStop(0.5, '#a08a78'); g.addColorStop(0.68, '#d08e5a');
  g.addColorStop(0.84, '#eab873'); g.addColorStop(0.95, '#f3dba0'); g.addColorStop(1, '#ecc98c');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  // clouds: banks of short, flat strokes, lit from below. Drawn twice so the texture wraps.
  for (let i = 0; i < 46; i++) {
    const cx = rnd() * w, cy = h * (0.12 + rnd() * 0.62), len = 120 + rnd() * 420, deep = cy / h;
    for (let k = 0; k < 26; k++) {
      const px = cx + (rnd() - 0.5) * len, py = cy + (rnd() - 0.5) * len * 0.16, rw = 30 + rnd() * 110, rh = 5 + rnd() * 16;
      const lit = py > cy; // undersides catch the low sun
      x.fillStyle = lit ? `rgba(${246 - deep * 10 | 0}, ${168 + deep * 50 | 0}, ${118 + deep * 50 | 0}, ${0.12 + rnd() * 0.2})` : `rgba(${74 + deep * 70 | 0}, ${66 + deep * 30 | 0}, ${78 - deep * 10 | 0}, ${0.1 + rnd() * 0.18})`;
      for (const off of [-w, 0, w]) { x.beginPath(); x.ellipse(px + off, py, rw, rh, (rnd() - 0.5) * 0.2, 0, 7); x.fill(); }
    }
  }
});
const sky = new THREE.Mesh(new THREE.PlaneGeometry(90000, 11500), new THREE.MeshBasicMaterial({ map: skyTex, fog: false, depthWrite: false }));
sky.position.set(0, 5300, -24000); sky.renderOrder = -1;
scene.add(sky);

// ---------- water: flat strokes of lake colour and reflected sky, sliding slowly ----------
const waterTex = paint(512, 512, (x, w, h) => {
  x.fillStyle = '#356a6c'; x.fillRect(0, 0, w, h);
  const cols = ['#24525a', '#3f7a7a', '#5b9590', '#8fb8aa', '#d9a468', '#f0cd8c'];
  for (let i = 0; i < 900; i++) {
    const c = cols[Math.min(cols.length - 1, Math.floor(Math.pow(rnd(), 1.6) * cols.length))];
    const px = rnd() * w, py = rnd() * h, rw = 8 + rnd() * 38, rh = 1.2 + rnd() * 3.2;
    x.fillStyle = c; x.globalAlpha = 0.35 + rnd() * 0.45;
    for (const ox of [-w, 0, w]) { x.beginPath(); x.ellipse(px + ox, py, rw, rh, 0, 0, 7); x.fill(); }
  }
});
waterTex.repeat.set(70, 70);
const water = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshLambertMaterial({ map: waterTex, color: 0xffffff }));
water.rotation.x = -Math.PI / 2;
scene.add(water);

// ---------- land and islands, as low dark slabs ----------
const LAND_H = 6;
function slab(points, color) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(points.map(p => new THREE.Vector2(p[0], p[1]))), { depth: LAND_H, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  scene.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color })));
}
const first = D.shore[0], last = D.shore[D.shore.length - 1], north = (D.box.n - D.origin.lat) * D.metresPerDegree.lat;
slab(D.shore.concat([[last[0], north], [first[0], north]]), 0x4a3326);
for (const ring of D.islands) slab(ring, 0x3d4a30);

// ---------- buildings: one merged mesh; each gets one of a few earth pigments ----------
if (B) {
  const PIGMENTS = [0xb98a5e, 0xa5633f, 0x8a5a44, 0xc9a070, 0x7d6a62, 0x9c7b62, 0x6f5850].map(h => new THREE.Color(h));
  const pos = [], col = [];
  for (const [, height, flat] of B.items) {
    const n = flat.length / 2, y0 = LAND_H, y1 = LAND_H + height, ring = [], c = PIGMENTS[Math.floor(rnd() * PIGMENTS.length)], from = pos.length;
    for (let i = 0; i < n; i++) ring.push(new THREE.Vector2(flat[i * 2], flat[i * 2 + 1]));
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      pos.push(a.x, y0, -a.y, b.x, y0, -b.y, b.x, y1, -b.y, a.x, y0, -a.y, b.x, y1, -b.y, a.x, y1, -a.y);
    }
    for (const tri of THREE.ShapeUtils.triangulateShape(ring, [])) for (const i of tri) pos.push(ring[i].x, y1, -ring[i].y);
    for (let i = from; i < pos.length; i += 3) col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
}
// CN Tower marker: position and 553.33 m height are real, the shape is simplified (as on the shoreline page)
{
  const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color: 0x8a6a5c });
  const part = (rTop, rBot, y0, y1) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, y1 - y0, 16), mat); c.position.y = (y0 + y1) / 2; g.add(c); };
  part(10, 26, 0, 335); part(24, 18, 335, 362); part(6, 9, 362, 450); part(1.5, 4, 450, 553.33);
  g.position.set((-79.3871 - D.origin.lon) * D.metresPerDegree.lon, LAND_H, -(43.6426 - D.origin.lat) * D.metresPerDegree.lat);
  scene.add(g);
}

// ---------- maple leaves on the wind ----------
const PTS = [50, 2, 57, 17, 65, 13, 61, 37, 75, 25, 78, 34, 92, 31, 87, 45, 96, 52, 73, 68, 76, 78, 53, 74, 54, 98, 46, 98, 47, 74, 24, 78, 27, 68, 4, 52, 13, 45, 8, 31, 22, 34, 25, 25, 39, 37, 35, 13, 43, 17];
// The outline is the site's leaf with its edges drawn as shallow curves and a thin bent stalk,
// so it reads as a brushed shape rather than a cut-out logo.
const P = [];
for (let i = 0; i < PTS.length; i += 2) P.push([(PTS[i] - 50) / 100, (50 - PTS[i + 1]) / 100]);
P.splice(12, 2, [0.012, -0.3], [0.05, -0.47], [0.028, -0.485], [-0.012, -0.3]); // the square stalk becomes a tapering, bent one
const shape = new THREE.Shape();
shape.moveTo(P[0][0], P[0][1]);
for (let i = 1; i <= P.length; i++) {
  const a = P[i - 1], b = P[i % P.length], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(mx, my) || 1;
  shape.quadraticCurveTo(mx - mx / len * 0.014, my - my / len * 0.014, b[0], b[1]); // each edge sags a little toward the middle
}
// The leaf is painted, not coloured in: strokes laid from the stalk out along each lobe, wet reds over
// a dark ground, ochre where the lobes thin out, pale veins dragged through last.
const leafTex = paint(512, 512, (x, w) => {
  const X = u => (u + 0.5) * w, Y = v => (0.5 - v) * w, base = [0, -0.24];
  const tips = [[0, 0.48], [0.42, 0.19], [0.46, -0.02], [0.26, -0.28], [-0.42, 0.19], [-0.46, -0.02], [-0.26, -0.28], [0.15, 0.37], [-0.15, 0.37]];
  x.fillStyle = '#7d1519'; x.fillRect(0, 0, w, w);
  const reds = ['#8f171b', '#b01d1e', '#c8261f', '#d93422', '#e04a26', '#a01a1c'], warm = ['#e2702a', '#e89236', '#d5552a'];
  x.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const t = tips[Math.floor(rnd() * tips.length)], k0 = rnd() * 0.85, k1 = Math.min(1.08, k0 + 0.12 + rnd() * 0.3), j = (rnd() - 0.5) * 0.16;
    const px = k => base[0] + (t[0] - base[0]) * k - (t[1] - base[1]) * j, py = k => base[1] + (t[1] - base[1]) * k + (t[0] - base[0]) * j;
    x.strokeStyle = k1 > 0.86 && rnd() < 0.4 ? warm[Math.floor(rnd() * warm.length)] : reds[Math.floor(rnd() * reds.length)];
    x.globalAlpha = 0.35 + rnd() * 0.5; x.lineWidth = 5 + rnd() * 14;
    x.beginPath(); x.moveTo(X(px(k0)), Y(py(k0))); x.lineTo(X(px(k1)), Y(py(k1))); x.stroke();
  }
  // veins: a pale loaded line to each lobe tip, with a few side veins
  x.globalAlpha = 0.6;
  tips.slice(0, 7).forEach(t => {
    x.strokeStyle = '#f0b060'; x.lineWidth = 3.2;
    x.beginPath(); x.moveTo(X(base[0]), Y(base[1])); x.quadraticCurveTo(X((base[0] + t[0]) / 2 + t[1] * 0.03), Y((base[1] + t[1]) / 2), X(t[0] * 0.93), Y(base[1] + (t[1] - base[1]) * 0.93)); x.stroke();
    x.lineWidth = 1.5; x.strokeStyle = '#e59a52';
    for (const k of [0.35, 0.55, 0.72]) for (const side of [-1, 1]) {
      const vx = base[0] + (t[0] - base[0]) * k, vy = base[1] + (t[1] - base[1]) * k, dx = t[0] - base[0], dy = t[1] - base[1];
      x.beginPath(); x.moveTo(X(vx), Y(vy)); x.lineTo(X(vx + dx * 0.16 - dy * 0.14 * side), Y(vy + dy * 0.16 + dx * 0.14 * side)); x.stroke();
    }
  });
  x.strokeStyle = '#6b3a22'; x.lineWidth = 9; x.globalAlpha = 1; // the stalk
  x.beginPath(); x.moveTo(X(0), Y(-0.24)); x.quadraticCurveTo(X(0.01), Y(-0.38), X(0.04), Y(-0.49)); x.stroke();
  x.globalAlpha = 1;
});
leafTex.offset.set(0.5, 0.5); // the shape runs from -0.5 to 0.5; the painting from 0 to 1
const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, emissiveMap: leafTex, emissive: 0x808080, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, fog: false });
const big = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 }), leafMat);
const rig = new THREE.Group(); // leaves live in camera space, so they keep their place in the frame
camera.add(rig); scene.add(camera);
rig.add(big);
const N = coarse ? 12 : 22, small = new THREE.InstancedMesh(new THREE.ShapeGeometry(shape), leafMat, N), drift = [];
for (let i = 0; i < N; i++) drift.push({ x: rnd(), y: rnd(), z: 6 + rnd() * 22, size: 0.25 + rnd() * 0.45, spin: 0.4 + rnd() * 1.2, phase: rnd() * 6.28, speed: 0.012 + rnd() * 0.02 });
// each small leaf is glazed a little differently: full red, orange, or going brown
const TINTS = [0xffffff, 0xffe0b8, 0xfff0d8, 0xe8c0a8, 0xffffff], tint = new THREE.Color();
for (let i = 0; i < N; i++) small.setColorAt(i, tint.setHex(TINTS[i % TINTS.length]));
small.frustumCulled = false;
rig.add(small);
const leafLight = new THREE.PointLight(0xffc48a, 30, 0, 1.6);
leafLight.position.set(-3, 2, -4); rig.add(leafLight);
const dummy = new THREE.Object3D();

// ---------- the paint: the 3D picture is drawn small, then repainted ----------
// A Kuwahara filter turns each neighbourhood into its flattest quarter, which gives flat dabs with
// hard edges, like a loaded brush. Then: ridges where dabs meet, canvas weave, and an aged varnish.
const target = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true });
const post = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: target.texture }, texel: { value: new THREE.Vector2() }, size: { value: new THREE.Vector2() } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse; uniform vec2 texel; uniform vec2 size; varying vec2 vUv;
    const int R = 3;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
    void quarter(vec2 from, out vec3 mean, out float spread) {
      vec3 sum = vec3(0.0), sq = vec3(0.0);
      for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
        vec3 c = texture2D(tDiffuse, vUv + (from + vec2(float(i), float(j))) * texel).rgb; sum += c; sq += c * c;
      }
      float n = float((R + 1) * (R + 1));
      mean = sum / n; vec3 v = abs(sq / n - mean * mean); spread = v.r + v.g + v.b;
    }
    void main() {
      vec3 m, best; float sp, low = 1e9;
      quarter(vec2(-float(R), -float(R)), m, sp); if (sp < low) { low = sp; best = m; }
      quarter(vec2(0.0, -float(R)), m, sp); if (sp < low) { low = sp; best = m; }
      quarter(vec2(-float(R), 0.0), m, sp); if (sp < low) { low = sp; best = m; }
      quarter(vec2(0.0, 0.0), m, sp); if (sp < low) { low = sp; best = m; }
      vec3 c = pow(best, vec3(1.0 / 2.2)); // the small picture is in linear light
      vec2 px = vUv * size;
      // impasto: a ridge of light and shade where one dab meets the next
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c += clamp((dFdx(l) - dFdy(l)) * 2.2, -0.09, 0.09);
      // bristle marks along the stroke, and the weave of the canvas showing through
      c *= 0.95 + 0.1 * noise(vec2(px.x * 0.035, px.y * 0.28));
      c *= 0.975 + 0.05 * (sin(px.x * 1.9) * sin(px.y * 1.9));
      // old varnish: warm, a little faded, blacks lifted, corners gone dark
      c = mix(c, vec3(l) * vec3(1.1, 0.97, 0.76), 0.12);
      c = c * 0.9 + vec3(0.055, 0.04, 0.025);
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.55;
      gl_FragColor = vec4(c, 1.0);
    }`,
  depthTest: false, depthWrite: false
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post), postScene = new THREE.Scene(), postCam = new THREE.Camera();
quad.frustumCulled = false; postScene.add(quad);

let W = 0, H = 0, time = 0, lastTs = 0, onScreen = true, dirty = true;
function draw() {
  const wide = camera.aspect > 1.15, sway = Math.sin(time * 0.07);
  camera.position.set(700 + sway * 260, 150 + Math.sin(time * 0.05) * 18, 4300);
  camera.lookAt(wide ? -1700 : -650, wide ? 150 : 300, -900);
  skyTex.offset.x = time * 0.0016; // clouds drift east
  waterTex.offset.set(time * 0.004, -time * 0.006);
  // the large leaf sits where the title leaves room: right of centre when wide, upper right on a phone
  const halfH = Math.tan(camera.fov * Math.PI / 360) * 9, halfW = halfH * camera.aspect;
  big.position.set(wide ? halfW * 0.6 : halfW * 0.5, (wide ? 0.42 : 0.62) * halfH + Math.sin(time * 0.5) * 0.1, -9);
  big.scale.setScalar(wide ? halfH * 0.62 : halfW * 0.55);
  big.rotation.set(-0.4 + Math.sin(time * 0.33) * 0.15, 0.2 + Math.sin(time * 0.21) * 0.45, 0.3 + Math.sin(time * 0.27) * 0.12); // never edge-on
  for (let i = 0; i < N; i++) {
    const d = drift[i], hh = Math.tan(camera.fov * Math.PI / 360) * d.z, hw = hh * camera.aspect;
    const u = ((d.x + time * d.speed) % 1 + 1) % 1; // 0..1 across the frame, left to right
    dummy.position.set((u * 2.4 - 1.2) * hw, (d.y * 1.6 - 0.6) * hh - u * hh * 0.35 + Math.sin(time * 0.8 + d.phase) * 0.25, -d.z);
    dummy.rotation.set(time * d.spin + d.phase, time * d.spin * 0.7, d.phase + time * 0.3);
    dummy.scale.setScalar(d.size);
    dummy.updateMatrix(); small.setMatrixAt(i, dummy.matrix);
  }
  small.instanceMatrix.needsUpdate = true;
  renderer.setRenderTarget(target); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
}
function resize() {
  W = canvas.clientWidth; H = canvas.clientHeight;
  if (!W || !H) return;
  renderer.setSize(W, H, false);
  camera.aspect = W / H; camera.updateProjectionMatrix();
  // The picture is painted at about 520 px across whatever the screen, so the dabs stay brush-sized.
  const k = Math.min(1, 520 / Math.min(W, H)), tw = Math.max(2, Math.round(W * k)), th = Math.max(2, Math.round(H * k));
  target.setSize(tw, th);
  post.uniforms.texel.value.set(1 / tw, 1 / th);
  post.uniforms.size.value.set(W, H);
  dirty = true;
}
new ResizeObserver(resize).observe(canvas);
new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(band);
window.addEventListener('yp-motion', () => { dirty = true; });
resize();
band.classList.add('live');
document.getElementById('hero-note').hidden = false;
renderer.setAnimationLoop(ts => {
  const dt = Math.min(0.5, (ts - lastTs) / 1000); lastTs = ts;
  const moving = onScreen && !document.documentElement.classList.contains('still');
  if (moving) time += dt;
  if (moving || dirty) { draw(); dirty = false; }
});
YP.hero = { scene, camera };
