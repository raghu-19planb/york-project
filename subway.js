// Ride the lines: the TTC's rapid transit lines, shown the way they are inside a car and on a map of the city.
//
// Two pictures of the same thing. On top, a line map like the one over the doors of a subway car: the line as a
// bar, every station named under a light, the lights coming on one by one as the ride goes. Under it, a map of
// Toronto with the line laid on it, and a light at the same station, so a name on the strip can be found in the
// city. Choosing a station on either one moves the light on both.
//
// What is real: the lines, their colours, the stations and their order, and where the track runs, from
// OpenStreetMap (data/subway.js, built by tools/build-subway.js). The map under them: the city's limits and the
// six old municipalities (City of Toronto open data, data/boundaries.js), and today's rivers and main roads
// (OpenStreetMap, data/today.js). Worked out from those: where you can change lines, and which part of the city
// a station is in. What is drawing: the lights, the icons, the chime, and how long the ride takes. It is not a
// timetable. The lake is drawn south of the city's southern limit, which is close to the shore but not a survey.
(function () {
  const D = window.YP && YP.SUBWAY, root = document.getElementById('subway');
  if (!D || !root) return;
  const B = YP.BOUNDARIES, TODAY = YP.TODAY;
  const $ = s => root.querySelector(s), el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const NS = 'http://www.w3.org/2000/svg', svgEl = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const still = () => document.documentElement.classList.contains('still');
  const svg = $('.sub-map svg'), over = $('.sub-over'), car = $('.car-row'), carBox = $('.car'), picker = $('.sub-lines');
  const ICON = { // drawn here, not anyone's signage
    stop: '<path d="M5 4h14v16H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v16" stroke="currentColor" stroke-width="2"/><path d="M9.5 12H7m7.5 0H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    change: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    end: '<path d="M6 21V4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6 5h12l-3 4 3 4H6z" fill="currentColor"/>'
  };
  const iconOf = s => s.end ? 'end' : s.change.length ? 'change' : 'stop';
  const textOn = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1c1a18' : '#fff6e5'; };
  const colourOf = ref => (D.lines.find(l => l.ref === ref) || {}).colour || '#888';
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const path = pts => 'M' + pts.map(p => Math.round(p[0]) + ' ' + Math.round(-p[1])).join('L'); // in the drawing north is up, so y is turned over

  // ---------- where in the city: the old municipality a point falls in ----------
  const PLACES = B ? B.former.map(f => ({ name: f.name === 'TORONTO' ? 'old Toronto' : f.name.toLowerCase().replace(/(^| )(\w)/g, (m, a, c) => a + c.toUpperCase()), rings: f.rings })) : [];
  function inside(x, y, rings) { let c = false; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  const placeOf = p => { const f = PLACES.find(q => inside(p[0], p[1], q.rings)); return f ? 'In ' + f.name : PLACES.length ? 'Outside the city limits' : ''; };
  for (const l of D.lines) for (const s of l.stops) s.place = placeOf(s.at);
  const sayOf = (l, s) => [s.place, s.end ? 'End of the line' : '', s.change.length ? 'Change here for Line ' + s.change.join(' and Line ') : ''].filter(Boolean).join(' · ');

  // ---------- each line's track as distances, and where along it each station is ----------
  for (const l of D.lines) {
    l.cum = [0]; for (let i = 1; i < l.track.length; i++) l.cum.push(l.cum[i - 1] + dist(l.track[i - 1], l.track[i]));
    let from = 0;
    l.stops.forEach(s => { let best = from, bd = 1e12; for (let i = from; i < l.track.length; i++) { const d = dist(l.track[i], s.at); if (d < bd) { bd = d; best = i; } } s.d = l.cum[best]; from = best; }); // in order, never backwards
  }
  function at(l, d) { const c = l.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++; const a = l.track[i - 1], b = l.track[i], k = Math.max(0, Math.min(1, (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1))); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }

  // ---------- the map of Toronto under the lines ----------
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const grow = p => { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); };
  for (const f of PLACES) for (const r of f.rings) r.forEach(grow);
  for (const l of D.lines) l.track.forEach(grow);
  const PAD = 1200, view = { x: x0 - PAD, y: -(y1 + PAD), w: x1 - x0 + 2 * PAD, h: y1 - y0 + 2 * PAD };
  svg.setAttribute('viewBox', [view.x, view.y, view.w, view.h].join(' '));
  const base = svgEl('g', { class: 'sub-base' });
  base.append(svgEl('rect', { x: view.x, y: view.y, width: view.w, height: view.h, class: 'land' }));
  if (PLACES.length) {
    // the lake: everything south of the city's southern limit
    const south = []; for (let x = x0; x <= x1; x += 250) { let low = 1e9; for (const f of PLACES) for (const r of f.rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[0] > x) !== (b[0] > x)) low = Math.min(low, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0])); } if (low < 1e9) south.push([x, low]); }
    if (south.length) base.append(svgEl('path', { d: path([[view.x, -(view.y + view.h)], [view.x, south[0][1]], ...south, [view.x + view.w, south[south.length - 1][1]], [view.x + view.w, -(view.y + view.h)]]) + 'Z', class: 'lake' }));
    for (const f of PLACES) base.append(svgEl('path', { d: f.rings.map(r => path(r) + 'Z').join(''), class: 'city' }));
  }
  if (TODAY) {
    for (const r of TODAY.rivers) if (r.cls === 'river') base.append(svgEl('path', { d: r.lines.map(path).join(''), class: 'river' }));
    for (const r of TODAY.roads) base.append(svgEl('path', { d: r.lines.map(path).join(''), class: 'road ' + r.cls }));
  }
  svg.append(base);
  // The picture keeps its shape inside its box, so a metre is the same number of pixels across and down.
  const unit = () => Math.max(view.w / (svg.clientWidth || 1), view.h / (svg.clientHeight || 1));
  const screen = p => { const u = unit(), ox = (svg.clientWidth - view.w / u) / 2, oy = (svg.clientHeight - view.h / u) / 2; return [ox + (p[0] - view.x) / u, oy + (-p[1] - view.y) / u]; };
  const names = PLACES.map(f => { const r = f.rings[0]; let sx = 0, sy = 0; for (const p of r) { sx += p[0]; sy += p[1]; } const n = el('span', 'sub-place', f.name.replace(/^old /, 'Old ')); over.append(n); return { n, at: [sx / r.length, sy / r.length] }; });
  if (PLACES.length) { const n = el('span', 'sub-place water', 'Lake Ontario'); over.append(n); names.push({ n, at: [(x0 + x1) / 2 + 3000, y0 + 1500] }); }

  const layer = {};
  for (const l of D.lines) {
    const g = svgEl('g', { class: 'sub-line', 'data-ref': l.ref });
    g.append(svgEl('path', { d: path(l.track), fill: 'none', stroke: l.colour, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const dots = l.stops.map((s, i) => { const c = svgEl('circle', { cx: s.at[0], cy: -s.at[1], r: 1, 'vector-effect': 'non-scaling-stroke', stroke: l.colour }); c.addEventListener('click', () => { if (line === l) go(i); }); g.append(c); return c; });
    svg.append(g); layer[l.ref] = { g, dots };
  }
  const lamp = svgEl('circle', { class: 'sub-lamp', r: 1, 'vector-effect': 'non-scaling-stroke' }); svg.append(lamp);
  const tag = el('div', 'sub-tag'); tag.append(el('b')); over.append(tag);
  function sizeMap() {
    const u = unit();
    for (const l of D.lines) layer[l.ref].dots.forEach((c, i) => c.setAttribute('r', ((line === l ? (l.stops[i].change.length || l.stops[i].end ? 6.5 : 5) : 2) * u).toFixed(1)));
    lamp.setAttribute('r', (9 * u).toFixed(1));
    for (const m of names) { const [sx, sy] = screen(m.at); m.n.style.transform = 'translate(' + sx.toFixed(0) + 'px,' + sy.toFixed(0) + 'px) translate(-50%,-50%)'; }
    placeLamp();
  }

  // ---------- the ride ----------
  const now = { kicker: $('.sub-now small'), name: $('.sub-now b'), say: $('.sub-now span'), ico: $('.sub-now .ico svg'), num: $('.sub-now .num') };
  let line = null, idx = 0, dirn = 1, phase = 'dwell', t = 0, playing = false, last = 0, ac = null, sound = false;
  const hop = () => Math.max(0.7, Math.min(1.5, Math.abs(line.stops[idx + dirn].d - line.stops[idx].d) / 1500)); // seconds between two stations
  const DWELL = 1.05, ease = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
  const lastIdx = () => dirn > 0 ? line.stops.length - 1 : 0;

  function chime() { // two soft notes as the doors open; made here, not a recording of anyone's
    if (!sound) return;
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); }
    if (ac.state === 'suspended') ac.resume();
    [659.25, 523.25].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), a = ac.currentTime + i * 0.16; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(0.12, a + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.5); o.connect(g); g.connect(ac.destination); o.start(a); o.stop(a + 0.55); });
  }
  function lights() { // which lights are on: every station passed, the one the train is at, and, between stations, the next one blinking
    const cells = car.children, dots = layer[line.ref].dots, next = phase === 'run' ? idx + dirn : -1;
    for (let i = 0; i < line.stops.length; i++) {
      const seen = dirn > 0 ? i <= idx : i >= idx, here = i === idx && phase === 'dwell';
      cells[i].classList.toggle('seen', seen); cells[i].classList.toggle('here', here); cells[i].classList.toggle('next', i === next);
      if (here) cells[i].setAttribute('aria-current', 'true'); else cells[i].removeAttribute('aria-current');
      dots[i].classList.toggle('seen', seen); dots[i].classList.toggle('here', here);
    }
  }
  function say() { // the words in the bar, and the name on the map
    const target = phase === 'run' ? idx + dirn : idx, s = line.stops[target], kind = iconOf(s), n = dirn > 0 ? target + 1 : line.stops.length - target;
    now.kicker.textContent = (phase === 'run' ? 'Next stop' : 'Now at') + ' · station ' + n + ' of ' + line.stops.length;
    now.name.textContent = s.name; now.say.textContent = sayOf(line, s); now.ico.innerHTML = ICON[kind];
    tag.firstChild.textContent = s.name;
    const cell = car.children[target]; if (cell) carBox.scrollTo({ left: cell.offsetLeft - carBox.clientWidth / 2 + cell.offsetWidth / 2, behavior: still() ? 'auto' : 'smooth' });
  }
  function placeLamp() { // the light on the map, and the name beside it
    if (!line) return;
    const a = line.stops[idx], p = phase === 'run' ? at(line, a.d + (line.stops[idx + dirn].d - a.d) * ease(t / hop())) : a.at;
    lamp.setAttribute('cx', p[0].toFixed(0)); lamp.setAttribute('cy', (-p[1]).toFixed(0));
    const s = line.stops[phase === 'run' ? idx + dirn : idx], [sx, sy] = screen(s.at);
    tag.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px)'; tag.classList.toggle('left', sx > svg.clientWidth * 0.6); tag.classList.toggle('below', sy < 60);
  }
  function arrive(quiet) { phase = 'dwell'; t = 0; lights(); say(); placeLamp(); root.classList.add('at'); if (!quiet) chime(); }
  function go(i) { idx = i; setPlaying(false); arrive(); }
  function setPlaying(on) {
    playing = on && !!line; root.classList.toggle('playing', playing);
    $('.sub-play').textContent = playing ? 'Pause' : line && idx === lastIdx() ? 'Ride it again' : 'Ride the line'; $('.sub-play').setAttribute('aria-pressed', String(playing));
  }
  function choose(l) {
    if (typeof l === 'string') l = D.lines.find(o => o.ref === l);
    if (!l) return;
    line = l; dirn = 1; idx = 0;
    root.style.setProperty('--line', l.colour); root.style.setProperty('--on-line', textOn(l.colour));
    for (const o of D.lines) layer[o.ref].g.classList.toggle('on', o === l);
    svg.insertBefore(layer[l.ref].g, lamp); // above the other lines, under the light
    [...picker.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ref === l.ref)));
    now.num.textContent = l.ref; $('.sub-title').textContent = l.name.replace(/^Line \d+\s*/, ''); $('.sub-ends').textContent = l.kind + ' · ' + l.from + ' to ' + l.to + ' · ' + l.stops.length + ' stations';
    $('.sub-turn').textContent = 'Ride toward ' + l.from;
    car.textContent = ''; car.style.setProperty('--n', l.stops.length);
    l.stops.forEach((s, i) => { // one station on the strip: a light, and its name under it
      const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', s.name + '. ' + sayOf(l, s));
      const led = el('i'); if (s.change.length) { b.classList.add('change'); led.style.setProperty('--x', colourOf(s.change[0])); } if (s.end) b.classList.add('end');
      b.append(led, el('span', null, s.name)); b.addEventListener('click', () => go(i)); car.append(b);
    });
    sizeMap(); arrive(true); setPlaying(false);
  }
  function step(dt) {
    if (!line || !playing) return;
    t += dt;
    if (phase === 'dwell') { if (t >= DWELL) { if (idx === lastIdx()) { setPlaying(false); return; } phase = 'run'; t = 0; root.classList.remove('at'); lights(); say(); } }
    else if (t >= hop()) { idx += dirn; arrive(); if (idx === lastIdx()) setPlaying(false); }
    placeLamp();
  }
  function frame(ts) { requestAnimationFrame(frame); const dt = Math.min(0.1, (ts - last) / 1000); last = ts; step(dt); }

  // ---------- controls ----------
  D.lines.forEach(l => { const b = el('button'); b.type = 'button'; b.dataset.ref = l.ref; b.style.setProperty('--c', l.colour); b.style.setProperty('--t', textOn(l.colour)); b.append(el('i', null, l.ref), el('span', null, l.name.replace(/^Line \d+\s*/, ''))); b.addEventListener('click', () => { choose(l); if (!still()) setPlaying(true); }); picker.append(b); });
  $('.sub-play').addEventListener('click', () => { if (!playing && idx === lastIdx()) { idx = dirn > 0 ? 0 : line.stops.length - 1; arrive(true); } setPlaying(!playing); }); // at the end of the line: back to the start
  $('.sub-next').addEventListener('click', () => { const n = idx + dirn; if (n < 0 || n >= line.stops.length) return; go(n); });
  $('.sub-turn').addEventListener('click', () => { dirn = -dirn; arrive(true); $('.sub-turn').textContent = 'Ride toward ' + (dirn > 0 ? line.from : line.to); setPlaying(!still()); });
  const snd = $('.sub-sound'); snd.addEventListener('click', () => { sound = !sound; snd.textContent = sound ? 'Chime on' : 'Chime off'; snd.setAttribute('aria-pressed', String(sound)); if (sound) chime(); });
  new ResizeObserver(sizeMap).observe(svg);
  window.addEventListener('yp-motion', () => { if (still()) setPlaying(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
  const src = $('.sub-source'); if (src) { src.href = D.sourceUrl; src.textContent = 'OpenStreetMap, as mapped on ' + (D.osmTimestamp || '').slice(0, 10); }
  const count = $('.sub-count'); if (count) count.textContent = D.lines.length + ' lines · ' + D.lines.reduce((n, l) => n + l.stops.length, 0) + ' stations';

  choose(D.lines[0]);
  // the ride starts by itself the first time the section comes on screen, unless Motion is off
  let started = false; new IntersectionObserver(es => { if (es[0].isIntersecting && !started && !still()) { started = true; setPlaying(true); } }, { threshold: 0.35 }).observe($('.sub-stage'));
  requestAnimationFrame(frame);
  YP.subway = { choose, go, setPlaying, step, get state() { return { line: line.ref, idx, dirn, phase, playing, station: line.stops[idx].name, place: line.stops[idx].place }; }, lines: D.lines };
})();
