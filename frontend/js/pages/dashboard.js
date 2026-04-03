async function loadDashboard() {
  const el = document.getElementById('page-dashboard');
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Dashboard</div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="navigate('inventory')">+ Add Item</button>
      </div>
    </div>
    <div class="page-content">
      <div class="stats-grid" id="dash-stats">
        ${[1,2,3,4].map(() => `<div class="stat-card"><div class="stat-label">Loading...</div><div class="stat-value">—</div></div>`).join('')}
      </div>
      <div class="grid-2" style="margin-bottom:1.5rem">
        <div class="card" id="dash-low-stock"></div>
        <div class="card" id="dash-recent-orders"></div>
      </div>
      <div class="card" id="dash-categories"></div>
    </div>`;

  try {
    const stats = await api.dashboardStats();
    renderDashStats(stats);
    renderLowStock();
    renderRecentOrders(stats.recentOrders);
    renderCategoryBreakdown(stats.categoryBreakdown, stats.totalValue);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderDashStats(s) {
  document.getElementById('dash-stats').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total products</div>
      <div class="stat-value">${s.totalProducts.toLocaleString()}</div>
      <div class="stat-sub">${s.outOfStock} out of stock</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Low stock alerts</div>
      <div class="stat-value" style="color:var(--warning)">${s.lowStock}</div>
      <div class="stat-sub down">${s.outOfStock} critical</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total inventory value</div>
      <div class="stat-value">${fmtCurrency(s.totalValue)}</div>
      <div class="stat-sub up">Across all products</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending orders</div>
      <div class="stat-value" style="color:var(--info)">${s.pendingOrders}</div>
      <div class="stat-sub">Awaiting processing</div>
    </div>`;
}

async function renderLowStock() {
  const el = document.getElementById('dash-low-stock');
  try {
    const { products } = await api.getProducts({ status: 'low_stock', limit: 5 });
    const { products: oos } = await api.getProducts({ status: 'out_of_stock', limit: 5 });
    const combined = [...oos, ...products].slice(0, 6);

    el.innerHTML = `
      <div class="card-header"><div class="card-title">Stock alerts</div><span class="badge badge-danger">${combined.length} items</span></div>
      ${combined.length === 0 ? '<div class="empty-state"><p>All items are well stocked</p></div>' :
        `<table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Status</th></tr></thead><tbody>
          ${combined.map(p => {
            const s = p.quantity === 0 ? 'out_of_stock' : 'low_stock';
            return `<tr>
              <td><div class="td-name">${escapeHtml(p.name)}</div></td>
              <td class="td-mono">${escapeHtml(p.sku)}</td>
              <td><span class="qty-badge" style="color:${p.quantity===0?'var(--danger)':'var(--warning)'}">${p.quantity}</span></td>
              <td>${statusBadge(s)}</td>
            </tr>`;
          }).join('')}
        </tbody></table>`}`;
  } catch (e) {
    el.innerHTML = `<div class="card-header"><div class="card-title">Stock alerts</div></div><div class="empty-state"><p>${e.message}</p></div>`;
  }
}

function renderRecentOrders(orders) {
  const el = document.getElementById('dash-recent-orders');
  el.innerHTML = `
    <div class="card-header"><div class="card-title">Recent orders</div><button class="btn btn-sm" onclick="navigate('orders')">View all</button></div>
    ${!orders || orders.length === 0 ? '<div class="empty-state"><p>No orders yet</p></div>' :
      `<table><thead><tr><th>Order</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead><tbody>
        ${orders.map(o => `<tr>
          <td><div class="td-name">${escapeHtml(o.orderNumber)}</div><div class="td-sub">${fmtDate(o.createdAt)}</div></td>
          <td><span class="badge badge-gray">${o.type}</span></td>
          <td>${fmtCurrency(o.totalAmount)}</td>
          <td>${orderStatusBadge(o.status)}</td>
        </tr>`).join('')}
      </tbody></table>`}`;
}

function renderCategoryBreakdown(cats, totalValue) {
  const el = document.getElementById('dash-categories');
  if (!cats || cats.length === 0) {
    el.innerHTML = `<div class="card-header"><div class="card-title">Category breakdown</div></div><div class="empty-state"><p>No categories found</p></div>`;
    return;
  }
  const maxVal = Math.max(...cats.map(c => c.value || 0), 1);
  el.innerHTML = `
    <div class="card-header"><div class="card-title">Category breakdown</div></div>
    <div style="padding:1.25rem">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem">
        ${cats.map(c => `
          <div>
            <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:13px">
              <span style="font-weight:500">${escapeHtml(c.name)}</span>
              <span style="color:var(--text-2)">${c.count} items</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${Math.round((c.value||0)/maxVal*100)}%"></div>
            </div>
            <div style="font-size:12px;color:var(--text-2);margin-top:4px">${fmtCurrency(c.value)}</div>
          </div>`).join('')}
      </div>
    </div>`;
}
