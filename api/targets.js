// PUT    /api/targets?month=YYYY-MM   → body: { amount }
// DELETE /api/targets?month=YYYY-MM   → hedefi kaldır
import { prisma } from './_lib/prisma.js';
import { requireAuth, readJSON } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  const month = req.query.month;
  if (!month) { res.status(400).json({ error: 'month required (YYYY-MM)' }); return; }

  if (req.method === 'PUT') {
    try {
      const { amount } = await readJSON(req);
      const value = Number(amount);
      if (!isFinite(value) || value < 0) { res.status(400).json({ error: 'invalid amount' }); return; }
      await prisma.target.upsert({
        where: { month },
        update: { monthlyProfitTarget: value },
        create: { month, monthlyProfitTarget: value },
      });
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.target.delete({ where: { month } });
      res.json({ ok: true });
    } catch (err) {
      if (err.code === 'P2025') { res.json({ ok: true }); return; }
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
