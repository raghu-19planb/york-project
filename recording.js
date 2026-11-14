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
// WHAT A VISITOR IS HERE TO FIND OUT: what this shore was, and who lived on it, before there was a town. So each
// recording comes with "Things to spot": things that are really in the picture, each with one fact about it and the
// source of that fact. Where the picture had to change something to make it visible (corn hung outside, not in
// the rafters), the entry says so.
//
// The words here are written for a reader of about nine and up: short sentences, one idea each, any unusual word
// explained where it is used.
window.YP = window.YP || {};
(function () {
  const WC = { src: 'Warren County Historical Society, Seneca Trunk: Clothing', url: 'https://warrenhistory.org/Seneca%20Trunk/3Clothing.html' };
  const WH = { src: 'Warren County Historical Society, Seneca Trunk: Seneca Homes', url: 'https://warrenhistory.org/Seneca%20Trunk/7Seneca%20Homes.html' };
  const GA = { src: 'Ganondagan State Historic Site, Seneca Bark Longhouse', url: 'https://www.ganondagan.org/bark-longhouse' };
  const CE = { src: 'The Canadian Encyclopedia, Teiaiagon (Seneca Village)', url: 'https://thecanadianencyclopedia.ca/en/article/toronto-feature-teiaiagon-seneca-village' };
  const NY = { src: 'New York State Museum, A Mohawk Iroquois Village', url: 'https://exhibitions.nysm.nysed.gov/iroquoisvillage' };
  YP.RECORDINGS = [
    { clip: 'world-aerial.mp4', still: 'world-aerial.jpg', name: 'Above the bay', sub: 'The harbour from the air',
      title: 'Toronto’s harbour, about 340 years ago',
      what: 'A long arm of sand curls round a calm bay. There is no city yet: only forest, right down to the water. Ships would one day shelter here, and that is why a town was built on this shore.',
      real: 'From old maps: the shape of the shore and the sand bar. Our drawing: the trees and the light.',
      spot: [
        { look: 'The long bar of sand', fact: 'It kept the bay calm. In 1858 a storm cut through it, and what is left is the Toronto Islands.', src: 'Wikipedia, Toronto Islands', url: 'https://en.wikipedia.org/wiki/Toronto_Islands' },
        { look: 'No village in sight', fact: 'The Seneca village of Teiaiagon was not on this bay. It stood about ten kilometres to the west, on a hill above the Humber River.', ...CE }
      ] },
    { clip: 'world-beach.mp4', still: 'world-beach.jpg', name: 'Down to the shore', sub: 'On the sand, beside the canoes',
      title: 'On the beach of the bay',
      what: 'Canoes are pulled up on the sand, and people are coming and going. Far across the water you can see the sand bar that keeps the bay calm.',
      real: 'Nobody drew this beach at the time. Who is here, the canoes and what everyone is doing is our picture of it.',
      spot: [
        { look: 'The men’s hair', fact: 'Men cut their hair short and left a crest standing along the middle of the head, with the sides shaved. Some wore one braided lock instead.', ...WC },
        { look: 'What the men wear', fact: 'A cloth hanging front and back from a belt, called a breechcloth, and leggings held up by the same belt. In summer, the breechcloth alone.', ...WC },
        { look: 'Their shoes', fact: 'Moccasins: each one made from a single piece of deerskin, sewn at the heel and over the top of the foot.', ...WC },
        { look: 'The children running', fact: 'In summer small children wore nothing at all. We have set this scene at harvest time and dressed them like the grown-ups: that is our choice.', ...WC }
      ] },
    { clip: 'world-village.mp4', still: 'world-village.jpg', name: 'Along the lane', sub: 'At eye level, in the village',
      title: 'Teiaiagon, a Seneca village',
      what: 'This village stood on a hill above the Humber River. When the French explorer La Salle came here in 1680, hundreds of people lived in dozens of longhouses, with fields of corn all round.',
      real: 'From the record: the village, its longhouses and its cornfields. Our drawing: where each house and person stands. No picture of Teiaiagon exists.',
      spot: [
        { look: 'The turtle on the end of a house', fact: 'Each longhouse belonged to a clan, and the clan’s animal was carved or painted on the end of the house in black and red. Which clans lived at Teiaiagon is not recorded; the turtles are our drawing.', ...WH },
        { look: 'How long the houses are', fact: 'A longhouse was about 20 feet (6 m) wide and anything from 40 to 200 feet (12 to 60 m) long. The more families, the longer the house.', ...GA },
        { look: 'The smoke', fact: 'There were no chimneys and no windows. Each fire was shared by two families, and its smoke went out through a hole in the roof, which had a bark cover opened from inside with a long pole.', ...WH },
        { look: 'The doors', fact: 'A door was a sheet of bark hung from the top, one at each end of the house.', ...WH },
        { look: 'Barrels and firewood by the doors', fact: 'Food was kept in barrels made of bark, with the firewood, in a store room at each end of the house. Ours stand outside so you can see them.', ...WH },
        { look: 'Corn hanging up', fact: 'Ears of corn were braided together by their husks and hung to dry. They hung from the rafters indoors; ours hang outside so you can see them.', ...WH },
        { look: 'A round hole in the ground', fact: 'A storage pit: a hole lined with bark, filled with food and covered with more bark. This one is copied from a museum’s model of a Mohawk village, not from Teiaiagon.', ...NY },
        { look: 'What the women wear', fact: 'A long dress or a skirt, with leggings tied above the knee and moccasins. Their hair is loose or tied in a bunch down the back.', ...WC },
        { look: 'Red and blue cloth', fact: 'Wool cloth came from European traders. The colours here are our drawing, taken from portraits of three Mohawk leaders and one Mahican leader painted in London in 1710.', src: 'Wikipedia, Four Mohawk Kings', url: 'https://en.wikipedia.org/wiki/Four_Mohawk_Kings' }
      ] }
  ];
  YP.STILLS = [
    { file: 'world-aerial.jpg', short: 'Bay & sand bar', title: 'The bay and its sand bar · c.1680', alt: 'A calm bay behind a long curling bar of sand, with forest to the water, seen from the air',
      what: 'The bay that became Toronto’s harbour. The long bar of sand kept the water calm. Much later, in 1858, a storm cut through the bar and turned it into islands.', real: 'From old maps: the shore and the sand bar. Our drawing: the trees and the light.' },
    { file: 'world-aerial-1.jpg', short: 'Over the sand bar', title: 'Looking in to the shore · c.1680', alt: 'Low over the sand bar and its ponds, looking across the bay to the forest shore',
      what: 'Low over the sand bar, looking across the bay. The bar was sand, ponds and a few trees. Beyond it the forest ran unbroken along the shore.', real: 'From old maps: the bar, its ponds and the shore. Our drawing: how it looked from here.' },
    { file: 'world-beach.jpg', short: 'On the beach', title: 'On the beach · c.1680', alt: 'Bark canoes pulled up on a sandy beach with men, women and children walking, forest on the left and the lake on the right',
      what: 'People travelled this country by water. A bark canoe could carry a family and its goods, and still be lifted out and carried past a waterfall.', real: 'Our drawing: the people, the canoes and what they are doing. Their dress and hair follow written descriptions of Seneca and other Haudenosaunee people.' },
    { file: 'world-beach-1.jpg', short: 'A canoe', title: 'A canoe, close up · c.1680', alt: 'A bark canoe resting on the sand beside driftwood logs, with the forest behind it',
      what: 'A canoe is a frame of thin wood with bark stretched over it. The seams were sealed with sticky tree gum so the water stayed out.', real: 'Our drawing. The shape follows bark canoes of the Great Lakes; this exact canoe is not copied from one that survives.' },
    { file: 'world-village.jpg', short: 'The village lane', title: 'Between the longhouses · c.1680', alt: 'A lane between tall arched houses covered in bark, a red turtle painted on the end of each, with people walking and forest behind',
      what: 'A longhouse was home to several families who were related through their mothers. Each family had its own space along the sides, and shared a fire down the middle with the family across from it.', real: 'From the record: longhouses of bark over poles, bark doors, clan animals painted on the ends. Our drawing: the lane and where each house stands.' },
    { file: 'world-village-1.jpg', short: 'The corn hills', title: 'From the fields · c.1680', alt: 'Small mounds of earth with corn plants in front of bark longhouses',
      what: 'Corn, beans and squash were planted together in little hills of earth. The beans climbed the corn, and the squash leaves shaded the ground. They are called the Three Sisters.', real: 'From the record: there were cornfields round the village. Our drawing: where they were and how big.' }
  ];
})();
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
    if (r.spot && r.spot.length) {   // things that are really in the picture, each with a fact and where the fact is from
      about.append(el('h4', 'spot-head', 'Things to spot')); const ul = el('ul', 'spot');
      for (const s of r.spot) { const li = el('li'); li.append(el('b', null, s.look), document.createTextNode(' ' + s.fact + ' ')); const a = el('a', null, s.src); a.href = s.url; a.target = '_blank'; a.rel = 'noopener'; li.append(a); ul.append(li); }
      about.append(ul);
    }
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
