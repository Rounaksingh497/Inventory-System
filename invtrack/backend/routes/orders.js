const router  = require('express').Router();
const Order   = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middlewares/auth');

// ─── STOCK HELPER ─────────────────────────────────────────────────────────────
// direction: 'apply'  → purchase adds stock,    sale subtracts stock
// direction: 'revert' → purchase subtracts stock, sale adds stock back
async function applyStockChanges(order, direction) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (!product) continue;

    if (order.type === 'purchase') {
      product.quantity = direction === 'apply'
        ? product.quantity + item.quantity
        : Math.max(0, product.quantity - item.quantity);
    } else if (order.type === 'sale') {
      product.quantity = direction === 'apply'
        ? Math.max(0, product.quantity - item.quantity)
        : product.quantity + item.quantity;
    }
    // 'adjustment' type: managed manually via PATCH /products/:id/quantity

    await product.save();
  }
}

// ─── GET /api/orders ──────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (type)   query.type   = type;
    if (status) query.status = status;

    if (search) {
      const re = { $regex: search, $options: 'i' };
      query.$or = [
        { orderNumber: re },
        { supplier:    re },
        { customer:    re },
        { notes:       re },
        { reference:   re }
      ];
    }

    const total  = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      orders,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Math.max(limit, 1))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name sku price')
      .populate('createdBy', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ─── POST /api/orders ─────────────────────────────────────────────────────────
// Stock is NEVER touched on create unless initial status is already 'completed'.
// All stock changes happen in PATCH /:id/status when moving TO 'completed'.
router.post('/', auth, async (req, res) => {
  try {
    const { type, status, items, notes, supplier, customer, reference } = req.body;

    if (!type)                   return res.status(400).json({ message: 'Order type is required' });
    if (!items || !items.length) return res.status(400).json({ message: 'At least one item is required' });

    // Validate items and recalculate totals server-side
    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: 'Each item needs a product and quantity >= 1' });
      }
      if (item.unitPrice === undefined || item.unitPrice < 0) {
        return res.status(400).json({ message: 'Each item needs a valid unit price' });
      }
      item.totalPrice = item.quantity * item.unitPrice;
    }

    const initialStatus = ['pending', 'processing', 'completed', 'cancelled'].includes(status)
      ? status : 'pending';

    const order = await Order.create({
      type, notes, supplier, customer, reference, items,
      status:       initialStatus,
      stockApplied: false,
      createdBy:    req.user._id
    });

    // Only apply stock immediately if created directly as 'completed'
    if (initialStatus === 'completed') {
      await applyStockChanges(order, 'apply');
      order.stockApplied = true;
      await order.save();
    }

    await order.populate('items.product', 'name sku');
    await order.populate('createdBy', 'name');
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── PATCH /api/orders/:id/status ─────────────────────────────────────────────
// THE ONLY place stock is added or subtracted.
//
//  pending    → processing  : no stock change
//  pending    → completed   : APPLY stock  (purchases +qty, sales -qty)
//  processing → completed   : APPLY stock  (purchases +qty, sales -qty)
//  pending    → cancelled   : no stock change (nothing was applied)
//  processing → cancelled   : no stock change (nothing was applied)
//  completed  → cancelled   : REVERT stock (undo what was applied)
//
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;

    // Guard: cancelled orders are frozen
    if (prevStatus === 'cancelled') {
      return res.status(400).json({ message: 'Cannot change the status of a cancelled order' });
    }

    // Guard: completed orders can only move to cancelled
    if (prevStatus === 'completed' && status !== 'cancelled') {
      return res.status(400).json({
        message: 'A completed order can only be cancelled, not moved back to pending/processing'
      });
    }

    // Guard: no-op
    if (prevStatus === status) {
      return res.json(order);
    }

    // ── Stock adjustments ─────────────────────────────────────────────────────

    // Moving TO completed → apply stock for the first time
    if (status === 'completed' && !order.stockApplied) {
      await applyStockChanges(order, 'apply');
      order.stockApplied = true;
    }

    // Moving TO cancelled from completed → revert the applied stock
    if (status === 'cancelled' && order.stockApplied) {
      await applyStockChanges(order, 'revert');
      order.stockApplied = false;
    }

    // pending → pending/processing/cancelled: no stock change at all

    order.status = status;
    await order.save();

    await order.populate('items.product', 'name sku');
    await order.populate('createdBy', 'name');
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ─── DELETE /api/orders/:id ───────────────────────────────────────────────────
// Reverts stock if the order had been completed before deleting
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Revert stock if it was already applied
    if (order.stockApplied) {
      await applyStockChanges(order, 'revert');
    }

    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;