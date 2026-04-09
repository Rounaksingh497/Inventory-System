// ─── STATE ────────────────────────────────────────────────────────────────────
let currentUser      = null;
let currentPage      = 'dashboard';
let sidebarCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.onload = async () => {
  // Apply saved sidebar state immediately
  if (sidebarCollapsed) document.getElementById('sidebar')?.classList.add('collapsed');

  const token = getToken();
  if (token) {
    try {
      currentUser = await api.me();
      localStorage.setItem('inv_user', JSON.stringify(currentUser));
      showApp();
    } catch {
      // Token invalid or server error — go back to login
      clearToken();
      showAuth();
    }
  } else {
    showAuth();
  }
};

// ─── SHOW / HIDE SCREENS ──────────────────────────────────────────────────────
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
  const nameEl   = document.getElementById('nav-username');
  const roleEl   = document.getElementById('nav-role');
  const avatarEl = document.getElementById('nav-avatar');
  if (nameEl)   nameEl.textContent   = currentUser.name;
  if (roleEl)   roleEl.textContent   = currentUser.role;
  if (avatarEl) avatarEl.textContent = currentUser.name.charAt(0).toUpperCase();

  const roleStyles = {
    admin:   '',
    manager: 'background:var(--teal-soft);color:var(--teal)',
    staff:   'background:var(--amber-soft);color:var(--amber)'
  };
  const style = roleStyles[currentUser.role] || '';
  if (avatarEl && style) avatarEl.setAttribute('style', style);
}

// ─── AUTH TABS ────────────────────────────────────────────────────────────────
function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login')   .classList.toggle('active',  isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('form-login')   .classList.toggle('hidden', !isLogin);
  document.getElementById('form-register').classList.toggle('hidden',  isLogin);
  clearAuthMessages();
}

function clearAuthMessages() {
  const err = document.getElementById('auth-error');
  const ok  = document.getElementById('auth-success');
  if (err) { err.textContent = ''; err.classList.add('hidden'); }
  if (ok)  { ok.textContent  = ''; ok.classList.add('hidden');  }
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function showAuthSuccess(msg) {
  const el = document.getElementById('auth-success');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function login() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const spinner  = document.getElementById('login-spinner');
  const btnText  = document.getElementById('login-btn-text');

  clearAuthMessages();

  if (!email || !password) {
    showAuthError('Please enter your email and password.');
    return;
  }

  btn.disabled         = true;
  spinner.classList.remove('hidden');
  btnText.textContent  = 'Signing in…';

  try {
    const { token, user } = await api.login(email, password);
    setToken(token);
    currentUser = user;
    localStorage.setItem('inv_user', JSON.stringify(user));
    showApp();
  } catch (err) {
    showAuthError(err.message || 'Invalid email or password.');
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  } finally {
    btn.disabled        = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Sign in';
  }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
async function register() {
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm  = document.getElementById('reg-confirm').value;
  const role     = document.getElementById('reg-role').value;
  const btn      = document.getElementById('reg-btn');
  const spinner  = document.getElementById('reg-spinner');
  const btnText  = document.getElementById('reg-btn-text');

  clearAuthMessages();

  if (!name)                        { showAuthError('Full name is required.');                  return; }
  if (!email)                       { showAuthError('Email address is required.');              return; }
  if (!/\S+@\S+\.\S+/.test(email)) { showAuthError('Please enter a valid email address.');     return; }
  if (password.length < 6)         { showAuthError('Password must be at least 6 characters.'); return; }
  if (password !== confirm)        { showAuthError('Passwords do not match.');                  return; }

  btn.disabled        = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Creating account…';

  try {
    // Backend returns { token, user } on successful register
    const { token, user } = await api.register({ name, email, password, role });

    // Save token and user — log them straight in, no extra step needed
    setToken(token);
    currentUser = user;
    localStorage.setItem('inv_user', JSON.stringify(user));

    // Go directly into the app
    showApp();
    toast(`Welcome, ${user.name}! Your account has been created.`, 'success');
  } catch (err) {
    showAuthError(err.message || 'Registration failed. Please try again.');
  } finally {
    btn.disabled        = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Create account';
  }
}

// ─── PASSWORD VISIBILITY TOGGLE ───────────────────────────────────────────────
function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon  = document.getElementById(iconId);
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type    = 'text';
    icon.innerHTML = `<path d="M1 8C2.5 4.5 5 3 8 3s5.5 1.5 7 5c-1.5 3.5-4 5-7 5s-5.5-1.5-7-5z"/><line x1="2" y1="2" x2="14" y2="14"/>`;
  } else {
    input.type    = 'password';
    icon.innerHTML = `<path d="M1 8C2.5 4.5 5 3 8 3s5.5 1.5 7 5c-1.5 3.5-4 5-7 5s-5.5-1.5-7-5z"/><circle cx="8" cy="8" r="2"/>`;
  }
}

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const authVisible = !document.getElementById('auth-screen').classList.contains('hidden');
  if (e.key === 'Enter' && authVisible) {
    const loginHidden = document.getElementById('form-login').classList.contains('hidden');
    loginHidden ? register() : login();
  }
  if (e.key === 'Escape') closeModal();
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
function logout() {
  clearToken();
  currentUser = null;
  showAuth();
  ['login-email', 'login-password'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  switchAuthTab('login');
  clearAuthMessages();
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function toggleSidebar() {
  const sidebar    = document.getElementById('sidebar');
  sidebarCollapsed = !sidebarCollapsed;
  sidebar.classList.toggle('collapsed', sidebarCollapsed);
  localStorage.setItem('sidebar_collapsed', sidebarCollapsed);
}

// ─── ROUTING ──────────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.classList.add('hidden');
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const el = document.getElementById(`page-${page}`);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');

  currentPage = page;

  const loaders = {
    dashboard:  loadDashboard,
    inventory:  loadInventory,
    orders:     loadOrders,
    categories: loadCategories
  };
  if (loaders[page]) loaders[page]();
}

// ─── MODAL ────────────────────────────────────────────────────────────────────
function openModal(title, bodyHTML, wide = false) {
  const titleEl   = document.getElementById('modal-title');
  const bodyEl    = document.getElementById('modal-body');
  const overlayEl = document.getElementById('modal-overlay');
  const modalEl   = document.getElementById('modal');

  if (titleEl)   titleEl.textContent = title;
  if (bodyEl)    bodyEl.innerHTML    = bodyHTML;
  if (overlayEl) overlayEl.classList.remove('hidden');
  if (modalEl)   modalEl.style.width = wide ? '700px' : '';

  setTimeout(() => {
    const first = modalEl?.querySelector(
      'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])'
    );
    if (first) first.focus();
  }, 120);
}

function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay')?.classList.add('hidden');
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function openSettingsModal() {
  openModal('Settings', `
    <div class="modal-body">
      <div class="form-group">
        <label class="field-required">Display name</label>
        <input id="set-name" value="${escapeHtml(currentUser?.name || '')}" placeholder="Your name" />
      </div>
      <div class="form-group">
        <label>Email</label>
        <input value="${escapeHtml(currentUser?.email || '')}" disabled style="opacity:0.6;cursor:not-allowed" />
      </div>
      <div class="form-group">
        <label>Role</label>
        <input value="${escapeHtml(currentUser?.role || '')}" disabled style="opacity:0.6;cursor:not-allowed" />
        <div class="field-hint">Role is managed by your administrator</div>
      </div>
      <div class="separator"></div>
      <div class="form-group">
        <label style="margin-bottom:10px">Preferences</label>
        <label style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px;border:1.5px solid var(--border);border-radius:var(--radius)">
          <div>
            <div style="font-weight:600;font-size:13px">Collapsed sidebar</div>
            <div style="font-size:11px;color:var(--text-3);margin-top:2px">Save screen space</div>
          </div>
          <div class="toggle ${sidebarCollapsed ? 'on' : ''}" id="pref-sidebar-toggle"
            onclick="this.classList.toggle('on')"></div>
        </label>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveSettings()">Save changes</button>
    </div>`);
}

function saveSettings() {
  const name        = document.getElementById('set-name')?.value.trim();
  const sidebarPref = document.getElementById('pref-sidebar-toggle')?.classList.contains('on');

  if (name && currentUser) {
    currentUser.name = name;
    localStorage.setItem('inv_user', JSON.stringify(currentUser));
    updateNavUser();
  }

  if (sidebarPref !== sidebarCollapsed) {
    sidebarCollapsed = sidebarPref;
    document.getElementById('sidebar')?.classList.toggle('collapsed', sidebarPref);
    localStorage.setItem('sidebar_collapsed', sidebarPref);
  }

  toast('Settings saved', 'success');
  closeModal();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const t       = document.createElement('div');
  t.className   = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.transition = 'all 0.25s ease';
    t.style.opacity    = '0';
    t.style.transform  = 'translateX(110%)';
    setTimeout(() => t.remove(), 260);
  }, 3200);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function timeAgo(d) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status) {
  const map = {
    in_stock:     ['badge-success', 'In stock'],
    low_stock:    ['badge-warning', 'Low stock'],
    out_of_stock: ['badge-danger',  'Out of stock']
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge badge-dot ${cls}">${label}</span>`;
}

function orderStatusBadge(s) {
  const map   = { pending:'badge-warning', processing:'badge-info', completed:'badge-success', cancelled:'badge-danger' };
  const icons = { pending:'⏳', processing:'⚙️', completed:'✓', cancelled:'✕' };
  return `<span class="badge ${map[s] || 'badge-gray'}">${icons[s] || ''} ${s}</span>`;
}

function typeBadge(t) {
  const map = { purchase:'badge-teal', sale:'badge-purple', adjustment:'badge-gray' };
  return `<span class="badge ${map[t] || 'badge-gray'}" style="text-transform:capitalize">${t}</span>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

// ─── PENDING ORDERS BADGE ─────────────────────────────────────────────────────
async function updatePendingBadge() {
  try {
    const { total } = await api.getOrders({ status: 'pending', limit: 1 });
    const badge     = document.getElementById('pending-badge');
    if (!badge) return;
    if (total > 0) {
      badge.textContent   = total > 99 ? '99+' : total;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  } catch {}
}