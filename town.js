// The time lapse page (town.html): a film of Toronto's harbour and downtown from 1800 to 2025, drawn as a blue-ink
// sketch, with a clock that shows the year, a slider to move through the years, and a timeline under it.
//
// The film is made by tools/blender/timelapse.py, whose opening comment says what in it rests on the record and
// what is a model. It runs 72 seconds from 1800 to 2025 at an even pace, then rises for 8 seconds to a plan of
// the city today. Nothing plays until Play is pressed (the story frame on the home page is the one exception:
// opening a story is the press).
//
// The dated entries in the timeline are the site's own records (records.js and scenery.js), each with its source.
// The sentence at the head of each period says what the FILM DRAWS in those years. It is a description of the
// drawing, not a claim about the city, and it says where the drawing is a model.
window.YP = window.YP || {};
(function () {
  const box = document.getElementById('tl'); if (!box) return;
  const Y0 = 1800, Y1 = 2025, RUN = 72, DIR = 'images/town/';
  const video = box.querySelector('video'), clock = document.getElementById('town-year'), people = document.getElementById('town-pop'), play = document.getElementById('tl-play'), bar = box.querySelector('.world-track span'), range = document.getElementById('town-range'), list = document.getElementById('town-line');
  const stamp = (document.currentScript && document.currentScript.src.split('?')[1]) || '', q = stamp ? '?' + stamp : '';
  const short = document.documentElement.classList.contains('short'), still = () => document.documentElement.classList.contains('still');
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  YP.ERAS = [
    { from: 1800, to: 1834, pic: 1815, name: 'A town in the forest',
      draws: 'Forest covers almost everything, down to a shore drawn from the map of 1802. A few blocks of wooden houses stand beside the bay, and the cleared ground spreads out from them year by year.' },
    { from: 1834, to: 1860, pic: 1850, name: 'A young city',
      draws: 'The town is now a city. Houses fill the streets west and north of the first blocks, and the shallows by the shore begin to be filled in. From 1853 a railway runs along the water’s edge. In 1858 the sand peninsula is cut through and becomes islands.' },
    { from: 1860, to: 1900, pic: 1885, name: 'Rails and brick',
      draws: 'The built-up city spreads north and west faster than before, and the last of the forest inside the picture goes. The harbour edge moves south as more land is made for rail yards and wharves. The first tall towers appear downtown.' },
    { from: 1900, to: 1945, pic: 1925, name: 'The streetcar city',
      draws: 'The city now runs past every edge of the picture. Downtown the buildings climb: a great station, a hotel, a bank tower. Along the water the made land keeps growing.' },
    { from: 1945, to: 1975, pic: 1965, name: 'Subways and expressways',
      draws: 'Red lines mark the subway as each part opens: under Yonge Street in 1954, under University Avenue in 1963. (It runs underground; a plan marks it on the surface.) An expressway is drawn along the lake. Downtown, old houses come down and the first dark office towers go up.' },
    { from: 1975, to: 2000, pic: 1990, name: 'The towers',
      draws: 'The CN Tower rises between 1973 and 1976 and stands over everything. Bank towers crowd round King and Bay streets, and a domed stadium is built beside the tower on old railway land.' },
    { from: 2000, to: 2025, pic: 2025, name: 'The city today',
      draws: 'Tall buildings spread along the waterfront and up the main streets until the skyline is the one seen now. The film ends by rising to look straight down, like a plan of the city on a drawing board.' }
  ];

  // how many people: the census counts in records.js, joined by straight lines; before the first count, nothing is claimed
  const counts = (YP.POPULATION && YP.POPULATION.counts) || [];
  function pop(year) {
    if (!counts.length || year < counts[0][0]) return 'The Town of York';
    let n = counts[counts.length - 1][1];
    for (let i = 1; i < counts.length; i++) if (year <= counts[i][0]) { const a = counts[i - 1], b = counts[i]; n = a[1] + (b[1] - a[1]) * (year - a[0]) / (b[0] - a[0]); break; }
    const round = n >= 1e6 ? (Math.round(n / 1e5) / 10).toFixed(1) + ' million' : (Math.round(n / (n >= 1e5 ? 1e4 : 1e3)) * (n >= 1e5 ? 1e4 : 1e3)).toLocaleString('en-CA');
    return 'About ' + round + ' people';
  }
  const yearAt = t => Math.round(Y0 + (Y1 - Y0) * Math.min(1, Math.max(0, t / RUN)));
  const timeOf = year => (year - Y0) / (Y1 - Y0) * RUN;
  let eraNow = -1;
  function tick() {
    const t = video.currentTime || 0, year = yearAt(t);
    clock.textContent = year; people.textContent = pop(year); bar.style.width = (100 * t / (video.duration || 80)) + '%';
    if (document.activeElement !== range) range.value = year;
    const k = YP.ERAS.findIndex(e => year >= e.from && (year < e.to || e.to === Y1));
    if (k !== eraNow && list) { eraNow = k; [...list.children].forEach((li, i) => li.classList.toggle('on', i === k)); }
    const on = !video.paused && !video.ended; play.textContent = on ? 'Pause' : video.ended ? 'Play again' : 'Play'; play.setAttribute('aria-pressed', String(on));
  }
  function go(year, start) {
    const seek = () => { video.currentTime = timeOf(year); tick(); if (start && !still()) video.play().catch(() => {}); };
    if (video.readyState >= 1) seek(); else { video.addEventListener('loadedmetadata', seek, { once: true }); video.load(); }
  }
  video.poster = DIR + 'tl-1800.jpg' + q; video.src = DIR + 'toronto-1800-2025.mp4' + q;
  play.addEventListener('click', () => { if (video.ended) video.currentTime = 0; if (video.paused) video.play().catch(() => {}); else video.pause(); });
  video.addEventListener('click', () => play.click());
  for (const ev of ['timeupdate', 'play', 'pause', 'ended', 'seeked', 'loadedmetadata']) video.addEventListener(ev, tick);
  (function smooth() { if (!video.paused) tick(); requestAnimationFrame(smooth); })();   // the clock counts every year, not four times a second
  if (range) range.addEventListener('input', () => { video.pause(); go(+range.value, false); });
  window.addEventListener('yp-motion', () => { if (still()) video.pause(); });

  // ---------- the timeline under the film ----------
  if (list) {
    const seen = new Set(), all = [...(YP.RECORDS || []), ...(YP.SCENERY || [])].filter(r => r.at >= 1793 && r.at <= Y1).sort((a, b) => a.at - b.at)
      .filter(r => { const key = r.at + '|' + r.url; if (seen.has(key)) return false; seen.add(key); return true; });   // the game and the scenery sometimes hold the same event
    YP.ERAS.forEach((e, k) => {
      const li = el('li', 'era'), head = el('button', 'era-pic'); head.type = 'button';
      const img = el('img'); img.src = DIR + 'tl-' + e.pic + '.jpg' + q; img.width = 960; img.height = 540; img.loading = 'lazy'; img.alt = 'The film at ' + e.pic + ': ' + e.name.toLowerCase();
      head.append(img, el('span', 'era-go', 'Play from ' + e.from + ' ▶')); head.addEventListener('click', () => { go(e.from, true); box.scrollIntoView({ behavior: still() ? 'auto' : 'smooth', block: 'center' }); });
      const words = el('div', 'era-words'); words.append(el('p', 'mono', e.from + ' to ' + e.to), el('h3', null, e.name), el('p', 'era-draws', e.draws));
      const facts = el('ul', 'era-facts');
      for (const r of all.filter(r => (k === 0 ? r.at <= e.to : r.at > e.from) && r.at <= e.to)) {
        const f = el('li'); f.append(el('b', null, String(r.at)), el('strong', null, r.title), document.createTextNode(' ' + r.text + ' '));
        if (r.url) { const a = el('a', null, r.source); a.href = r.url; a.target = '_blank'; a.rel = 'noopener'; f.append(a); } else if (r.source) f.append(el('span', null, r.source));
        facts.append(f);
      }
      words.append(facts); li.append(head, words); list.append(li);
    });
  }
  tick();
  if (short && !still()) { video.muted = true; video.play().catch(() => {}); }
})();
