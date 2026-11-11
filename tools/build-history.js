// Builds data/history.js: Toronto's shoreline and creeks as drawn on nine maps, 1802 to 1886.
//
//   node tools/build-history.js <folder>            writes data/history.js
//   node tools/build-history.js <folder> --inspect  prints what each shapefile holds
//
// <folder> must hold the unzipped year archives (1802.zip, 1834.zip, 1842.zip, 1851.zip,
// 1853.zip, 1857.zip, 1872.zip, 1878.zip, 1886.zip), each in a folder named for its year, from
//   "Historical Hydrography of Toronto (1802 - 1886)", Marcel Fortin, University of Toronto
//   Map & Data Library. doi:10.5683/SP2/IYS0K9. CC BY-SA 4.0.
//   File list: https://borealisdata.ca/api/datasets/:persistentId/?persistentId=doi:10.5683/SP2/IYS0K9
// Each archive holds a polygon shapefile (lake, harbour, rivers, ponds: the water as that map
// drew it) and a line shapefile (creeks), digitized by the library from the georeferenced map.
//
// The output is adapted from that dataset and so carries the same licence, CC BY-SA 4.0.
// It is in the same metres-from-origin frame as data/shoreline.js and data/boundaries.js.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build-history.js <folder> [--inspect]'); process.exit(1); }
const INSPECT = process.argv[3] === '--inspect';
const ORIGIN = { lat: 43.635, lon: -79.378 }; // must match build-shoreline.js
const MX = Math.cos(ORIGIN.lat * Math.PI / 180) * 111320, MY = 110574;
const project = ([lon, lat]) => [(lon - ORIGIN.lon) * MX, (lat - ORIGIN.lat) * MY];

// The maps, in date order. `map` is the title given in the dataset's own readme for that year.
const MAPS = [
  { year: 1802, file: '1802/1802', by: 'William Chewett', map: 'Plan of 916 1/4 acres, in the Township of York in Upper Canada' },
  { year: 1834, file: '1834/1834', by: 'William Chewett', map: 'City of Toronto and Liberties' },
  { year: 1842, file: '1842/1842', by: 'James Cane', map: 'Topographical Plan of the City and Liberties of Toronto in the Province of Canada' },
  { year: 1851, file: '1851/1851', by: 'J.O. Browne', map: 'Map of the Township of York' },
  { year: 1853, file: '1853/1853', by: 'Sandford Fleming', map: 'Plan shewing the Boundaries marked on the ground of the Military Reserve belonging to the Ordnance in the City of Toronto' },
  { year: 1857, file: '1857/1857', by: 'Waterlow & Sons', map: 'Toronto, Canada West' },
  { year: 1872, file: '1872/1872', by: 'Wadsworth & Unwin', map: 'Map of the City of Toronto shewing Real Estate Exempt from Taxation' },
  { year: 1878, file: '1878/1878_Hart-Rawlinson', by: 'Hart & Rawlinson', map: 'City of Toronto' },
  { year: 1878, file: '1878/1878_Cotterell', by: 'A.T. Cotterell', map: 'Map of Toronto' },
  { year: 1886, file: '1886/1886', by: 'Speight & Van Nostrand', map: 'Map of West Toronto Junction and Vicinity' }
];

// NAD83 / UTM zone 17N (the shapefiles' .prj) to longitude and latitude.
function utm17(E, N) {
  const a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, lon0 = -81 * Math.PI / 180;
  const e2 = f * (2 - f), ep2 = e2 / (1 - e2), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const M = N / k0, mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256));
  const p1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 * e1 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu)
    + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
  const s = Math.sin(p1), c = Math.cos(p1), t = Math.tan(p1);
  const C1 = ep2 * c * c, T1 = t * t, N1 = a / Math.sqrt(1 - e2 * s * s), R1 = a * (1 - e2) / Math.pow(1 - e2 * s * s, 1.5);
  const D = (E - 500000) / (N1 * k0);
  const lat = p1 - (N1 * t / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D ** 4 / 24
    + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D ** 6 / 720);
  const lon = lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D ** 5 / 120) / c;
  return [lon * 180 / Math.PI, lat * 180 / Math.PI];
}

function readDbf(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(4), hlen = b.readUInt16LE(8), rlen = b.readUInt16LE(10);
  const fields = [];
  for (let o = 32; b[o] !== 0x0d; o += 32) fields.push({ name: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), len: b[o + 16] });
  const rows = [];
  for (let i = 0; i < n; i++) {
    let o = hlen + i * rlen + 1; const r = {};
    for (const f of fields) { r[f.name] = b.toString('latin1', o, o + f.len).trim(); o += f.len; }
    rows.push(r);
  }
  return rows;
}
// Polylines (3, 13, 23) and polygons (5, 15, 25): returns, per record, a list of parts.
function readShp(file) {
  const b = fs.readFileSync(file), out = [];
  let o = 100;
  while (o < b.length) {
    const len = b.readUInt32BE(o + 4) * 2, type = b.readUInt32LE(o + 8);
    if (type === 0) { out.push([]); o += 8 + len; continue; }
    if (![3, 5, 13, 15, 23, 25].includes(type)) throw new Error('unexpected shape type ' + type + ' in ' + file);
    const parts = b.readUInt32LE(o + 44), points = b.readUInt32LE(o + 48), starts = [];
    for (let p = 0; p < parts; p++) starts.push(b.readUInt32LE(o + 52 + p * 4));
    starts.push(points);
    const base = o + 52 + parts * 4, list = [];
    for (let p = 0; p < parts; p++) {
      const part = [];
      for (let k = starts[p]; k < starts[p + 1]; k++) part.push([b.readDoubleLE(base + k * 16), b.readDoubleLE(base + k * 16 + 8)]);
      list.push(part);
    }
    out.push(list);
    o += 8 + len;
  }
  return out;
}

function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(), dx = pts[b][0] - pts[a][0], dy = pts[b][1] - pts[a][1], len = Math.hypot(dx, dy) || 1;
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - pts[a][0]) * dy - (pts[i][1] - pts[a][1]) * dx) / len; if (d > worst) { worst = d; at = i; } }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function ring(pts, tol) { // closed: split at the point farthest from the start, simplify both halves
  let far = 0, at = 0;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > far) { far = d; at = i; } });
  const r = dp(pts.slice(0, at + 1), tol).concat(dp(pts.slice(at), tol).slice(1));
  return r.slice(0, -1).map(p => [Math.round(p[0]), Math.round(p[1])]);
}
const line = (pts, tol) => dp(pts, tol).map(p => [Math.round(p[0]), Math.round(p[1])]);
const area = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };
const length = l => { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; };
const toLocal = p => project(utm17(p[0], p[1]));
const box = lists => {
  let x0 = 1e12, x1 = -1e12, y0 = 1e12, y1 = -1e12;
  for (const l of lists) for (const p of l) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return [x0, y0, x1, y1].map(Math.round);
};

const maps = MAPS.map(m => {
  const base = path.join(dir, m.file);
  const water = readShp(base + '.shp'), creeks = readShp(base + '_creeks.shp');
  if (INSPECT) {
    console.log('==', m.year, m.by);
    console.log('  water:', water.length, 'records', JSON.stringify(readDbf(base + '.dbf')).slice(0, 400));
    console.log('  creeks:', creeks.length, 'records', JSON.stringify(readDbf(base + '_creeks.dbf')).slice(0, 400));
  }
  // Water polygons: each record's parts are rings; holes (islands inside the water) are kept as rings too.
  // Two of the maps (1802, 1834) mark some polygons as marsh; those are kept apart from open water.
  const kinds = readDbf(base + '.dbf').map(r => r.type === 'marsh' ? 'marsh' : 'water');
  const poly = kind => water.flatMap((rec, i) => kinds[i] === kind ? rec.map(part => ring(part.map(toLocal), 8)) : []).filter(r => r.length >= 3 && area(r) > 1500);
  const rings = poly('water'), marsh = poly('marsh');
  const lines = creeks.flatMap(rec => rec.map(part => line(part.map(toLocal), 6))).filter(l => l.length >= 2 && length(l) > 60);
  const out = { year: m.year, by: m.by, map: m.map, water: rings, marsh, creeks: lines, box: box(rings.concat(marsh, lines)) };
  if (INSPECT) console.log('  ->', rings.length, 'rings', rings.reduce((n, r) => n + r.length, 0), 'pts |', lines.length, 'creeks', Math.round(lines.reduce((n, l) => n + length(l), 0)), 'm | box', out.box.join(','));
  return out;
});
if (INSPECT) process.exit(0);

const out = path.join(__dirname, '..', 'data', 'history.js');
const data = {
  origin: ORIGIN,
  source: {
    title: 'Historical Hydrography of Toronto (1802 - 1886)',
    by: 'Marcel Fortin, University of Toronto Map & Data Library',
    licence: 'CC BY-SA 4.0',
    url: 'https://doi.org/10.5683/SP2/IYS0K9'
  },
  maps
};
fs.writeFileSync(out,
  '// Generated by tools/build-history.js. Do not edit by hand.\n' +
  '// Adapted from "Historical Hydrography of Toronto (1802 - 1886)", Marcel Fortin, U of T Map & Data Library.\n' +
  '// This file is licensed CC BY-SA 4.0, as its source is. Metres from origin: [east, north].\n' +
  'window.YP = window.YP || {};\nYP.HISTORY = ' + JSON.stringify(data) + ';\n');
console.log(maps.map(m => m.year + ' ' + m.by + ': ' + m.water.length + ' water, ' + m.marsh.length + ' marsh, ' + m.creeks.length + ' creeks').join('\n'), '\nKB:', Math.round(fs.statSync(out).size / 1024));
