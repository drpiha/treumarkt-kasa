// POST   /api/expenses          → gider ekle
// DELETE /api/expenses?id=<id>  → gider sil
import { prisma } from './_lib/prisma.js';
import { requireAuth, readJSON } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'POST') {
    try {
      const e = await readJSON(req);
      const created = await prisma.expense.create({
        data: {
          id: e.id,
          description: e.description || '—',
          amount: e.amount,
          ts: e.ts ? new Date(e.ts) : new Date(),
        },
      });
      res.json({ ok: true, id: created.id });
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    try {
      await prisma.expense.delete({ where: { id } });
      res.json({ ok: true });
    } catch (err) {
      if (err.code === 'P2025') { res.json({ ok: true, note: 'already deleted' }); return; }
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
