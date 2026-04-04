async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle" id="dash-greeting">Welcome back</div>
      </div>
      <div class="page-actions">
        <button class="btn" onclick="refreshDashboard()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M2 8A6 6 0 1114 8"/><path d="M14 4v4h-4"/></svg>
          Refresh
        </button>
        <button class="btn btn-primary" onclick="navigate('inventory')">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          Add Product
        </button>
      </div>
    </div>
    <div class="page-content">
      <!-- Stat cards placeholder -->
      <div class="stats-grid" id="dash-stats">
        ${[
          { label:'Total Products', icon:'<rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="6" y1="6" x2="6" y2="14"/>' },
          { label:'Low Stock Alerts', icon:'<path d="M8 2v8M8 14v.1"/><path d="M3 13l5-11 5 11H3z"/>' },
          { label:'Inventory Value', icon:'<path d="M8 1v14M5 4h4.5a2.5 2.5 0 010 5H5M5 9h5a2.5 2.5 0 010 5H5"/>' },
          { label:'Pending Orders', icon:'<path d="M2 4h12M2 8h8M2 12h5"/>' }
        ].map(s => `
          <div class="stat-card">
            <div class="stat-icon" style="opacity:0.35">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">${s.icon}</svg>
            </div>
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="color:var(--text-3)">—</div>
          </div>`).join('')}
      </div>

      <div class="grid-2" style="margin-bottom:1.5rem">
        <div class="card" id="dash-low-stock">
          <div class="card-header"><div class="card-title">Stock Alerts</div></div>
          <div style="padding:2rem;text-align:center;color:var(--text-3)">Loading…</div>
        </div>
        <div class="card" id="dash-recent-orders">
          <div class="card-header"><div class="card-title">Recent Orders</div></div>
          <div style="padding:2rem;text-align:center;color:var(--text-3)">Loading…</div>
        </div>
      </div>

      <div class="card" id="dash-categories">
        <div class="card-header"><div class="card-title">Category Breakdown</div></div>
        <div style="padding:2rem;text-align:center;color:var(--text-3)">Loading…</div>
      </div>
    </div>`;

  // Dynamic greeting
  const hour  = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateStr = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
  const firstName = currentUser?.name?.split(' ')[0] || 'there';
  const greetEl = document.getElementById('dash-greeting');
  if (greetEl) greetEl.textContent = `${greet}, ${firstName} — ${dateStr}`;

  await refreshDashboard();
}

async function refreshDashboard() {
  try {
    const stats = await api.dashboardStats();
    renderDashStats(stats);
    renderRecentOrders(stats.recentOrders);
    renderCategoryBreakdown(stats.categoryBreakdown, stats.totalValue);
    renderLowStock(); // separate API call for freshest data
    updatePendingBadge();
  } catch (err) {
    toast(err.message || 'Failed to load dashboard', 'error');
  }
}

function renderDashStats(s) {
  const el = document.getElementById('dash-stats');
  if (!el) return;
  el.innerHTML = `
    <div class="stat-card" style="--card-color:var(--accent);--card-color-soft:var(--accent-soft)">
      <div class="stat-icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="6" y1="6" x2="6" y2="14"/></svg>
      </div>
      <div class="stat-label">Total Products</div>
      <div class="stat-value">${(s.totalProducts || 0).toLocaleString()}</div>
      <div class="stat-sub ${s.outOfStock > 0 ? 'down' : 'up'}">
        ${s.outOfStock > 0 ? `⚠ ${s.outOfStock} out of stock` : '✓ All items available'}
      </div>
    </div>
    <div class="stat-card" style="--card-color:var(--warning);--card-color-soft:var(--warning-soft)">
      <div class="stat-icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 2v8M8 14v.1"/><path d="M3 13l5-11 5 11H3z"/></svg>
      </div>
      <div class="stat-label">Low Stock Alerts</div>
      <div class="stat-value" style="color:var(--warning)">${s.lowStock || 0}</div>
      <div class="stat-sub ${s.outOfStock > 0 ? 'warn' : ''}">
        ${s.outOfStock > 0 ? `${s.outOfStock} critical — out of stock` : 'Needs restocking soon'}
      </div>
    </div>
    <div class="stat-card" style="--card-color:var(--success);--card-color-soft:var(--success-soft)">
      <div class="stat-icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 1v14M5 4h4.5a2.5 2.5 0 010 5H5M5 9h5a2.5 2.5 0 010 5H5"/></svg>
      </div>
      <div class="stat-label">Inventory Value</div>
      <div class="stat-value" style="font-size:22px">${fmtCurrency(s.totalValue)}</div>
      <div class="stat-sub up">Across all products</div>
    </div>
    <div class="stat-card" style="--card-color:var(--info);--card-color-soft:var(--info-soft)">
      <div class="stat-icon">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4h12M2 8h8M2 12h5"/></svg>
      </div>
      <div class="stat-label">Pending Orders</div>
      <div class="stat-value" style="color:var(--info)">${s.pendingOrders || 0}</div>
      <div class="stat-sub">
        <button class="btn btn-sm btn-ghost" style="padding:0;font-size:11px;font-weight:600;color:var(--info);height:auto;border:none"
          onclick="navigate('orders')">View all →</button>
      </div>
    </div>`;
}

async function renderLowStock() {
  const el = document.getElementById('dash-low-stock');
  if (!el) return;
  try {
    const [{ products: oos }, { products: low }] = await Promise.all([
      api.getProducts({ status: 'out_of_stock', limit: 4 }),
      api.getProducts({ status: 'low_stock',    limit: 4 })
    ]);
    const combined = [...oos, ...low].slice(0, 6);

    el.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">Stock Alerts</div>
          <div class="card-meta">${combined.length} item${combined.length !== 1 ? 's' : ''} need attention</div>
        </div>
        <div style="display:flex;gap:6px">
          ${oos.length > 0 ? `<span class="badge badge-danger">${oos.length} out</span>` : ''}
          ${low.length > 0 ? `<span class="badge badge-warning">${low.length} low</span>` : ''}
        </div>
      </div>
      ${combined.length === 0
        ? `<div class="empty-state" style="padding:2rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>All items well stocked</p>
          </div>`
        : `<table>
            <thead><tr><th>Product</th><th>Qty</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${combined.map(p => {
                const st = p.quantity === 0 ? 'out_of_stock' : 'low_stock';
                return `<tr>
                  <td>
                    <div class="td-name">${escapeHtml(p.name)}</div>
                    <div class="td-sub">${escapeHtml(p.sku)}</div>
                  </td>
                  <td>
                    <span class="qty-badge" style="color:${p.quantity===0 ? 'var(--danger)' : 'var(--warning)'}">${p.quantity}</span>
                    <span style="color:var(--text-3);font-size:11px"> ${escapeHtml(p.unit || 'pcs')}</span>
                  </td>
                  <td>${statusBadge(st)}</td>
                  <td>
                    <button class="btn btn-sm" onclick="navigate('inventory')" style="font-size:11px">Restock</button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
          <div style="padding:10px 16px;border-top:1px solid var(--border)">
            <button class="btn btn-sm btn-ghost" onclick="navigate('inventory')"
              style="color:var(--accent);border:none;font-size:12px;padding:4px 0">View all inventory →</button>
          </div>`}`;
  } catch (e) {
    el.innerHTML = `<div class="card-header"><div class="card-title">Stock Alerts</div></div>
      <div class="empty-state"><p>Failed to load: ${escapeHtml(e.message)}</p></div>`;
  }
}

function renderRecentOrders(orders) {
  const el = document.getElementById('dash-recent-orders');
  if (!el) return;
  el.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">Recent Orders</div>
        <div class="card-meta">Last ${(orders || []).length} orders</div>
      </div>
      <button class="btn btn-sm" onclick="navigate('orders')">View all</button>
    </div>
    ${!orders || orders.length === 0
      ? `<div class="empty-state" style="padding:2rem">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <p>No orders yet</p>
          <button class="btn btn-sm btn-primary" style="margin-top:10px" onclick="navigate('orders')">Create first order</button>
        </div>`
      : `<table>
          <thead><tr><th>Order</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${orders.map(o => `<tr>
              <td>
                <div class="td-name" style="font-family:'DM Mono',monospace;font-size:11px">${escapeHtml(o.orderNumber)}</div>
                <div class="td-sub">${timeAgo(o.createdAt)}</div>
              </td>
              <td>${typeBadge(o.type)}</td>
              <td style="font-weight:700">${fmtCurrency(o.totalAmount)}</td>
              <td>${orderStatusBadge(o.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div style="padding:10px 16px;border-top:1px solid var(--border)">
          <button class="btn btn-sm btn-ghost" onclick="navigate('orders')"
            style="color:var(--accent);border:none;font-size:12px;padding:4px 0">All orders →</button>
        </div>`}`;
}

function renderCategoryBreakdown(cats, totalValue) {
  const el = document.getElementById('dash-categories');
  if (!el) return;
  if (!cats || cats.length === 0) {
    el.innerHTML = `<div class="card-header"><div class="card-title">Category Breakdown</div></div>
      <div class="empty-state" style="padding:2rem"><p>No categories found</p></div>`;
    return;
  }
  const grandTotal = cats.reduce((s, c) => s + (c.value || 0), 0);
  const maxVal     = Math.max(...cats.map(c => c.value || 0), 1);

  el.innerHTML = `
    <div class="card-header">
      <div>
        <div class="card-title">Category Breakdown</div>
        <div class="card-meta">${cats.length} categories · ${fmtCurrency(grandTotal)} total</div>
      </div>
      <button class="btn btn-sm" onclick="navigate('categories')">Manage</button>
    </div>
    <div style="padding:1.5rem">
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1.25rem">
        ${cats.map(c => {
          const pct   = Math.round((c.value || 0) / Math.max(grandTotal, 1) * 100);
          const color = c.color || '#5b60d6';
          return `<div style="padding:1rem;border:1.5px solid var(--border);border-radius:var(--radius);transition:box-shadow 0.15s"
            onmouseover="this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.boxShadow=''">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
              <span style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0"></span>
              <span style="font-weight:700;font-size:13px">${escapeHtml(c.name)}</span>
              <span style="margin-left:auto;font-size:11px;color:var(--text-3)">${c.count} item${c.count !== 1 ? 's' : ''}</span>
            </div>
            <div class="progress-bar" style="margin-bottom:8px">
              <div class="progress-fill" style="width:${Math.round((c.value||0)/maxVal*100)}%;background:${color}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-weight:700;font-size:14px">${fmtCurrency(c.value)}</span>
              <span style="font-size:11px;background:${color}18;color:${color};padding:2px 7px;border-radius:999px;font-weight:700">${pct}%</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}
