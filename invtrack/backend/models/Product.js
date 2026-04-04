const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  sku:          { type: String, required: true, unique: true, trim: true, uppercase: true },
  description:  { type: String, default: '' },
  category:     { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  price:        { type: Number, required: true, min: 0, default: 0 },
  costPrice:    { type: Number, min: 0, default: 0 },
  quantity:     { type: Number, required: true, min: 0, default: 0 },
  reorderLevel: { type: Number, default: 10, min: 0 },
  unit:         { type: String, default: 'pcs', trim: true },
  supplier:     { type: String, default: '', trim: true },
  location:     { type: String, default: '', trim: true },
  isActive:     { type: Boolean, default: true },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

// Virtual: stock status
productSchema.virtual('stockStatus').get(function () {
  if (this.quantity === 0)               return 'out_of_stock';
  if (this.quantity <= this.reorderLevel) return 'low_stock';
  return 'in_stock';
});

// Text index for search
productSchema.index({ name: 'text', sku: 'text', supplier: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
