let invState = { search: '', status: '', category: '', page: 1, categories: [] };

async function loadInventory() {
  const el = document.getElementById('page-inventory');
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Inventory</div>
      <div class="page-actions">
        <button class="btn" onclick="exportInventory()">Export CSV</button>
        <button class="btn btn-primary" onclick="openProductModal()">+ Add Product</button>
      </div>
    </div>
    <div class="page-content">
      <div class="card">
        <div class="table-toolbar">
          <div class="search-wrap">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
            <input placeholder="Search products, SKUs, suppliers..." id="inv-search" oninput="invSearch(this.value)" />
          </div>
          <div class="filter-tabs">
            <div class="tab active" onclick="invFilter('')">All</div>
            <div class="tab" onclick="invFilter('in_stock')">In stock</div>
            <div class="tab" onclick="invFilter('low_stock')">Low stock</div>
            <div class="tab" onclick="invFilter('out_of_stock')">Out of stock</div>
          </div>
        </div>
        <div class="table-wrap" id="inv-table-wrap"></div>
        <div id="inv-pagination" class="pagination"></div>
      </div>
    </div>`;

  try {
    invState.categories = await api.getCategories();
  } catch {}
  await fetchInventory();
}

let invSearchTimeout;
function invSearch(val) {
  clearTimeout(invSearchTimeout);
  invSearchTimeout = setTimeout(() => { invState.search = val; invState.page = 1; fetchInventory(); }, 300);
}

function invFilter(status) {
  invState.status = status;
  invState.page = 1;
  document.querySelectorAll('#page-inventory .tab').forEach((t, i) => {
    t.classList.toggle('active', ['', 'in_stock', 'low_stock', 'out_of_stock'][i] === status);
  });
  fetchInventory();
}

async function fetchInventory() {
  const wrap = document.getElementById('inv-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-3)">Loading...</div>`;

  try {
    const params = { page: invState.page, limit: 15 };
    if (invState.search) params.search = invState.search;
    if (invState.status) params.status = invState.status;
    if (invState.category) params.category = invState.category;

    const { products, total, page, pages } = await api.getProducts(params);
    renderInventoryTable(products);
    renderInvPagination(total, page, pages);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderInventoryTable(products) {
  const wrap = document.getElementById('inv-table-wrap');
  if (!products.length) {
    wrap.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      <p>No products found</p></div>`;
    return;
  }
  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Product</th><th>SKU</th><th>Category</th>
      <th>Quantity</th><th>Unit price</th><th>Total value</th>
      <th>Status</th><th>Actions</th>
    </tr></thead>
    <tbody>
      ${products.map(p => {
        const status = p.quantity === 0 ? 'out_of_stock' : p.quantity <= p.reorderLevel ? 'low_stock' : 'in_stock';
        const totalVal = p.quantity * p.price;
        return `<tr>
          <td>
            <div class="td-name">${escapeHtml(p.name)}</div>
            ${p.supplier ? `<div class="td-sub">${escapeHtml(p.supplier)}</div>` : ''}
          </td>
          <td class="td-mono">${escapeHtml(p.sku)}</td>
          <td>
            ${p.category ? `<span style="display:inline-flex;align-items:center;gap:5px">
              <span class="color-dot" style="background:${p.category.color||'#6366f1'}"></span>
              ${escapeHtml(p.category.name)}
            </span>` : '—'}
          </td>
          <td>
            <span class="qty-badge" style="color:${p.quantity===0?'var(--danger)':p.quantity<=p.reorderLevel?'var(--warning)':'var(--text)'}">${p.quantity}</span>
            <span style="color:var(--text-3);font-size:11px"> ${escapeHtml(p.unit||'pcs')}</span>
          </td>
          <td>${fmtCurrency(p.price)}</td>
          <td>${fmtCurrency(totalVal)}</td>
          <td>${statusBadge(status)}</td>
          <td>
            <div class="actions-col">
              <button class="btn-icon" title="Adjust stock" onclick="openAdjustModal('${p._id}','${escapeHtml(p.name)}',${p.quantity})">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
              </button>
              <button class="btn-icon" title="Edit" onclick="openProductModal('${p._id}')">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-9 9H2v-3z"/></svg>
              </button>
              <button class="btn-icon" title="Delete" onclick="deleteProduct('${p._id}','${escapeHtml(p.name)}')">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 4 13 4"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>`;
}

function renderInvPagination(total, page, pages) {
  const el = document.getElementById('inv-pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = `<span class="page-info">${total} products</span>`; return; }
  el.innerHTML = `
    <span class="page-info">${total} products — page ${page} of ${pages}</span>
    <button class="btn btn-sm" onclick="invChangePage(${page-1})" ${page<=1?'disabled':''}>← Prev</button>
    <button class="btn btn-sm" onclick="invChangePage(${page+1})" ${page>=pages?'disabled':''}>Next →</button>`;
}

function invChangePage(p) { invState.page = p; fetchInventory(); }

// --- PRODUCT MODAL ---
async function openProductModal(id = null) {
  const cats = invState.categories;
  let p = null;
  if (id) {
    try { p = await api.getProduct(id); } catch (e) { toast(e.message, 'error'); return; }
  }

  const catOptions = cats.map(c => `<option value="${c._id}" ${p && p.category && (p.category._id||p.category)===c._id ? 'selected':''}>${escapeHtml(c.name)}</option>`).join('');

  openModal(id ? 'Edit Product' : 'Add Product', `
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label>Product name *</label>
          <input id="pf-name" value="${escapeHtml(p?.name||'')}" placeholder="Wireless Headphones X3" />
        </div>
        <div class="form-group">
          <label>SKU *</label>
          <input id="pf-sku" value="${escapeHtml(p?.sku||'')}" placeholder="WH-X3-BLK" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Category *</label>
          <select id="pf-category"><option value="">Select category</option>${catOptions}</select>
        </div>
        <div class="form-group">
          <label>Unit</label>
          <input id="pf-unit" value="${escapeHtml(p?.unit||'pcs')}" placeholder="pcs, kg, box..." />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Selling price ($) *</label>
          <input type="number" id="pf-price" value="${p?.price||''}" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Cost price ($)</label>
          <input type="number" id="pf-costprice" value="${p?.costPrice||''}" min="0" step="0.01" placeholder="0.00" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Quantity *</label>
          <input type="number" id="pf-qty" value="${p?.quantity??''}" min="0" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Reorder level</label>
          <input type="number" id="pf-reorder" value="${p?.reorderLevel??10}" min="0" placeholder="10" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Supplier</label>
          <input id="pf-supplier" value="${escapeHtml(p?.supplier||'')}" placeholder="Supplier name" />
        </div>
        <div class="form-group">
          <label>Location</label>
          <input id="pf-location" value="${escapeHtml(p?.location||'')}" placeholder="Warehouse / shelf" />
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="pf-desc" placeholder="Product description...">${escapeHtml(p?.description||'')}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProduct('${id||''}')">Save product</button>
    </div>`);
}

async function saveProduct(id) {
  const data = {
    name: document.getElementById('pf-name').value.trim(),
    sku: document.getElementById('pf-sku').value.trim(),
    category: document.getElementById('pf-category').value,
    unit: document.getElementById('pf-unit').value.trim() || 'pcs',
    price: parseFloat(document.getElementById('pf-price').value) || 0,
    costPrice: parseFloat(document.getElementById('pf-costprice').value) || 0,
    quantity: parseInt(document.getElementById('pf-qty').value) || 0,
    reorderLevel: parseInt(document.getElementById('pf-reorder').value) || 10,
    supplier: document.getElementById('pf-supplier').value.trim(),
    location: document.getElementById('pf-location').value.trim(),
    description: document.getElementById('pf-desc').value.trim()
  };

  if (!data.name || !data.sku || !data.category) {
    toast('Name, SKU and category are required', 'error'); return;
  }

  try {
    if (id) { await api.updateProduct(id, data); toast('Product updated', 'success'); }
    else { await api.createProduct(data); toast('Product created', 'success'); }
    closeModal();
    fetchInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- ADJUST STOCK MODAL ---
function openAdjustModal(id, name, current) {
  openModal('Adjust Stock', `
    <div class="modal-body">
      <p style="margin-bottom:1rem;color:var(--text-2)">Current stock for <strong>${escapeHtml(name)}</strong>: <strong>${current}</strong></p>
      <div class="form-group">
        <label>Adjustment type</label>
        <select id="adj-type">
          <option value="add">Add stock (purchase/return)</option>
          <option value="subtract">Remove stock (sale/loss)</option>
          <option value="set">Set exact quantity</option>
        </select>
      </div>
      <div class="form-group">
        <label>Quantity</label>
        <input type="number" id="adj-qty" min="0" placeholder="Enter quantity" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="applyAdjust('${id}')">Apply adjustment</button>
    </div>`);
}

async function applyAdjust(id) {
  const type = document.getElementById('adj-type').value;
  const qty = parseInt(document.getElementById('adj-qty').value);
  if (isNaN(qty) || qty < 0) { toast('Enter a valid quantity', 'error'); return; }
  try {
    await api.adjustQuantity(id, qty, type);
    toast('Stock updated', 'success');
    closeModal();
    fetchInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- DELETE ---
async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await api.deleteProduct(id);
    toast('Product deleted', 'success');
    fetchInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- EXPORT CSV ---
async function exportInventory() {
  try {
    const { products } = await api.getProducts({ limit: 9999 });
    const rows = [['Name','SKU','Category','Quantity','Unit Price','Cost Price','Status','Supplier','Location']];
    products.forEach(p => {
      const status = p.quantity===0?'Out of stock':p.quantity<=p.reorderLevel?'Low stock':'In stock';
      rows.push([p.name,p.sku,p.category?.name||'',p.quantity,p.price,p.costPrice||0,status,p.supplier||'',p.location||'']);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `inventory_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast('CSV exported', 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}
