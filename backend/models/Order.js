const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  type: { type: String, enum: ['purchase', 'sale', 'adjustment'], required: true },
  items: [orderItemSchema],
  totalAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'cancelled'], default: 'pending' },
  notes: { type: String, default: '' },
  supplier: { type: String, default: '' },
  customer: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${String(count + 1).padStart(5, '0')}`;
  }
  this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
  next();
});

module.exports = mongoose.model('Order', orderSchema);
