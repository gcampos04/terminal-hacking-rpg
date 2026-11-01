import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

createServer(async (req, res) => {
  const caminho = new URL(req.url, 'http://local').pathname;
  if (caminho !== '/' && caminho !== '/index.html') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(await readFile(new URL('../index.html', import.meta.url)));
}).listen(4173, '127.0.0.1');
