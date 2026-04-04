let ordState = { type: '', status: '', page: 1, products: [], search: '' };

async function loadOrders() {
  const el = document.getElementById('page-orders');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Orders</div>
        <div class="page-subtitle">Track purchases, sales, and stock adjustments</div>
      </div>
      <div class="page-actions">
        <button class="btn" onclick="exportOrders()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M8 2v8M5 7l3 3 3-3M2 12h12"/></svg>
          Export
        </button>
        <button class="btn btn-primary" onclick="openOrderModal()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          New Order
        </button>
      </div>
    </div>
    <div class="page-content">
      <div class="stats-grid" id="ord-stats" style="margin-bottom:1.25rem">
        ${[1,2,3,4].map(() => `
          <div class="stat-card" style="padding:1rem">
            <div class="stat-label" style="background:var(--border);border-radius:4px;height:12px;width:60%;margin-bottom:8px"></div>
            <div class="stat-value" style="font-size:20px;color:var(--text-3)">—</div>
          </div>`).join('')}
      </div>

      <div class="card">
        <div class="table-toolbar">
          <div class="search-wrap">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
            <input placeholder="Search order #, supplier, customer…" id="ord-search" oninput="ordSearch(this.value)" />
          </div>
          <div class="filter-group">
            <span class="filter-label">Type</span>
            <div class="filter-tabs" id="ord-type-tabs">
              <div class="tab active"      onclick="ordTypeFilter('')">All</div>
              <div class="tab"             onclick="ordTypeFilter('purchase')">Purchase</div>
              <div class="tab"             onclick="ordTypeFilter('sale')">Sale</div>
              <div class="tab"             onclick="ordTypeFilter('adjustment')">Adjustment</div>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">Status</span>
            <div class="filter-tabs" id="ord-status-tabs">
              <div class="tab active"      onclick="ordStatusFilter('')">All</div>
              <div class="tab"             onclick="ordStatusFilter('pending')">Pending</div>
              <div class="tab"             onclick="ordStatusFilter('processing')">Processing</div>
              <div class="tab"             onclick="ordStatusFilter('completed')">Done</div>
              <div class="tab"             onclick="ordStatusFilter('cancelled')">Cancelled</div>
            </div>
          </div>
        </div>
        <div class="table-wrap" id="ord-table-wrap">
          <div style="padding:2.5rem;text-align:center;color:var(--text-3)">Loading…</div>
        </div>
        <div id="ord-pagination" class="pagination"></div>
      </div>
    </div>`;

  // Preload products for the "new order" modal
  try {
    const { products } = await api.getProducts({ limit: 999, sort: 'name' });
    ordState.products = products;
  } catch {}

  // Load table and stats in parallel
  await Promise.all([fetchOrders(), fetchOrderStats()]);
}

// ─── STATS ───────────────────────────────────────────────────────────────────
async function fetchOrderStats() {
  try {
    const [all, pending, completed, sales] = await Promise.all([
      api.getOrders({ limit: 1 }),
      api.getOrders({ status: 'pending',   limit: 1 }),
      api.getOrders({ status: 'completed', limit: 1 }),
      api.getOrders({ type: 'sale', status: 'completed', limit: 999 }),
    ]);
    const salesTotal = (sales.orders || []).reduce((s, o) => s + (o.totalAmount || 0), 0);

    const el = document.getElementById('ord-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-card" style="--card-color:var(--accent);--card-color-soft:var(--accent-soft)">
        <div class="stat-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4h12M2 8h8M2 12h5"/></svg>
        </div>
        <div class="stat-label">Total Orders</div>
        <div class="stat-value">${(all.total || 0).toLocaleString()}</div>
      </div>
      <div class="stat-card" style="--card-color:var(--warning);--card-color-soft:var(--warning-soft)">
        <div class="stat-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="6"/><path d="M8 5v4l2 2"/></svg>
        </div>
        <div class="stat-label">Pending</div>
        <div class="stat-value" style="color:var(--warning)">${pending.total || 0}</div>
        <div class="stat-sub warn">Awaiting action</div>
      </div>
      <div class="stat-card" style="--card-color:var(--success);--card-color-soft:var(--success-soft)">
        <div class="stat-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 8l4 4 8-8"/></svg>
        </div>
        <div class="stat-label">Completed</div>
        <div class="stat-value" style="color:var(--success)">${completed.total || 0}</div>
        <div class="stat-sub up">Fulfilled orders</div>
      </div>
      <div class="stat-card" style="--card-color:var(--purple);--card-color-soft:var(--purple-soft)">
        <div class="stat-icon">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M8 1l2 5h5l-4 3 1.5 5L8 11l-4.5 3L5 9 1 6h5z"/></svg>
        </div>
        <div class="stat-label">Sales Revenue</div>
        <div class="stat-value" style="font-size:20px">${fmtCurrency(salesTotal)}</div>
        <div class="stat-sub up">Completed sales</div>
      </div>`;
  } catch {}
}

// ─── FILTERS ─────────────────────────────────────────────────────────────────
let ordSearchTimer;
function ordSearch(val) {
  clearTimeout(ordSearchTimer);
  ordSearchTimer = setTimeout(() => {
    ordState.search = val;
    ordState.page   = 1;
    fetchOrders();
  }, 300);
}

function ordTypeFilter(type) {
  ordState.type = type;
  ordState.page = 1;
  document.querySelectorAll('#ord-type-tabs .tab').forEach((t, i) => {
    t.classList.toggle('active', ['', 'purchase', 'sale', 'adjustment'][i] === type);
  });
  fetchOrders();
}

function ordStatusFilter(status) {
  ordState.status = status;
  ordState.page   = 1;
  document.querySelectorAll('#ord-status-tabs .tab').forEach((t, i) => {
    t.classList.toggle('active', ['', 'pending', 'processing', 'completed', 'cancelled'][i] === status);
  });
  fetchOrders();
}

// ─── FETCH ───────────────────────────────────────────────────────────────────
async function fetchOrders() {
  const wrap = document.getElementById('ord-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="padding:2.5rem;text-align:center;color:var(--text-3)">
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="var(--accent)" style="width:30px;height:30px;display:block;margin:0 auto 8px"><g fill="none"><g transform="translate(1 1)" stroke-width="2"><circle stroke-opacity=".25" cx="18" cy="18" r="18"/><path d="M36 18c0-9.94-8.06-18-18-18"><animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite"/></path></g></g></svg>
    Loading orders…</div>`;

  try {
    const params = { page: ordState.page, limit: 15 };
    if (ordState.type)   params.type   = ordState.type;
    if (ordState.status) params.status = ordState.status;
    if (ordState.search) params.search = ordState.search;

    const { orders, total, page, pages } = await api.getOrders(params);
    renderOrdersTable(orders);
    renderOrdPagination(total, page, pages);
    updatePendingBadge();
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

// ─── TABLE ───────────────────────────────────────────────────────────────────
function renderOrdersTable(orders) {
  const wrap = document.getElementById('ord-table-wrap');
  if (!orders || orders.length === 0) {
    wrap.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p>No orders found</p>
      <div class="empty-hint">Try adjusting your filters, or create a new order</div>
      <button class="btn btn-primary" style="margin-top:12px" onclick="openOrderModal()">+ New Order</button>
    </div>`;
    return;
  }

  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Order #</th><th>Type</th><th>Party</th>
      <th>Items</th><th>Total</th><th>Status</th><th>Date</th><th style="text-align:center">Actions</th>
    </tr></thead>
    <tbody>
      ${orders.map(o => {
        const party      = o.supplier || o.customer || '—';
        const partyLabel = o.type === 'purchase'
          ? `<div class="td-sub">Supplier</div>`
          : o.type === 'sale'
          ? `<div class="td-sub">Customer</div>`
          : '';
        return `<tr>
          <td>
            <div class="td-name" style="font-family:'DM Mono',monospace;font-size:12px">${escapeHtml(o.orderNumber)}</div>
            <div class="td-sub">${timeAgo(o.createdAt)}</div>
          </td>
          <td>${typeBadge(o.type)}</td>
          <td>
            <div style="font-size:13px;font-weight:500">${escapeHtml(party)}</div>
            ${partyLabel}
          </td>
          <td>
            <span style="font-weight:600">${o.items.length}</span>
            <span style="color:var(--text-3);font-size:11px"> item${o.items.length !== 1 ? 's' : ''}</span>
          </td>
          <td style="font-weight:700;font-size:14px">${fmtCurrency(o.totalAmount)}</td>
          <td>${orderStatusBadge(o.status)}</td>
          <td style="color:var(--text-2);font-size:12px;white-space:nowrap">${fmtDate(o.createdAt)}</td>
          <td>
            <div class="actions-col" style="justify-content:center">
              <button class="btn btn-sm" onclick="viewOrder('${o._id}')">View</button>
              ${o.status === 'pending' ? `
                <button class="btn btn-sm" style="color:var(--info);border-color:var(--info)"
                  onclick="quickUpdateStatus('${o._id}','processing')">Process</button>
                <button class="btn btn-sm" style="color:var(--success);border-color:var(--success)"
                  onclick="quickUpdateStatus('${o._id}','completed')">✓ Done</button>
                <button class="btn-icon" title="Cancel" style="color:var(--danger)"
                  onclick="quickUpdateStatus('${o._id}','cancelled')">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
                </button>` : ''}
              ${o.status === 'processing' ? `
                <button class="btn btn-sm btn-success"
                  onclick="quickUpdateStatus('${o._id}','completed')">✓ Complete</button>` : ''}
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

async function quickUpdateStatus(id, status) {
  if (status === 'cancelled' && !confirm('Cancel this order? This cannot be undone.')) return;
  try {
    await api.updateOrderStatus(id, status);
    const labels = { processing: 'marked as processing', completed: 'completed', cancelled: 'cancelled' };
    toast(`Order ${labels[status] || status}`, 'success');
    fetchOrders();
    fetchOrderStats();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────
function renderOrdPagination(total, page, pages) {
  const el = document.getElementById('ord-pagination');
  if (!el) return;
  if (pages <= 1) {
    el.innerHTML = `<span class="page-info">${total} order${total !== 1 ? 's' : ''}</span>`;
    return;
  }
  let btns = '';
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      btns += `<button class="btn btn-sm ${i === page ? 'btn-primary' : ''}"
        onclick="ordChangePage(${i})" ${i === page ? 'disabled' : ''}>${i}</button>`;
    } else if (i === page - 2 || i === page + 2) {
      btns += `<span style="color:var(--text-3);padding:0 4px">…</span>`;
    }
  }
  el.innerHTML = `
    <span class="page-info">${total} orders — page ${page} of ${pages}</span>
    <button class="btn btn-sm" onclick="ordChangePage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
    ${btns}
    <button class="btn btn-sm" onclick="ordChangePage(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next →</button>`;
}
function ordChangePage(p) { ordState.page = p; fetchOrders(); }

// ─── VIEW ORDER DETAIL ────────────────────────────────────────────────────────
async function viewOrder(id) {
  try {
    const o = await api.getOrder(id);

    const statusSteps = ['pending', 'processing', 'completed'];
    const currentStep = statusSteps.indexOf(o.status);

    const timelineHTML = o.status === 'cancelled'
      ? `<div class="order-status-bar cancelled">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="8" cy="8" r="6"/><line x1="5" y1="5" x2="11" y2="11"/><line x1="11" y1="5" x2="5" y2="11"/></svg>
          This order was cancelled
        </div>`
      : `<div class="order-timeline">
          ${statusSteps.map((s, i) => {
            const isDone   = i < currentStep;
            const isActive = i === currentStep;
            const labels   = ['Pending', 'Processing', 'Completed'];
            return `<div class="timeline-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}">
              <div class="timeline-dot">${isDone ? '✓' : i + 1}</div>
              <div class="timeline-label">${labels[i]}</div>
            </div>`;
          }).join('')}
        </div>`;

    openModal(`Order ${escapeHtml(o.orderNumber)}`, `
      <div class="modal-body">
        ${timelineHTML}

        <div class="order-info-grid">
          <div class="order-info-item">
            <div class="order-info-label">Order type</div>
            <div class="order-info-value">${typeBadge(o.type)}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Status</div>
            <div class="order-info-value">${orderStatusBadge(o.status)}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Date created</div>
            <div class="order-info-value">${fmtDateTime(o.createdAt)}</div>
          </div>
          <div class="order-info-item">
            <div class="order-info-label">Created by</div>
            <div class="order-info-value">${escapeHtml(o.createdBy?.name || '—')}</div>
          </div>
          ${o.supplier ? `<div class="order-info-item">
            <div class="order-info-label">Supplier</div>
            <div class="order-info-value">${escapeHtml(o.supplier)}</div>
          </div>` : ''}
          ${o.customer ? `<div class="order-info-item">
            <div class="order-info-label">Customer</div>
            <div class="order-info-value">${escapeHtml(o.customer)}</div>
          </div>` : ''}
          ${o.reference ? `<div class="order-info-item">
            <div class="order-info-label">Reference</div>
            <div class="order-info-value" style="font-family:'DM Mono',monospace;font-size:13px">${escapeHtml(o.reference)}</div>
          </div>` : ''}
        </div>

        <div class="separator"></div>
        <div style="font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-2);margin-bottom:10px">
          Line Items (${o.items.length})
        </div>
        <table style="margin-bottom:1rem">
          <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            ${o.items.map((item, idx) => `<tr>
              <td style="color:var(--text-3);font-size:12px">${idx + 1}</td>
              <td>
                <div class="td-name">${escapeHtml(item.product?.name || '—')}</div>
                <div class="td-sub">${escapeHtml(item.product?.sku || '')}</div>
              </td>
              <td><span class="qty-badge">${item.quantity}</span></td>
              <td>${fmtCurrency(item.unitPrice)}</td>
              <td style="font-weight:700">${fmtCurrency(item.totalPrice)}</td>
            </tr>`).join('')}
          </tbody>
        </table>

        <div style="display:flex;justify-content:flex-end;background:var(--bg);padding:12px 16px;border-radius:var(--radius)">
          <div style="text-align:right">
            <div style="font-size:12px;color:var(--text-2);margin-bottom:2px">Order Total</div>
            <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em">${fmtCurrency(o.totalAmount)}</div>
          </div>
        </div>

        ${o.notes ? `<div class="separator"></div>
          <div style="background:var(--bg);padding:12px;border-radius:var(--radius);font-size:13px;color:var(--text-2)">
            <div style="font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:6px;color:var(--text-3)">Notes</div>
            ${escapeHtml(o.notes)}
          </div>` : ''}
      </div>
      <div class="modal-footer">
        ${o.status === 'pending' ? `
          <button class="btn" style="color:var(--danger);border-color:var(--danger)"
            onclick="viewOrderAction('${o._id}','cancelled')">Cancel Order</button>
          <button class="btn" style="color:var(--info);border-color:var(--info)"
            onclick="viewOrderAction('${o._id}','processing')">Mark Processing</button>
          <button class="btn btn-success"
            onclick="viewOrderAction('${o._id}','completed')">✓ Complete</button>` : ''}
        ${o.status === 'processing' ? `
          <button class="btn btn-success"
            onclick="viewOrderAction('${o._id}','completed')">✓ Mark Complete</button>` : ''}
        <button class="btn" onclick="closeModal()">Close</button>
      </div>`, true);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function viewOrderAction(id, status) {
  await quickUpdateStatus(id, status);
  closeModal();
}

// ─── NEW ORDER MODAL ──────────────────────────────────────────────────────────
let orderItems = [];

function openOrderModal() {
  orderItems = [];

  const productOptions = ordState.products.map(p =>
    `<option value="${p._id}" data-price="${p.price}" data-name="${escapeHtml(p.name)}" data-sku="${escapeHtml(p.sku)}">
      ${escapeHtml(p.name)} — ${escapeHtml(p.sku)} (${fmtCurrency(p.price)})
    </option>`
  ).join('');

  openModal('New Order', `
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="field-required">Order type</label>
          <select id="of-type" onchange="onOrderTypeChange()">
            <option value="purchase">📦 Purchase — adds stock</option>
            <option value="sale">🛒 Sale — removes stock</option>
            <option value="adjustment">⚙️ Adjustment</option>
          </select>
        </div>
        <div class="form-group">
          <label>Initial status</label>
          <select id="of-status">
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label id="of-party-label">Supplier</label>
          <input id="of-party" placeholder="Supplier / vendor name" />
        </div>
        <div class="form-group">
          <label>Reference / PO #</label>
          <input id="of-reference" placeholder="e.g. PO-2025-001" />
        </div>
      </div>

      <div class="separator"></div>
      <div style="font-weight:700;font-size:13px;margin-bottom:10px">Add Products</div>

      <div style="display:grid;grid-template-columns:1fr 90px auto;gap:8px;margin-bottom:12px;align-items:end">
        <div class="form-group" style="margin:0">
          <label>Product</label>
          <select id="of-product">${productOptions || '<option value="">No products available</option>'}</select>
        </div>
        <div class="form-group" style="margin:0">
          <label>Qty</label>
          <input type="number" id="of-item-qty" value="1" min="1" />
        </div>
        <div class="form-group" style="margin:0">
          <label style="visibility:hidden">Add</label>
          <button class="btn btn-primary" onclick="addOrderItem()" style="width:100%;white-space:nowrap">+ Add</button>
        </div>
      </div>

      <div id="of-items-list"></div>

      <div class="form-group">
        <label>Notes <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
        <textarea id="of-notes" placeholder="Internal notes or special instructions…" style="min-height:60px"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="save-order-btn" onclick="saveOrder()">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M2 8l4 4 8-8"/></svg>
        Create Order
      </button>
    </div>`, true);

  renderOrderItems();
  onOrderTypeChange();
}

function onOrderTypeChange() {
  const type  = document.getElementById('of-type')?.value;
  const label = document.getElementById('of-party-label');
  const input = document.getElementById('of-party');
  if (!label || !input) return;
  if (type === 'sale') {
    label.textContent  = 'Customer';
    input.placeholder  = 'Customer name';
  } else if (type === 'purchase') {
    label.textContent  = 'Supplier';
    input.placeholder  = 'Supplier / vendor name';
  } else {
    label.textContent  = 'Reference';
    input.placeholder  = 'Adjustment reason or reference';
  }
}

function addOrderItem() {
  const sel = document.getElementById('of-product');
  const qty = parseInt(document.getElementById('of-item-qty').value) || 1;

  if (!sel || !sel.value) { toast('Please select a product', 'error'); return; }
  if (qty < 1) { toast('Quantity must be at least 1', 'error'); return; }

  const productId   = sel.value;
  const selectedOpt = sel.options[sel.selectedIndex];
  const productName = selectedOpt?.dataset.name || selectedOpt?.text || '';
  const price       = parseFloat(selectedOpt?.dataset.price) || 0;
  const sku         = selectedOpt?.dataset.sku || '';

  // Merge if product already in list
  const existing = orderItems.find(i => i.product === productId);
  if (existing) {
    existing.quantity   += qty;
    existing.totalPrice  = existing.quantity * existing.unitPrice;
  } else {
    orderItems.push({
      product:    productId,
      name:       productName,
      sku,
      quantity:   qty,
      unitPrice:  price,
      totalPrice: qty * price
    });
  }

  renderOrderItems();
  document.getElementById('of-item-qty').value = 1;
}

function removeOrderItem(idx) {
  orderItems.splice(idx, 1);
  renderOrderItems();
}

function updateOrderItemQty(idx, val) {
  const qty = parseInt(val);
  if (qty > 0 && orderItems[idx]) {
    orderItems[idx].quantity   = qty;
    orderItems[idx].totalPrice = qty * orderItems[idx].unitPrice;
    // Update subtotal display only, don't re-render whole list (preserves focus)
    const subtotalEl = document.getElementById('order-subtotal');
    const subtotal   = orderItems.reduce((s, i) => s + i.totalPrice, 0);
    if (subtotalEl) subtotalEl.textContent = fmtCurrency(subtotal);
  }
}

function renderOrderItems() {
  const el = document.getElementById('of-items-list');
  if (!el) return;

  if (!orderItems.length) {
    el.innerHTML = `<div style="background:var(--bg);border:1.5px dashed var(--border);border-radius:var(--radius);padding:1.5rem;text-align:center;color:var(--text-3);font-size:13px;margin-bottom:1rem">
      No products added yet — select a product above and click Add
    </div>`;
    return;
  }

  const subtotal = orderItems.reduce((s, i) => s + i.totalPrice, 0);
  el.innerHTML = `
    <div style="border:1.5px solid var(--border);border-radius:var(--radius);overflow:hidden;margin-bottom:1rem">
      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
        <tbody>
          ${orderItems.map((item, idx) => `<tr>
            <td><div class="td-name" style="font-size:13px">${escapeHtml(item.name)}</div></td>
            <td><span class="td-mono">${escapeHtml(item.sku)}</span></td>
            <td style="width:90px">
              <input type="number" value="${item.quantity}" min="1"
                style="width:72px;padding:5px 8px;font-size:13px"
                onchange="updateOrderItemQty(${idx}, this.value)"
                oninput="updateOrderItemQty(${idx}, this.value)" />
            </td>
            <td>${fmtCurrency(item.unitPrice)}</td>
            <td style="font-weight:700">${fmtCurrency(item.totalPrice)}</td>
            <td>
              <button class="btn-icon" style="color:var(--danger)" onclick="removeOrderItem(${idx})" title="Remove">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 4 13 4"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
              </button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;padding:12px 16px;background:var(--bg);border-top:1px solid var(--border)">
        <div style="text-align:right">
          <div style="font-size:11px;color:var(--text-3);margin-bottom:2px;text-transform:uppercase;letter-spacing:0.07em">Subtotal</div>
          <div id="order-subtotal" style="font-size:20px;font-weight:700;letter-spacing:-0.02em">${fmtCurrency(subtotal)}</div>
        </div>
      </div>
    </div>`;
}

async function saveOrder() {
  if (!orderItems.length) { toast('Add at least one product', 'error'); return; }

  const type      = document.getElementById('of-type').value;
  const status    = document.getElementById('of-status').value;
  const party     = document.getElementById('of-party').value.trim();
  const reference = document.getElementById('of-reference').value.trim();
  const notes     = document.getElementById('of-notes').value.trim();

  const data = {
    type,
    status,
    notes,
    reference,
    items: orderItems.map(i => ({
      product:    i.product,
      quantity:   i.quantity,
      unitPrice:  i.unitPrice,
      totalPrice: i.quantity * i.unitPrice  // recalculate cleanly
    }))
  };

  if (type === 'purchase')  data.supplier = party;
  else if (type === 'sale') data.customer = party;

  const btn = document.getElementById('save-order-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  try {
    await api.createOrder(data);
    toast('Order created successfully', 'success');
    closeModal();
    fetchOrders();
    fetchOrderStats();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M2 8l4 4 8-8"/></svg> Create Order`; }
  }
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
async function exportOrders() {
  try {
    toast('Preparing export…', 'info');
    const { orders } = await api.getOrders({ limit: 9999 });
    const rows = [['Order #', 'Type', 'Status', 'Party', 'Items', 'Total', 'Reference', 'Notes', 'Date']];
    orders.forEach(o => {
      const party = o.supplier || o.customer || '';
      rows.push([
        o.orderNumber, o.type, o.status, party,
        o.items.length, o.totalAmount,
        o.reference || '', o.notes || '',
        fmtDate(o.createdAt)
      ]);
    });
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Exported ${orders.length} orders`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}
