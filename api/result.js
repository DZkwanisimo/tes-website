const crypto = require('crypto');
const KEY = 'pancasila:results';
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const sameText = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

const redis = async cmd => {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('db ' + r.status);
  return (await r.json()).result;
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return res.status(500).json({ error: 'ADMIN_PASSWORD belum diatur' });
  if (!sameText(req.headers['x-admin-password'] || '', pass)) return res.status(401).json({ error: 'Unauthorized' });
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Database belum terhubung' });

  try {
    if (req.method === 'GET') {
      const rows = await redis(['LRANGE', KEY, 0, 4999]);
      const items = rows.map(x => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      return res.status(200).json({ items });
    }
    if (req.method === 'DELETE') {
      await redis(['DEL', KEY]);
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
};
