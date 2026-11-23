import { put } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object' || !body.respuestas) return res.status(400).json({ error: 'bad' });
    const raw = JSON.stringify(body);
    if (raw.length > 200_000) return res.status(413).json({ error: 'too large' });
    body.recibido = new Date().toISOString();
    const nombre = String(body.respuestas?.nombre?.respuesta || 'anonimo')
      .toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    await put(`respuestas/${Date.now()}-${nombre}.json`, JSON.stringify(body, null, 2), {
      access: 'public', contentType: 'application/json', addRandomSuffix: true,
    });
    console.log('[diagnostico] nueva respuesta de', nombre);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[diagnostico] error', e);
    return res.status(500).json({ error: 'store' });
  }
}
