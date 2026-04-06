require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const path     = require('path');

// ─── VALIDATE REQUIRED ENV VARIABLES ─────────────────────────────────────────
const REQUIRED_ENV  = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnv    = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnv.join(', '));
  console.error('   Set these in your Render dashboard → Environment tab.');
  process.exit(1);
}

const authRoutes      = require('./routes/auth');
const productRoutes   = require('./routes/products');
const categoryRoutes  = require('./routes/categories');
const orderRoutes     = require('./routes/orders');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allows all origins so your Render frontend can talk to your Render backend.
// If you want to lock this down later, replace '*' with your Render app URL.
app.use(cors({
  origin:         '*',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    false   // must be false when origin is '*'
}));

// ─── BODY PARSERS ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── STATIC FRONTEND ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db:     mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    env:    {
      jwtSecret: process.env.JWT_SECRET ? '✓ set' : '✗ missing',
      mongoUri:  process.env.MONGODB_URI ? '✓ set' : '✗ missing'
    },
    time: new Date().toISOString()
  });
});

// ─── FRONTEND FALLBACK (must be after all API routes) ─────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// ─── CONNECT & START ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`   Frontend: http://localhost:${PORT}`);

    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('   → Check MONGODB_URI is correct');
    console.error('   → Check MongoDB Atlas Network Access allows 0.0.0.0/0');
    process.exit(1);
  });

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  console.log('\n🛑 Server stopped');
  process.exit(0);
});

module.exports = app;