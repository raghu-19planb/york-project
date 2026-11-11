// The snapshot gallery for the c.1700 world: six stills taken from the live model (world1700.js),
// shown as a row of thumbnails and in a dialog with next and previous.
// The pictures are in images/world1700/ and are made with tools/shoot-world.js; retake them when the model changes.
window.YP = window.YP || {};
YP.GALLERY = [
  { file: '01-bay.jpg', short: 'Bay & peninsula', title: 'The bay and the peninsula · c.1700', alt: 'The bay behind its long sand peninsula, seen from above, in the 3D reconstruction' },
  { file: '02-humber.jpg', short: 'The Humber mouth', title: 'The mouth of the Humber · c.1700', alt: 'The mouth of the Humber River, where the trail met the lake, in the 3D reconstruction' },
  { file: '03-carrying-place.jpg', short: 'The Carrying Place', title: 'The Carrying Place and the site of Teiaiagon · c.1700', alt: 'The trail along the east bank of the Humber and the clearing where Teiaiagon stood, in the 3D reconstruction' },
  { file: '04-map.jpg', short: 'Rivers & shore', title: 'Rivers, shore and marsh · c.1700', alt: 'The whole model from straight above: two rivers, the bay, the peninsula and the marsh' },
  { file: '05-beach.jpg', short: 'On the beach', title: 'On the beach at the Humber · c.1700', alt: 'Canoes off the beach at the mouth of the Humber, at eye level, in the 3D reconstruction' },
  { file: '06-trees.jpg', short: 'Among the trees', title: 'Among the trees on the trail · c.1700', alt: 'The trail running through tall forest, at eye level, in the 3D reconstruction' }
];
(function () {
  const G = YP.GALLERY, DIR = 'images/world1700/';
  const contact = document.getElementById('gallery-contact'), dialog = document.getElementById('gallery-dialog');
  if (!contact || !dialog) return;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const img = (g, alt) => { const i = el('img'); i.src = DIR + g.file; i.alt = alt; i.width = 1600; i.height = 900; i.loading = 'lazy'; return i; };

  // the dialog
  const head = el('div', 'gallery-head'), titles = el('div');
  titles.append(Object.assign(el('h2', null, 'A world taking shape.'), { id: 'gallery-title' }), el('p', null, 'Views from the model in progress, around 1700. Taken from the live 3D world.'));
  const close = el('button', 'gallery-close', 'Close ×'); close.type = 'button';
  head.append(titles, close);
  const figure = el('figure', 'gallery-stage'), big = el('img'), cap = el('figcaption');
  big.width = 1600; big.height = 900; figure.append(big, cap);
  const nav = el('div', 'gallery-nav'), prev = el('button', null, 'Previous image'), next = el('button', null, 'Next image'), count = el('output');
  prev.type = next.type = 'button'; count.setAttribute('aria-live', 'polite'); nav.append(prev, count, next);
  const thumbs = el('div', 'gallery-thumbs');
  dialog.append(head, figure, nav, thumbs);

  let at = 0;
  function show(i) {
    at = (i + G.length) % G.length;
    big.src = DIR + G[at].file; big.alt = G[at].alt; cap.textContent = G[at].title;
    count.textContent = (at + 1) + ' / ' + G.length;
    [...thumbs.children].forEach((b, k) => b.setAttribute('aria-current', String(k === at)));
  }
  function open(i) { show(i); if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); }
  G.forEach((g, i) => {
    const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', g.title);
    const frame = el('span', 'thumb'); frame.append(img(g, ''));
    const label = el('span'); label.append(el('small', null, String(i + 1).padStart(2, '0')), g.short);
    b.append(frame, label); b.addEventListener('click', () => open(i));
    contact.append(b);
    const t = el('button'); t.type = 'button'; t.setAttribute('aria-label', g.title); t.append(img(g, '')); t.addEventListener('click', () => show(i));
    thumbs.append(t);
  });
  prev.addEventListener('click', () => show(at - 1)); next.addEventListener('click', () => show(at + 1));
  close.addEventListener('click', () => dialog.close ? dialog.close() : dialog.removeAttribute('open'));
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); }); // a click on the backdrop
  dialog.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
  const opener = document.getElementById('gallery-open'); if (opener) opener.addEventListener('click', () => open(0));
})();
