const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true, min: 0 },
  costPrice: { type: Number, default: 0, min: 0 },
  quantity: { type: Number, required: true, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10 },
  unit: { type: String, default: 'pcs' },
  supplier: { type: String, default: '' },
  location: { type: String, default: '' },
  images: [{ type: String }],
  isActive: { type: Boolean, default: true },
  tags: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

productSchema.virtual('status').get(function () {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

productSchema.virtual('totalValue').get(function () {
  return this.quantity * this.price;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
