import { settings } from '../lib/settings.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'GET 요청만 사용할 수 있습니다.' }); }
  const config = settings();
  return res.status(200).json({ mode: config.mode, requiresCode: Boolean(config.workshopCode) });
}
