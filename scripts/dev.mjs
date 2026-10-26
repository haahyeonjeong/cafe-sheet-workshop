import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import configHandler from '../api/config.js';
import ordersHandler from '../api/orders.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
// 로컬 체험에서는 PC에 남아 있는 외부 연결 설정도 사용하지 않는다.
for (const name of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SPREADSHEET_ID', 'GOOGLE_SHEET_NAME', 'WORKSHOP_CODE']) delete process.env[name];
let port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65515) throw new Error('PORT는 1024~65515 사이의 정수여야 합니다.');
const lastPort = port + 20;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const vercel = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); return res; };
  for (const { key, value } of vercel.headers[0].headers) res.setHeader(key, value);
  let url;
  try { url = new URL(req.url, `http://127.0.0.1:${port}`); } catch { res.statusCode = 400; return res.end(); }
  if (url.pathname === '/api/config') return configHandler(req, res);
  if (url.pathname === '/api/orders') {
    const chunks = []; let length = 0;
    try {
      for await (const chunk of req) {
        length += chunk.length;
        if (length > 12000) return res.status(413).json({ error: '주문 내용이 너무 큽니다.' });
        chunks.push(chunk);
      }
      req.body = Buffer.concat(chunks).toString('utf8');
      return await ordersHandler(req, res);
    } catch { if (!res.headersSent) res.status(400).json({ error: '요청을 읽지 못했습니다.' }); return; }
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.statusCode = 405; return res.end(); }
  try {
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = path.resolve(root, `.${relative}`);
    if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) { res.statusCode = 403; return res.end(); }
    const data = await readFile(target);
    res.setHeader('Content-Type', types[path.extname(target)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store'); res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.statusCode = 404; res.end('파일을 찾지 못했습니다.'); }
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < lastPort) {
    port++;
    server.listen(port, '127.0.0.1');
  } else {
    console.error(`로컬 서버 실행 실패: ${error.code || error.name}`);
    process.exitCode = 1;
  }
});
server.on('listening', () => console.log(`카페 주문 실습: http://127.0.0.1:${port} (외부 연결 없는 체험 모드)`));
server.listen(port, '127.0.0.1');
