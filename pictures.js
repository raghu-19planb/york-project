// Next Stop, Toronto, drawn from pictures. For the years it covers, the game is no longer built from shapes as it
// runs: it slides painted pictures past each other, the far ones slowly and the near ones fast.
//
// The pictures are made ahead of time in Blender by tools/blender/game_art.py, which also says what in them is
// sourced (the dated things from scenery.js) and what is drawing (everything else). The years are painted an era
// at a time, each with its own backdrop, ride and things in the way:
//   1690 to 1861  the north shore from the lake; a birchbark canoe; a rock and a drifting log
//   1861 to 1892  the north side of a street; the horsecar; a barrel and a crate
//   1892 to 1954  the same street grown up, with eight landmarks as small models; the electric streetcar
//   1954 to today the street behind an open cut, with seven more landmarks; the subway car, red and then silver
// If the pictures cannot be loaded the game falls back to its older 3D view (scene3d.js) from wherever they stop.
//
// How a backdrop lines up with the clock: it slides at a fraction of the ride's speed (slide) and is drawn at so
// many dots to the metre, so a thing dated to a year is beside the ride in that year. game_art.py places things by
// the same sum (year_x, street_x, town_x, metro_x).
(function () {
  const YP = window.YP = window.YP || {}, G = YP.GEO; if (!G) return;
  const { W, H, GROUND, Y0, PXPY } = G, PX = 150, PIECE = 1620, DIR = 'images/game/';
  const stamp = (document.currentScript && document.currentScript.src.split('?')[1]) || '', q = stamp ? '?' + stamp : '';
  const load = name => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = DIR + name + q; });
  const ERAS = [
    { from: 1690, to: 1861, slide: 0.35, pics: ['shore-0.jpg', 'shore-1.jpg', 'shore-2.jpg', 'shore-3.jpg'], water: true, base: 310,
      ride: { pic: 'canoe.png', n: 8, w: 178, below: 0.34, turns: 1.25, dx: 48, dy: 6, bob: 1.4 }, props: ['rock.png', 'log.png'],
      tags: { fort: 118, windmill: 196, tavern: 104, gaslamps: 70, stlawrence: 212, train: 78, uc: 236 }, nudge: { gaslamps: 34 } },
    { from: 1861, to: 1892, slide: 0.6, pics: ['street-0.jpg', 'street-1.jpg'], water: false, base: 396,
      ride: { pic: 'horsecar.png', n: 8, w: 248, below: 0.175, turns: 2.1, dx: 62, dy: 3, bob: 0.7 }, props: ['barrel.png', 'crate.png'],
      tags: { arclamps: 188 }, nudge: {} },
    { from: 1892, to: 1954, slide: 0.6, pics: ['town-0.jpg', 'town-1.jpg', 'town-2.jpg'], water: false, base: 396,
      ride: { pic: 'streetcar.png', n: 6, w: 285, below: 0.047, turns: 1.1, dx: 62, dy: 3, bob: 0.5 }, props: ['barrel.png', 'crate.png'],
      // the landmarks are small models standing in gaps in the row; four finished within four years, so some stand a little past their year (nudge, in dots)
      tags: { queenspark: 300, oldcityhall: 372, casaloma: 300, viaduct: 205, union: 165, royalyork: 372, commerce: 335, gardens: 195 }, nudge: { oldcityhall: 34, viaduct: 105, union: -56, royalyork: 113, commerce: 164, gardens: 381 } },
    // the last era runs a year past the end of the line, so the final moment is still drawn from pictures
    { from: 1954, to: 2027, slide: 0.58, pics: ['metro-0.jpg', 'metro-1.jpg', 'metro-2.jpg'], water: false, base: 396, storm: 1.7,
      ride: { pic: 'subway.png', n: 1, w: 320, below: 0.079, turns: 1, dx: 70, dy: 4, bob: 0.35, later: { from: 1990, pic: 'subway2.png' } }, props: ['cone.png', 'barrier.png'],
      tags: { hazel: 250, cityhall: 372, td: 335, ontarioplace: 175, cntower: 372, eaton: 195, skydome: 200, crystal: 205 }, nudge: { cityhall: -83, td: 76, ontarioplace: 101, cntower: 44, eaton: 229, skydome: 9 } }
  ];
  const view = YP.pictures = { ready: false, until: ERAS[0].from };
  // Each era is ready when all its pictures have arrived; the game uses pictures only up to the last year that is ready.
  ERAS.reduce((before, era) => before.then(() => Promise.all([Promise.all(era.pics.map(load)), load(era.ride.pic), Promise.all(era.props.map(load)), era.ride.later ? load(era.ride.later.pic) : null]))
    .then(([pics, ride, props, later]) => { era.img = pics; era.ride.img = ride; era.prop = props; if (later) era.ride.later.img = later; view.ready = true; view.until = era.to; }), Promise.resolve()).catch(() => { /* the older view carries on from wherever this stopped */ });

  const placeX = (era, year, d) => (year - era.from) * PXPY * era.slide + (PX + 46) - (d - (era.from - Y0) * PXPY) * era.slide;   // where on the screen a year's place in the backdrop is
  function backdrop(ctx, era, d) { const scroll = Math.max(0, d - (era.from - Y0) * PXPY) * era.slide; for (let i = 0; i < era.img.length; i++) { const x = i * PIECE - scroll; if (x < W && x + PIECE > 0) ctx.drawImage(era.img[i], Math.round(x * 2) / 2, 0, PIECE + 0.5, H); } }

  function ripples(ctx, d, t) { // the water close by slides faster than the shore: short pale strokes, four rows deep
    ctx.lineCap = 'round';
    for (let row = 0; row < 4; row++) {
      const y = GROUND - 26 + row * 30, speed = 0.55 + row * 0.2, gap = 150 + row * 46, off = (d * speed) % gap;
      ctx.strokeStyle = 'rgba(255,250,235,' + (0.1 + row * 0.035) + ')'; ctx.lineWidth = 1.6 + row * 0.5; ctx.beginPath();
      for (let x = -off - gap; x < W + gap; x += gap) { const w = 22 + row * 10 + 8 * Math.sin(x * 0.7 + row), yy = y + 3 * Math.sin(t * 1.3 + x * 0.05 + row); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + w / 2, yy - 2.5 - row, x + w, yy); }
      ctx.stroke();
    }
  }
  function ruts(ctx, d) { // the road close by slides faster than the far side of the street: scuffs and stones, three rows deep
    for (let row = 0; row < 3; row++) {
      const y = GROUND + 22 + row * 30, speed = 0.8 + row * 0.12, gap = 120 + row * 50, off = (d * speed) % gap;
      for (let x = -off - gap; x < W + gap; x += gap) { const k = Math.sin(x * 12.9898 + row * 78.233) * 43758.5453, r = k - Math.floor(k); ctx.fillStyle = r < 0.5 ? 'rgba(70,52,36,0.2)' : 'rgba(255,240,215,0.2)'; ctx.fillRect(x + r * 40, y + r * 9, 16 + r * 34 + row * 8, 2 + row); }
    }
  }
  function sprite(ctx, img, sx, sw, x, line, w, h, below, water) { // a picture standing on the water or the road at (x, line)
    const top = line - h * (1 - below);
    if (water) { // a faint upside-down copy under it, and nothing shown of what is under the water (a paddle's blade, the foot of a rock)
      ctx.save(); ctx.beginPath(); ctx.rect(0, line, W, H - line); ctx.clip(); ctx.globalAlpha = 0.2; ctx.translate(0, line * 2 - 2); ctx.scale(1, -1); ctx.drawImage(img, sx, 0, sw, img.height, x - w / 2, top, w, h); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, line + 3); ctx.clip(); ctx.drawImage(img, sx, 0, sw, img.height, x - w / 2, top, w, h); ctx.restore();
    } else { // on the road: a soft shadow under it
      ctx.fillStyle = 'rgba(40,28,18,0.22)'; ctx.beginPath(); ctx.ellipse(x, line + 2, w * 0.46, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.drawImage(img, sx, 0, sw, img.height, x - w / 2, top, w, h);
    }
  }

  view.draw = function (ctx, S, d, yr, drawToken) {
    const t = S.state === 'menu' ? performance.now() / 1000 : S.t || 0, at = Math.max(0, ERAS.findIndex(e => yr < e.to)), era = ERAS[at], next = ERAS[at + 1];
    ctx.imageSmoothingQuality = 'high';
    backdrop(ctx, era, d);
    if (next && next.img && yr > era.to - 0.7) { ctx.globalAlpha = Math.min(1, (yr - (era.to - 0.7)) / 0.7); backdrop(ctx, next, 0); ctx.globalAlpha = 1; }   // the next era comes up through the last months of this one
    // name tags over the dated things
    ctx.font = '600 12px "Anek Latin", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const s of YP.SCENERY || []) {
      const lift = era.tags[s.id]; if (!lift) continue; const x = placeX(era, s.at, d) + (era.nudge[s.id] || 0); if (x < -140 || x > W + 140) continue;
      const text = s.label + ' · ' + s.title, w = ctx.measureText(text).width + 16, y = era.base - lift;
      ctx.fillStyle = 'rgba(22,19,15,0.86)'; ctx.fillRect(x - w / 2, y - 11, w, 22); ctx.fillRect(x - 0.75, y + 11, 1.5, 12);
      ctx.fillStyle = '#fff6e5'; ctx.fillText(text, x, y + 1);
    }
    if (era.storm && yr < era.from + era.storm) { // Hurricane Hazel, October 1954: the sky darkens and rain drives across for the era's first months
      const k = Math.min(1, (era.from + era.storm - yr) / 0.5) * Math.min(1, (yr - era.from + 0.7) / 0.5); ctx.fillStyle = 'rgba(38,46,58,' + 0.5 * k + ')'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(215,228,240,' + 0.45 * k + ')'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let i = 0; i < 150; i++) { const h1 = Math.sin(i * 12.9898) * 43758.5453, h2 = Math.sin(i * 78.233) * 12543.123, x = ((h1 - Math.floor(h1)) * (W + 300) - (t * 520) % (W + 300) + W + 300) % (W + 300) - 60, y = ((h2 - Math.floor(h2)) * H + t * 900) % H; ctx.moveTo(x, y); ctx.lineTo(x - 13, y + 30); }
      ctx.stroke();
    }
    if (era.water) ripples(ctx, d, t); else ruts(ctx, d);
    if (S.state !== 'menu') {
      for (const o of S.obstacles || []) { // the things in the way, at the ride's distance; each belongs to the era of its own year
        const sx = PX + 46 + (o.d0 - d); if (sx < -80 || sx > W + 60) continue;
        const oy = Y0 + o.d0 / PXPY, own = ERAS.find(e => oy < e.to) || era; if (!own.prop) continue;
        sprite(ctx, own.prop[o.k < 0.5 ? 0 : 1], 0, own.prop[0].width, sx + 15, GROUND + 4 + (own.water ? 1.5 * Math.sin(t * 2 + o.d0) : 0), 60, 40, own.water ? 0.3 : 0.23, own.water);
      }
      for (const tk of S.tokens || []) { const sx = PX + 46 + (tk.d0 - d); if (!tk.got && sx > -40 && sx < W + 40) drawToken(sx, tk); }
    }
    if (!(S.safe > 0 && Math.floor(t * 12) % 2)) { // the ride: eight pictures of one stroke or stride, turned over in time
      const r = era.ride, pic = r.later && yr >= r.later.from ? r.later.img : r.img, fw = pic.width / r.n, f = Math.floor((t * r.turns % 1) * r.n) % r.n, y = GROUND + r.dy + Math.sin(t * 2.6) * r.bob - (S.jy || 0), h = r.w * pic.height / fw;
      if (era.water && !S.jy) { ctx.strokeStyle = 'rgba(255,250,235,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let k = 0; k < 3; k++) { const wx = PX + r.dx - 80 - k * 26 - (t * 40 % 26); ctx.moveTo(wx, y + 5 + k * 2); ctx.quadraticCurveTo(wx + 9, y + 1 + k * 2, wx + 18, y + 5 + k * 2); } ctx.stroke(); } // the wake
      if (!era.water && !S.jy) { ctx.fillStyle = 'rgba(190,160,120,0.35)'; for (let k = 0; k < 4; k++) { const a = (t * 1.6 + k * 0.25) % 1; ctx.beginPath(); ctx.arc(PX + r.dx - 78 - a * 46, y - 3 - a * 9, 3 + a * 8, 0, Math.PI * 2); ctx.globalAlpha = 1 - a; ctx.fill(); } ctx.globalAlpha = 1; } // dust from the wheels
      sprite(ctx, pic, f * fw, fw, PX + r.dx, y, r.w, h, r.below, era.water);
    }
    const banner = document.getElementById('banner');
    if (banner) { const on = !!(S.banner && S.t < S.banner.until); banner.hidden = !on; if (on) banner.textContent = S.banner.text; }
  };
})();
