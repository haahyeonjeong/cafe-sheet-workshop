import { createPrivateKey, sign } from 'node:crypto';
import { OrderError, toSheetRow, columns } from './order.js';

let cachedToken;
let tokenPromise;

async function request(fetcher, url, init = {}) {
  try { return await fetcher(url, { ...init, signal: AbortSignal.timeout(7000) }); }
  catch { throw new OrderError('Google 응답을 확인하지 못했습니다. 시트에 주문ID가 있는지 먼저 확인해 주세요.', 504, 'SAVE_UNCERTAIN'); }
}

function credentialsFrom(config) {
  try {
    const credentials = JSON.parse(config.credentials);
    if (credentials.type !== 'service_account' || typeof credentials.client_email !== 'string' || !credentials.client_email.endsWith('.iam.gserviceaccount.com') || typeof credentials.private_key !== 'string') throw new Error();
    return credentials;
  } catch { throw new OrderError('서비스 계정 JSON을 확인해 주세요. Vercel 환경 변수에 파일 내용 전체를 넣어야 합니다.', 503, 'CREDENTIALS_INVALID'); }
}

async function token(config, fetcher) {
  const credentials = credentialsFrom(config);
  const fingerprint = `${credentials.client_email}:${credentials.private_key}`;
  if (cachedToken?.fingerprint === fingerprint && cachedToken.expires > Date.now() + 60000) return cachedToken.value;
  if (tokenPromise?.fingerprint === fingerprint) return tokenPromise.promise;
  const promise = (async () => {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claim = Buffer.from(JSON.stringify({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).toString('base64url');
    let signature;
    try { signature = sign('RSA-SHA256', Buffer.from(`${header}.${claim}`), createPrivateKey(credentials.private_key)).toString('base64url'); }
    catch { throw new OrderError('서비스 계정 비밀키 형식이 올바르지 않습니다. JSON 내용 전체를 다시 확인해 주세요.', 503, 'CREDENTIALS_INVALID'); }
    const response = await request(fetcher, 'https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${signature}` }).toString(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.access_token !== 'string') throw new OrderError('Google 인증에 실패했습니다. 서비스 계정 키가 유효한지 확인해 주세요.', 502, 'GOOGLE_AUTH_FAILED');
    cachedToken = { fingerprint, value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
    return data.access_token;
  })();
  tokenPromise = { fingerprint, promise };
  try { return await promise; } finally { if (tokenPromise?.promise === promise) tokenPromise = undefined; }
}

async function checkGoogle(response, write = false) {
  if (response.ok) return response;
  if (response.status === 429) throw new OrderError('시트 요청이 많습니다. 잠시 후 다시 시도해 주세요.', 429, 'GOOGLE_QUOTA');
  if (response.status === 401) { cachedToken = undefined; throw new OrderError('Google 인증이 만료되었습니다. 다시 시도해 주세요.', 502, 'GOOGLE_AUTH_FAILED'); }
  if (response.status === 403) throw new OrderError('시트 쓰기 권한을 확인해 주세요. Sheets API 사용 설정과 서비스 계정의 편집자 공유가 필요합니다.', 502, 'SHEET_PERMISSION');
  if (response.status === 404 || response.status === 400) throw new OrderError('시트를 찾지 못했습니다. 시트 ID와 탭 이름을 확인해 주세요.', 502, 'SHEET_NOT_FOUND');
  throw new OrderError(write ? '저장 결과가 불확실합니다. 재시도 전에 시트에서 주문ID를 확인해 주세요.' : '시트를 읽지 못했습니다. 잠시 후 다시 시도해 주세요.', 502, write ? 'SAVE_UNCERTAIN' : 'GOOGLE_ERROR');
}

export async function saveOrder(order, config, fetcher = fetch) {
  const accessToken = await token(config, fetcher);
  const sheet = `'${config.sheetName.replaceAll("'", "''")}'`;
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(config.spreadsheetId)}/values/`;
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  // 재시도에서 이미 저장한 주문ID를 확인한다. Sheets의 원자적 중복 방지는 아니다.
  const existing = await checkGoogle(await request(fetcher, `${base}${encodeURIComponent(`${sheet}!A:H`)}`, { headers }));
  const data = await existing.json().catch(() => { throw new OrderError('시트 응답을 읽지 못했습니다. 다시 시도해 주세요.', 502, 'GOOGLE_ERROR'); });
  const rows = data.values || [];
  if (rows.length && columns.some((name, i) => rows[0]?.[i] !== name)) throw new OrderError('시트의 첫 행이 다릅니다. 배포 안내서의 머리글 8개를 A1:H1에 붙여 넣어 주세요.', 503, 'SHEET_HEADER');
  const previous = rows.slice(1).find(row => row[0] === order.orderId);
  if (previous) {
    const expected = toSheetRow(order);
    if ([2, 3, 4, 5, 6].some(i => String(previous[i]) !== String(expected[i]))) throw new OrderError('이 주문ID에 다른 내역이 이미 저장되어 있습니다. 시트에서 주문을 확인해 주세요.', 409, 'ORDER_CONFLICT');
    return { duplicate: true };
  }
  const values = rows.length ? [toSheetRow(order)] : [columns, toSheetRow(order)];
  await checkGoogle(await request(fetcher, `${base}${encodeURIComponent(`${sheet}!A:H`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST', headers, body: JSON.stringify({ majorDimension: 'ROWS', values }),
  }), true);
  return { duplicate: false };
}
