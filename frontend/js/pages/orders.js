let ordState = { type: '', status: '', page: 1, products: [] };

async function loadOrders() {
  const el = document.getElementById('page-orders');
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Orders</div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openOrderModal()">+ New Order</button>
      </div>
    </div>
    <div class="page-content">
      <div class="card">
        <div class="table-toolbar" style="flex-wrap:wrap;gap:8px">
          <div class="filter-tabs">
            <span style="font-size:12px;color:var(--text-2);margin-right:4px">Type:</span>
            <div class="tab active" onclick="ordTypeFilter('')">All</div>
            <div class="tab" onclick="ordTypeFilter('purchase')">Purchase</div>
            <div class="tab" onclick="ordTypeFilter('sale')">Sale</div>
            <div class="tab" onclick="ordTypeFilter('adjustment')">Adjustment</div>
          </div>
          <div class="filter-tabs" style="margin-left:auto">
            <span style="font-size:12px;color:var(--text-2);margin-right:4px">Status:</span>
            <div class="tab active" data-status-tab onclick="ordStatusFilter('')">All</div>
            <div class="tab" data-status-tab onclick="ordStatusFilter('pending')">Pending</div>
            <div class="tab" data-status-tab onclick="ordStatusFilter('completed')">Completed</div>
          </div>
        </div>
        <div class="table-wrap" id="ord-table-wrap"></div>
        <div id="ord-pagination" class="pagination"></div>
      </div>
    </div>`;

  try { ordState.products = (await api.getProducts({ limit: 999 })).products; } catch {}
  await fetchOrders();
}

function ordTypeFilter(type) {
  ordState.type = type; ordState.page = 1;
  document.querySelectorAll('#page-orders .filter-tabs:first-child .tab').forEach((t, i) => {
    t.classList.toggle('active', ['','purchase','sale','adjustment'][i] === type);
  });
  fetchOrders();
}

function ordStatusFilter(status) {
  ordState.status = status; ordState.page = 1;
  document.querySelectorAll('[data-status-tab]').forEach((t, i) => {
    t.classList.toggle('active', ['','pending','completed'][i] === status);
  });
  fetchOrders();
}

async function fetchOrders() {
  const wrap = document.getElementById('ord-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-3)">Loading...</div>`;

  try {
    const params = { page: ordState.page, limit: 15 };
    if (ordState.type) params.type = ordState.type;
    if (ordState.status) params.status = ordState.status;
    const { orders, total, page, pages } = await api.getOrders(params);
    renderOrdersTable(orders);
    renderOrdPagination(total, page, pages);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderOrdersTable(orders) {
  const wrap = document.getElementById('ord-table-wrap');
  if (!orders.length) {
    wrap.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p>No orders found</p></div>`;
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Order #</th><th>Type</th><th>Items</th>
      <th>Total</th><th>Status</th><th>Date</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${orders.map(o => `<tr>
        <td><div class="td-name">${escapeHtml(o.orderNumber)}</div></td>
        <td><span class="badge badge-gray">${o.type}</span></td>
        <td style="color:var(--text-2)">${o.items.length} item${o.items.length!==1?'s':''}</td>
        <td style="font-weight:500">${fmtCurrency(o.totalAmount)}</td>
        <td>${orderStatusBadge(o.status)}</td>
        <td style="color:var(--text-2)">${fmtDate(o.createdAt)}</td>
        <td>
          <div class="actions-col">
            <button class="btn btn-sm" onclick="viewOrder('${o._id}')">View</button>
            ${o.status==='pending'?`<button class="btn btn-sm" onclick="updateOrderStatus('${o._id}','completed')">Complete</button>`:''}
            ${o.status==='pending'?`<button class="btn btn-sm" style="color:var(--danger)" onclick="updateOrderStatus('${o._id}','cancelled')">Cancel</button>`:''}
          </div>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function renderOrdPagination(total, page, pages) {
  const el = document.getElementById('ord-pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = `<span class="page-info">${total} orders</span>`; return; }
  el.innerHTML = `
    <span class="page-info">${total} orders — page ${page} of ${pages}</span>
    <button class="btn btn-sm" onclick="ordChangePage(${page-1})" ${page<=1?'disabled':''}>← Prev</button>
    <button class="btn btn-sm" onclick="ordChangePage(${page+1})" ${page>=pages?'disabled':''}>Next →</button>`;
}

function ordChangePage(p) { ordState.page = p; fetchOrders(); }

// --- VIEW ORDER ---
async function viewOrder(id) {
  try {
    const o = await api.getOrder(id);
    openModal(`Order ${o.orderNumber}`, `
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:1rem">
          <div><div style="font-size:12px;color:var(--text-2)">Type</div><div style="font-weight:500;text-transform:capitalize">${o.type}</div></div>
          <div><div style="font-size:12px;color:var(--text-2)">Status</div>${orderStatusBadge(o.status)}</div>
          <div><div style="font-size:12px;color:var(--text-2)">Date</div><div>${fmtDate(o.createdAt)}</div></div>
          <div><div style="font-size:12px;color:var(--text-2)">Created by</div><div>${escapeHtml(o.createdBy?.name||'—')}</div></div>
          ${o.supplier?`<div><div style="font-size:12px;color:var(--text-2)">Supplier</div><div>${escapeHtml(o.supplier)}</div></div>`:''}
          ${o.customer?`<div><div style="font-size:12px;color:var(--text-2)">Customer</div><div>${escapeHtml(o.customer)}</div></div>`:''}
        </div>
        <div class="separator"></div>
        <table style="margin-bottom:1rem">
          <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
          <tbody>
            ${o.items.map(i=>`<tr>
              <td><div class="td-name">${escapeHtml(i.product?.name||'—')}</div><div class="td-sub">${escapeHtml(i.product?.sku||'')}</div></td>
              <td>${i.quantity}</td>
              <td>${fmtCurrency(i.unitPrice)}</td>
              <td style="font-weight:500">${fmtCurrency(i.totalPrice)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;font-size:15px;font-weight:600">
          Total: ${fmtCurrency(o.totalAmount)}
        </div>
        ${o.notes?`<div class="separator"></div><div style="font-size:13px;color:var(--text-2)">Notes: ${escapeHtml(o.notes)}</div>`:''}
      </div>
      <div class="modal-footer"><button class="btn" onclick="closeModal()">Close</button></div>`);
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- NEW ORDER MODAL ---
let orderItems = [];

function openOrderModal() {
  orderItems = [];
  const productOptions = ordState.products.map(p => `<option value="${p._id}" data-price="${p.price}">${escapeHtml(p.name)} (${escapeHtml(p.sku)})</option>`).join('');

  openModal('New Order', `
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Order type *</label>
          <select id="of-type">
            <option value="purchase">Purchase (adds stock)</option>
            <option value="sale">Sale (removes stock)</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div class="form-group">
          <label>Status</label>
          <select id="of-status">
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Supplier (for purchases)</label>
          <input id="of-supplier" placeholder="Supplier name" />
        </div>
        <div class="form-group">
          <label>Customer (for sales)</label>
          <input id="of-customer" placeholder="Customer name" />
        </div>
      </div>
      <div class="separator"></div>
      <div style="margin-bottom:8px;font-weight:500;font-size:13px">Order items</div>
      <div style="display:flex;gap:8px;margin-bottom:1rem">
        <select id="of-product" style="flex:1">${productOptions}</select>
        <input type="number" id="of-item-qty" value="1" min="1" style="width:80px" />
        <button class="btn btn-sm btn-primary" onclick="addOrderItem()">Add</button>
      </div>
      <div id="of-items-list"></div>
      <div class="form-group" style="margin-top:0.5rem">
        <label>Notes</label>
        <textarea id="of-notes" placeholder="Optional notes..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveOrder()">Create order</button>
    </div>`, true);
}

function addOrderItem() {
  const sel = document.getElementById('of-product');
  const qty = parseInt(document.getElementById('of-item-qty').value) || 1;
  const productId = sel.value;
  const productName = sel.options[sel.selectedIndex]?.text || '';
  const price = parseFloat(sel.options[sel.selectedIndex]?.dataset.price) || 0;

  const existing = orderItems.find(i => i.product === productId);
  if (existing) { existing.quantity += qty; existing.totalPrice = existing.quantity * existing.unitPrice; }
  else { orderItems.push({ product: productId, name: productName, quantity: qty, unitPrice: price, totalPrice: qty * price }); }
  renderOrderItems();
}

function removeOrderItem(idx) { orderItems.splice(idx, 1); renderOrderItems(); }

function renderOrderItems() {
  const el = document.getElementById('of-items-list');
  if (!el) return;
  if (!orderItems.length) { el.innerHTML = `<div style="color:var(--text-3);font-size:13px;margin-bottom:1rem">No items added yet</div>`; return; }
  const total = orderItems.reduce((s, i) => s + i.totalPrice, 0);
  el.innerHTML = `<table style="margin-bottom:8px">
    <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th><th></th></tr></thead>
    <tbody>
      ${orderItems.map((i, idx) => `<tr>
        <td style="font-size:12px">${escapeHtml(i.name)}</td>
        <td>${i.quantity}</td>
        <td>${fmtCurrency(i.unitPrice)}</td>
        <td style="font-weight:500">${fmtCurrency(i.totalPrice)}</td>
        <td><button class="btn-icon" onclick="removeOrderItem(${idx})">✕</button></td>
      </tr>`).join('')}
    </tbody>
  </table>
  <div style="text-align:right;font-weight:600;font-size:14px;margin-bottom:1rem">Total: ${fmtCurrency(total)}</div>`;
}

async function saveOrder() {
  if (!orderItems.length) { toast('Add at least one item', 'error'); return; }
  const data = {
    type: document.getElementById('of-type').value,
    status: document.getElementById('of-status').value,
    supplier: document.getElementById('of-supplier').value.trim(),
    customer: document.getElementById('of-customer').value.trim(),
    notes: document.getElementById('of-notes').value.trim(),
    items: orderItems.map(i => ({ product: i.product, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice }))
  };
  try {
    await api.createOrder(data);
    toast('Order created', 'success');
    closeModal();
    fetchOrders();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function updateOrderStatus(id, status) {
  try {
    await api.updateOrderStatus(id, status);
    toast(`Order marked as ${status}`, 'success');
    fetchOrders();
  } catch (err) {
    toast(err.message, 'error');
  }
}
