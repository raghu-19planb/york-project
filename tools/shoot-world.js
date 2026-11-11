// Retakes the six gallery pictures of the c.1700 world (images/world1700/).
//
//   1. node tools/shoot-world.js          (leave it running; it listens on http://127.0.0.1:5191)
//   2. open world.html in a browser, from a local server
//   3. paste the snippet this script prints into the browser's console
//
// The pictures are drawn by the live model itself (YP.w17.shot in world1700.js), so they are always
// what the world looks like, not something painted separately. The browser posts each one here and
// this script writes it to disk. It only accepts the six file names below, and only from this machine.
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'images', 'world1700');
const SHOTS = [['01-bay.jpg', 0], ['02-humber.jpg', 4], ['03-carrying-place.jpg', 3], ['04-map.jpg', 5], ['05-beach.jpg', 1], ['06-trees.jpg', 2]]; // file, index into VIEWS
const TOWN_OUT = path.join(__dirname, '..', 'images', 'town'); // town.html's five pictures: town-1700.jpg and so on, one camera, five years
const isTown = name => /^town-1[78]\d\d\.jpg$/.test(name);
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(TOWN_OUT, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const name = decodeURIComponent(req.url.slice(1));
  if (req.method !== 'POST' || !(SHOTS.some(s => s[0] === name) || isTown(name))) { res.writeHead(404); return res.end('no'); }
  const parts = [];
  req.on('data', d => parts.push(d));
  req.on('end', () => {
    const buf = Buffer.concat(parts);
    if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) { res.writeHead(400); return res.end('not a JPEG'); }
    fs.writeFileSync(path.join(isTown(name) ? TOWN_OUT : OUT, name), buf);
    console.log('saved', name, Math.round(buf.length / 1024) + ' KB');
    res.writeHead(200); res.end('ok');
  });
}).listen(5191, '127.0.0.1', () => {
  console.log('Listening on http://127.0.0.1:5191. Paste this into the console on world.html:\n');
  console.log('for (const [name, view] of ' + JSON.stringify(SHOTS) + ') await fetch("http://127.0.0.1:5191/" + name, { method: "POST", headers: { "content-type": "image/jpeg" }, body: await YP.w17.shot(view, 1600, 900) });\n');
});
