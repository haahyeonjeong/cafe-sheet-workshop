import { cafe, menu } from './catalog.js';

const $ = id => document.getElementById(id);
const won = amount => `${amount.toLocaleString('ko-KR')}원`;
const cart = new Map();
const temperatures = new Map(menu.map(item => [item.id, item.temperatures[0]]));
let category = '전체';
let config = { mode: 'loading', requiresCode: false };
let busy = false;
let requestId = 0;
let pending;

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function button(text, className, action, label) {
  const result = node('button', className, text); result.type = 'button';
  if (label) result.setAttribute('aria-label', label);
  result.addEventListener('click', action); return result;
}
function announce(text) { $('announcement').textContent = text; }
function error(text) { $('order-error').textContent = text; $('order-error').hidden = !text; }
function invalidate() { pending = undefined; try { sessionStorage.removeItem('cafe-order-pending'); } catch {} error(''); }

$('cafe-name').textContent = cafe.name;
$('cafe-address').textContent = cafe.address;
$('map-link').href = cafe.naverMapUrl;
document.title = `${cafe.name} · 주문 실습`;

for (const name of cafe.categories) {
  const control = button(name, 'category', () => {
    category = name;
    for (const child of $('categories').children) child.setAttribute('aria-pressed', String(child.textContent === name));
    renderMenu();
  });
  control.setAttribute('aria-pressed', String(name === category));
  $('categories').append(control);
}

function renderMenu() {
  const search = $('search').value.trim().toLocaleLowerCase('ko-KR');
  const visible = menu.filter(item => (category === '전체' || category === item.category) && `${item.name} ${item.description}`.toLocaleLowerCase('ko-KR').includes(search));
  const list = $('menu-list'); list.replaceChildren();
  if (!visible.length) list.append(node('p', 'empty-menu', '찾는 메뉴가 없습니다. 검색어나 분류를 바꿔 주세요.'));
  for (const item of visible) {
    const article = node('article', 'menu-item'); article.dataset.menu = item.id;
    if (item.image) {
      const photo = node('img', 'menu-photo'); photo.src = item.image; photo.alt = item.imageAlt || `${item.name} 메뉴 사진`;
      photo.width = 1280; photo.height = 960; photo.loading = 'eager'; photo.decoding = 'async';
      article.append(photo);
    }
    article.append(node('h3', '', item.name), node('p', 'menu-description', item.description), node('p', 'menu-price', won(item.price)));
    const actions = node('div', 'menu-actions');
    const group = node('div', 'temperature-group'); group.setAttribute('role', 'group'); group.setAttribute('aria-label', `${item.name} 옵션`);
    for (const temperature of item.temperatures) {
      const option = button(temperature, 'temperature', () => {
        temperatures.set(item.id, temperature);
        for (const sibling of group.children) sibling.setAttribute('aria-pressed', String(sibling.textContent === temperature));
      }, `${item.name} ${temperature}`);
      option.setAttribute('aria-pressed', String(temperatures.get(item.id) === temperature)); group.append(option);
    }
    actions.append(group, button('담기', 'button secondary add-button', () => addItem(item), `${item.name} 담기`));
    article.append(actions); list.append(article);
  }
}

function addItem(product) {
  if (busy) return;
  const temperature = temperatures.get(product.id);
  const key = `${product.id}:${temperature}`;
  const existing = cart.get(key);
  if (existing?.quantity >= 20) { announce('메뉴별로 20개까지 담을 수 있습니다.'); return; }
  if (Array.from(cart.values()).reduce((n, item) => n + item.quantity, 0) >= 50) { announce('한 번에 50개까지 담을 수 있습니다.'); return; }
  invalidate();
  cart.set(key, { id: product.id, temperature, quantity: (existing?.quantity || 0) + 1 });
  renderCart(); announce(`${product.name} ${temperature} 메뉴를 담았습니다.`);
}

function renderCart() {
  const list = $('cart-items'); list.replaceChildren();
  let total = 0; let count = 0;
  if (!cart.size) list.append(node('p', 'empty-cart', '원하는 메뉴를 담아 주세요.'));
  for (const [key, item] of cart) {
    const product = menu.find(m => m.id === item.id);
    const line = node('div', 'cart-item');
    const top = node('div', 'cart-item-top');
    const name = node('div'); name.append(node('p', 'cart-item-name', product.name), node('p', 'cart-item-option', item.temperature));
    const remove = button('삭제', 'remove-item', () => { invalidate(); cart.delete(key); renderCart(); announce(`${product.name} 메뉴를 삭제했습니다.`); }, `${product.name} ${item.temperature} 삭제`);
    remove.disabled = busy; top.append(name, remove);
    const bottom = node('div', 'cart-item-bottom');
    const controls = node('div', 'quantity-controls');
    const minus = button('−', '', () => { invalidate(); if (item.quantity === 1) cart.delete(key); else item.quantity--; renderCart(); }, `${product.name} ${item.temperature} 수량 줄이기`);
    const plus = button('+', '', () => { if (count >= 50) { announce('한 번에 50개까지 담을 수 있습니다.'); return; } invalidate(); item.quantity++; renderCart(); }, `${product.name} ${item.temperature} 수량 늘리기`);
    minus.disabled = busy; plus.disabled = busy || item.quantity >= 20;
    controls.append(minus, node('span', 'quantity-value', String(item.quantity)), plus);
    bottom.append(controls, node('span', 'cart-line-price', won(item.quantity * product.price))); line.append(top, bottom); list.append(line);
    total += item.quantity * product.price; count += item.quantity;
  }
  $('cart-total').textContent = won(total); $('cart-count').textContent = `${count}개`;
  $('mobile-cart').hidden = !count || $('receipt-dialog').open;
  $('mobile-cart').textContent = `주문 내역 ${count}개 · ${won(total)}`;
  updateControls();
}

function updateControls() {
  const ready = config.mode === 'demo' || config.mode === 'sheets';
  $('submit-order').disabled = busy || !cart.size || !ready;
  $('submit-order').textContent = busy ? '주문 확인 중…' : config.mode === 'sheets' ? '주문 내역 저장하기' : config.mode === 'demo' ? '체험 주문하기' : config.mode === 'loading' ? '연결 상태 확인 중' : '연결 상태를 확인해 주세요';
  $('storage-help').textContent = busy ? '저장이 끝날 때까지 잠시 기다려 주세요.' : config.mode === 'sheets' ? '연결한 Google 스프레드시트에 저장합니다.' : config.mode === 'demo' ? '체험 주문은 시트에 저장되지 않습니다.' : config.mode === 'setup-required' ? '시트 설정이 덜 끝났습니다. 배포 안내서를 확인해 주세요.' : '서버 연결을 확인한 뒤 다시 시도해 주세요.';
  $('code-field').hidden = !config.requiresCode;
  $('retry-config').hidden = ready || busy || config.mode === 'loading';
  $('alias').disabled = busy; $('workshop-code').disabled = busy;
  for (const control of document.querySelectorAll('.add-button')) control.disabled = busy;
}

async function loadConfig() {
  const current = ++requestId;
  config = { mode: 'loading', requiresCode: false }; updateControls(); $('mode-label').textContent = '연결 상태 확인 중';
  try {
    const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok || !['demo', 'sheets', 'setup-required'].includes(data.mode)) throw new Error();
    if (current !== requestId) return;
    config = data;
  } catch { if (current !== requestId) return; config = { mode: 'offline', requiresCode: false }; }
  $('mode-label').textContent = config.mode === 'sheets' ? '시트 저장 모드' : config.mode === 'demo' ? '체험 모드' : config.mode === 'setup-required' ? '시트 설정 필요' : '서버 연결 확인 필요';
  $('mode-label').classList.toggle('error', !['demo', 'sheets'].includes(config.mode)); updateControls();
}

function fieldError(id, message) {
  const input = $(id); const output = $(id === 'alias' ? 'alias-error' : 'code-error');
  output.textContent = message; output.hidden = !message; input.setAttribute('aria-invalid', String(Boolean(message)));
}

$('search').addEventListener('input', renderMenu);
$('alias').addEventListener('input', () => { invalidate(); fieldError('alias', ''); });
$('workshop-code').addEventListener('input', () => { fieldError('workshop-code', ''); error(''); });
$('retry-config').addEventListener('click', loadConfig);
$('close-receipt').addEventListener('click', () => { $('receipt-dialog').close(); $('alias').focus(); });
$('receipt-dialog').addEventListener('close', () => { $('mobile-cart').hidden = !cart.size; });

try {
  const saved = JSON.parse(sessionStorage.getItem('cafe-order-pending') || 'null');
  if (saved?.payload?.items?.length && typeof saved.payload.alias === 'string' && typeof saved.payload.orderId === 'string') {
    for (const item of saved.payload.items) {
      const product = menu.find(m => m.id === item.id);
      if (!product || !product.temperatures.includes(item.temperature) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) throw new Error();
      cart.set(`${item.id}:${item.temperature}`, item);
    }
    $('alias').value = saved.payload.alias; pending = saved;
    error(`이전에 결과를 확인하지 못한 주문이 있습니다. 시트에서 주문ID ${saved.payload.orderId}를 먼저 확인해 주세요. 같은 내용으로 보내면 같은 주문ID로 확인합니다.`);
  }
} catch { cart.clear(); pending = undefined; }

$('order-form').addEventListener('submit', async event => {
  event.preventDefault(); if (busy || !cart.size || !['demo', 'sheets'].includes(config.mode)) return;
  const alias = $('alias').value.trim(); const code = $('workshop-code').value.trim();
  if (!alias || alias.length > 20 || /[\u0000-\u001f\u007f]/.test(alias)) { fieldError('alias', '별칭을 1~20자로 입력해 주세요.'); $('alias').focus(); return; }
  if (config.requiresCode && !code) { fieldError('workshop-code', '안내받은 실습 코드를 입력해 주세요.'); $('workshop-code').focus(); return; }
  const content = { alias, items: Array.from(cart.values()) };
  const signature = JSON.stringify(content);
  if (!pending || pending.signature !== signature) pending = { signature, payload: { ...content, orderId: crypto.randomUUID() } };
  try { sessionStorage.setItem('cafe-order-pending', JSON.stringify(pending)); } catch {}
  busy = true; error(''); renderCart(); $('order-form').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...pending.payload, workshopCode: code }), signal: AbortSignal.timeout(35000) });
    const result = await response.json();
    if (!response.ok) {
      if (result.code === 'CODE_INVALID') { fieldError('workshop-code', result.error); $('workshop-code').disabled = false; $('workshop-code').focus(); }
      throw Object.assign(new Error(result.error || '주문을 저장하지 못했습니다.'), { code: result.code, fieldOnly: result.code === 'CODE_INVALID' });
    }
    if (!result.order || !['demo', 'sheets'].includes(result.mode)) throw new Error('저장 결과를 확인하지 못했습니다.');
    $('receipt-title').textContent = result.mode === 'sheets' ? '주문 내역을 시트에 저장했습니다' : '체험 주문을 완료했습니다';
    $('receipt-description').textContent = result.mode === 'sheets' ? result.duplicate ? '이미 저장된 주문ID를 확인했습니다. 같은 주문을 다시 추가하지 않았습니다.' : 'Google 스프레드시트에서 새 행을 확인해 보세요.' : '화면 체험이 끝났습니다. 주문 내역은 시트에 저장되지 않았습니다.';
    $('receipt-alias').textContent = result.order.alias;
    $('receipt-items').textContent = result.order.items.map(i => `${i.name} · ${i.temperature} · ${i.quantity}개`).join('\n');
    $('receipt-total').textContent = won(result.order.total); $('receipt-id').textContent = result.order.orderId;
    cart.clear(); invalidate(); $('receipt-dialog').showModal(); $('mobile-cart').hidden = true;
  } catch (failure) {
    const uncertain = failure.code === 'SAVE_UNCERTAIN' || failure.name === 'TimeoutError' || failure.name === 'AbortError' || failure instanceof TypeError;
    if (!failure.fieldOnly) error(uncertain ? `저장 결과를 확인하지 못했습니다. 시트에서 주문ID ${pending.payload.orderId}를 먼저 확인해 주세요. 다시 보내면 같은 주문ID를 사용합니다.` : failure.message);
  } finally { busy = false; $('order-form').setAttribute('aria-busy', 'false'); renderCart(); }
});

renderMenu(); renderCart(); loadConfig();
