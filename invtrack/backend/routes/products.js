const router  = require('express').Router();
const Product = require('../models/Product');
const { auth, requireRole } = require('../middlewares/auth'); // FIXED path

// GET /api/products
router.get('/', auth, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name:        { $regex: search, $options: 'i' } },
        { sku:         { $regex: search, $options: 'i' } },
        { supplier:    { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;

    let products = await Product.find(query)
      .populate('category', 'name color')
      .sort(sort)
      .lean();

    // Apply stock-status filter in memory (virtual field)
    if (status) {
      products = products.filter(p => {
        if (p.quantity === 0)                return status === 'out_of_stock';
        if (p.quantity <= p.reorderLevel)    return status === 'low_stock';
        return status === 'in_stock';
      });
    }

    const total     = products.length;
    const pageNum   = Math.max(1, Number(page));
    const limitNum  = Math.max(1, Number(limit));
    const paginated = products.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({
      products: paginated,
      total,
      page:  pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category',  'name color')
      .populate('createdBy', 'name');
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, createdBy: req.user._id });
    await product.populate('category', 'name color');
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'A product with this SKU already exists' });
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  try {
    // Don't let client overwrite createdBy
    delete req.body.createdBy;
    const product = await Product.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    ).populate('category', 'name color');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'A product with this SKU already exists' });
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/products/:id/quantity
router.patch('/:id/quantity', auth, async (req, res) => {
  try {
    const { adjustment, type } = req.body;
    const amt = Number(adjustment);
    if (isNaN(amt) || amt < 0) return res.status(400).json({ message: 'adjustment must be a non-negative number' });

    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) return res.status(404).json({ message: 'Product not found' });

    if (type === 'set')           product.quantity = amt;
    else if (type === 'subtract') product.quantity = Math.max(0, product.quantity - amt);
    else                          product.quantity += amt; // default: add

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/products/:id  — soft delete
router.delete('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
