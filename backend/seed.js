require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany()]);
  console.log('Cleared existing data');

  const admin = await User.create({
    name: 'Admin User', email: 'admin@inventory.com', password: 'admin123', role: 'admin'
  });

  const categories = await Category.insertMany([
    { name: 'Electronics', color: '#3b82f6' },
    { name: 'Accessories', color: '#8b5cf6' },
    { name: 'Peripherals', color: '#10b981' },
    { name: 'Displays', color: '#f59e0b' },
    { name: 'Storage', color: '#ef4444' }
  ]);

  const [elec, acc, per, disp, stor] = categories;

  await Product.insertMany([
    { name: 'Wireless Headphones X3', sku: 'WH-X3-BLK', category: elec._id, price: 89.99, costPrice: 45, quantity: 142, reorderLevel: 20, supplier: 'AudioTech Inc', createdBy: admin._id },
    { name: 'USB-C Hub 7-Port', sku: 'HUB-C7-SLV', category: acc._id, price: 34.50, costPrice: 15, quantity: 8, reorderLevel: 15, supplier: 'ConnectPro', createdBy: admin._id },
    { name: 'Mechanical Keyboard TKL', sku: 'KB-TKL-RED', category: per._id, price: 119.00, costPrice: 60, quantity: 0, reorderLevel: 10, supplier: 'KeyMaster', createdBy: admin._id },
    { name: '27" Monitor 4K', sku: 'MON-27-4K', category: disp._id, price: 399.00, costPrice: 200, quantity: 31, reorderLevel: 5, supplier: 'ViewTech', createdBy: admin._id },
    { name: 'Laptop Stand Aluminium', sku: 'STD-LT-ALU', category: acc._id, price: 49.95, costPrice: 22, quantity: 5, reorderLevel: 10, supplier: 'DeskPro', createdBy: admin._id },
    { name: 'SSD 1TB NVMe', sku: 'SSD-1TB-NVM', category: stor._id, price: 79.99, costPrice: 40, quantity: 65, reorderLevel: 15, supplier: 'StoragePlus', createdBy: admin._id },
    { name: 'Webcam HD 1080p', sku: 'CAM-HD-1080', category: per._id, price: 59.99, costPrice: 28, quantity: 23, reorderLevel: 10, supplier: 'VisionTech', createdBy: admin._id },
    { name: 'Wireless Mouse Ergonomic', sku: 'MS-WL-ERG', category: per._id, price: 44.99, costPrice: 20, quantity: 88, reorderLevel: 20, supplier: 'ClickMaster', createdBy: admin._id },
    { name: 'HDMI Cable 2m', sku: 'CBL-HDMI-2M', category: acc._id, price: 12.99, costPrice: 4, quantity: 200, reorderLevel: 50, supplier: 'CableCo', createdBy: admin._id },
    { name: '4K Webcam Pro', sku: 'CAM-4K-PRO', category: per._id, price: 149.99, costPrice: 75, quantity: 3, reorderLevel: 8, supplier: 'VisionTech', createdBy: admin._id }
  ]);

  console.log('✅ Seed complete!');
  console.log('Login: admin@inventory.com / admin123');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
