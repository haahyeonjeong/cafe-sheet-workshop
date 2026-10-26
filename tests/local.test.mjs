import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('로컬 실행은 기존 외부 연결 정보를 무시하고 사용 중인 포트를 피한다', { timeout: 10000 }, async () => {
  const occupied = createServer();
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  const port = occupied.address().port;
  assert.ok(port <= 65515);
  const child = spawn(process.execPath, ['scripts/dev.mjs'], {
    cwd: new URL('../', import.meta.url),
    env: { ...process.env, PORT: String(port), GOOGLE_SERVICE_ACCOUNT_JSON: 'synthetic-invalid-json', GOOGLE_SPREADSHEET_ID: 'synthetic-sheet-id', WORKSHOP_CODE: 'synthetic-code' },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  try {
    const address = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('서버 시작 시간 초과')), 5000);
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
        if (match) { clearTimeout(timer); resolve(match[0]); }
      });
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('서버 조기 종료')); });
    });
    assert.notEqual(new URL(address).port, String(port));
    const config = await (await fetch(`${address}/api/config`)).json();
    assert.equal(config.mode, 'demo');
    assert.equal(config.requiresCode, false);
    const result = await fetch(`${address}/api/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: '09a26af7-cdce-4e8e-92c8-a1fb57c6a313', alias: '로컬 검증', items: [{ id: 'cookie', temperature: '기본', quantity: 1 }] }),
    });
    assert.equal(result.status, 200);
    const receipt = await result.json();
    assert.equal(receipt.mode, 'demo');
    assert.equal(receipt.order.total, 2500);
    assert.equal((await fetch(`${address}/images/americano.jpg`)).status, 200);
    assert.equal((await fetch(`${address}/.env.example`)).status, 404);
  } finally {
    if (child.exitCode === null) { const stopped = once(child, 'exit'); child.kill(); await stopped; }
    await new Promise(resolve => occupied.close(resolve));
  }
});
