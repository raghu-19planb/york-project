// Builds data/shoreline.js from OpenStreetMap.
//
//   node tools/build-shoreline.js            fetches from the Overpass API
//   node tools/build-shoreline.js lake.json  uses a saved Overpass response
//
// Source: the Lake Ontario multipolygon (OSM relation 1206310), clipped to a
// box around downtown Toronto. "outer" members are the mainland shore; "inner"
// members are islands. Output is in metres from ORIGIN: x east, y north.
// Data (c) OpenStreetMap contributors, ODbL.
const fs = require('fs');
const path = require('path');

const BOX = { s: 43.600, w: -79.430, n: 43.665, e: -79.320 };
const ORIGIN = { lat: 43.635, lon: -79.378 };
const TOLERANCE = 2; // metres, for line simplification
const QUERY = `[out:json][timeout:90];relation(1206310);out geom(${BOX.s},${BOX.w},${BOX.n},${BOX.e});`;

const MX = Math.cos(ORIGIN.lat * Math.PI / 180) * 111320, MY = 110574;
const project = p => [(p.lon - ORIGIN.lon) * MX, (p.lat - ORIGIN.lat) * MY];
const key = p => p.lat.toFixed(7) + ',' + p.lon.toFixed(7);

async function load() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'static-site-builder/1.0' },
    body: 'data=' + encodeURIComponent(QUERY)
  });
  if (!res.ok) throw new Error('Overpass returned ' + res.status);
  return res.json();
}

// A clipped way has nulls where it leaves the box: split it into runs.
function runs(geometry) {
  const out = []; let cur = [];
  for (const p of geometry) {
    if (p) cur.push(p);
    else if (cur.length) { if (cur.length > 1) out.push(cur); cur = []; }
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

// Join segments end to end wherever their endpoints match.
function stitch(segs) {
  const chains = [];
  const pool = segs.slice();
  while (pool.length) {
    let chain = pool.pop().slice();
    let grew = true;
    while (grew) {
      grew = false;
      for (let i = 0; i < pool.length; i++) {
        const s = pool[i], a = key(chain[0]), b = key(chain[chain.length - 1]);
        const s0 = key(s[0]), s1 = key(s[s.length - 1]);
        if (a === b) break; // already a closed ring
        if (b === s0) chain = chain.concat(s.slice(1));
        else if (b === s1) chain = chain.concat(s.slice().reverse().slice(1));
        else if (a === s1) chain = s.concat(chain.slice(1));
        else if (a === s0) chain = s.slice().reverse().concat(chain.slice(1));
        else continue;
        pool.splice(i, 1); grew = true; break;
      }
    }
    chains.push(chain);
  }
  return chains;
}

// Douglas-Peucker on projected points.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let worst = 0, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > worst) { worst = d; at = i; }
    }
    if (worst > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
// A closed ring has no baseline to measure against, so split it at the point
// farthest from its start and simplify the two halves.
function simplifyRing(pts, tol) {
  let far = 0, at = 0;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > far) { far = d; at = i; } });
  return simplify(pts.slice(0, at + 1), tol).concat(simplify(pts.slice(at), tol).slice(1));
}
const round = pts => pts.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]);

(async () => {
  const json = await load();
  const rel = json.elements.find(e => e.type === 'relation');
  const outer = [], inner = [];
  for (const m of rel.members) {
    if (!m.geometry) continue;
    for (const r of runs(m.geometry)) (m.role === 'inner' ? inner : outer).push(r);
  }

  // Mainland: one line, west to east. Gaps (outside the box) are bridged.
  const shoreChains = stitch(outer).map(c => (c[0].lon > c[c.length - 1].lon ? c.slice().reverse() : c));
  shoreChains.sort((a, b) => a[0].lon - b[0].lon);
  const shore = simplify([].concat(...shoreChains).map(project), TOLERANCE);

  // Islands: closed rings only. A ring cut by the box is dropped, and reported.
  let dropped = 0;
  const islands = [];
  for (const c of stitch(inner)) {
    if (key(c[0]) !== key(c[c.length - 1])) { dropped++; continue; }
    const ring = simplifyRing(c.map(project), TOLERANCE);
    if (ring.length >= 4) islands.push(round(ring.slice(0, -1)));
  }

  const data = {
    source: 'OpenStreetMap contributors (ODbL), Lake Ontario relation 1206310',
    sourceUrl: 'https://www.openstreetmap.org/relation/1206310',
    osmTimestamp: json.osm3s && json.osm3s.timestamp_osm_base,
    origin: ORIGIN,
    box: BOX,
    metresPerDegree: { lon: MX, lat: MY },
    shore: round(shore),
    islands
  };
  const out = path.join(__dirname, '..', 'data', 'shoreline.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out,
    '// Generated by tools/build-shoreline.js. Do not edit by hand.\n' +
    '// Shoreline (c) OpenStreetMap contributors, ODbL. Metres from origin: [east, north].\n' +
    'window.YP = window.YP || {};\nYP.SHORE = ' + JSON.stringify(data) + ';\n');
  console.log('shore points:', data.shore.length, '| shore chains:', shoreChains.length,
    '| islands:', islands.length, '| island points:', islands.reduce((n, r) => n + r.length, 0),
    '| open rings dropped:', dropped, '| osm base:', data.osmTimestamp);
  const xs = data.shore.map(p => p[0]), ys = data.shore.map(p => p[1]);
  console.log('shore extent m: x', Math.min(...xs), Math.max(...xs), 'y', Math.min(...ys), Math.max(...ys));
})().catch(e => { console.error(e); process.exit(1); });
