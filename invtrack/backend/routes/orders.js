const router  = require('express').Router();
const Order   = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middlewares/auth'); // FIXED path

// GET /api/orders
router.get('/', auth, async (req, res) => {
  try {
    const { type, status, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (type)   query.type   = type;
    if (status) query.status = status;

    // Search by order number, supplier, customer
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

// GET /api/orders/:id
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

// POST /api/orders
router.post('/', auth, async (req, res) => {
  try {
    const { type, status, items, notes, supplier, customer, reference } = req.body;

    if (!type)  return res.status(400).json({ message: 'Order type is required' });
    if (!items || !items.length) return res.status(400).json({ message: 'At least one item is required' });

    // Validate items have required fields
    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ message: 'Each item needs a product and quantity ≥ 1' });
      }
      if (item.unitPrice === undefined || item.unitPrice < 0) {
        return res.status(400).json({ message: 'Each item needs a valid unit price' });
      }
      // Recalculate totalPrice server-side (don't trust client)
      item.totalPrice = item.quantity * item.unitPrice;
    }

    const order = await Order.create({
      type, status, notes, supplier, customer, reference,
      items,
      createdBy: req.user._id
    });

    // Update product stock quantities
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      if (type === 'purchase') {
        product.quantity += item.quantity;
      } else if (type === 'sale') {
        product.quantity = Math.max(0, product.quantity - item.quantity);
      }
      // 'adjustment' type does not auto-adjust (use /products/:id/quantity instead)
      await product.save();
    }

    await order.populate('items.product', 'name sku');
    await order.populate('createdBy', 'name');
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }
    const order = await Order.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).populate('createdBy', 'name');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/orders/:id  — added (frontend calls this)
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
