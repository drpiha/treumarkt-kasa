// POST /api/seed — DB'de hiç ürün yoksa 36 ürünü insert (idempotent)
import { prisma } from './_lib/prisma.js';
import { requireAuth } from './_lib/auth.js';
import { SEED_PRODUCTS } from './_lib/seed.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const count = await prisma.product.count();
    if (count > 0) { res.json({ ok: true, skipped: true, count }); return; }
    await prisma.$transaction(async (tx) => {
      for (const p of SEED_PRODUCTS) {
        await tx.product.create({
          data: {
            id: p.id, name: p.name,
            buy: p.buy, sell: p.sell, order: p.order,
            category: p.category, weight: p.weight,
            weightUnit: p.weightUnit,
          },
        });
        await tx.inventory.create({
          data: { productId: p.id, totalSold: 0, stockOnHand: 0 },
        });
      }
    });
    res.json({ ok: true, seeded: SEED_PRODUCTS.length });
  } catch (err) {
    console.error('seed error', err);
    res.status(500).json({ error: err.message });
  }
}
