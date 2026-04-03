const API_BASE = '/api';

function getToken() { return localStorage.getItem('inv_token'); }
function setToken(t) { localStorage.setItem('inv_token', t); }
function clearToken() { localStorage.removeItem('inv_token'); localStorage.removeItem('inv_user'); }

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

const api = {
  // Auth
  login: (email, password) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => apiFetch('/auth/me'),
  register: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  dashboardStats: () => apiFetch('/dashboard/stats'),

  // Products
  getProducts: (params = {}) => apiFetch('/products?' + new URLSearchParams(params)),
  getProduct: (id) => apiFetch(`/products/${id}`),
  createProduct: (data) => apiFetch('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => apiFetch(`/products/${id}`, { method: 'DELETE' }),
  adjustQuantity: (id, adjustment, type) => apiFetch(`/products/${id}/quantity`, { method: 'PATCH', body: JSON.stringify({ adjustment, type }) }),

  // Categories
  getCategories: () => apiFetch('/categories'),
  createCategory: (data) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => apiFetch(`/categories/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (params = {}) => apiFetch('/orders?' + new URLSearchParams(params)),
  getOrder: (id) => apiFetch(`/orders/${id}`),
  createOrder: (data) => apiFetch('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id, status) => apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
