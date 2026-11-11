// Builds data/boundaries.js: how Toronto's limits were redrawn, 1834 to 1998.
//
//   node tools/build-boundaries.js <folder>
//
// <folder> must hold two downloads (neither needs an account):
//   AnnexationBounds1967.shp and .dbf, unzipped from
//     "City of Toronto Historical Annexation Boundaries (1834-1967)", Marcel Fortin,
//     University of Toronto Map & Data Library. doi:10.5683/SP3/XN2NRW. CC BY 4.0.
//     https://borealisdata.ca/api/access/datafile/434609
//   former.geojson, the WGS84 GeoJSON of
//     "Former Municipality Boundaries", City of Toronto Open Data.
//     Open Government Licence - Toronto.
//     https://open.toronto.ca/dataset/former-municipality-boundaries/
//
// Output is in the same metres-from-origin frame as data/shoreline.js.
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
if (!dir) { console.error('usage: node tools/build-boundaries.js <folder>'); process.exit(1); }
const ORIGIN = { lat: 43.635, lon: -79.378 }; // must match build-shoreline.js
const MX = Math.cos(ORIGIN.lat * Math.PI / 180) * 111320, MY = 110574;
const project = ([lon, lat]) => [(lon - ORIGIN.lon) * MX, (lat - ORIGIN.lat) * MY];

// NAD83 / UTM zone 17N (the shapefile's .prj) to longitude and latitude.
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
function readShp(file) { // polygons only: returns, per record, a list of rings
  const b = fs.readFileSync(file), out = [];
  let o = 100;
  while (o < b.length) {
    const len = b.readUInt32BE(o + 4) * 2, type = b.readUInt32LE(o + 8);
    if (type !== 5 && type !== 15) throw new Error('unexpected shape type ' + type);
    const parts = b.readUInt32LE(o + 44), points = b.readUInt32LE(o + 48), starts = [];
    for (let p = 0; p < parts; p++) starts.push(b.readUInt32LE(o + 52 + p * 4));
    starts.push(points);
    const base = o + 52 + parts * 4, rings = [];
    for (let p = 0; p < parts; p++) {
      const ring = [];
      for (let k = starts[p]; k < starts[p + 1]; k++) ring.push([b.readDoubleLE(base + k * 16), b.readDoubleLE(base + k * 16 + 8)]);
      rings.push(ring);
    }
    out.push(rings);
    o += 8 + len;
  }
  return out;
}

// Douglas-Peucker for a closed ring, split at the point farthest from its start.
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
function ring(pts, tol) {
  let far = 0, at = 0;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > far) { far = d; at = i; } });
  const r = dp(pts.slice(0, at + 1), tol).concat(dp(pts.slice(at), tol).slice(1));
  return r.slice(0, -1).map(p => [Math.round(p[0]), Math.round(p[1])]);
}
const area = r => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a / 2); };

const rows = readDbf(path.join(dir, 'AnnexationBounds1967.dbf'));
const shapes = readShp(path.join(dir, 'AnnexationBounds1967.shp'));
if (process.argv[3] === '--inspect') { rows.forEach((r, i) => console.log(i, JSON.stringify(r), shapes[i].length, 'rings')); process.exit(0); }

const annexations = rows.map((r, i) => ({
  raw: r,
  rings: shapes[i].map(rg => ring(rg.map(p => project(utm17(p[0], p[1]))), 15)).filter(rg => rg.length >= 3 && area(rg) > 5000)
}));
const former = JSON.parse(fs.readFileSync(path.join(dir, 'former.geojson'), 'utf8')).features.map(f => ({
  name: f.properties.AREA_NAME,
  rings: f.geometry.coordinates.map(poly => ring(poly[0].map(project), 25)).filter(rg => rg.length >= 3 && area(rg) > 20000)
}));
module.exports = { annexations, former };

if (require.main === module) {
  const out = path.join(__dirname, '..', 'data', 'boundaries.js');
  const data = {
    origin: ORIGIN,
    sources: {
      annexations: {
        title: 'City of Toronto Historical Annexation Boundaries (1834-1967)',
        by: 'Marcel Fortin, University of Toronto Map & Data Library', licence: 'CC BY 4.0',
        url: 'https://doi.org/10.5683/SP3/XN2NRW'
      },
      former: {
        title: 'Former Municipality Boundaries', by: 'City of Toronto Open Data',
        licence: 'Open Government Licence - Toronto', url: 'https://open.toronto.ca/dataset/former-municipality-boundaries/'
      }
    },
    // Sorted by the dataset's own annexation number. The one record with no number (land annexed in 1888
    // and ceded to Forest Hill in 1929) is left out: it is not a step in the city's growth.
    annexations: annexations.filter(a => /^[0-9]+$/.test(a.raw.AnxNum)).sort((a, b) => a.raw.AnxNum - b.raw.AnxNum)
      .map(a => ({ num: +a.raw.AnxNum, year: +a.raw.YrAnxd, date: a.raw.DtAnxd, name: a.raw.Name, rings: a.rings })),
    former
  };
  fs.writeFileSync(out,
    '// Generated by tools/build-boundaries.js. Do not edit by hand.\n' +
    '// Annexations: Marcel Fortin, U of T Map & Data Library, CC BY 4.0. Former municipalities: City of Toronto, OGL-Toronto.\n' +
    '// Metres from origin: [east, north].\nwindow.YP = window.YP || {};\nYP.BOUNDARIES = ' + JSON.stringify(data) + ';\n');
  console.log('annexations:', data.annexations.length, '| former:', former.map(f => f.name + ':' + f.rings.reduce((n, r) => n + r.length, 0)).join(' '),
    '| KB:', Math.round(fs.statSync(out).size / 1024));
}
