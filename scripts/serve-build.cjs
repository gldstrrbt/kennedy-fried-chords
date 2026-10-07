const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'build');
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webm': 'audio/webm'
};

http.createServer((req, res) => {
  let pathname = decodeURIComponent((req.url || '/').split('?')[0]);
  if (pathname === '/') pathname = '/index.html';
  let file = path.join(root, pathname.replace(/^\/+/, ''));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) file = path.join(root, 'index.html');
    fs.readFile(file, (readErr, data) => {
      if (readErr) { res.writeHead(404); return res.end('Not found'); }
      res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
      res.end(data);
    });
  });
}).listen(port, host, () => {
  console.log(`Production build preview: http://${host}:${port}`);
});
