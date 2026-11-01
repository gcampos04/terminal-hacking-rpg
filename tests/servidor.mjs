import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const salas = new Map();
const sala = (nome) => { if (!salas.has(nome)) salas.set(nome, { ultimo: null, ouvintes: new Set() }); return salas.get(nome); };
const CORS = { 'access-control-allow-origin': '*' };

async function rele(req, res, url) {
  const [, nome, acao] = url.pathname.match(/^\/rele\/([\w-]+)(?:\/(\w+))?$/) || [];
  if (!nome) { res.writeHead(404, CORS); res.end(); return; }
  const s = sala(nome);
  if (req.method === 'POST') {
    let message = '';
    for await (const parte of req) message += parte;
    s.ultimo = JSON.stringify({ id: 'x', event: 'message', topic: nome, message });
    for (const o of s.ouvintes) o.write('data: ' + s.ultimo + '\n\n');
    res.writeHead(200, CORS); res.end('{}');
  } else if (acao === 'sse') {
    res.writeHead(200, { ...CORS, 'content-type': 'text/event-stream', 'cache-control': 'no-store' });
    res.write('event: open\ndata: {"event":"open"}\n\n');
    s.ouvintes.add(res);
    req.on('close', () => s.ouvintes.delete(res));
  } else {
    res.writeHead(200, CORS); res.end(s.ultimo ? s.ultimo + '\n' : '');
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local'), caminho = url.pathname;
  if (caminho.startsWith('/rele/')) { await rele(req, res, url); return; }
  if (caminho !== '/' && caminho !== '/index.html') { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  const pagina = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  res.end(pagina.replace('<head>', () => '<head><script>window.RELE_URL = "http://127.0.0.1:4173/rele";</script>'));
}).listen(4173, '127.0.0.1');
