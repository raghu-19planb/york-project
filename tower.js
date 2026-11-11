// How a tower went up: a scrapbook that turns its own pages.
//
// Each page is one archive photograph, redrawn as a coloured sketch (sketch.js) and taped in, with the date, what
// was happening, and how high the tower stood. The words and credits are in data/tower.js. The story plays like a
// short film: bars along the top show where you are, a tap on the right or left turns a page, and Play turns
// them for you. With Motion off nothing moves by itself and pages change without the flip.
(function () {
  const T = window.YP && YP.TOWER, book = document.getElementById('story');
  if (!T || !book) return;
  const pagesEl = document.getElementById('story-pages'), barsEl = document.getElementById('story-bars'), playBtn = document.getElementById('story-play');
  const still = () => document.documentElement.classList.contains('still');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const DIR = 'images/tower/src/', HOLD = 7; // seconds a page is held when the story plays itself
  const NS = 'http://www.w3.org/2000/svg';

  // the little drawing of the tower that fills as it rises
  function gauge(level, mark, i) {
    const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 64 200'); s.setAttribute('aria-hidden', 'true');
    const shape = 'M32 4 L33 40 L34.5 41 L35 60 L41 63 L41 72 L36 75 L39 196 L25 196 L28 75 L23 72 L23 63 L29 60 L29.5 41 L31 40 Z';
    const h = 192 * Math.max(0, Math.min(1, level));
    s.innerHTML = '<defs><clipPath id="lv' + i + '"><rect x="0" y="' + (196 - h).toFixed(1) + '" width="64" height="' + h.toFixed(1) + '"/></clipPath></defs>' +
      '<path d="' + shape + '" fill="none" stroke="#6d5a4a" stroke-width="1" stroke-dasharray="3 2.5"/>' +
      '<path d="' + shape + '" fill="#b8232f" opacity="0.85" clip-path="url(#lv' + i + ')"/>' +
      '<path d="M6 196 H58" stroke="#3a2d25" stroke-width="1.6" stroke-linecap="round"/>';
    const box = el('div', 'gauge'); box.append(s);
    const words = el('div'); words.append(el('small', null, 'How high'), el('b', null, mark)); box.append(words);
    return box;
  }

  const pages = T.pages.map((p, i) => {
    const page = el('article', 'page'); page.style.zIndex = String(T.pages.length - i); page.setAttribute('aria-label', 'Page ' + (i + 1) + ' of ' + T.pages.length + ': ' + p.title);
    const snap = el('figure', 'snap ' + (p.height > p.width ? 'tall ' : '') + (i % 2 ? 'lean-r' : 'lean-l'));
    const img = el('img'); img.alt = p.shows + ' ' + p.when + '.'; img.width = p.width; img.height = p.height; img.dataset.src = DIR + p.file;
    const cap = el('figcaption'); cap.append(p.shows + ' ', el('span', null, 'Photo: ' + p.by.replace(/ ?\(Bobolink\),?| from Stirling.*$/g, '').trim() + ', ' + p.licence));
    snap.append(el('span', 'tape t1'), el('span', 'tape t2'), img, cap);
    const note = el('div', 'note'); note.append(el('div', 'dated', p.when), el('h2', null, p.title), el('p', null, p.text), gauge(p.level, p.mark, i));
    const sticky = el('aside', 'sticky ' + (i % 2 ? 'lean-l' : 'lean-r')); sticky.append(el('small', null, 'Not many people know'), el('p', null, p.fact));
    page.append(snap, note, sticky, el('div', 'folio', (i + 1) + ' / ' + T.pages.length));
    pagesEl.append(page);
    const bar = el('i'); bar.append(el('b')); barsEl.append(bar);
    return { page, img, snap, bar: bar.firstChild, done: false };
  });

  // a page's picture is fetched, and sketched, only when the page is about to be seen
  function ready(i) {
    const p = pages[i]; if (!p || p.done) return; p.done = true;
    p.img.addEventListener('load', () => {
      try { const c = YP.sketch(p.img, 900); c.className = 'sketch'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Sketch made from the photograph: ' + p.img.alt); p.snap.insertBefore(c, p.img); p.snap.classList.add('drawn'); }
      catch (e) { /* the photograph stays as it is */ }
    }, { once: true });
    p.img.src = p.img.dataset.src;
  }

  let at = 0, playing = false, since = 0, last = 0;
  function show(i, by) {
    at = Math.max(0, Math.min(pages.length - 1, i)); since = 0;
    pages.forEach((p, k) => { p.page.classList.toggle('turned', k < at); p.page.classList.toggle('current', k === at); p.page.setAttribute('aria-hidden', String(k !== at)); p.bar.style.transform = 'scaleX(' + (k < at ? 1 : 0) + ')'; });
    ready(at); ready(at + 1);
    document.querySelectorAll('#story-years button').forEach((b, k) => b.classList.toggle('on', k === at));
    if (by === 'user' && at === pages.length - 1) setPlaying(false);
  }
  function setPlaying(on) {
    playing = on && !still(); book.classList.toggle('playing', playing);
    playBtn.textContent = playing ? 'Pause' : at >= pages.length - 1 ? 'Play again' : 'Turn the pages for me';
    playBtn.setAttribute('aria-pressed', String(playing));
  }
  function focus() { // bring the book into view, as the timelapse does
    const r = book.getBoundingClientRect();
    if (r.top < 64 || r.bottom > window.innerHeight) window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 72), behavior: still() ? 'auto' : 'smooth' });
  }
  function tick(ts) {
    requestAnimationFrame(tick);
    const dt = Math.min(0.25, (ts - last) / 1000); last = ts;
    if (!playing) return;
    since += dt; pages[at].bar.style.transform = 'scaleX(' + Math.min(1, since / HOLD).toFixed(3) + ')';
    if (since >= HOLD) { if (at < pages.length - 1) show(at + 1); else setPlaying(false); }
  }
  playBtn.addEventListener('click', () => { if (!playing && at >= pages.length - 1) show(0); setPlaying(!playing); if (playing) focus(); });
  document.getElementById('story-next').addEventListener('click', () => show(at + 1, 'user'));
  document.getElementById('story-prev').addEventListener('click', () => show(at - 1, 'user'));
  book.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(at + 1, 'user'); if (e.key === 'ArrowLeft') show(at - 1, 'user'); });
  const photoBtn = document.getElementById('story-photo');
  photoBtn.addEventListener('click', () => { const on = !book.classList.contains('as-photo'); book.classList.toggle('as-photo', on); photoBtn.textContent = on ? 'Show the sketches' : 'Show the photographs'; photoBtn.setAttribute('aria-pressed', String(on)); });
  const years = document.getElementById('story-years');
  T.pages.forEach((p, i) => { const b = el('button'); b.type = 'button'; b.append(el('b', null, p.when.replace(/^[A-Za-z]+ /, '')), el('span', null, p.title)); b.addEventListener('click', () => { show(i, 'user'); focus(); }); years.append(b); });
  // credits: one line for every picture, with its page on Commons and its licence
  const list = document.getElementById('story-credits');
  T.pages.forEach(p => { const li = el('li'), a = el('a', null, p.original), l = el('a', null, p.licence); a.href = p.source; a.target = l.target = '_blank'; a.rel = l.rel = 'noopener'; l.href = p.licenceUrl || p.source; li.append(p.when + ': ', a, ' · ' + p.by + ' · ', l); list.append(li); });
  window.addEventListener('yp-motion', () => { if (still()) setPlaying(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });

  show(0); setPlaying(false);
  if (location.hash === '#play' && !still()) { setPlaying(true); setTimeout(focus, 300); } // arriving from a story card: start at once
  requestAnimationFrame(tick);
  YP.story = { show, setPlaying, get at() { return at; }, pages };
})();
