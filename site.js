// The home page and notes.html: each block below fills its part of the page from records.js, world.js,
// scenery.js and references.js, and is skipped on a page that does not have that part.
(function () {
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  if (document.getElementById('motion')) {
  // Motion: one switch for everything that moves on its own (3D drift, the silent film glimpse).
  const root = document.documentElement, motion = document.getElementById('motion');
  const showMotion = () => motion.setAttribute('aria-pressed', String(!root.classList.contains('still')));
  motion.addEventListener('click', () => {
    const still = root.classList.toggle('still');
    try { localStorage.setItem('yp-motion', still ? 'off' : 'on'); } catch (e) {}
    showMotion(); window.dispatchEvent(new Event('yp-motion'));
  });
  showMotion();

  
  }

  if (document.getElementById('rides')) {
  // Rides: the four vehicles and the year each takes over
  const rides = document.getElementById('rides');
  YP.VEHICLES.forEach(v => {
    const li = el('li');
    li.append(el('b', null, v.name), el('span', null, v.era));
    rides.append(li);
  });

  
  }

  if (document.getElementById('pieces')) {
  // Pieces
  const statusText = { live: 'Live', building: 'In progress', planned: 'Planned' };
  const pieces = document.getElementById('pieces');
  YP.PIECES.forEach((p, i) => {
    const card = el('article', 'piece ' + p.status);
    const top = el('div', 'top kicker');
    top.append(el('span', null, String(i + 1).padStart(2, '0') + ' / ' + p.kind), el('span', 'status ' + p.status, statusText[p.status]));
    card.append(top, el('h3', null, p.title), el('p', 'line', p.line), el('p', null, p.body));
    if (p.href) {
      const a = el('a', 'go', p.cta);
      // a link to a part of the home page still works from notes.html, where that part is not on the page
      a.href = p.href.charAt(0) === '#' && !document.getElementById(p.href.slice(1)) ? './' + p.href : p.href;
      card.append(a);
    }
    pieces.append(card);
  });
  const live = YP.PIECES.filter(p => p.status === 'live').length;
  const building = YP.PIECES.filter(p => p.status === 'building').length;
  document.getElementById('world-count').textContent =
    [live + ' live', building + ' in progress', (YP.PIECES.length - live - building) + ' planned'].join(' · ');

  
  }

  if (document.getElementById('records')) {
  // Records
  const list = document.getElementById('records');
  YP.RECORDS.forEach(r => list.append(YP.recordItem(r)));
  document.getElementById('record-count').textContent = YP.RECORDS.length + ' entries';

  
  }

  if (document.getElementById('scenery')) {
  // Scenery
  const scenery = document.getElementById('scenery');
  YP.SCENERY.forEach(s => scenery.append(YP.recordItem(s)));
  const ps = document.getElementById('pop-src');
  ps.href = YP.POPULATION.url; ps.textContent = YP.POPULATION.source;

  
  }

  if (document.getElementById('refs')) {
  // Visual references
  const refs = document.getElementById('refs');
  YP.REFERENCES.forEach(r => {
    const li = el('li'), body = el('div');
    body.append(el('h3', null, r.item), el('p', null, 'From the reference: ' + r.took));
    if (r.caveat) body.append(el('p', null, 'Still a guess: ' + r.caveat));
    r.refs.forEach(x => { const d = el('div', 'src'), a = el('a', null, x.title); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; d.append(a); body.append(d); });
    li.append(el('div', 'yr', 'Checked against a source'), body);
    refs.append(li);
  });
  YP.UNCHECKED.forEach(u => document.getElementById('unchecked').append(el('li', null, u)));
  document.getElementById('ref-count').textContent = YP.REFERENCES.length + ' checked · ' + YP.UNCHECKED.length + ' groups to do';

  
  }

  if (document.getElementById('loglist')) {
  // Log
  const log = document.getElementById('loglist');
  YP.LOG.forEach(e => {
    const li = el('li');
    const t = el('time', null, e.date);
    t.dateTime = e.date;
    li.append(t, el('span', null, e.text));
    log.append(li);
  });
  }
})();
