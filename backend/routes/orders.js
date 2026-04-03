const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (type) query.type = type;
    if (status) query.status = status;

    const total = await Order.countDocuments(query);
    const orders = await Order.find(query)
      .populate('items.product', 'name sku')
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

router.post('/', auth, async (req, res) => {
  try {
    const order = await Order.create({ ...req.body, createdBy: req.user._id });

    // Update product quantities
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (order.type === 'purchase') product.quantity += item.quantity;
      else if (order.type === 'sale') product.quantity = Math.max(0, product.quantity - item.quantity);
      await product.save();
    }

    await order.populate('items.product', 'name sku');
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch('/:id/status', auth, async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
