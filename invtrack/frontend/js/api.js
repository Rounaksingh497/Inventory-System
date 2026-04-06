// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────
const API_BASE = '/api';

function getToken()   { return localStorage.getItem('inv_token'); }
function setToken(t)  { localStorage.setItem('inv_token', t); }
function clearToken() {
  localStorage.removeItem('inv_token');
  localStorage.removeItem('inv_user');
}

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
    throw new Error('Cannot reach the server. Please check your connection and try again.');
  }

  const data = await res.json().catch(() => ({}));

  // Token expired or invalid — clear and reload to login screen
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error(data.message || 'Session expired. Please log in again.');
  }

  if (!res.ok) throw new Error(data.message || `Server error (${res.status})`);
  return data;
}

// ─── API OBJECT ───────────────────────────────────────────────────────────────
const api = {

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: async (email, password) => {
    return await apiFetch('/auth/login', {
      method: 'POST',
      body:   JSON.stringify({ email, password })
    });
  },

  register: async (data) => {
    return await apiFetch('/auth/register', {
      method: 'POST',
      body:   JSON.stringify(data)
    });
  },

  me: async () => {
    return await apiFetch('/auth/me');
  },

  // ── Dashboard ─────────────────────────────────────────────────────────────
  dashboardStats: () => apiFetch('/dashboard/stats'),

  // ── Products ──────────────────────────────────────────────────────────────
  getProducts:    (params = {}) => apiFetch('/products?' + new URLSearchParams(params)),
  getProduct:     (id)          => apiFetch(`/products/${id}`),
  createProduct:  (data)        => apiFetch('/products',       { method: 'POST',   body: JSON.stringify(data) }),
  updateProduct:  (id, data)    => apiFetch(`/products/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
  deleteProduct:  (id)          => apiFetch(`/products/${id}`, { method: 'DELETE' }),
  adjustQuantity: (id, adjustment, type) =>
    apiFetch(`/products/${id}/quantity`, {
      method: 'PATCH',
      body:   JSON.stringify({ adjustment, type })
    }),

  // ── Categories ────────────────────────────────────────────────────────────
  getCategories:  ()         => apiFetch('/categories'),
  createCategory: (data)     => apiFetch('/categories',       { method: 'POST',  body: JSON.stringify(data) }),
  updateCategory: (id, data) => apiFetch(`/categories/${id}`, { method: 'PUT',   body: JSON.stringify(data) }),
  deleteCategory: (id)       => apiFetch(`/categories/${id}`, { method: 'DELETE' }),

  // ── Orders ────────────────────────────────────────────────────────────────
  getOrders:         (params = {}) => apiFetch('/orders?' + new URLSearchParams(params)),
  getOrder:          (id)          => apiFetch(`/orders/${id}`),
  createOrder:       (data)        => apiFetch('/orders',       { method: 'POST',  body: JSON.stringify(data) }),
  updateOrderStatus: (id, status)  => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  deleteOrder:       (id)          => apiFetch(`/orders/${id}`, { method: 'DELETE' }),
};