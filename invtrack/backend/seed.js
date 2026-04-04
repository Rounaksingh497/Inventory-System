require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('./models/User');
const Category = require('./models/Category');
const Product  = require('./models/Product');
const Order    = require('./models/Order');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all collections
    await Promise.all([
      User.deleteMany(),
      Category.deleteMany(),
      Product.deleteMany(),
      Order.deleteMany()
    ]);
    console.log('🗑  Cleared existing data');

    // Create users
    const admin = await User.create({
      name: 'Admin User', email: 'admin@inventory.com',
      password: 'admin123', role: 'admin'
    });
    const manager = await User.create({
      name: 'Sarah Manager', email: 'manager@inventory.com',
      password: 'manager123', role: 'manager'
    });
    await User.create({
      name: 'John Staff', email: 'staff@inventory.com',
      password: 'staff123', role: 'staff'
    });
    console.log('👤 Users created');

    // Create categories
    const categories = await Category.insertMany([
      { name: 'Electronics',  color: '#3b82f6', description: 'Electronic devices and gadgets' },
      { name: 'Accessories',  color: '#8b5cf6', description: 'Cables, stands and add-ons' },
      { name: 'Peripherals',  color: '#10b981', description: 'Input/output devices' },
      { name: 'Displays',     color: '#f59e0b', description: 'Monitors and screens' },
      { name: 'Storage',      color: '#ef4444', description: 'Hard drives, SSDs, memory' }
    ]);
    const [elec, acc, per, disp, stor] = categories;
    console.log('📂 Categories created');

    // Create products
    const products = await Product.insertMany([
      { name: 'Wireless Headphones X3',  sku: 'WH-X3-BLK',  category: elec._id, price: 89.99,  costPrice: 45,  quantity: 142, reorderLevel: 20, supplier: 'AudioTech Inc',  unit: 'pcs', createdBy: admin._id },
      { name: 'USB-C Hub 7-Port',        sku: 'HUB-C7-SLV', category: acc._id,  price: 34.50,  costPrice: 15,  quantity: 8,   reorderLevel: 15, supplier: 'ConnectPro',    unit: 'pcs', createdBy: admin._id },
      { name: 'Mechanical Keyboard TKL', sku: 'KB-TKL-RED',  category: per._id,  price: 119.00, costPrice: 60,  quantity: 0,   reorderLevel: 10, supplier: 'KeyMaster',     unit: 'pcs', createdBy: admin._id },
      { name: '27" Monitor 4K',          sku: 'MON-27-4K',   category: disp._id, price: 399.00, costPrice: 200, quantity: 31,  reorderLevel: 5,  supplier: 'ViewTech',      unit: 'pcs', createdBy: admin._id },
      { name: 'Laptop Stand Aluminium',  sku: 'STD-LT-ALU',  category: acc._id,  price: 49.95,  costPrice: 22,  quantity: 5,   reorderLevel: 10, supplier: 'DeskPro',       unit: 'pcs', createdBy: admin._id },
      { name: 'SSD 1TB NVMe',            sku: 'SSD-1TB-NVM', category: stor._id, price: 79.99,  costPrice: 40,  quantity: 65,  reorderLevel: 15, supplier: 'StoragePlus',   unit: 'pcs', createdBy: admin._id },
      { name: 'Webcam HD 1080p',         sku: 'CAM-HD-1080', category: per._id,  price: 59.99,  costPrice: 28,  quantity: 23,  reorderLevel: 10, supplier: 'VisionTech',    unit: 'pcs', createdBy: admin._id },
      { name: 'Wireless Mouse Ergonomic',sku: 'MS-WL-ERG',   category: per._id,  price: 44.99,  costPrice: 20,  quantity: 88,  reorderLevel: 20, supplier: 'ClickMaster',   unit: 'pcs', createdBy: admin._id },
      { name: 'HDMI Cable 2m',           sku: 'CBL-HDMI-2M', category: acc._id,  price: 12.99,  costPrice: 4,   quantity: 200, reorderLevel: 50, supplier: 'CableCo',       unit: 'pcs', createdBy: admin._id },
      { name: '4K Webcam Pro',           sku: 'CAM-4K-PRO',  category: per._id,  price: 149.99, costPrice: 75,  quantity: 3,   reorderLevel: 8,  supplier: 'VisionTech',    unit: 'pcs', createdBy: admin._id }
    ]);
    console.log('📦 Products created');

    // Create some sample orders
    const p0 = products[0]; // Headphones
    const p5 = products[5]; // SSD

    // Completed orders → stockApplied: true (stock already reflected in product quantities above)
    await Order.create({
      type: 'purchase', status: 'completed', stockApplied: true,
      supplier: 'AudioTech Inc',
      items: [{ product: p0._id, quantity: 50, unitPrice: 45, totalPrice: 2250 }],
      createdBy: admin._id
    });
    await Order.create({
      type: 'sale', status: 'completed', stockApplied: true,
      customer: 'Acme Corp',
      items: [{ product: p5._id, quantity: 10, unitPrice: 79.99, totalPrice: 799.90 }],
      createdBy: manager._id
    });
    // Pending order → stockApplied: false (stock NOT yet changed)
    await Order.create({
      type: 'purchase', status: 'pending', stockApplied: false,
      supplier: 'ConnectPro',
      items: [{ product: products[1]._id, quantity: 20, unitPrice: 15, totalPrice: 300 }],
      createdBy: manager._id
    });
    console.log('🧾 Sample orders created');

    console.log('\n✅ Seed complete!');
    console.log('─────────────────────────────────');
    console.log('Login credentials:');
    console.log('  Admin:   admin@inventory.com   / admin123');
    console.log('  Manager: manager@inventory.com / manager123');
    console.log('  Staff:   staff@inventory.com   / staff123');
    console.log('─────────────────────────────────');
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    throw err;
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed().catch(() => process.exit(1));