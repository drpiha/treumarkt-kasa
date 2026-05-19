// POST   /api/products          → yeni ürün + inventory satırı oluştur
// PATCH  /api/products?id=<id>  → mevcut ürünü güncelle (name/buy/sell/order/category/weight/weight_unit)
// DELETE /api/products?id=<id>  → ürünü sil (cascade ile inventory de düşer; satış log'u korunur)
import { prisma } from './_lib/prisma.js';
import { requireAuth, readJSON } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'POST') {
    try {
      const p = await readJSON(req);
      if (!p.id || !p.name) { res.status(400).json({ error: 'id+name required' }); return; }
      await prisma.$transaction(async (tx) => {
        await tx.product.create({
          data: {
            id: p.id, name: p.name,
            buy: p.buy, sell: p.sell, order: p.order,
            category: p.category, weight: p.weight,
            weightUnit: p.weight_unit || p.weightUnit,
          },
        });
        await tx.inventory.create({
          data: { productId: p.id, totalSold: 0, stockOnHand: 0 },
        });
      });
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }

  if (req.method === 'PATCH') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    try {
      const p = await readJSON(req);
      const data = {};
      ['name','category'].forEach(k => { if (p[k] !== undefined) data[k] = p[k]; });
      ['buy','sell','weight','order'].forEach(k => { if (p[k] !== undefined) data[k] = p[k]; });
      if (p.weight_unit) data.weightUnit = p.weight_unit;
      if (p.weightUnit)  data.weightUnit = p.weightUnit;
      await prisma.product.update({ where: { id }, data });
      res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
    return;
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    try {
      await prisma.product.delete({ where: { id } });
      res.json({ ok: true });
    } catch (err) {
      if (err.code === 'P2025') { res.json({ ok: true, note: 'already gone' }); return; }
      res.status(500).json({ error: err.message });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
