import { cafe, menu } from '../public/catalog.js';

export class OrderError extends Error {
  constructor(message, status = 400, code = 'INVALID_ORDER') {
    super(message); this.status = status; this.code = code;
  }
}

export function validateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new OrderError('주문 내용을 확인해 주세요.');
  if (typeof body.orderId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.orderId)) {
    throw new OrderError('주문 번호가 올바르지 않습니다. 페이지를 새로 열어 주세요.');
  }
  if (typeof body.alias !== 'string' || !body.alias.trim() || body.alias.trim().length > 20 || /[\u0000-\u001f\u007f]/.test(body.alias)) {
    throw new OrderError('주문자 별칭을 1~20자로 입력해 주세요.');
  }
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 16) throw new OrderError('메뉴를 1개 이상 담아 주세요.');
  const seen = new Set();
  const items = body.items.map(item => {
    if (!item || typeof item !== 'object') throw new OrderError('담은 메뉴를 다시 확인해 주세요.');
    const product = menu.find(m => m.id === item.id);
    if (!product || !product.temperatures.includes(item.temperature)) throw new OrderError('판매 메뉴 또는 옵션이 변경되었습니다. 새로고침해 주세요.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new OrderError('메뉴별 수량은 1~20개로 선택해 주세요.');
    const key = `${item.id}:${item.temperature}`;
    if (seen.has(key)) throw new OrderError('같은 메뉴의 수량을 합쳐서 주문해 주세요.');
    seen.add(key);
    return { id: product.id, name: product.name, temperature: item.temperature, quantity: item.quantity, unitPrice: product.price, amount: product.price * item.quantity };
  });
  const quantity = items.reduce((n, item) => n + item.quantity, 0);
  if (quantity > 50) throw new OrderError('한 번에 50개까지 주문할 수 있습니다.');
  return {
    orderId: body.orderId.toLowerCase(), alias: body.alias.trim(), cafe: cafe.name,
    items, quantity, total: items.reduce((n, item) => n + item.amount, 0),
  };
}

export const columns = ['주문ID', '접수시각(한국)', '카페', '주문자별칭', '메뉴내역', '총수량', '합계(원)', '저장구분'];

export function toSheetRow(order, now = new Date()) {
  return [order.orderId, new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'medium' }).format(now),
    order.cafe, order.alias,
    order.items.map(i => `${i.name} / ${i.temperature} / ${i.quantity}개 / ${i.amount}원`).join(' | '),
    order.quantity, order.total, '연수 실습'];
}
