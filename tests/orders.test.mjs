import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { validateOrder, columns, toSheetRow } from '../lib/order.js';
import { settings, requireSettings } from '../lib/settings.js';
import { saveOrder } from '../lib/sheets.js';
import handler from '../api/orders.js';
import configHandler from '../api/config.js';

const id = '09a26af7-cdce-4e8e-92c8-a1fb57c6a313';
const input = () => ({ orderId: id, alias: '연수생 01', items: [{ id: 'americano', temperature: 'ICE', quantity: 2 }] });
const names = ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_SPREADSHEET_ID', 'GOOGLE_SHEET_NAME', 'WORKSHOP_CODE'];
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
afterEach(() => { for (const name of names) { if (original[name] === undefined) delete process.env[name]; else process.env[name] = original[name]; } });
function clearEnv() { names.forEach(name => delete process.env[name]); }
function response() { return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; }
function req(body = input(), extra = {}) { return { method: 'POST', headers: { 'content-type': 'application/json', host: 'localhost:4173' }, body, ...extra }; }
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
let sequence = 0;
function sheetConfig() { return { credentials: JSON.stringify({ type: 'service_account', client_email: `test${++sequence}@example.iam.gserviceaccount.com`, private_key: privateKey }), spreadsheetId: 'exampleSpreadsheetId0123456789', sheetName: '주문내역' }; }
function mockGoogle(rows = [], appendStatus = 200) {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/token')) return json({ access_token: 'synthetic-token', expires_in: 3600 });
    if (options.method === 'POST') return json({ updates: { updatedRows: 1 } }, appendStatus);
    return json({ values: rows });
  };
  return { calls, fetcher };
}

test('클라이언트가 가격과 합계를 조작해도 서버 카탈로그로 계산한다', () => {
  const body = input(); body.total = 1; body.items[0].price = 1;
  const order = validateOrder(body); assert.equal(order.total, 7000); assert.equal(order.items[0].unitPrice, 3500);
});
test('다른 온도와 디저트 수량도 정확히 합산한다', () => {
  const body = input(); body.items.push({ id: 'cookie', temperature: '기본', quantity: 3 });
  const order = validateOrder(body); assert.equal(order.quantity, 5); assert.equal(order.total, 14500);
});
test('음수·소수·과다 수량, 없는 메뉴, 잘못된 옵션을 거절한다', () => {
  for (const change of [{ quantity: -1 }, { quantity: 1.1 }, { quantity: 21 }, { id: 'fake' }, { temperature: 'WARM' }]) {
    const body = input(); Object.assign(body.items[0], change); assert.throws(() => validateOrder(body));
  }
});
test('중복 품목, 50개 초과, 빈 장바구니를 거절한다', () => {
  const body = input(); body.items.push({ ...body.items[0] }); assert.throws(() => validateOrder(body));
  body.items = ['americano', 'caffe-latte', 'vanilla-latte'].map(id => ({ id, temperature: 'ICE', quantity: 20 })); assert.throws(() => validateOrder(body));
  body.items = []; assert.throws(() => validateOrder(body));
});
test('별칭·주문ID·배열이 아닌 품목을 검증한다', () => {
  for (const change of [{ alias: ' ' }, { alias: '가'.repeat(21) }, { alias: '가\n나' }, { orderId: '../secret' }, { items: {} }]) assert.throws(() => validateOrder({ ...input(), ...change }));
});
test('한국 시각과 8열을 구성하고 수식을 문자열로 유지한다', () => {
  const order = validateOrder({ ...input(), alias: '=1+1' });
  const row = toSheetRow(order, new Date('2026-10-25T15:00:00Z'));
  assert.equal(row.length, 8); assert.equal(row[1], '2026-10-26 00:00:00'); assert.equal(row[3], '=1+1'); assert.equal(row[6], 7000);
});
test('미설정은 체험, 일부 설정은 오류, 전체 설정은 시트 모드이다', () => {
  assert.equal(settings({}).mode, 'demo');
  assert.equal(settings({ GOOGLE_SPREADSHEET_ID: 'id' }).mode, 'setup-required');
  assert.throws(() => requireSettings(settings({ GOOGLE_SPREADSHEET_ID: 'id' })));
  assert.equal(settings({ GOOGLE_SERVICE_ACCOUNT_JSON: '{}', GOOGLE_SPREADSHEET_ID: 'id', WORKSHOP_CODE: 'code' }).mode, 'sheets');
});
test('설정 API는 인증키·시트ID·실습 코드를 공개하지 않는다', () => {
  clearEnv(); process.env.GOOGLE_SERVICE_ACCOUNT_JSON = 'SECRET'; process.env.GOOGLE_SPREADSHEET_ID = 'PRIVATE'; process.env.WORKSHOP_CODE = 'HIDDEN';
  const res = response(); configHandler({ method: 'GET' }, res);
  assert.deepEqual(res.body, { mode: 'sheets', requiresCode: true }); assert.equal(JSON.stringify(res.body).includes('SECRET'), false);
});
test('체험 주문은 실제 저장을 주장하지 않는다', async () => {
  clearEnv(); const res = response(); await handler(req(), res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.mode, 'demo'); assert.equal(res.body.order.total, 7000);
});
test('잘못된 실습 코드와 다른 사이트의 요청을 차단한다', async () => {
  clearEnv(); process.env.WORKSHOP_CODE = 'training';
  const res = response(); await handler(req(), res); assert.equal(res.statusCode, 403); assert.equal(res.body.code, 'CODE_INVALID');
  const external = response(); await handler(req(input(), { headers: { 'content-type': 'application/json', host: 'localhost:4173', origin: 'https://outside.example' } }), external); assert.equal(external.statusCode, 403);
});
test('잘못된 요청 방식·형식·JSON·큰 본문을 거절한다', async () => {
  clearEnv();
  for (const [request, expected] of [[req(input(), { method: 'GET' }), 405], [req(input(), { headers: {} }), 415], [req('{'), 400], [req('x'.repeat(12001)), 413]]) {
    const res = response(); await handler(request, res); assert.equal(res.statusCode, expected);
  }
});
test('시트 설정이 일부만 있으면 체험 주문으로 바꾸지 않는다', async () => {
  clearEnv(); process.env.GOOGLE_SPREADSHEET_ID = 'partial';
  const res = response(); await handler(req(), res); assert.equal(res.statusCode, 503); assert.equal(res.body.code, 'SETUP_REQUIRED');
});
test('서비스 계정 JWT 서명·권한·만료 시간과 RAW 쓰기를 확인한다', async () => {
  const config = sheetConfig(); const google = mockGoogle();
  await saveOrder(validateOrder(input()), config, google.fetcher);
  const params = new URLSearchParams(google.calls[0].options.body); const assertion = params.get('assertion');
  const [head, claim, signature] = assertion.split('.');
  assert.equal(verify('RSA-SHA256', Buffer.from(`${head}.${claim}`), publicKey, Buffer.from(signature, 'base64url')), true);
  const decoded = JSON.parse(Buffer.from(claim, 'base64url'));
  assert.equal(decoded.scope, 'https://www.googleapis.com/auth/spreadsheets'); assert.equal(decoded.exp - decoded.iat, 3600);
  const append = google.calls[2]; assert.match(append.url, /valueInputOption=RAW/);
  const body = JSON.parse(append.options.body); assert.deepEqual(body.values[0], columns); assert.equal(body.values[1][6], 7000);
});
test('같은 주문ID를 재전송하면 새 행을 추가하지 않는다', async () => {
  const order = validateOrder(input()); const google = mockGoogle([columns, toSheetRow(order)]);
  const result = await saveOrder(order, sheetConfig(), google.fetcher); assert.equal(result.duplicate, true); assert.equal(google.calls.length, 2);
});
test('기존 주문ID와 내역이 다르면 충돌을 반환한다', async () => {
  const order = validateOrder(input()); const google = mockGoogle([columns, toSheetRow({ ...order, alias: '다른 별칭' })]);
  await assert.rejects(saveOrder(order, sheetConfig(), google.fetcher), error => error.status === 409);
});
test('머리글이 다르면 기존 시트를 덮어쓰지 않는다', async () => {
  const google = mockGoogle([['다른 자료']]); await assert.rejects(saveOrder(validateOrder(input()), sheetConfig(), google.fetcher), error => error.code === 'SHEET_HEADER'); assert.equal(google.calls.length, 2);
});
test('잘못된 서비스 계정은 Google에 보내기 전에 거절한다', async () => {
  const google = mockGoogle(); await assert.rejects(saveOrder(validateOrder(input()), { ...sheetConfig(), credentials: '{}' }, google.fetcher), error => error.code === 'CREDENTIALS_INVALID'); assert.equal(google.calls.length, 0);
});
test('Google 인증 실패·권한 오류·할당량·불확실한 저장을 구분한다', async () => {
  await assert.rejects(saveOrder(validateOrder(input()), sheetConfig(), async () => json({}, 401)), error => error.code === 'GOOGLE_AUTH_FAILED');
  for (const [status, code] of [[403, 'SHEET_PERMISSION'], [429, 'GOOGLE_QUOTA'], [500, 'SAVE_UNCERTAIN']]) {
    const google = mockGoogle([columns], status);
    await assert.rejects(saveOrder(validateOrder(input()), sheetConfig(), google.fetcher), error => error.code === code);
  }
});
test('네트워크 예외는 저장 완료로 처리하지 않는다', async () => {
  await assert.rejects(saveOrder(validateOrder(input()), sheetConfig(), async () => { throw new TypeError('network'); }), error => error.code === 'SAVE_UNCERTAIN');
});
