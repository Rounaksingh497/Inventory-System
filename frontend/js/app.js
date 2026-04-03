let currentUser = null;
let currentPage = 'dashboard';

// --- INIT ---
window.onload = async () => {
  const token = getToken();
  if (token) {
    try {
      currentUser = await api.me();
      localStorage.setItem('inv_user', JSON.stringify(currentUser));
      showApp();
    } catch {
      clearToken();
      showAuth();
    }
  } else {
    showAuth();
  }
};

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  updateNavUser();
  navigate('dashboard');
}

function showAuth() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function updateNavUser() {
  if (!currentUser) return;
  document.getElementById('nav-username').textContent = currentUser.name;
  document.getElementById('nav-role').textContent = currentUser.role;
  document.getElementById('nav-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
}

// --- AUTH ---
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('auth-error');
  errEl.classList.add('hidden');

  try {
    const { token, user } = await api.login(email, password);
    setToken(token);
    currentUser = user;
    localStorage.setItem('inv_user', JSON.stringify(user));
    showApp();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('auth-screen').classList.contains('hidden')) login();
});

function logout() {
  clearToken();
  currentUser = null;
  showAuth();
  toast('Signed out successfully');
}

// --- ROUTING ---
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById(`page-${page}`);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');

  currentPage = page;
  const loaders = { dashboard: loadDashboard, inventory: loadInventory, orders: loadOrders, categories: loadCategories };
  if (loaders[page]) loaders[page]();
}

// --- MODAL ---
function openModal(title, bodyHTML, wide = false) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
  if (wide) document.getElementById('modal').style.width = '680px';
  else document.getElementById('modal').style.width = '';
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.add('hidden');
}

// --- TOAST ---
function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// --- HELPERS ---
function fmtCurrency(n) { return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }
function statusBadge(status) {
  const map = { in_stock: ['badge-success', 'In stock'], low_stock: ['badge-warning', 'Low stock'], out_of_stock: ['badge-danger', 'Out of stock'] };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge badge-dot ${cls}">${label}</span>`;
}
function orderStatusBadge(s) {
  const map = { pending: 'badge-warning', processing: 'badge-info', completed: 'badge-success', cancelled: 'badge-danger' };
  return `<span class="badge ${map[s] || 'badge-gray'}">${s}</span>`;
}
function escapeHtml(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
