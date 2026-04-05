# InvTrack — Fullstack Inventory Management System

A complete inventory management system built with **Node.js + Express + MongoDB +  HTML/CSS/JS**.

## Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Frontend**: HTML, CSS, JavaScript
- **Auth**: JWT (JSON Web Tokens) + bcrypt

## Features
- **Dashboard** — live stats, stock alerts, category breakdown, recent orders
- **Inventory** — add/edit/delete products, search & filter, CSV export, stock adjustment
- **Orders** — create purchase/sale/adjustment orders, auto-updates stock levels
- **Categories** — manage product categories with custom colors
- **Auth** — JWT login with role-based access (admin, manager, staff)

## Project Structure
```
invtrack/
├── backend/
│   ├── models/         # Mongoose models (User, Product, Category, Order)
│   ├── routes/         # Express routes (auth, products, categories, orders, dashboard)
│   ├── middleware/     # JWT auth middleware
│   ├── server.js       # Main entry point
│   ├── seed.js         # Database seeder
│   └── .env.example    # Environment variables template
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js              # API client
        ├── app.js              # Auth, routing, utilities
        └── pages/
            ├── dashboard.js
            ├── inventory.js
            ├── orders.js
            └── categories.js
```

## Setup Instructions

### Prerequisites
- Node.js v18+ installed
- MongoDB running locally OR a MongoDB Atlas URI

### 1. Install dependencies
```bash
cd backend
npm install
```
### 2. Seed the database (optional but recommended)
```bash
npm run seed
```
This creates sample categories, products, and an admin account.

**Demo credentials:** `admin@inventory.com` / `admin123`

### 3. Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 4. Open in browser
Visit: **https://invtrack-vxb7.onrender.com/**

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/register | Register |
| GET | /api/auth/me | Current user |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/products | List (search, filter, paginate) |
| GET | /api/products/:id | Get one |
| POST | /api/products | Create |
| PUT | /api/products/:id | Update |
| DELETE | /api/products/:id | Soft delete |
| PATCH | /api/products/:id/quantity | Adjust stock |

### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List all |
| POST | /api/categories | Create |
| PUT | /api/categories/:id | Update |
| DELETE | /api/categories/:id | Delete |

### Orders
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/orders | List (filter, paginate) |
| GET | /api/orders/:id | Get one |
| POST | /api/orders | Create (auto-adjusts stock) |
| PATCH | /api/orders/:id/status | Update status |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/dashboard/stats | Summary stats |

## Deployment Notes
- Use MongoDB Atlas for cloud database
- Deploy to Railway, Render, Heroku, or any Node.js host
