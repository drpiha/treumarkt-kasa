// POST /api/reset — Kasayı sıfırla:
//   - sales tablosunu tamamen sil
//   - expenses tablosunu sil
//   - inventory.totalSold ve stockOnHand sıfırla (satırlar kalır)
//   - products korunur
import { prisma } from './_lib/prisma.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    await prisma.$transaction([
      prisma.sale.deleteMany({}),
      prisma.expense.deleteMany({}),
      prisma.inventory.updateMany({ data: { totalSold: 0, stockOnHand: 0 } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
