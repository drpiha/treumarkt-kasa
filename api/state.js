// GET /api/state — tüm verileri tek seferde döndür (boot için)
import { prisma } from './_lib/prisma.js';
import { requireAuth } from './_lib/auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  if (req.method !== 'GET') { res.status(405).json({ error: 'method not allowed' }); return; }
  try {
    const [products, inventory, sales, expenses, targets] = await Promise.all([
      prisma.product.findMany({ orderBy: { order: 'asc' } }),
      prisma.inventory.findMany(),
      prisma.sale.findMany({ orderBy: { ts: 'desc' }, take: 5000 }),
      prisma.expense.findMany({ orderBy: { ts: 'desc' }, take: 1000 }),
      prisma.target.findMany(),
    ]);
    // Frontend için snake_case'e dönüştür (mevcut state şeması ile uyumlu)
    res.json({
      products: products.map(p => ({
        id: p.id, name: p.name,
        buy: Number(p.buy), sell: Number(p.sell),
        order: p.order, category: p.category,
        weight: Number(p.weight), weight_unit: p.weightUnit,
      })),
      inventory: Object.fromEntries(inventory.map(i => [i.productId, i.totalSold])),
      stockOnHand: Object.fromEntries(inventory.map(i => [i.productId, i.stockOnHand])),
      sales: sales.map(s => ({
        id: s.id, productId: s.productId, productName: s.productName,
        buyPrice: Number(s.buyPrice), sellPrice: Number(s.sellPrice),
        ts: s.ts.toISOString(),
        _stockWasDecremented: s.stockWasDecremented,
      })),
      expenses: expenses.map(e => ({
        id: e.id, description: e.description,
        amount: Number(e.amount), ts: e.ts.toISOString(),
      })),
      targets: Object.fromEntries(targets.map(t => [t.month, Number(t.monthlyProfitTarget)])),
    });
  } catch (err) {
    console.error('state error', err);
    res.status(500).json({ error: 'db error', message: err.message });
  }
}
