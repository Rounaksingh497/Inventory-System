const router   = require('express').Router();
const Category = require('../models/Category');
const { auth, requireRole } = require('../middlewares/auth'); // FIXED path

// GET /api/categories
router.get('/', auth, async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort('name');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/categories
router.post('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, color, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name is required' });
    const category = await Category.create({ name, color, description });
    res.status(201).json(category);
  } catch (err) {
    // Duplicate key
    if (err.code === 11000) return res.status(400).json({ message: 'A category with this name already exists' });
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'A category with this name already exists' });
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/categories/:id  (soft delete)
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
