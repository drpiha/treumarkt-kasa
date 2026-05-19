// POST   /api/sales          → tek/çoklu satış kaydet, inventory + stockOnHand güncelle
// DELETE /api/sales?id=<id>   → satışı sil, inventory geri al, (varsa) stockOnHand iade et
import { prisma } from './_lib/prisma.js';
import { requireAuth, readJSON } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'POST') {
    try {
      const body = await readJSON(req);
      const rows = Array.isArray(body) ? body : (body.sales || []);
      if (rows.length === 0) { res.status(400).json({ error: 'empty payload' }); return; }
      const created = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const r of rows) {
          const sale = await tx.sale.create({
            data: {
              id: r.id,
              productId: r.productId || null,
              productName: r.productName,
              buyPrice: r.buyPrice,
              sellPrice: r.sellPrice,
              stockWasDecremented: !!r._stockWasDecremented,
              ts: r.ts ? new Date(r.ts) : new Date(),
            },
          });
          // inventory: total_sold++, stock_on_hand-- (eğer mevcut sayı > 0)
          if (r.productId) {
            const inv = await tx.inventory.findUnique({ where: { productId: r.productId } });
            if (inv) {
              await tx.inventory.update({
                where: { productId: r.productId },
                data: {
                  totalSold: { increment: 1 },
                  stockOnHand: r._stockWasDecremented && inv.stockOnHand > 0
                    ? { decrement: 1 }
                    : undefined,
                },
              });
            } else {
              await tx.inventory.create({
                data: { productId: r.productId, totalSold: 1, stockOnHand: 0 },
              });
            }
          }
          results.push(sale.id);
        }
        return results;
      });
      res.json({ ok: true, ids: created });
    } catch (err) {
      console.error('sales POST error', err);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    try {
      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({ where: { id } });
        if (!sale) return;
        await tx.sale.delete({ where: { id } });
        if (sale.productId) {
          const inv = await tx.inventory.findUnique({ where: { productId: sale.productId } });
          if (inv) {
            await tx.inventory.update({
              where: { productId: sale.productId },
              data: {
                totalSold: inv.totalSold > 0 ? { decrement: 1 } : undefined,
                stockOnHand: sale.stockWasDecremented ? { increment: 1 } : undefined,
              },
            });
          }
        }
      });
      res.json({ ok: true });
    } catch (err) {
      console.error('sales DELETE error', err);
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
