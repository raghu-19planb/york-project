// Ride the lines: the TTC's rapid transit map, with a train you can send down any line.
//
// Pick a line and a train runs it from one end to the other, stopping at every station. As it arrives the station
// lights up with an icon that says what kind of stop it is: an ordinary station (doors), a place to change lines
// (two arrows, with the lines you can change to), or the end of the line (a flag). A strip under the map lights
// station by station, like the map above the doors in a subway car.
//
// What is real: the lines, their colours, the stations and their order, and where the track runs, all from
// OpenStreetMap (data/subway.js, built by tools/build-subway.js). Worked out from that: where you can change.
// What is drawing: the train, the icons, the chime, and how long the train takes. It is not a timetable.
(function () {
  const D = window.YP && YP.SUBWAY, root = document.getElementById('subway');
  if (!D || !root) return;
  const $ = s => root.querySelector(s), el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const NS = 'http://www.w3.org/2000/svg', svgEl = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
  const still = () => document.documentElement.classList.contains('still');
  const svg = $('.sub-map svg'), over = $('.sub-over'), strip = $('.sub-strip'), picker = $('.sub-lines');
  const ICON = { // drawn here, not anyone's signage
    stop: '<path d="M5 4h14v16H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v16" stroke="currentColor" stroke-width="2"/><path d="M9.5 12H7m7.5 0H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    change: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    end: '<path d="M6 21V4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M6 5h12l-3 4 3 4H6z" fill="currentColor"/>'
  };
  const iconOf = s => s.end ? 'end' : s.change.length ? 'change' : 'stop';
  const sayOf = (l, s) => s.end ? 'End of the line' + (s.change.length ? ' · change here for Line ' + s.change.join(' and Line ') : '') : s.change.length ? 'Change here for Line ' + s.change.join(' and Line ') : 'Line ' + l.ref;
  const textOn = hex => { const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1c1a18' : '#fff6e5'; };

  // ---------- geometry: each line's track as distances, and where along it each station is ----------
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  for (const l of D.lines) {
    l.cum = [0]; for (let i = 1; i < l.track.length; i++) l.cum.push(l.cum[i - 1] + dist(l.track[i - 1], l.track[i]));
    let from = 0;
    l.stops.forEach(s => { let best = from, bd = 1e12; for (let i = from; i < l.track.length; i++) { const d = dist(l.track[i], s.at); if (d < bd) { bd = d; best = i; } } s.d = l.cum[best]; from = best; }); // in order, never backwards
  }
  function at(l, d) { // the point d metres along a line's track, and the way the track is heading there
    const c = l.cum; let i = 1; while (i < c.length - 1 && c[i] < d) i++;
    const a = l.track[i - 1], b = l.track[i], k = Math.max(0, Math.min(1, (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1)));
    return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dir: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  }
  const boxOf = ls => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const l of ls) for (const p of l.track) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } const px = (x1 - x0) * 0.1 + 900, py = (y1 - y0) * 0.1 + 900; return { x: x0 - px, y: -(y1 + py), w: x1 - x0 + 2 * px, h: y1 - y0 + 2 * py }; }; // in the drawing, north is up, so y is turned over

  // ---------- the map ----------
  const layer = {};
  for (const l of D.lines) {
    const g = svgEl('g', { class: 'sub-line', 'data-ref': l.ref });
    g.append(svgEl('path', { d: 'M' + l.track.map(p => p[0] + ' ' + (-p[1])).join('L'), fill: 'none', stroke: l.colour, 'vector-effect': 'non-scaling-stroke', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const dots = l.stops.map(s => { const c = svgEl('circle', { cx: s.at[0], cy: -s.at[1], r: 1, 'vector-effect': 'non-scaling-stroke', stroke: l.colour }); g.append(c); return c; });
    svg.append(g); layer[l.ref] = { g, dots };
  }
  let view = boxOf(D.lines), want = view;
  const setView = v => { view = v; svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].map(n => n.toFixed(1)).join(' ')); sizeDots(); };
  // The picture keeps its shape inside the box, so one metre is the same number of pixels across and down.
  const unit = () => Math.max(view.w / (svg.clientWidth || 1), view.h / (svg.clientHeight || 1)); // metres to a pixel
  const screen = (x, y) => { const u = unit(), ox = (svg.clientWidth - view.w / u) / 2, oy = (svg.clientHeight - view.h / u) / 2; return [ox + (x - view.x) / u, oy + (-y - view.y) / u]; };
  function sizeDots() { const u = unit(); for (const l of D.lines) layer[l.ref].dots.forEach((c, i) => c.setAttribute('r', ((line === l ? (l.stops[i].change.length || l.stops[i].end ? 6 : 4.5) : 2.2) * u).toFixed(1))); }

  // ---------- the train, the badge on the station it is at, and the words ----------
  const train = el('div', 'sub-train'); train.innerHTML = '<svg viewBox="0 0 54 24" aria-hidden="true"><rect x="1" y="3" width="52" height="15" rx="5" fill="#f4f1ea" stroke="#1c1a18" stroke-width="1.6"/><rect class="stripe" x="1" y="12.5" width="52" height="3.4"/><rect x="6" y="6" width="8" height="5" rx="1" fill="#1c1a18"/><rect x="17" y="6" width="8" height="5" rx="1" fill="#1c1a18"/><rect x="29" y="6" width="8" height="5" rx="1" fill="#1c1a18"/><rect x="40" y="6" width="8" height="5" rx="1" fill="#1c1a18"/><circle cx="13" cy="20" r="2.6" fill="#1c1a18"/><circle cx="41" cy="20" r="2.6" fill="#1c1a18"/></svg>';
  const badge = el('div', 'sub-badge'); badge.innerHTML = '<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span><b></b>';
  over.append(badge, train);
  const now = { kicker: $('.sub-now small'), name: $('.sub-now b'), say: $('.sub-now span'), ico: $('.sub-now .ico svg'), num: $('.sub-now .num') };

  let line = null, idx = 0, dirn = 1, phase = 'dwell', t = 0, playing = false, last = 0, here = null, ac = null, sound = false;
  const hop = () => Math.max(0.65, Math.min(1.5, Math.abs(line.stops[idx + dirn].d - line.stops[idx].d) / 1500)); // seconds between two stations: longer gaps take longer, within limits
  const DWELL = 0.95;

  function chime() { // two soft notes as the doors open; made here, not a recording of anyone's
    if (!sound) return;
    if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); }
    if (ac.state === 'suspended') ac.resume();
    [659.25, 523.25].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(), a = ac.currentTime + i * 0.16; o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, a); g.gain.exponentialRampToValueAtTime(0.12, a + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a + 0.5); o.connect(g); g.connect(ac.destination); o.start(a); o.stop(a + 0.55); });
  }
  function arrive(quiet) { // the train is at station idx: light it, name it, say what it is
    const s = line.stops[idx], kind = iconOf(s); here = s;
    layer[line.ref].dots.forEach((c, i) => { c.classList.toggle('seen', dirn > 0 ? i <= idx : i >= idx); c.classList.toggle('here', i === idx); });
    badge.querySelector('svg').innerHTML = ICON[kind]; badge.querySelector('b').textContent = s.name; badge.className = 'sub-badge is-' + kind;
    void badge.offsetWidth; badge.classList.add('pop'); // start the pop again
    now.kicker.textContent = 'Now at · station ' + (dirn > 0 ? idx + 1 : line.stops.length - idx) + ' of ' + line.stops.length;
    now.name.textContent = s.name; now.say.textContent = sayOf(line, s); now.ico.innerHTML = ICON[kind];
    [...strip.children].forEach((b, i) => { b.classList.toggle('seen', dirn > 0 ? i <= idx : i >= idx); b.classList.toggle('here', i === idx); if (i === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    const cur = strip.children[idx]; if (cur) strip.scrollTo({ left: cur.offsetLeft - strip.clientWidth / 2 + cur.offsetWidth / 2, behavior: still() ? 'auto' : 'smooth' });
    if (!quiet) chime();
    place();
  }
  function place() { // put the train and the badge where they belong on the screen
    if (!line) return;
    const a = line.stops[idx], d = phase === 'run' ? a.d + (line.stops[idx + dirn].d - a.d) * ease(t / hop()) : a.d, p = at(line, d);
    const [sx, sy] = screen(p.x, p.y); let turn = -p.dir * 180 / Math.PI; if (dirn < 0) turn += 180; const flip = Math.abs(((turn % 360) + 540) % 360 - 180) > 90; // keep the wheels down
    train.style.transform = 'translate(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px) translate(-50%,-50%) rotate(' + (flip ? turn + 180 : turn).toFixed(1) + 'deg)';
    if (here) { const [bx, by] = screen(here.at[0], here.at[1]); badge.style.transform = 'translate(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px)'; badge.classList.toggle('left', bx > svg.clientWidth * 0.62); badge.classList.toggle('below', by < 70); }
  }
  const ease = k => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };

  function setPlaying(on) {
    playing = on && !!line; root.classList.toggle('playing', playing);
    const atEnd = line && (dirn > 0 ? idx === line.stops.length - 1 : idx === 0);
    $('.sub-play').textContent = playing ? 'Pause' : atEnd ? 'Ride it again' : 'Ride the line'; $('.sub-play').setAttribute('aria-pressed', String(playing));
  }
  function choose(l, keep) {
    line = l; dirn = 1; idx = 0; phase = 'dwell'; t = 0;
    root.style.setProperty('--line', l.colour); root.style.setProperty('--on-line', textOn(l.colour));
    for (const o of D.lines) layer[o.ref].g.classList.toggle('on', o === l);
    svg.append(layer[l.ref].g); // on top
    [...picker.children].forEach(b => b.setAttribute('aria-pressed', String(b.dataset.ref === l.ref)));
    now.num.textContent = l.ref; $('.sub-title').textContent = l.name.replace(/^Line \d+\s*/, ''); $('.sub-ends').textContent = l.kind + ' · ' + l.from + ' to ' + l.to + ' · ' + l.stops.length + ' stations';
    strip.textContent = '';
    l.stops.forEach((s, i) => { const b = el('button'); b.type = 'button'; b.title = sayOf(l, s); b.append(el('i'), el('span', null, s.name)); if (s.change.length) b.classList.add('change'); if (s.end) b.classList.add('end'); b.addEventListener('click', () => { idx = i; phase = 'dwell'; t = 0; setPlaying(false); arrive(); }); strip.append(b); });
    want = boxOf([l]); if (still() || keep) setView(want);
    arrive(true); setPlaying(false);
  }
  function step(dt) {
    if (!line) return;
    if (view !== want) { const k = 1 - Math.exp(-dt * 5), v = { x: view.x + (want.x - view.x) * k, y: view.y + (want.y - view.y) * k, w: view.w + (want.w - view.w) * k, h: view.h + (want.h - view.h) * k }; setView(Math.abs(v.w - want.w) < 2 && Math.abs(v.x - want.x) < 2 ? want : v); place(); }
    if (!playing) return;
    t += dt;
    if (phase === 'dwell') { if (t >= DWELL) { if (dirn > 0 ? idx >= line.stops.length - 1 : idx <= 0) { setPlaying(false); return; } phase = 'run'; t = 0; badge.classList.remove('pop'); } }
    else if (t >= hop()) { idx += dirn; phase = 'dwell'; t = 0; arrive(); if (dirn > 0 ? idx === line.stops.length - 1 : idx === 0) setPlaying(false); }
    place();
  }
  function frame(ts) { requestAnimationFrame(frame); const dt = Math.min(0.1, (ts - last) / 1000); last = ts; step(dt); }

  // ---------- controls ----------
  D.lines.forEach(l => { const b = el('button'); b.type = 'button'; b.dataset.ref = l.ref; b.style.setProperty('--c', l.colour); b.style.setProperty('--t', textOn(l.colour)); b.append(el('i', null, l.ref), el('span', null, l.name.replace(/^Line \d+\s*/, ''))); b.addEventListener('click', () => { choose(l); if (!still()) setPlaying(true); }); picker.append(b); });
  $('.sub-play').addEventListener('click', () => {
    const end = dirn > 0 ? line.stops.length - 1 : 0;
    if (!playing && idx === end) { idx = dirn > 0 ? 0 : line.stops.length - 1; phase = 'dwell'; t = 0; arrive(true); } // at the end of the line: back to the start
    setPlaying(!playing);
  });
  $('.sub-next').addEventListener('click', () => { setPlaying(false); const n = idx + dirn; if (n < 0 || n >= line.stops.length) return; idx = n; phase = 'dwell'; t = 0; arrive(); });
  $('.sub-turn').addEventListener('click', () => { dirn = -dirn; phase = 'dwell'; t = 0; arrive(true); $('.sub-turn').textContent = 'Ride toward ' + (dirn > 0 ? line.from : line.to); setPlaying(!still()); });
  const snd = $('.sub-sound'); snd.addEventListener('click', () => { sound = !sound; snd.textContent = sound ? 'Chime on' : 'Chime off'; snd.setAttribute('aria-pressed', String(sound)); if (sound) chime(); });
  new ResizeObserver(() => { sizeDots(); place(); }).observe(svg);
  window.addEventListener('yp-motion', () => { if (still()) setPlaying(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
  const src = $('.sub-source'); if (src) { src.href = D.sourceUrl; src.textContent = 'OpenStreetMap, as mapped on ' + (D.osmTimestamp || '').slice(0, 10); }
  const count = $('.sub-count'); if (count) count.textContent = D.lines.length + ' lines, ' + D.lines.reduce((n, l) => n + l.stops.length, 0) + ' stations';

  setView(view); choose(D.lines[0], true);
  // the train sets off by itself the first time the map comes on screen, unless Motion is off
  let started = false; new IntersectionObserver(es => { if (es[0].isIntersecting && !started && !still()) { started = true; setPlaying(true); } }, { threshold: 0.5 }).observe(svg);
  requestAnimationFrame(frame);
  YP.subway = { choose, setPlaying, step, get state() { return { line: line.ref, idx, dirn, phase, playing, station: line.stops[idx].name }; }, lines: D.lines };
})();
