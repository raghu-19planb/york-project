// The six views of the c.1700 world, each with what it shows and why it is there. world1700.js reads these for the
// recording's captions; this file also builds the snapshot row and the gallery dialog from them.
// Rule: no view without a purpose. `what` says what you are looking at and why it matters, from sources already
// cited on the site; `real` says which parts of the picture are data and which are drawn.
// The pictures are in images/world1700/ and are made with tools/shoot-world.js; retake them when the model changes.
window.YP = window.YP || {};
YP.GALLERY = [
  {
    view: 0, file: '01-bay.jpg', short: 'Bay & peninsula', title: 'The bay and the peninsula · c.1700',
    alt: 'The bay behind its long sand peninsula, seen from above, in the 3D reconstruction',
    what: 'A sheltered bay behind a long bar of sand. This is the harbour that made the place worth settling: the garrison of 1793 was built on its north shore. The bar was joined to the mainland at its east end until a storm cut through it in 1858 and made it the Toronto Islands.',
    real: 'Real: the shape of the shore and the bar, from maps of 1802 and 1834. Drawn: the trees and the light.'
  },
  {
    view: 4, file: '02-humber.jpg', short: 'The Humber mouth', title: 'The mouth of the Humber · c.1700',
    alt: 'The mouth of the Humber River, where the trail met the lake, in the 3D reconstruction',
    what: 'Where the river meets the lake, and where the Carrying Place began. Travellers left the water here and went north on foot along the east bank. In 1720 the French built a trading post, the Magasin Royal, about 2 km up this river.',
    real: 'Real: the river, its valley and the sand at its mouth, from today’s ground and a map of 1851. Drawn: the forest and the canoes.'
  },
  {
    view: 3, file: '03-carrying-place.jpg', short: 'Teiaiagon', title: 'Teiaiagon, a Seneca village · c.1680',
    alt: 'A village of bark longhouses inside a palisade, with corn fields round it, on the bluff above the Humber, in the 3D reconstruction',
    what: 'Teiaiagon, a village of the Seneca, one of the Haudenosaunee (Iroquois) nations, standing here by the late 1660s where the trail north crossed their country. Families lived in longhouses of bark over a frame of poles, each about 24 m long and home to many related households. Fields of corn, beans and squash lay all round; in November 1678 the village fed La Salle’s crew when their ship put in at the river mouth.',
    real: 'From the record: the place, 20 to 30 buildings, a palisade (traces were found), fields around it. From Seneca towns of the same years: the size and build of the houses. Arranged by hand: where each house stood. No plan or picture of the village survives, and the middle is left open.',
    what1700: 'The same bluff twenty years on. Teiaiagon was left in 1687 or by 1701; accounts differ on which, and on whether the French burned it or its people moved away. The Anishinaabe, whom the French called Mississaugas, then held this country. The clearing and its old fields are going back to brush.',
    real1700: 'Real: the place, on the east bank at today’s Baby Point. Drawn: the brush, and how far the clearing had closed in. Nothing read for this project describes the site in 1700.'
  },
  {
    view: 5, file: '04-map.jpg', short: 'Rivers & shore', title: 'Rivers, shore and marsh · c.1700',
    alt: 'The whole model from straight above: two rivers, the bay, the peninsula and the marsh',
    what: 'The whole place at once. The Humber on the left and the Don on the right run down to the lake; between them the bay lies behind its sandbar, with a marsh where the Don comes in. The thin blue lines are creeks from maps of 1802 and 1851. Most of them are buried under the city now.',
    real: 'Real: the rivers, shore, marsh and creeks, and the rise of the land. Drawn: the forest cover, which is shown unbroken.'
  },
  {
    view: 1, file: '05-beach.jpg', short: 'On the beach', title: 'On the beach at the Humber · c.1700',
    alt: 'Canoes drawn up on the sand at the mouth of the Humber, with people beside them, at eye level',
    what: 'The landing. A canoe trip up the lake ended on a beach like this one, and the carry began: boats and loads went on shoulders for about 80 km to the Holland River and Lake Simcoe. The canoes are birchbark, the kind used across the Great Lakes.',
    real: 'Real: that there was sand here, from the 1851 map. Drawn: the canoes, and the people, whose dress follows portraits painted in 1710 and written accounts. Nobody’s camp is shown.'
  },
  {
    view: 2, file: '06-trees.jpg', short: 'On the trail', title: 'On the Carrying Place, coming to Teiaiagon · c.1680',
    alt: 'The trail coming out of forest through corn fields to the gate of a palisaded village of longhouses, at eye level',
    what: 'Walking the Carrying Place north, the short way from Lake Ontario to the upper lakes, used for centuries before French and English traders followed. The forest gives way to fields of corn, and ahead the trail goes in at the gate of Teiaiagon. The people are dressed as the evidence of these years shows: linen shirts and red or blue cloth got in trade, worn with hide leggings and moccasins.',
    real: 'Real: that the trail passed the village and that fields surrounded it. Drawn from portraits painted in 1710 and written accounts: the dress. Drawn: the trail’s exact line and width, and every tree and corn hill.',
    what1700: 'Walking the Carrying Place north, the short way from Lake Ontario to the upper lakes. Twenty years after the village, the trail runs through its old clearing, now open ground going back to brush.',
    real1700: 'Real: that the trail kept to this bank and passed where the village had been. Drawn: its exact line and width, the brush, and every tree.'
  }
];
(function () {
  // The home page shows the six pictures from the Blender model (recording.js); the world page shows the six views of the live 3D world.
  const home = !!(YP.STILLS && document.getElementById('rec')), G = home ? YP.STILLS : YP.GALLERY, DIR = home ? 'images/world/' : 'images/world1700/';
  const contact = document.getElementById('gallery-contact'), dialog = document.getElementById('gallery-dialog');
  if (!contact || !dialog) return;
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const img = (g, alt) => { const i = el('img'); i.src = DIR + g.file; i.alt = alt; i.width = 1600; i.height = 900; i.loading = 'lazy'; return i; };

  // the dialog
  const head = el('div', 'gallery-head'), titles = el('div');
  titles.append(Object.assign(el('h2', null, 'A world taking shape.'), { id: 'gallery-title' }), el('p', null, home ? 'Six pictures from the model of the bay and the village, around 1680.' : 'Views from the model in progress, around 1700. Taken from the live 3D world.'));
  const close = el('button', 'gallery-close', 'Close ×'); close.type = 'button';
  head.append(titles, close);
  const figure = el('figure', 'gallery-stage'), big = el('img'), cap = el('figcaption'), capTitle = el('b'), capWhat = el('p'), capReal = el('p', 'real');
  big.width = 1600; big.height = 900; cap.append(capTitle, capWhat, capReal); figure.append(big, cap);
  const nav = el('div', 'gallery-nav'), prev = el('button', null, 'Previous image'), next = el('button', null, 'Next image'), count = el('output');
  prev.type = next.type = 'button'; count.setAttribute('aria-live', 'polite'); nav.append(prev, count, next);
  const thumbs = el('div', 'gallery-thumbs');
  dialog.append(head, figure, nav, thumbs);

  let at = 0;
  function show(i) {
    at = (i + G.length) % G.length;
    big.src = DIR + G[at].file; big.alt = G[at].alt; capTitle.textContent = G[at].title; capWhat.textContent = G[at].what; capReal.textContent = G[at].real;
    count.textContent = (at + 1) + ' / ' + G.length;
    [...thumbs.children].forEach((b, k) => b.setAttribute('aria-current', String(k === at)));
  }
  function open(i) { show(i); if (dialog.showModal) dialog.showModal(); else dialog.setAttribute('open', ''); }
  G.forEach((g, i) => {
    const b = el('button'); b.type = 'button'; b.setAttribute('aria-label', g.title + '. ' + g.what);
    const frame = el('span', 'thumb'); frame.append(img(g, ''));
    const label = el('span', 'name'); label.append(el('small', null, String(i + 1).padStart(2, '0')), g.short);
    b.append(frame, label, el('span', 'why', g.what.split('. ')[0] + '.')); b.addEventListener('click', () => open(i));
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
