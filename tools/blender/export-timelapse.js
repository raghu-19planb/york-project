// Writes the lines the time lapse film draws on top of the ground: today's main roads and railways, and the
// subway tracks, cut to the piece of the city the film looks at.
//
//   node tools/blender/export-timelapse.js <out.json>
//
// The ground, shores and buildings come from tools/blender/export-moments.js; tools/blender/timelapse.py reads both.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..', '..'), ctx = {}; ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data/today.js', 'data/subway.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx);
const BOX = { x0: -7000, x1: 8500, y0: -3200, y1: 10500 };   // wider than the ground the film models, so roads run on into the distance
const inside = p => p[0] >= BOX.x0 && p[0] <= BOX.x1 && p[1] >= BOX.y0 && p[1] <= BOX.y1;
const cut = line => { const out = []; let run = []; for (const p of line) { if (inside(p)) run.push([Math.round(p[0]), Math.round(p[1])]); else { if (run.length > 1) out.push(run); run = []; } } if (run.length > 1) out.push(run); return out; };
const T = ctx.YP.TODAY, roads = [], rail = [], subway = [];
for (const r of T.roads) for (const l of r.lines) for (const piece of cut(l)) roads.push({ cls: r.cls, name: r.name || '', line: piece });
for (const r of T.rail) for (const l of r.lines) for (const piece of cut(l)) rail.push(piece);
for (const l of ctx.YP.SUBWAY.lines) for (const piece of cut(l.track)) subway.push({ ref: l.ref, name: l.name, line: piece });
fs.writeFileSync(process.argv[2], JSON.stringify({ box: BOX, roads, rail, subway }));
console.log('roads', roads.length, 'rail', rail.length, 'subway', subway.length);
