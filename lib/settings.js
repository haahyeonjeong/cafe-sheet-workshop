import { OrderError } from './order.js';

export function settings(env = process.env) {
  const credentials = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() || '';
  const spreadsheetId = env.GOOGLE_SPREADSHEET_ID?.trim() || '';
  const workshopCode = env.WORKSHOP_CODE?.trim() || '';
  const sheetName = env.GOOGLE_SHEET_NAME?.trim() || '주문내역';
  const hasSheets = Boolean(credentials || spreadsheetId);
  const mode = !hasSheets ? 'demo' : credentials && spreadsheetId && workshopCode ? 'sheets' : 'setup-required';
  return { mode, credentials, spreadsheetId, workshopCode, sheetName };
}

export function requireSettings(config) {
  if (config.mode === 'setup-required') throw new OrderError('시트 연결 설정이 덜 끝났습니다. Vercel 환경 변수를 확인한 뒤 다시 배포해 주세요.', 503, 'SETUP_REQUIRED');
  if (config.mode !== 'sheets') return;
  if (!/^[a-zA-Z0-9_-]{20,200}$/.test(config.spreadsheetId) || config.sheetName.length > 100 || /[\u0000-\u001f]/.test(config.sheetName)) {
    throw new OrderError('시트 ID 또는 탭 이름이 올바르지 않습니다. 설정 안내서를 확인해 주세요.', 503, 'SETUP_REQUIRED');
  }
}
