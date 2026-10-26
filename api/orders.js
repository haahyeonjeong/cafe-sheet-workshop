import { timingSafeEqual } from 'node:crypto';
import { validateOrder, OrderError } from '../lib/order.js';
import { settings, requireSettings } from '../lib/settings.js';
import { saveOrder } from '../lib/sheets.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST 요청만 사용할 수 있습니다.' }); }
  try {
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw new OrderError('JSON 형식으로 주문해 주세요.', 415);
    if (req.headers['sec-fetch-site'] === 'cross-site') throw new OrderError('주문 화면에서 다시 시도해 주세요.', 403, 'ORIGIN_INVALID');
    const origin = req.headers.origin;
    if (origin) {
      const host = req.headers.host;
      try { if (new URL(origin).host !== host) throw new Error(); }
      catch { throw new OrderError('주문 화면에서 다시 시도해 주세요.', 403, 'ORIGIN_INVALID'); }
    }
    const config = settings();
    requireSettings(config);
    if (Number(req.headers['content-length']) > 12000) throw new OrderError('주문 내용이 너무 큽니다.', 413);
    let body = req.body;
    if (typeof body === 'string') { if (Buffer.byteLength(body) > 12000) throw new OrderError('주문 내용이 너무 큽니다.', 413); try { body = JSON.parse(body); } catch { throw new OrderError('주문 내용을 읽지 못했습니다.'); } }
    if (config.workshopCode) {
      const actual = Buffer.from(typeof body?.workshopCode === 'string' ? body.workshopCode : '');
      const expected = Buffer.from(config.workshopCode);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new OrderError('실습 코드를 확인해 주세요.', 403, 'CODE_INVALID');
    }
    const order = validateOrder(body);
    let duplicate = false;
    if (config.mode === 'sheets') ({ duplicate } = await saveOrder(order, config));
    return res.status(200).json({ mode: config.mode, duplicate, order: { ...order, receivedAt: new Date().toISOString() } });
  } catch (error) {
    if (error instanceof OrderError) return res.status(error.status).json({ error: error.message, code: error.code });
    // 인증키·요청 본문·별칭은 로그나 응답에 출력하지 않는다.
    console.error('Order handler failed:', error?.name || 'Error');
    return res.status(500).json({ error: '주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', code: 'SERVER_ERROR' });
  }
}
