// Builds data/terrain.js: ground heights for the c.1700 world, and which cells were water or marsh
// on the earliest map that covers them.
//
//   node tools/build-terrain.js            fetches the elevation tiles
//   node tools/build-terrain.js <folder>   uses tiles saved as <z>-<x>-<y>.png in that folder
//
// Heights: Mapzen / Tilezen terrain tiles in "terrarium" encoding, served from the AWS Open Data
// registry (https://registry.opendata.aws/terrain-tiles/). For this area they are built from
// Canadian and US government elevation models. They show TODAY's ground, including land made
// since 1700, so they are corrected with the maps:
// Water and marsh: data/history.js (University of Toronto, Historical Hydrography of Toronto,
// CC BY-SA 4.0). Each cell takes the earliest map that covers it: Chewett 1802, then Chewett 1834,
// then Browne 1851. Nothing mapped in 1700 exists in that data, so 1802 is the nearest there is.
// Where a map says water, the ground is pushed below lake level; where it says land but today's
// model is at lake level (the peninsula has moved), it is lifted just above it.
//
// Output grid is in the same metres-from-origin frame as the other data files.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const vm = require('vm');

const ORIGIN = { lat: 43.635, lon: -79.378 }; // must match build-shoreline.js
const MX = Math.cos(ORIGIN.lat * Math.PI / 180) * 111320, MY = 110574;
const BOX = { x0: -11500, x1: 9000, y0: -6000, y1: 7500 }, CELL = 100; // metres
const Z = 12, LAKE = 74.6; // Lake Ontario's surface, metres above sea level, as the tiles show it

function png(buf) { // 8-bit RGB or RGBA, not interlaced: enough for these tiles
  let o = 8, w = 0, h = 0, type = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), tag = buf.toString('latin1', o + 4, o + 8), data = buf.subarray(o + 8, o + 8 + len);
    if (tag === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); type = data[9]; if (data[8] !== 8 || (type !== 2 && type !== 6) || data[12]) throw new Error('unsupported PNG'); }
    if (tag === 'IDAT') idat.push(data);
    o += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255;
    }
  }
  return { w, h, bpp, px: out };
}

const tiles = new Map();
async function tile(x, y) {
  const key = Z + '-' + x + '-' + y;
  if (tiles.has(key)) return tiles.get(key);
  let buf;
  if (process.argv[2]) buf = fs.readFileSync(path.join(process.argv[2], key + '.png'));
  else {
    const res = await fetch('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/' + Z + '/' + x + '/' + y + '.png');
    if (!res.ok) throw new Error('tile ' + key + ' returned ' + res.status);
    buf = Buffer.from(await res.arrayBuffer());
  }
  const t = png(buf); tiles.set(key, t);
  return t;
}
async function heightAt(lon, lat) { // bilinear, in Web Mercator pixels
  const n = 2 ** Z, r = lat * Math.PI / 180;
  const fx = (lon + 180) / 360 * n * 256 - 0.5, fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n * 256 - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), kx = fx - x0, ky = fy - y0;
  const at = async (px, py) => { const t = await tile(Math.floor(px / 256), Math.floor(py / 256)), i = ((py % 256) * t.w + (px % 256)) * t.bpp; return t.px[i] * 256 + t.px[i + 1] + t.px[i + 2] / 256 - 32768; };
  const a = await at(x0, y0), b = await at(x0 + 1, y0), c = await at(x0, y0 + 1), d = await at(x0 + 1, y0 + 1);
  return (a * (1 - kx) + b * kx) * (1 - ky) + (c * (1 - kx) + d * kx) * ky;
}

// the maps
const ctx = { window: {} }; ctx.YP = ctx.window.YP = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data', 'history.js'), 'utf8'), ctx);
const inRing = (x, y, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const signed = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]); return a; };
// In a shapefile an outer ring runs clockwise and a hole anticlockwise. Polygons on these maps overlap (a lagoon
// drawn over the lake, say), so a point is water when more outer rings than holes contain it.
const inside = (x, y, rings) => { let n = 0; for (const r of rings) if (inRing(x, y, r)) n += r.cw ? 1 : -1; return n > 0; };
const MAPS = [[1802, 'William Chewett'], [1834, 'William Chewett'], [1851, 'J.O. Browne']].map(([year, by]) => {
  const m = ctx.YP.HISTORY.maps.find(q => q.year === year && q.by === by);
  // A map's own extent is taken from its water polygons, pulled in a little so its cut edges are not trusted.
  for (const r of m.water.concat(m.marsh)) r.cw = signed(r) < 0;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const r of m.water.concat(m.marsh)) for (const p of r) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { year, by, m, x0: x0 + 150, x1: x1 - 150, y0: y0 + 150, y1: y1 - 150 };
});
// 0 land, 1 water, 2 marsh, -1 no map covers this point; and which map said so.
// A map only draws water near what it was made to show (the 1802 plan draws part of the bay, the 1834 map
// the whole lake front), so a blank on one map is not evidence of land. A point is water if ANY map that
// reaches it draws water there, marsh if any draws marsh, and land only if every map that reaches it agrees.
function mapped(x, y) {
  let first = -1, marsh = -1;
  for (let k = 0; k < MAPS.length; k++) {
    const M = MAPS[k];
    if (x < M.x0 || x > M.x1 || y < M.y0 || y > M.y1) continue;
    if (first < 0) first = k;
    if (inside(x, y, M.m.water)) return [1, k];
    if (marsh < 0 && inside(x, y, M.m.marsh)) marsh = k;
  }
  return marsh >= 0 ? [2, marsh] : first >= 0 ? [0, first] : [-1, -1];
}

(async () => {
  // The mask is sampled at half the height spacing: the old peninsula was a sandbar too narrow for 100 m cells.
  const FINE = CELL / 2, nx = Math.round((BOX.x1 - BOX.x0) / FINE) + 1, ny = Math.round((BOX.y1 - BOX.y0) / FINE) + 1;
  const z0 = new Float32Array(nx * ny), kind = new Uint8Array(nx * ny), src = new Uint8Array(nx * ny);
  const count = { land: 0, water: 0, marsh: 0, unmapped: 0, offSheet: 0, madeLandSunk: 0, lowLandKept: 0 };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = BOX.x0 + i * FINE, y = BOX.y0 + j * FINE, n = j * nx + i;
    const z = await heightAt(ORIGIN.lon + x / MX, ORIGIN.lat + y / MY);
    let [k, which] = mapped(x, y);
    if (k === -1) { count.unmapped++; k = z <= LAKE + 0.4 ? 1 : 0; }
    z0[n] = z; kind[n] = k; src[n] = which + 1;
  }
  // Beyond the edge of a map's lake the maps seem to say "land" where there is open water. Those points are
  // found by flooding in from the lake that no map covers, through every point a map calls land but today's
  // model puts at lake level. What the flood cannot reach (it is walled in by mapped water, as the old
  // peninsula is) stays land.
  const low = n => kind[n] === 0 && src[n] > 0 && z0[n] <= LAKE + 0.5;
  const queue = [], seen = new Uint8Array(nx * ny);
  const seed = n => { if (!seen[n]) { seen[n] = 1; queue.push(n); } };
  for (let n = 0; n < nx * ny; n++) if (kind[n] === 1 && src[n] === 0) seed(n);
  for (let i = 0; i < nx; i++) for (const n of [i, (ny - 1) * nx + i]) if (low(n)) seed(n);
  for (let j = 0; j < ny; j++) for (const n of [j * nx, j * nx + nx - 1]) if (low(n)) seed(n);
  while (queue.length) {
    const n = queue.pop(), i = n % nx, j = (n - i) / nx;
    if (low(n)) { kind[n] = 1; src[n] = 0; count.offSheet++; }
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj; if (ii < 0 || jj < 0 || ii >= nx || jj >= ny) continue;
      const m = jj * nx + ii; if (low(m)) seed(m);
    }
  }
  // A sandbar narrower than one 50 m point would vanish. Walk each mapped shoreline and look across it to the
  // land side: where water starts again within 220 m, the strip of land between is a bar or spit, and the
  // points along that crossing are set to land, so it is at least one point wide. The peninsula's long arm
  // is the case that matters: it joined the mainland until 1858.
  count.barPoints = 0;
  for (let k = 0; k < 2; k++) { // the two maps that draw the bay
    const M = MAPS[k], wet = (x, y) => inside(x, y, M.m.water);
    for (const r of M.m.water) for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const A = r[j], B = r[i], len = Math.hypot(B[0] - A[0], B[1] - A[1]); if (len < 1 || len > 650) continue; // long straight runs are sheet edges
      const ux = (B[0] - A[0]) / len, uy = (B[1] - A[1]) / len;
      for (let t = 12; t < len; t += 25) for (const side of [1, -1]) {
        const mx = A[0] + ux * t, my = A[1] + uy * t, px = -uy * side, py = ux * side;
        if (wet(mx + px * 12, my + py * 12)) continue;            // that side is the water side
        let across = 0;
        for (let d = 30; d <= 220; d += 15) if (wet(mx + px * d, my + py * d)) { across = d; break; }
        if (!across) continue;
        for (let d = 0; d <= across; d += 20) {
          const x = mx + px * d, y = my + py * d, gi = Math.round((x - BOX.x0) / FINE), gj = Math.round((y - BOX.y0) / FINE);
          if (gi < 0 || gj < 0 || gi >= nx || gj >= ny) continue;
          const n = gj * nx + gi; if (kind[n] !== 0) { kind[n] = 0; src[n] = k + 1; count.barPoints++; }
        }
      }
    }
  }
  for (let n = 0; n < nx * ny; n++) {
    count[['land', 'water', 'marsh'][kind[n]]]++;
    if (kind[n] === 1 && z0[n] > LAKE + 0.6) count.madeLandSunk++;
    if (kind[n] === 0 && z0[n] < LAKE + 0.9) count.lowLandKept++;
  }
  // Heights are kept at every second point (100 m). The world page sets water below the lake, marsh at the
  // waterline, and land at least 0.9 m above it, whatever today's ground says there.
  const hx = (nx + 1) >> 1, hy = (ny + 1) >> 1, h = [];
  for (let j = 0; j < hy; j++) for (let i = 0; i < hx; i++) h.push(Math.round((z0[j * 2 * nx + i * 2] - LAKE) * 10));
  const data = {
    origin: ORIGIN, box: BOX, lake: LAKE,
    cell: CELL, nx: hx, ny: hy,           // heights
    maskCell: FINE, maskNx: nx, maskNy: ny, // land, water, marsh
    sources: {
      heights: { title: 'Terrain Tiles (Mapzen / Tilezen, terrarium encoding)', by: 'AWS Open Data registry; elevation from Canadian and US government models', url: 'https://registry.opendata.aws/terrain-tiles/' },
      water: { title: 'Historical Hydrography of Toronto (1802 - 1886)', by: 'Marcel Fortin, University of Toronto Map & Data Library', licence: 'CC BY-SA 4.0', url: 'https://doi.org/10.5683/SP2/IYS0K9' }
    },
    maps: MAPS.map(M => M.by + ' ' + M.year),
    // h: today's height above the lake in decimetres, row by row from the south-west corner.
    // kind: 0 land, 1 water, 2 marsh. src: 0 no map (today's model decides), else 1-based index into maps.
    h, kind: Array.from(kind).join(''), src: Array.from(src).join('')
  };
  const out = path.join(__dirname, '..', 'data', 'terrain.js');
  fs.writeFileSync(out,
    '// Generated by tools/build-terrain.js. Do not edit by hand.\n' +
    '// Heights: Mapzen / Tilezen terrain tiles (today\'s ground). Water and marsh: adapted from "Historical Hydrography\n' +
    '// of Toronto", Marcel Fortin, U of T Map & Data Library, CC BY-SA 4.0, so this file is CC BY-SA 4.0 too.\n' +
    'window.YP = window.YP || {};\nYP.TERRAIN = ' + JSON.stringify(data) + ';\n');
  console.log(hx + ' x ' + hy + ' heights, ' + nx + ' x ' + ny + ' mask', JSON.stringify(count), 'max height', Math.max(...h) / 10, 'm above the lake | KB:', Math.round(fs.statSync(out).size / 1024));
})().catch(e => { console.error(e.message); process.exit(1); });
