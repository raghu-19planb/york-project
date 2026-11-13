// Writes the data Blender needs to render "Same place, three moments": node tools/blender/export-moments.js <out.json>
//
// One grid over the harbour view, a point every 12.5 m, with for each of the three moments: the height of the
// ground above the lake (decimetres, negative under water), what each point is (0 land, 1 water, 2 marsh) and
// how near it is to land (for the colour of the shallows).
//   first: the ground of the c.1700 world. The rules that make it (earliest map per spot, the lake no early map
//          drew, the sandbar joined) live in world1700.js; that block of code is run here as it stands, so the
//          picture and the 3D world cannot disagree.
//   city:  William Chewett's map of 1834 (data/history.js), over today's heights.
//   today: today's shore (data/shoreline.js), over today's heights, with a mark where the land was water or
//          marsh at first, and a mark on today's main roads (data/today.js).
// Also the building footprints inside the view and the 1834 city limits.
//
// The sources say land or water point by point. To draw a shore and not a staircase, each moment's land is
// blurred a little (25 m) and the water's edge is taken where the blur is half: the same shore, without steps.
// Nothing narrower than about 50 m survives that, and nothing finer was in the 50 m ground to begin with.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..'), out = process.argv[2];
if (!out) { console.error('usage: node tools/blender/export-moments.js <out.json>'); process.exit(1); }
global.window = {}; global.YP = window.YP = {};
for (const f of ['terrain', 'history', 'shoreline', 'boundaries', 'buildings', 'today']) require(path.join(root, 'data', f + '.js'));
const T = YP.TERRAIN, F = { x0: -3100, x1: 4650, y0: -2850, y1: 3300 }, STEP = 12.5;

// ---- the c.1700 ground, by the 3D world's own code ----
const src = fs.readFileSync(path.join(root, 'world1700.js'), 'utf8').replace(/\r\n/g, '\n');
const a = src.indexOf('const { box, cell, nx, ny, maskCell, maskNx, maskNy } = T;'), b = src.indexOf('\n// What something standing or floating', a);
if (a < 0 || b < 0) throw new Error('the ground block of world1700.js was not found');
const ground = new Function('T', 'clamp', src.slice(a, b) + '\nreturn { hs, lake, lone, rawAt, kind: T.kind };')(T, (v, lo, hi) => Math.max(lo, Math.min(hi, v)));
const { box, maskCell, maskNx, maskNy } = T;
const markAt = (i, j) => { const n = j * maskNx + i; return +ground.kind[n] === 2 ? 2 : (+ground.kind[n] === 1 || ground.lone[n]) ? 1 : 0; };
const firstAt = (x, y) => { // how dry and how marshy the first ground is here, each 0 to 1, between its 50 m marks
  const fx = Math.max(0, Math.min(maskNx - 1.001, (x - box.x0) / maskCell)), fy = Math.max(0, Math.min(maskNy - 1.001, (y - box.y0) / maskCell)), i = Math.floor(fx), j = Math.floor(fy), kx = fx - i, ky = fy - j;
  const mix = f => (f(i, j) * (1 - kx) + f(i + 1, j) * kx) * (1 - ky) + (f(i, j + 1) * (1 - kx) + f(i + 1, j + 1) * kx) * ky;
  return [mix((p, q) => markAt(p, q) === 1 ? 0 : 1), mix((p, q) => markAt(p, q) === 2 ? 1 : 0)];
};

// ---- polygons ----
const inside = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const p = r[i], q = r[j]; if ((p[1] > y) !== (q[1] > y) && x < (q[0] - p[0]) * (y - p[1]) / (q[1] - p[1]) + p[0]) c = !c; } return c; };
const boxed = rings => rings.filter(r => r.length > 2).map(r => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } return { r, x0, x1, y0, y1 }; });
const inAny = (x, y, list) => list.some(b => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1 && inside(x, y, b.r));
const m34 = YP.HISTORY.maps.find(m => +m.year === 1834), marsh34 = boxed(m34.marsh);
// The 1834 lake is closed off by a straight cut across the sheet's south-east corner. That cut is the edge of the
// tracing, not a shore, so the corner beyond it is lake too.
const lake34 = m34.water[0], cutA = lake34[lake34.length - 2], cutB = lake34[lake34.length - 1], corner = [cutA, cutB, [m34.box[2], m34.box[1]]];
if (Math.abs(cutA[0] - m34.box[2]) > 3 || Math.abs(cutB[1] - m34.box[1]) > 3) throw new Error('the 1834 lake no longer ends on the corner cut');
const water34 = boxed(m34.water.concat([corner]));
const S = YP.SHORE, s0 = S.shore[0], s1 = S.shore[S.shore.length - 1], north = F.y1 + 400;
const land = boxed([S.shore.concat([[s1[0] + 400, s1[1]], [s1[0] + 400, north], [s0[0] - 400, north], [s0[0] - 400, s0[1]]])].concat(S.islands));

const nx = Math.round((F.x1 - F.x0) / STEP) + 1, ny = Math.round((F.y1 - F.y0) / STEP) + 1, N = nx * ny;
function blur(a, sigma) { // a soft average, the same in every direction
  const r = Math.ceil(sigma * 2.6), k = []; let sum = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * sigma * sigma)); k.push(v); sum += v; }
  const t = new Float32Array(N), o = new Float32Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0; for (let d = -r; d <= r; d++) s += a[j * nx + Math.max(0, Math.min(nx - 1, i + d))] * k[d + r]; t[j * nx + i] = s / sum; }
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let s = 0; for (let d = -r; d <= r; d++) s += t[Math.max(0, Math.min(ny - 1, j + d)) * nx + i] * k[d + r]; o[j * nx + i] = s / sum; }
  return o;
}
const ease = v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); };
function moment(dryAt, marshAt, heightAt) {
  const dry = new Float32Array(N), bog = new Float32Array(N), h = new Float32Array(N);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const n = j * nx + i, x = F.x0 + i * STEP, y = F.y0 + j * STEP; dry[n] = dryAt(x, y); bog[n] = marshAt(x, y); h[n] = heightAt(x, y); }
  const near = blur(dry, 2), wide = blur(dry, 14), wet = blur(bog, 2);
  const z = new Int16Array(N), kind = new Uint8Array(N), shallow = new Uint8Array(N);
  for (let n = 0; n < N; n++) {
    const isLand = near[n] >= 0.5, isMarsh = isLand && wet[n] > 0.5;
    kind[n] = isMarsh ? 2 : isLand ? 0 : 1;
    const up = isMarsh ? 0.3 : 0.15 + (Math.max(h[n], 0.9) - 0.15) * ease((near[n] - 0.5) / 0.3);   // the beach climbs from the water's edge
    const down = -(0.3 + 7 * ease((0.5 - wide[n]) / 0.5));                                           // the bed falls away from the shore
    z[n] = Math.round((isLand ? up : down) * 10); shallow[n] = Math.round(Math.max(0, Math.min(1, wide[n] * 2)) * 255);
  }
  return { z, kind, shallow };
}
const first = moment((x, y) => firstAt(x, y)[0], (x, y) => firstAt(x, y)[1], (x, y) => ground.rawAt(x, y));
const city = moment((x, y) => inAny(x, y, water34) && !inAny(x, y, marsh34) ? 0 : 1, (x, y) => inAny(x, y, marsh34) ? 1 : 0, (x, y) => ground.rawAt(x, y));
const today = moment((x, y) => inAny(x, y, land) ? 1 : 0, () => 0, (x, y) => ground.rawAt(x, y));
today.made = new Uint8Array(N); for (let n = 0; n < N; n++) today.made[n] = today.kind[n] === 0 && first.kind[n] !== 0 ? 1 : 0;
// today's main roads, marked on the grid: 2 for motorways, 1 for the other main roads
today.road = new Uint8Array(N);
for (const r of YP.TODAY.roads) { const big = r.cls === 'motorway' || r.cls === 'trunk', wide = big ? 1 : 0;
  for (const l of r.lines) for (let k = 1; k < l.length; k++) { const p = l[k - 1], q = l[k], L = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    for (let s = 0; s <= L; s += 6) { const i = Math.round((p[0] + (q[0] - p[0]) * s / L - F.x0) / STEP), j = Math.round((p[1] + (q[1] - p[1]) * s / L - F.y0) / STEP);
      for (let dj = -wide; dj <= wide; dj++) for (let di = -wide; di <= wide; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < nx && jj < ny) today.road[jj * nx + ii] = Math.max(today.road[jj * nx + ii], big ? 2 : 1); } } } }

const pack = m => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, Array.from(v)]));
const B = YP.BUILDINGS, buildings = B.items.filter(it => { const f = it[2]; for (let i = 0; i < f.length; i += 2) if (f[i] < F.x0 || f[i] > F.x1 || f[i + 1] < F.y0 || f[i + 1] > F.y1) return false; return f.length >= 6; }).map(it => [it[0], it[1] || B.defaultHeight, it[2]]);
const limits = YP.BOUNDARIES.annexations.find(x => +x.num === 1).rings;
fs.writeFileSync(out, JSON.stringify({ F, step: STEP, nx, ny, first: pack(first), city: pack(city), today: pack(today), buildings, limits }));
const count = (a, v) => a.reduce((s, k) => s + (k === v), 0);
console.log('grid', nx, 'x', ny, '| first land/water/marsh', count(first.kind, 0), count(first.kind, 1), count(first.kind, 2), '| city', count(city.kind, 0), count(city.kind, 1), count(city.kind, 2), '| today land', count(today.kind, 0), 'made', count(today.made, 1), '(' + Math.round(count(today.made, 1) * STEP * STEP / 10000) + ' ha) | buildings', buildings.length);
