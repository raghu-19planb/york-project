// The landscape behind the ride. Everything here is a function of the year.
//
// - How built-up the city is comes from census counts (YP.POPULATION).
// - Dated landmarks and street lighting come from YP.SCENERY and appear in
//   the year they are dated to, with a caption.
// - Ordinary buildings, people, carts, cars and ships are illustrative: an
//   impression of the period that shifts gradually, decade by decade.
(function () {
  const GEO = YP.GEO = { W: 960, H: 540, GROUND: 430, Y0: 1690, Y1: 2026, PXPY: 92 };
  const { W, GROUND, Y0, PXPY } = GEO;
  const BASE = GROUND - 12;
  const C = YP.C;
  let ctx, T = 0;

  const hash = (i, s) => { const x = Math.sin(i * 127.1 + (s || 0) * 311.7 + 74.7) * 43758.5453; return x - Math.floor(x); };
  const clamp = (v, a, b) => Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 1 : b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => { const A = hex(a), B = hex(b); return 'rgb(' + A.map((v, i) => Math.round(lerp(v, B[i], k))).join(',') + ')'; };
  const pick = (arr, k) => arr[Math.min(arr.length - 1, Math.floor(k * arr.length))];
  const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.fill(); };
  const disc = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const smoke = (x, y, seed, size) => {
    for (let k = 0; k < 3; k++) {
      const s = (T * 14 + seed * 13 + k * 14) % 42;
      disc(x + s * 0.5, y - s, (size || 6) + s * 0.22, 'rgba(90,85,80,' + (0.34 - s * 0.007) + ')');
    }
  };

  // ---------- sky ----------
  const SKY = [
    [1690, '#f2c894', '#fbeedb'], [1850, '#cfd8d2', '#efe8d8'], [1905, '#b5ada0', '#e6dcc8'],
    [1960, '#8ec3dd', '#e4f1f2'], [2026, '#5b79a6', '#f3c9a0']
  ];
  function sky(year) {
    let i = 0;
    while (i < SKY.length - 2 && year > SKY[i + 1][0]) i++;
    const a = SKY[i], b = SKY[i + 1], k = clamp((year - a[0]) / (b[0] - a[0]));
    return [mix(a[1], b[1], k), mix(a[2], b[2], k)];
  }

  // ---------- growth, paced by census counts ----------
  const POP = YP.POPULATION.counts;
  const L0 = 3.5, L1 = Math.log10(POP[POP.length - 1][1]);
  const lv = p => (Math.log10(p) - L0) / (L1 - L0);
  function dev(year) { // 0 = no town, 1 = today's city
    if (year <= 1793) return 0;
    if (year < POP[0][0]) return lv(POP[0][1]) * (year - 1793) / (POP[0][0] - 1793);
    for (let i = 0; i < POP.length - 1; i++)
      if (year < POP[i + 1][0]) return lerp(lv(POP[i][1]), lv(POP[i + 1][1]), (year - POP[i][0]) / (POP[i + 1][0] - POP[i][0]));
    return 1;
  }
  YP.land = { dev, hash, sky, clamp, pick }; // shared with scene3d.js
  YP.populationAt = year => { let r = null; for (const c of POP) if (c[0] <= year) r = c; return r; };

  // A layer scrolls at `par` of the foreground speed. A slot's year is the
  // year in which it sits at mid-screen.
  const slotYear = (i, SL, par) => Y0 + ((i * SL - 480) / par) / PXPY;
  const slotFor = (year, SL, par) => Math.round(((year - Y0) * PXPY * par + 480) / SL);

  function tag(x, y, text) {
    ctx.font = '600 10px "IBM Plex Mono", monospace';
    const w = ctx.measureText(text).width + 10;
    rect(x - w / 2, y - 15, w, 15, C.paper);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2 + 0.5, y - 14.5, w - 1, 14);
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y - 4);
  }

  // ---------- dated landmarks (YP.SCENERY) ----------
  const LANDMARK = {
    fort(x, b) {
      for (let k = 0; k < 9; k++) poly([x + k * 8, b, x + k * 8, b - 20, x + k * 8 + 4, b - 26, x + k * 8 + 8, b - 20, x + k * 8 + 8, b], '#7a5a3a');
      rect(x + 22, b - 40, 28, 40, '#6b4a2e'); rect(x + 17, b - 58, 38, 20, '#7a5a3a');
      poly([x + 14, b - 58, x + 36, b - 74, x + 58, b - 58], '#4b3a2c');
      rect(x + 60, b - 96, 2, 96, C.ink);
      const f = Math.sin(T * 5) * 2;
      poly([x + 62, b - 96, x + 84, b - 93 + f, x + 62, b - 82], C.red);
      return 100;
    },
    windmill(x, b) {
      poly([x + 18, b, x + 26, b - 78, x + 40, b - 78, x + 48, b], '#b9a27e');
      poly([x + 22, b - 78, x + 33, b - 92, x + 44, b - 78], '#4b3a2c');
      rect(x + 29, b - 20, 8, 20, '#4b3a2c');
      ctx.save(); ctx.translate(x + 33, b - 80); ctx.rotate(T * 0.8);
      for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); rect(-2, 0, 4, 46, C.ink); rect(2, 12, 9, 32, 'rgba(243,236,221,0.9)'); }
      ctx.restore();
      return 132;
    },
    oldcityhall(x, b) {
      rect(x - 6, b - 62, 78, 62, '#c9a57c');
      poly([x - 10, b - 62, x + 4, b - 78, x + 62, b - 78, x + 76, b - 62], '#6f5a48');
      rect(x + 22, b - 150, 22, 150, '#c9a57c');
      poly([x + 19, b - 150, x + 33, b - 184, x + 47, b - 150], '#6f5a48');
      disc(x + 33, b - 132, 7, C.paper); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x + 33, b - 132); ctx.lineTo(x + 33, b - 137); ctx.moveTo(x + 33, b - 132); ctx.lineTo(x + 36, b - 131); ctx.stroke();
      for (let k = 0; k < 5; k++) { ctx.fillStyle = '#4b3a2c'; ctx.beginPath(); ctx.arc(x + 2 + k * 15, b - 26, 4, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 2 + k * 15, b - 26, 8, 12); }
      return 190;
    },
    royalyork(x, b) {
      rect(x - 4, b - 90, 72, 90, '#cbbf9f'); rect(x + 10, b - 128, 44, 40, '#cbbf9f');
      poly([x + 8, b - 128, x + 32, b - 156, x + 56, b - 128], '#6f9a86');
      poly([x - 6, b - 90, x + 2, b - 100, x + 10, b - 90], '#6f9a86'); poly([x + 54, b - 90, x + 62, b - 100, x + 70, b - 90], '#6f9a86');
      ctx.fillStyle = 'rgba(23,32,43,0.45)';
      for (let wy = b - 120; wy < b - 10; wy += 12) for (let wx = x + 2; wx < x + 64; wx += 9) if (wy > b - 86 || (wx > x + 12 && wx < x + 50)) ctx.fillRect(wx, wy, 4, 6);
      return 162;
    },
    commerce(x, b) {
      rect(x + 6, b - 110, 52, 110, '#d2c6a8'); rect(x + 14, b - 170, 36, 60, '#d2c6a8'); rect(x + 21, b - 205, 22, 36, '#d2c6a8');
      rect(x + 26, b - 214, 12, 10, '#a89a78');
      ctx.fillStyle = 'rgba(23,32,43,0.4)';
      for (let wy = b - 198; wy < b - 8; wy += 9) { const m = wy < b - 170 ? 24 : wy < b - 110 ? 17 : 9; for (let wx = x + m; wx < x + 64 - m; wx += 6) ctx.fillRect(wx, wy, 2.5, 5); }
      return 220;
    },
    cityhall(x, b) {
      const tower = (cx, h, dir) => {
        ctx.fillStyle = '#e8e2d2'; ctx.beginPath();
        ctx.moveTo(cx, b); ctx.lineTo(cx, b - h); ctx.quadraticCurveTo(cx + dir * 16, b - h, cx + dir * 20, b - h + 6);
        ctx.lineTo(cx + dir * 20, b); ctx.fill();
        ctx.fillStyle = 'rgba(23,32,43,0.3)';
        for (let wy = b - h + 10; wy < b - 6; wy += 7) ctx.fillRect(Math.min(cx, cx + dir * 17), wy, 17, 2.5);
      };
      tower(x + 4, 128, 1); tower(x + 62, 102, -1);
      ctx.fillStyle = '#d6cfbd'; ctx.beginPath(); ctx.ellipse(x + 33, b - 16, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
      rect(x + 30, b - 12, 6, 12, '#b9b2a3');
      return 134;
    },
    td(x, b) {
      rect(x + 10, b - 232, 44, 232, '#22262b');
      ctx.fillStyle = 'rgba(180,190,200,0.25)';
      for (let wx = x + 13; wx < x + 52; wx += 5) ctx.fillRect(wx, b - 228, 1.5, 224);
      return 238;
    },
    cntower(x, b) {
      poly([x + 20, b, x + 29, 150, x + 37, 150, x + 46, b], '#6b7780');
      ctx.fillStyle = '#3d4750'; ctx.beginPath(); ctx.ellipse(x + 33, 150, 20, 9, 0, 0, Math.PI * 2); ctx.fill();
      rect(x + 21, 132, 24, 14, '#3d4750'); rect(x + 30, 70, 6, 64, '#6b7780'); rect(x + 32, 22, 2, 50, '#6b7780');
      return b - 16;
    },
    skydome(x, b) {
      rect(x - 22, b - 26, 112, 26, '#c9c4b8');
      ctx.fillStyle = '#f1eee6'; ctx.beginPath(); ctx.ellipse(x + 34, b - 26, 56, 34, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = 'rgba(23,32,43,0.35)'; ctx.lineWidth = 1;
      for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + 34, b - 26, 56 - k * 14, 34, 0, Math.PI, 0); ctx.stroke(); }
      return 66;
    }
  };
  const SL = 64, PAR = 0.5;
  const landmarkAt = {}, slotOf = {};
  for (const s of YP.SCENERY) {
    if (!LANDMARK[s.id]) continue;
    let i = slotFor(s.at, SL, PAR);
    while (landmarkAt[i]) i++;
    landmarkAt[i] = s; slotOf[s.id] = i;
  }
  const byId = {}; YP.SCENERY.forEach(s => { byId[s.id] = s; });

  // ---------- ordinary buildings (illustrative) ----------
  function trees(x, i, yr) {
    if (yr < 1865) {
      for (let k = 0; k < 2; k++) {
        const tx = x + 14 + k * 30, th = 60 + hash(i * 2 + k, 1) * 70;
        poly([tx, BASE - th, tx + 18, BASE, tx - 18, BASE], k ? '#3f6b52' : '#2f5a45');
      }
    } else {
      rect(x + 30, BASE - 26, 4, 26, '#5a4332');
      disc(x + 32, BASE - 36, 17, '#5f8f63'); disc(x + 22, BASE - 28, 11, '#4f7f57');
    }
  }
  function cabin(x, h2) {
    rect(x + 10, BASE - 24, 42, 24, '#7a5a3a');
    ctx.fillStyle = 'rgba(23,32,43,0.3)'; for (let y = BASE - 20; y < BASE; y += 6) ctx.fillRect(x + 10, y, 42, 1.5);
    poly([x + 5, BASE - 24, x + 31, BASE - 42, x + 57, BASE - 24], '#4b3a2c');
    rect(x + 42, BASE - 46, 6, 14, '#5a5148');
    if (h2 > 0.4) smoke(x + 45, BASE - 50, h2 * 9, 4);
    rect(x + 26, BASE - 14, 8, 14, '#3a2c20');
  }
  function house(x, h, h2) {
    const bh = 30 + h2 * 24;
    rect(x + 8, BASE - bh, 46, bh, h > 0.6 ? '#d9c9a8' : h > 0.3 ? '#9c7a55' : '#a85f4b');
    poly([x + 3, BASE - bh, x + 31, BASE - bh - 20, x + 59, BASE - bh], '#4b3a2c');
    if (h2 > 0.9) poly([x + 26, BASE - bh - 18, x + 31, BASE - bh - 70, x + 36, BASE - bh - 18], '#4b3a2c');
    rect(x + 16, BASE - bh + 10, 8, 10, C.paper); rect(x + 38, BASE - bh + 10, 8, 10, C.paper);
  }
  function brick(x, i, h, h2, dv, yr, year) {
    const bh = 46 + dv * 150 * (0.45 + h * 0.55);
    const burnt = Math.abs(yr - 1904.3) < 0.9;
    rect(x + 3, BASE - bh, 58, bh, burnt ? '#3a2e2a' : pick(['#8c4a3a', '#a0604a', '#6f4034', '#b07a5a'], h2));
    ctx.fillStyle = burnt ? 'rgba(0,0,0,0.5)' : 'rgba(243,236,221,0.75)';
    for (let wy = BASE - bh + 12; wy < BASE - 14; wy += 20) for (let wx = x + 10; wx < x + 52; wx += 15) ctx.fillRect(wx, wy, 7, 10);
    if (burnt && Math.abs(year - 1904.3) < 2.2) {
      for (let k = 0; k < 4; k++) {
        const fx = x + 10 + k * 13, fh = 18 + Math.abs(Math.sin(T * 9 + k * 2 + i)) * 26;
        poly([fx - 7, BASE - bh, fx, BASE - bh - fh, fx + 7, BASE - bh], k % 2 ? '#e8762c' : '#f2b233');
      }
      smoke(x + 30, BASE - bh - 30, i, 12);
    } else if (h2 > 0.5 && yr < 1965) {
      rect(x + 44, BASE - bh - 26, 9, 26, '#4b3a2c');
      smoke(x + 48, BASE - bh - 32, i, 7);
    }
  }
  function deco(x, h, h2, dv) {
    const bh = 90 + dv * 190 * h, col = pick(['#cbbf9f', '#d6ccb2', '#bcae8e'], h2);
    rect(x + 4, BASE - bh * 0.62, 56, bh * 0.62, col); rect(x + 12, BASE - bh * 0.88, 40, bh * 0.3, col); rect(x + 20, BASE - bh, 24, bh * 0.14, col);
    ctx.fillStyle = 'rgba(23,32,43,0.38)';
    for (let wy = BASE - bh * 0.84; wy < BASE - 10; wy += 11) { const m = wy < BASE - bh * 0.62 ? 15 : 8; for (let wx = x + m; wx < x + 62 - m; wx += 7) ctx.fillRect(wx, wy, 3, 6); }
  }
  function slab(x, h, h2, dv) {
    const bh = 110 + dv * 200 * h;
    rect(x + 6, BASE - bh, 50, bh, pick(['#5d7f93', '#44627a', '#7fa3b3', '#2f4658', '#8a8f86'], h2));
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (let wy = BASE - bh + 8; wy < BASE - 8; wy += 12) ctx.fillRect(x + 10, wy, 42, 4);
  }
  function condo(x, i, h, h2) {
    const bh = 150 + 170 * h;
    rect(x + 10, BASE - bh, 42, bh, pick(['#9fc0cc', '#b8cdd2', '#7e9fae', '#c9d6d4'], h2));
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let wy = BASE - bh + 6; wy < BASE - 6; wy += 8) ctx.fillRect(x + 8, wy, 46, 2);
    rect(x + 28, BASE - bh - 10, 8, 10, '#6b7780');
    if (hash(i, 7) > 0.86) { // a tower crane
      rect(x + 56, BASE - bh - 40, 2, bh + 40, '#d9a21e'); rect(x + 30, BASE - bh - 40, 60, 2, '#d9a21e');
      rect(x + 84, BASE - bh - 40, 1, 26, C.ink);
    }
  }

  function buildings(d, year) {
    const off = d * PAR, i0 = Math.floor(off / SL);
    const tags = [];
    for (let i = i0 - 2; i < i0 + 18; i++) {
      const x = i * SL - off, yr = slotYear(i, SL, PAR);
      const h = hash(i), h2 = hash(i, 2), dv = dev(yr);
      const lm = landmarkAt[i];
      if (lm) { const top = LANDMARK[lm.id](x, BASE); tags.push([x + 33, BASE - top - 6, lm.title + ' · ' + lm.label]); continue; }
      const forest = clamp(1 - (yr - 1790) / 75, 0.07, 1);
      if (h < forest) { trees(x, i, yr); continue; }
      const t = yr + (hash(i, 3) - 0.5) * 30; // styles overlap by about a generation
      if (t < 1822) cabin(x, h2);
      else if (t < 1862) house(x, hash(i, 4), h2);
      else if (t < 1912) brick(x, i, hash(i, 4), h2, dv, yr, year);
      else if (t < 1960) (hash(i, 4) > 0.45 ? deco(x, hash(i, 5), h2, dv) : brick(x, i, hash(i, 5), h2, dv, yr, year));
      else if (t < 2002) (hash(i, 4) > 0.25 ? slab(x, hash(i, 5), h2, dv) : deco(x, hash(i, 5), h2, dv));
      else (hash(i, 4) > 0.4 ? condo(x, i, hash(i, 5), h2) : slab(x, hash(i, 5), h2, dv));
    }
    for (const t of tags) tag(t[0], Math.max(t[1], 118), t[2]);
  }

  // ---------- street life (illustrative, except the lamps) ----------
  function person(x, yr, k) {
    const b = BASE, early = yr < 1793, soldier = !early && yr < 1816 && k > 0.6, skirt = !early && !soldier && k < 0.45 && yr < 1925;
    const body = early ? '#6b4a2e' : soldier ? C.red : yr < 1900 ? pick(['#3a3530', '#5a4636', '#6f4034', '#2f4658'], k)
      : yr < 1960 ? pick(['#3a3530', '#6b5a46', '#44627a', '#7a3b3b'], k)
        : pick(['#b8232f', '#2f6f8f', '#e9b44c', '#3a3530', '#4f7f57', '#8a5fa0'], k);
    if (skirt) poly([x, b - 20, x - 7, b, x + 7, b], body);
    else { rect(x - 3, b - 20, 6, 11, body); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 2, b - 9); ctx.lineTo(x - 3, b); ctx.moveTo(x + 2, b - 9); ctx.lineTo(x + 3, b); ctx.stroke(); }
    disc(x, b - 24, 3.5, '#d9b79a');
    if (early) return;
    if (soldier) rect(x - 3, b - 33, 6, 7, C.ink);
    else if (!skirt && yr < 1915) { rect(x - 3, b - 34, 6, 7, C.ink); rect(x - 5, b - 28, 10, 1.5, C.ink); }
    else if (yr < 1962) { rect(x - 5, b - 28, 10, 1.5, C.ink); rect(x - 3, b - 31, 6, 3, skirt ? '#7a3b3b' : C.ink); }
    else if (k > 0.7) rect(x - 6, b - 19, 3, 8, '#44627a'); // backpack
  }
  function wheel(x, r) { disc(x, BASE - r, r, C.ink); disc(x, BASE - r, r * 0.4, '#b9b2a3'); }
  function cart(x, k) {
    rect(x, BASE - 20, 30, 10, '#8a5a33'); wheel(x + 6, 7); wheel(x + 24, 7);
    ctx.fillStyle = '#6b4526'; ctx.beginPath(); ctx.ellipse(x + 46, BASE - 17, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
    poly([x + 53, BASE - 20, x + 59, BASE - 30, x + 63, BASE - 26, x + 57, BASE - 16], '#6b4526');
    ctx.strokeStyle = '#6b4526'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (const lx of [38, 43, 50, 54]) { ctx.moveTo(x + lx, BASE - 14); ctx.lineTo(x + lx, BASE); }
    ctx.stroke();
    if (k > 0.5) rect(x + 4, BASE - 30, 22, 10, '#c79a66');
  }
  function car(x, yr, k) {
    const b = BASE;
    if (yr < 1936) { rect(x, b - 17, 36, 10, '#1f2226'); rect(x + 12, b - 29, 18, 13, '#1f2226'); rect(x + 15, b - 26, 12, 7, '#cfe0e4'); wheel(x + 7, 6); wheel(x + 29, 6); }
    else if (yr < 1960) {
      const c = pick(['#6f2f2f', '#2f5a45', '#d9c9a8', '#2f4658'], k);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x + 22, b - 12, 23, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 22, b - 19, 12, 8, 0, Math.PI, 0); ctx.fill(); rect(x + 14, b - 24, 16, 5, '#cfe0e4'); wheel(x + 9, 5); wheel(x + 35, 5);
    } else if (yr < 1990) {
      const c = pick(['#c79a2a', '#7a4a2a', '#3f6f8f', '#b8232f', '#d9d2c2'], k);
      rect(x, b - 15, 54, 9, c); poly([x + 12, b - 15, x + 18, b - 24, x + 38, b - 24, x + 44, b - 15], c); rect(x + 19, b - 22, 18, 6, '#cfe0e4'); wheel(x + 10, 5); wheel(x + 44, 5);
    } else {
      const c = pick(['#b9bec4', '#f1eee6', '#b8232f', '#3d4750', '#2f6f8f'], k);
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, b - 6); ctx.lineTo(x + 2, b - 15); ctx.lineTo(x + 12, b - 17); ctx.lineTo(x + 18, b - 26); ctx.lineTo(x + 36, b - 26);
      ctx.lineTo(x + 44, b - 17); ctx.lineTo(x + 48, b - 14); ctx.lineTo(x + 48, b - 6); ctx.fill(); rect(x + 19, b - 24, 17, 7, '#cfe0e4'); wheel(x + 10, 5); wheel(x + 38, 5);
    }
  }
  function bike(x, yr, k) {
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    for (const wx of [x, x + 20]) { ctx.beginPath(); ctx.arc(wx, BASE - 7, 7, 0, Math.PI * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(x, BASE - 7); ctx.lineTo(x + 9, BASE - 18); ctx.lineTo(x + 20, BASE - 7); ctx.moveTo(x + 9, BASE - 18); ctx.lineTo(x + 17, BASE - 20); ctx.stroke();
    rect(x + 6, BASE - 31, 6, 13, pick(['#b8232f', '#2f6f8f', '#e9b44c'], k)); disc(x + 9, BASE - 35, 3.5, '#d9b79a');
  }
  function ship(x, yr, k) {
    const b = BASE + 4;
    if (yr > 1832 && k > 0.5) { // steamer
      poly([x, b - 12, x + 78, b - 12, x + 70, b, x + 8, b], '#2a2f35'); rect(x + 14, b - 24, 46, 12, C.paper);
      rect(x + 32, b - 46, 9, 22, '#b8232f'); rect(x + 32, b - 46, 9, 5, C.ink); smoke(x + 36, b - 50, x, 6);
      if (yr < 1900) disc(x + 38, b - 6, 10, '#6b4526');
    } else { // schooner
      poly([x, b - 10, x + 70, b - 10, x + 60, b, x + 8, b], '#4b3a2c');
      rect(x + 22, b - 74, 2, 64, C.ink); rect(x + 46, b - 62, 2, 52, C.ink);
      poly([x + 25, b - 72, x + 25, b - 16, x + 44, b - 16], C.paper); poly([x + 49, b - 60, x + 49, b - 16, x + 64, b - 16], C.paper);
      poly([x + 21, b - 70, x + 21, b - 18, x + 4, b - 18], '#e9dfca');
    }
  }
  function canoeAshore(x) {
    ctx.fillStyle = C.wood; ctx.beginPath(); ctx.moveTo(x, BASE - 8); ctx.quadraticCurveTo(x + 24, BASE + 4, x + 48, BASE - 8);
    ctx.quadraticCurveTo(x + 24, BASE - 3, x, BASE - 8); ctx.fill();
  }
  function lamp(x, yr, first) {
    const b = BASE;
    if (yr < 1883) { rect(x, b - 30, 2, 30, C.ink); poly([x - 4, b - 30, x - 3, b - 39, x + 5, b - 39, x + 6, b - 30], C.ink); disc(x + 1, b - 34, 2.5, '#f2c14e'); }
    else if (yr < 1950) {
      rect(x, b - 58, 2.5, 58, '#3a3530'); ctx.strokeStyle = '#3a3530'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x + 1, b - 56); ctx.quadraticCurveTo(x + 12, b - 64, x + 16, b - 54); ctx.stroke(); disc(x + 16, b - 50, 4.5, '#fff6d6');
      rect(x - 9, b - 52, 20, 2, '#3a3530');
    } else { rect(x, b - 62, 2, 62, '#8a9096'); rect(x, b - 62, 18, 2, '#8a9096'); rect(x + 12, b - 60, 8, 3, '#f1eee6'); }
    if (first) tag(x + 4, b - 70, first.title + ' · ' + first.label);
  }

  function life(d) {
    const SL2 = 96, P2 = 0.8, off = d * P2, j0 = Math.floor(off / SL2);
    const even = n => n + (n % 2); // lamps stand on even slots
    const gas = even(slotFor(byId.gaslamps.at, SL2, P2)), arc = even(slotFor(byId.arclamps.at, SL2, P2));
    for (let j = j0 - 1; j < j0 + 12; j++) {
      const x = j * SL2 - off, yr = slotYear(j, SL2, P2), r = hash(j, 11), k = hash(j, 12);
      if (j >= gas && j % 2 === 0) lamp(x + 70, yr, j === gas ? byId.gaslamps : j === arc ? byId.arclamps : null);
      if (yr < 1793) { if (r < 0.12) { canoeAshore(x + 10); person(x + 66, yr, k); } continue; }
      const busy = 0.25 + dev(yr) * 0.6; // more people on the street as the city grows
      if (r > busy) continue;
      const q = hash(j, 13);
      if (yr < 1861 && q < 0.22 && yr > 1800) ship(x, yr, k);
      else if (yr < 1925 && q < 0.42) cart(x + 6, k);
      else if (yr >= 1908 && q < 0.6) car(x + 10, yr, k);
      else if ((yr > 1890 && yr < 1905 || yr > 1995) && q < 0.72) bike(x + 20, yr, k);
      else { person(x + 24, yr, k); if (k > 0.35) person(x + 40, yr, hash(j, 14)); if (k > 0.8 && yr > 1850) person(x + 58, yr, hash(j, 15)); }
    }
  }

  // ---------- one-off moments ----------
  function train(year) {
    const s = byId.train, k = (year - (s.at - 0.5)) / 1.9;
    if (k < 0 || k > 1) return;
    const x = W - k * (W + 260), b = BASE;
    rect(x, b - 26, 50, 18, '#1f2226'); rect(x + 34, b - 40, 18, 16, '#1f2226'); rect(x + 6, b - 42, 8, 18, '#1f2226'); poly([x + 2, b - 42, x + 18, b - 42, x + 14, b - 50, x + 6, b - 50], '#1f2226');
    poly([x - 12, b - 6, x, b - 16, x, b - 6], '#1f2226'); smoke(x + 10, b - 54, 3, 9);
    for (const wx of [10, 24, 42]) { disc(x + wx, b - 7, 7, C.red); disc(x + wx, b - 7, 2.5, C.ink); }
    for (let c = 0; c < 2; c++) { const cx = x + 58 + c * 62; rect(cx, b - 34, 56, 26, '#7a4a2a'); rect(cx, b - 38, 56, 4, C.ink); ctx.fillStyle = C.paper; for (let w = 0; w < 5; w++) ctx.fillRect(cx + 5 + w * 10, b - 28, 6, 9); wheel(cx + 10, 5); wheel(cx + 46, 5); }
    tag(x + 80, b - 62, s.title + ' · 16 May ' + s.label);
  }
  function battle(d, year) { // the magazine explosion of 27 April 1813
    const k = (year - 1813.25) / 1.2;
    if (k < 0 || k > 1) return;
    const x = slotOf.fort * SL - d * PAR + 40;
    for (let n = 0; n < 7; n++) disc(x + Math.sin(n * 2.4) * 30 * k, BASE - 40 - n * 22 * k - k * 60, 14 + n * 4 * k + k * 16, 'rgba(70,64,60,' + (0.5 * (1 - k)) + ')');
    if (k < 0.25) disc(x, BASE - 40, 26 * (1 - k * 3), 'rgba(242,178,51,0.8)');
  }

  // ---------- entry point ----------
  YP.drawLandscape = function (c, d, year, t) {
    ctx = c; T = t;
    const [top, bot] = sky(year);
    const g = ctx.createLinearGradient(0, 0, 0, GROUND);
    g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, GEO.H);
    const glow = clamp(1 - Math.abs(year - 1904.3) / 1.6);
    if (glow > 0) rect(0, 0, W, GROUND, 'rgba(226,96,32,' + glow * 0.4 + ')');
    disc(760, 120, 44, 'rgba(255,244,214,0.75)');
    buildings(d, year);
    battle(d, year);
    life(d);
    train(year);
  };
})();
