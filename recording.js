// Section 3 of the home page: recordings and pictures from the world of c.1680, made in Blender.
//
// The home page used to draw its 3D world live. It now plays three short recordings of a more lifelike model, and
// shows six pictures from it, the way a film shows a place you cannot walk into. Each recording is ten seconds at
// 24 pictures a second. The camera travels: at a walk along the beach and up the lane, and a quarter of the way
// round the bay from the air. (A first version flew kilometres in five seconds and juddered; a second barely
// drifted and looked as if nothing was happening.) The model is built by
// tools/blender/world_set.py, whose opening comment says what in it rests on the record and what is drawing; the
// live, explorable 3D world is still on world.html.
//
// The words here are written for a reader of about nine and up: short sentences, one idea each, any unusual word
// explained where it is used.
window.YP = window.YP || {};
YP.RECORDINGS = [
  { clip: 'world-aerial.mp4', still: 'world-aerial.jpg', name: 'Above the bay', sub: 'The harbour from the air',
    title: 'Toronto’s harbour, about 340 years ago',
    what: 'A long arm of sand curls round a calm bay. There is no city yet: only forest, right down to the water. Ships would one day shelter here, and that is why a town was built on this shore.',
    real: 'From old maps: the shape of the shore and the sand bar. Our drawing: the trees and the light.' },
  { clip: 'world-beach.mp4', still: 'world-beach.jpg', name: 'Down to the shore', sub: 'On the sand, beside the canoes',
    title: 'On the beach of the bay',
    what: 'Canoes are pulled up on the sand. They are made of bark, so they are light enough for two people to carry. Far across the water you can see the sand bar that keeps the bay calm.',
    real: 'Nobody drew this beach at the time. The people, the canoes and where they are is our picture of it.' },
  { clip: 'world-village.mp4', still: 'world-village.jpg', name: 'Along the lane', sub: 'At eye level, in the village',
    title: 'Teiaiagon, a Seneca village',
    what: 'This village stood beside the Humber River. Families lived together in longhouses: frames of bent poles covered with sheets of elm bark, each about as long as two school buses. Smoke from the cooking fires went out through holes in the roof.',
    real: 'From the record: the village was here, with longhouses, a wall of logs and fields of corn. Our drawing: where each house and person stands. No picture of Teiaiagon exists.' }
];
YP.STILLS = [
  { file: 'world-aerial.jpg', short: 'Bay & sand bar', title: 'The bay and its sand bar · c.1680', alt: 'A calm bay behind a long curling bar of sand, with forest to the water, seen from the air',
    what: 'The bay that became Toronto’s harbour. The long bar of sand kept the water calm. Much later, in 1858, a storm cut through the bar and turned it into islands.', real: 'From old maps: the shore and the sand bar. Our drawing: the trees and the light.' },
  { file: 'world-aerial-1.jpg', short: 'Over the sand bar', title: 'Looking in to the shore · c.1680', alt: 'Low over the sand bar and its ponds, looking across the bay to the forest shore',
    what: 'Low over the sand bar, looking across the bay. The bar was sand, ponds and a few trees. Beyond it the forest ran unbroken along the shore.', real: 'From old maps: the bar, its ponds and the shore. Our drawing: how it looked from here.' },
  { file: 'world-beach.jpg', short: 'On the beach', title: 'On the beach · c.1680', alt: 'Bark canoes pulled up on a sandy beach with people walking, forest on the left and the lake on the right',
    what: 'People travelled this country by water. A bark canoe could carry a family and its goods, and still be lifted out and carried past a waterfall.', real: 'Our drawing: the people, the canoes and what they are doing. Their clothes follow portraits painted in 1710.' },
  { file: 'world-beach-1.jpg', short: 'A canoe', title: 'A canoe, close up · c.1680', alt: 'A bark canoe resting on the sand beside driftwood logs, with the forest behind it',
    what: 'A canoe is a frame of thin wood with bark stretched over it. The seams were sealed with sticky tree gum so the water stayed out.', real: 'Our drawing. The shape follows bark canoes of the Great Lakes; this exact canoe is not copied from one that survives.' },
  { file: 'world-village.jpg', short: 'The village lane', title: 'Between the longhouses · c.1680', alt: 'A lane between tall arched houses covered in bark, with people walking and forest behind',
    what: 'A longhouse was home to several families who were related. Each family had its own space along the sides, and shared a fire down the middle with the family across from it.', real: 'From the record: longhouses of bark over poles. Our drawing: the lane, the doors and where each house stands.' },
  { file: 'world-village-1.jpg', short: 'The corn hills', title: 'From the fields · c.1680', alt: 'Small mounds of earth with corn plants in front of bark longhouses',
    what: 'Corn, beans and squash were planted together in little hills of earth. The beans climbed the corn, and the squash leaves shaded the ground. They are called the Three Sisters.', real: 'From the record: there were fields round the village. Our drawing: where they were and how big.' }
];
(function () {
  const box = document.getElementById('rec'); if (!box) return;
  const R = YP.RECORDINGS, DIR = 'images/world/', video = box.querySelector('video'), tag = document.getElementById('rec-tag'), play = document.getElementById('rec-play'), cards = document.getElementById('rec-views'), about = document.getElementById('rec-about');
  const stamp = (document.currentScript && document.currentScript.src.split('?')[1]) || '', q = stamp ? '?' + stamp : '';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const still = () => document.documentElement.classList.contains('still');
  let at = 0;
  function label() { play.textContent = !video.paused && !video.ended ? 'Pause' : video.ended ? 'Play again' : 'Play'; play.setAttribute('aria-pressed', String(!video.paused && !video.ended)); }
  function show(i, start) {
    at = i; const r = R[i];
    video.pause(); video.poster = DIR + r.still + q; video.src = DIR + r.clip + q; video.load();
    tag.textContent = ''; tag.append(el('small', null, String(i + 1).padStart(2, '0') + ' / ' + String(R.length).padStart(2, '0')), el('b', null, r.name));
    about.textContent = ''; about.append(el('h3', null, r.title), el('p', null, r.what), el('p', 'real', r.real));
    [...cards.children].forEach((b, k) => { b.classList.toggle('on', k === i); b.setAttribute('aria-pressed', String(k === i)); });
    if (start && !still()) video.play().catch(() => {}); label();
  }
  R.forEach((r, i) => { const b = el('button'); b.type = 'button'; b.append(el('small', null, String(i + 1).padStart(2, '0')), el('b', null, r.name), el('span', null, r.sub)); b.addEventListener('click', () => show(i, true)); cards.append(b); });
  play.addEventListener('click', () => { if (video.paused || video.ended) video.play().catch(() => {}); else video.pause(); });
  video.addEventListener('click', () => play.click());
  for (const ev of ['play', 'pause', 'ended']) video.addEventListener(ev, label);
  window.addEventListener('yp-motion', () => { if (still()) video.pause(); });
  show(0, false);   // nothing moves until Play, or a view, is pressed
})();
