const router = require('express').Router();
const Product = require('../models/Product');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/products — list with search, filter, pagination
router.get('/', auth, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20, sort = '-createdAt' } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { supplier: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;

    let products = await Product.find(query)
      .populate('category', 'name color')
      .sort(sort)
      .lean();

    // Apply virtual status filter
    if (status) {
      products = products.filter(p => {
        const s = p.quantity === 0 ? 'out_of_stock' : p.quantity <= p.reorderLevel ? 'low_stock' : 'in_stock';
        return s === status;
      });
    }

    const total = products.length;
    const paginated = products.slice((page - 1) * limit, page * limit);

    res.json({ products: paginated, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name color').populate('createdBy', 'name');
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
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('category', 'name color');
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/products/:id/quantity — adjust stock
router.patch('/:id/quantity', auth, async (req, res) => {
  try {
    const { adjustment, type } = req.body; // adjustment: number, type: 'add'|'subtract'|'set'
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (type === 'set') product.quantity = adjustment;
    else if (type === 'subtract') product.quantity = Math.max(0, product.quantity - adjustment);
    else product.quantity += adjustment;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/products/:id — soft delete
router.delete('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
