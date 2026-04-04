const router   = require('express').Router();
const Product  = require('../models/Product');
const Order    = require('../models/Order');
const Category = require('../models/Category');
const { auth } = require('../middlewares/auth'); // FIXED path

// GET /api/dashboard/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const [products, orders, categories] = await Promise.all([
      Product.find({ isActive: true }).lean(),
      Order.find().sort('-createdAt').limit(100).lean(),
      Category.find({ isActive: true }).lean()
    ]);

    const totalProducts = products.length;
    const totalValue    = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const lowStock      = products.filter(p => p.quantity > 0 && p.quantity <= p.reorderLevel).length;
    const outOfStock    = products.filter(p => p.quantity === 0).length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;

    // Build category map
    const categoryMap = {};
    categories.forEach(c => {
      categoryMap[c._id.toString()] = {
        name:  c.name,
        color: c.color || '#5b60d6',
        count: 0,
        value: 0
      };
    });
    products.forEach(p => {
      const cid = p.category?.toString();
      if (cid && categoryMap[cid]) {
        categoryMap[cid].count++;
        categoryMap[cid].value += p.quantity * p.price;
      }
    });

    // Recent orders with creator populated
    const recentOrders = await Order.find()
      .populate('createdBy', 'name')
      .sort('-createdAt')
      .limit(5)
      .lean();

    res.json({
      totalProducts,
      totalValue:       Math.round(totalValue * 100) / 100,
      lowStock,
      outOfStock,
      pendingOrders,
      categoryBreakdown: Object.values(categoryMap),
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
