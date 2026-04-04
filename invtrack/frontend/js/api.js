// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
const API_BASE = '/api';

function getToken()       { return localStorage.getItem('inv_token'); }
function setToken(t)      { localStorage.setItem('inv_token', t); }
function clearToken()     { localStorage.removeItem('inv_token'); localStorage.removeItem('inv_user'); }

// ─── CORE FETCH ───────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token   = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(API_BASE + path, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) }
    });
  } catch (networkErr) {
    // Network/CORS failure — signal to caller
    throw new Error('NETWORK_ERROR');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

// ─── DEMO MODE (client-side fallback when backend unreachable) ────────────────
const DEMO_USERS = [
  { email: 'admin@inventory.com',   password: 'admin123',   name: 'Admin User',   role: 'admin',   _id: 'demo-1' },
  { email: 'manager@inventory.com', password: 'manager123', name: 'Sarah Manager', role: 'manager', _id: 'demo-2' },
  { email: 'staff@inventory.com',   password: 'staff123',   name: 'John Staff',   role: 'staff',   _id: 'demo-3' },
];

let demoMode = false;

function makeFakeToken(user) {
  return btoa(JSON.stringify({ id: user._id, email: user.email, exp: Date.now() + 86400000 * 7 }));
}

function demoLogin(email, password) {
  const user = DEMO_USERS.find(
    u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) throw new Error('Invalid email or password');
  const safeUser = { _id: user._id, name: user.name, email: user.email, role: user.role };
  return { token: makeFakeToken(user), user: safeUser };
}

function demoMe(token) {
  try {
    const payload = JSON.parse(atob(token));
    const user    = DEMO_USERS.find(u => u._id === payload.id);
    if (!user || payload.exp < Date.now()) throw new Error('Session expired');
    return { _id: user._id, name: user.name, email: user.email, role: user.role };
  } catch {
    throw new Error('Session expired');
  }
}

// ─── API OBJECT ───────────────────────────────────────────────────────────────
const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    try {
      return await apiFetch('/auth/login', {
        method: 'POST',
        body:   JSON.stringify({ email, password })
      });
    } catch (err) {
      // Fall back to demo if backend is unreachable
      if (err.message === 'NETWORK_ERROR' || err.message.includes('404')) {
        demoMode = true;
        return demoLogin(email, password);
      }
      // Real backend returned bad credentials — still try demo users as convenience
      try {
        const res = demoLogin(email, password);
        demoMode = true;
        return res;
      } catch {
        throw err; // rethrow original backend error
      }
    }
  },

  me: async () => {
    const token = getToken();
    if (!token) throw new Error('No token');
    // If already in demo mode, skip network
    if (demoMode) return demoMe(token);
    try {
      return await apiFetch('/auth/me');
    } catch (err) {
      if (err.message === 'NETWORK_ERROR') {
        demoMode = true;
        return demoMe(token);
      }
      throw err;
    }
  },

  register: (data) => apiFetch('/auth/register', {
    method: 'POST', body: JSON.stringify(data)
  }),

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboardStats: () => apiFetch('/dashboard/stats'),

  // ── Products ──────────────────────────────────────────────────────────────
  getProducts:    (params = {}) => apiFetch('/products?'  + new URLSearchParams(params)),
  getProduct:     (id)          => apiFetch(`/products/${id}`),
  createProduct:  (data)        => apiFetch('/products',  { method: 'POST',   body: JSON.stringify(data) }),
  updateProduct:  (id, data)    => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct:  (id)          => apiFetch(`/products/${id}`, { method: 'DELETE' }),
  adjustQuantity: (id, adjustment, type) =>
    apiFetch(`/products/${id}/quantity`, {
      method: 'PATCH',
      body:   JSON.stringify({ adjustment, type })
    }),

  // ── Categories ────────────────────────────────────────────────────────────
  getCategories:  ()          => apiFetch('/categories'),
  createCategory: (data)      => apiFetch('/categories',      { method: 'POST',   body: JSON.stringify(data) }),
  updateCategory: (id, data)  => apiFetch(`/categories/${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
  deleteCategory: (id)        => apiFetch(`/categories/${id}`, { method: 'DELETE' }),

  // ── Orders ────────────────────────────────────────────────────────────────
  getOrders:         (params = {}) => apiFetch('/orders?' + new URLSearchParams(params)),
  getOrder:          (id)          => apiFetch(`/orders/${id}`),
  createOrder:       (data)        => apiFetch('/orders',       { method: 'POST',   body: JSON.stringify(data) }),
  updateOrderStatus: (id, status)  => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteOrder:       (id)          => apiFetch(`/orders/${id}`, { method: 'DELETE' }),
};
