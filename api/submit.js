const KEY = 'pancasila:results';
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const nums = (a, n) => Array.isArray(a) && a.length === n && a.every(x => Number.isFinite(x));
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!URL_ || !TOKEN) return res.status(500).json({ error: 'Database belum terhubung' });

  let b;
  try { b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}; }
  catch { return res.status(400).json({ error: 'JSON tidak valid' }); }

  const nama = str(b.nama, 60);
  if (nama.length < 2) return res.status(400).json({ error: 'Nama wajib diisi' });
  if (!nums(b.scores, 5) || !nums(b.percents, 5) || !Number.isInteger(b.top) || b.top < 0 || b.top > 4)
    return res.status(400).json({ error: 'Data hasil tidak valid' });

  const rec = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    t: new Date().toISOString(),
    nama,
    kelas: str(b.kelas, 80),
    top: b.top,
    scores: b.scores,
    percents: b.percents,
    answers: (Array.isArray(b.answers) ? b.answers : []).slice(0, 10)
      .map(x => ({ q: str(x && x.q, 200), a: str(x && x.a, 200), s: Number(x && x.s) || 0 }))
  };

  try {
    const r = await fetch(URL_, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(['LPUSH', KEY, JSON.stringify(rec)])
    });
    if (!r.ok) throw new Error('db ' + r.status);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Gagal menyimpan' });
  }
};
