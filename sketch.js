// Turns a photograph into a coloured sketch, in the browser: pencil lines over a watercolour wash, on paper.
//
// How: the pencil comes from the old darkroom trick of dividing a picture by a blurred negative of itself, which
// leaves only the edges; the wash is the photograph's own colours, softened, lightened and reduced to a few
// tones of light and dark; the deepest shadows are hatched; a little grain stands in for the paper. Nothing is added that is not in
// the photograph: no colour is invented and nothing is drawn in. The photograph itself stays on the page as the
// fallback and can be shown again at any time.
(function () {
  window.YP = window.YP || {};
  function blur(src, w, h, r) { // a box blur, across then down; twice over is close to a soft Gaussian
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h), n = r * 2 + 1;
    for (let pass = 0; pass < 2; pass++) {
      const a = pass ? out : src;
      for (let y = 0; y < h; y++) { let s = 0; const o = y * w; for (let x = -r; x <= r; x++) s += a[o + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[o + x] = s / n; s += a[o + Math.min(w - 1, x + r + 1)] - a[o + Math.max(0, x - r)]; } }
      for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = s / n; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; } }
    }
    return out;
  }
  // img: a loaded <img> from this site. Returns a canvas the same shape, at most `max` pixels on its long side.
  YP.sketch = function (img, max) {
    const k = Math.min(1, (max || 900) / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, w, h);
    const im = g.getImageData(0, 0, w, h), d = im.data, n = w * h;
    const grey = new Float32Array(n), neg = new Float32Array(n), R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
    for (let i = 0; i < n; i++) { R[i] = d[i * 4]; G[i] = d[i * 4 + 1]; B[i] = d[i * 4 + 2]; grey[i] = 0.299 * R[i] + 0.587 * G[i] + 0.114 * B[i]; neg[i] = 255 - grey[i]; }
    const soft = blur(neg, w, h, Math.max(2, Math.round(w / 220)));                    // the blurred negative
    const wr = Math.max(2, Math.round(w / 150)), r2 = blur(R, w, h, wr), g2 = blur(G, w, h, wr), b2 = blur(B, w, h, wr); // the wash
    let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < n; i++) {
      const x = i % w, y = (i - x) / w;
      let line = Math.min(1, grey[i] / Math.max(1, 255 - soft[i])); line = Math.pow(line, 3.2);              // 1 = paper, 0 = pencil
      // The wash keeps the photograph's own hue. Only its lightness is stepped into a few flat tones, as a brush
      // lays them; stepping red, green and blue separately would make colours that are not in the picture.
      let r = r2[i], gg = g2[i], b = b2[i];
      const l = Math.max(1, 0.299 * r + 0.587 * gg + 0.114 * b), step = (Math.round(l / 30) * 30 + 6) / l;
      r *= step; gg *= step; b *= step;
      const l2 = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = l2 + (r - l2) * 1.25; gg = l2 + (gg - l2) * 1.25; b = l2 + (b - l2) * 1.25;                         // a little richer, as wet colour is
      const thin = 0.38 + 0.2 * Math.min(1, l2 / 255);                                                       // thinned with the paper, most in the lights
      r = r * (1 - thin) + 252 * thin; gg = gg * (1 - thin) + 246 * thin; b = b * (1 - thin) + 232 * thin;
      let ink = 0.1 + 0.9 * line;
      if (grey[i] < 70 && (x + y) % 6 < 1) ink *= 0.82;                                                      // one direction of hatching, in the shadows only
      const grain = 0.97 + rnd() * 0.06;
      d[i * 4] = Math.max(0, Math.min(255, r * ink * grain)); d[i * 4 + 1] = Math.max(0, Math.min(255, gg * ink * grain)); d[i * 4 + 2] = Math.max(0, Math.min(255, b * ink * (grain - 0.01)));
    }
    g.putImageData(im, 0, 0);
    return c;
  };
})();
