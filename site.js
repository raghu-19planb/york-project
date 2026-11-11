// Landing page: everything below is rendered from records.js and world.js.
(function () {
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Rides strip
  const rides = document.getElementById('rides');
  YP.VEHICLES.forEach(v => {
    const box = el('div', 'ride');
    const c = document.createElement('canvas');
    c.width = 260; c.height = 130;
    const ctx = c.getContext('2d');
    ctx.scale(2, 2);
    ctx.strokeStyle = YP.C.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(4, 58.5); ctx.lineTo(126, 58.5); ctx.stroke();
    YP.drawVehicle(ctx, v.id, 14, 58, 0.3);
    box.append(c, el('span', 'mono', v.era), el('b', null, v.name));
    rides.append(box);
  });

  // Pieces
  const statusText = { live: 'Live', building: 'In progress', planned: 'Planned' };
  const pieces = document.getElementById('pieces');
  YP.PIECES.forEach((p, i) => {
    const card = el('article', 'piece ' + p.status);
    const top = el('div', 'top mono');
    top.append(el('span', null, String(i + 1).padStart(2, '0') + ' / ' + p.kind), el('span', 'status ' + p.status, statusText[p.status]));
    card.append(top, el('h3', null, p.title), el('p', 'line', p.line), el('p', null, p.body));
    if (p.href) {
      const a = el('a', 'go', p.cta + ' →');
      a.href = p.href;
      card.append(a);
    }
    pieces.append(card);
  });
  const live = YP.PIECES.filter(p => p.status === 'live').length;
  const building = YP.PIECES.filter(p => p.status === 'building').length;
  document.getElementById('world-count').textContent =
    [live + ' live', building + ' in progress', (YP.PIECES.length - live - building) + ' planned'].join(' · ');

  // Records
  const list = document.getElementById('records');
  YP.RECORDS.forEach(r => list.append(YP.recordItem(r)));
  document.getElementById('record-count').textContent = YP.RECORDS.length + ' entries';

  // Scenery
  const scenery = document.getElementById('scenery');
  YP.SCENERY.forEach(s => scenery.append(YP.recordItem(s)));
  const ps = document.getElementById('pop-src');
  ps.href = YP.POPULATION.url; ps.textContent = YP.POPULATION.source;

  // Visual references
  const refs = document.getElementById('refs');
  YP.REFERENCES.forEach(r => {
    const li = el('li'), body = el('div');
    body.append(el('h3', null, r.item), el('p', null, 'From the reference: ' + r.took));
    if (r.caveat) body.append(el('p', null, 'Still a guess: ' + r.caveat));
    r.refs.forEach(x => { const d = el('div', 'src'), a = el('a', null, x.title); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; d.append(a); body.append(d); });
    li.append(el('div', 'yr', 'Checked'), body);
    refs.append(li);
  });
  YP.UNCHECKED.forEach(u => document.getElementById('unchecked').append(el('li', null, u)));
  document.getElementById('ref-count').textContent = YP.REFERENCES.length + ' checked · ' + YP.UNCHECKED.length + ' groups to do';

  // Log
  const log = document.getElementById('loglist');
  YP.LOG.forEach(e => {
    const li = el('li');
    const t = el('time', null, e.date);
    t.dateTime = e.date;
    li.append(t, el('span', null, e.text));
    log.append(li);
  });
})();
