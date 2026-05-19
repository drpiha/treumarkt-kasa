// PATCH /api/stock-on-hand — body: { "productId": newQty, ... } bulk güncelle
import { prisma } from './_lib/prisma.js';
import { requireAuth, readJSON } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'PATCH') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const body = await readJSON(req);
    const entries = Object.entries(body || {});
    if (entries.length === 0) { res.json({ ok: true, updated: 0 }); return; }
    await prisma.$transaction(entries.map(([productId, qty]) =>
      prisma.inventory.upsert({
        where: { productId },
        update: { stockOnHand: Math.max(0, Math.floor(Number(qty) || 0)) },
        create: { productId, stockOnHand: Math.max(0, Math.floor(Number(qty) || 0)), totalSold: 0 },
      })
    ));
    res.json({ ok: true, updated: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
