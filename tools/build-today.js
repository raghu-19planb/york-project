// Builds data/today.js: today's rivers, main roads and railways across the whole city,
// drawn faintly under "Toronto, redrawn" so the old boundaries can be placed.
//
//   node tools/build-today.js             fetches from the Overpass API
//   node tools/build-today.js saved.json  uses a saved Overpass response
//
// Data (c) OpenStreetMap contributors, ODbL. Output is in metres from ORIGIN: [east, north],
// the same frame as data/shoreline.js and data/boundaries.js.
const fs = require('fs');
const path = require('path');

const BOX = { s: 43.575, w: -79.645, n: 43.86, e: -79.11 };
const ORIGIN = { lat: 43.635, lon: -79.378 }; // must match build-shoreline.js
const QUERY = `[out:json][timeout:180];(
way["waterway"~"^(river|stream)$"]["name"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});
way["highway"~"^(motorway|trunk|primary|secondary)$"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});
way["railway"="rail"]["usage"="main"](${BOX.s},${BOX.w},${BOX.n},${BOX.e});
);out tags geom;`;
const MX = Math.cos(ORIGIN.lat * Math.PI / 180) * 111320, MY = 110574;
const project = p => [(p.lon - ORIGIN.lon) * MX, (p.lat - ORIGIN.lat) * MY];

async function load() {
  if (process.argv[2]) return JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  let last;
  for (const host of ['https://overpass-api.de', 'https://overpass.kumi.systems', 'https://overpass.private.coffee']) {
    try {
      const res = await fetch(host + '/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'static-site-builder/1.0' },
        body: 'data=' + encodeURIComponent(QUERY)
      });
      if (res.ok) return res.json();
      last = new Error(host + ' returned ' + res.status);
    } catch (e) { last = e; }
  }
  throw last;
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
const length = l => { let s = 0; for (let i = 1; i < l.length; i++) s += Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]); return s; };

// OSM cuts a road into many short ways. Chain the ones that meet end to end (same name and class),
// so a road becomes a few long lines that simplify well.
function chain(ways) {
  const key = p => Math.round(p[0]) + ',' + Math.round(p[1]);
  const left = new Set(ways), ends = new Map();
  const note = w => { for (const k of [key(w[0]), key(w[w.length - 1])]) { if (!ends.has(k)) ends.set(k, []); ends.get(k).push(w); } };
  ways.forEach(note);
  const take = k => { const list = ends.get(k) || []; while (list.length) { const w = list.pop(); if (left.has(w)) return w; } return null; };
  const out = [];
  for (const w of ways) {
    if (!left.has(w)) continue;
    left.delete(w);
    let line = w.slice();
    for (let next; (next = take(key(line[line.length - 1])));) { // grow forwards
      left.delete(next);
      line = line.concat((key(next[0]) === key(line[line.length - 1]) ? next : next.slice().reverse()).slice(1));
    }
    for (let prev; (prev = take(key(line[0])));) { // grow backwards
      left.delete(prev);
      line = (key(prev[prev.length - 1]) === key(line[0]) ? prev : prev.slice().reverse()).slice(0, -1).concat(line);
    }
    out.push(line);
  }
  return out;
}

load().then(json => {
  const groups = { river: new Map(), road: new Map(), rail: new Map() };
  for (const el of json.elements) {
    if (el.type !== 'way' || !el.geometry) continue;
    const t = el.tags || {}, pts = el.geometry.filter(Boolean).map(project);
    if (pts.length < 2) continue;
    const kind = t.waterway ? 'river' : t.railway ? 'rail' : 'road';
    const name = kind === 'rail' ? '' : (t.name || t.ref || '');
    const cls = kind === 'road' ? t.highway : kind === 'river' ? t.waterway : 'rail';
    const k = cls + '|' + name;
    if (!groups[kind].has(k)) groups[kind].set(k, { cls, name, ways: [] });
    groups[kind].get(k).ways.push(pts);
  }
  const out = {};
  for (const kind of Object.keys(groups)) {
    const tol = kind === 'river' ? 15 : 25, min = kind === 'river' ? 1500 : 800;
    out[kind] = [...groups[kind].values()].map(g => ({
      cls: g.cls, name: g.name,
      lines: chain(g.ways).map(w => dp(w, tol).map(p => [Math.round(p[0]), Math.round(p[1])])).filter(l => l.length > 1)
    })).filter(g => g.lines.reduce((s, l) => s + length(l), 0) > min);
  }
  const data = {
    source: 'OpenStreetMap contributors (ODbL)', sourceUrl: 'https://www.openstreetmap.org/copyright',
    osmTimestamp: json.osm3s && json.osm3s.timestamp_osm_base, origin: ORIGIN, box: BOX,
    rivers: out.river, roads: out.road, rail: out.rail
  };
  const file = path.join(__dirname, '..', 'data', 'today.js');
  fs.writeFileSync(file,
    '// Generated by tools/build-today.js. Do not edit by hand.\n' +
    '// Rivers, main roads and railways (c) OpenStreetMap contributors, ODbL. Metres from origin: [east, north].\n' +
    'window.YP = window.YP || {};\nYP.TODAY = ' + JSON.stringify(data) + ';\n');
  const n = k => out[k].length + ' ' + k + ' groups, ' + out[k].reduce((s, g) => s + g.lines.reduce((a, l) => a + l.length, 0), 0) + ' pts';
  console.log(n('river'), '|', n('road'), '|', n('rail'), '| KB:', Math.round(fs.statSync(file).size / 1024));
}).catch(e => { console.error(e.message); process.exit(1); });
