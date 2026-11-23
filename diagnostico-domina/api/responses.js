import { list } from '@vercel/blob';

export default async function handler(req, res) {
  const key = req.query.key || req.headers['x-admin-key'];
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  const { blobs } = await list({ prefix: 'respuestas/', limit: 1000 });
  const items = await Promise.all(blobs.map(async b => {
    try { return await (await fetch(b.url, { cache: 'no-store' })).json(); } catch { return null; }
  }));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json(items.filter(Boolean).sort((a, b) => (b.recibido || '').localeCompare(a.recibido || '')));
}
