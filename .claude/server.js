// Tiny static server for local preview. Not part of the deployed site.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = 5180;

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
};

http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(root, urlPath);
  if (!filePath.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const head = { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    // A browser can only jump about in a video if the server will send it a piece of the file (GitHub Pages does).
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? +m[1] : Math.max(0, data.length - +m[2]), end = m[1] && m[2] ? Math.min(+m[2], data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) { res.writeHead(416, { 'Content-Range': 'bytes */' + data.length }); res.end(); return; }
      res.writeHead(206, { ...head, 'Content-Range': 'bytes ' + start + '-' + end + '/' + data.length, 'Content-Length': end - start + 1 });
      res.end(data.subarray(start, end + 1)); return;
    }
    res.writeHead(200, { ...head, 'Content-Length': data.length });
    res.end(data);
  });
}).listen(port, '127.0.0.1', () => {
  console.log('Serving ' + root + ' at http://127.0.0.1:' + port);
});
