let invState = {
  search: '', status: '', category: '', page: 1,
  categories: [], sort: '-createdAt'
};

async function loadInventory() {
  const el = document.getElementById('page-inventory');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Inventory</div>
        <div class="page-subtitle">Manage products, stock levels, and pricing</div>
      </div>
      <div class="page-actions">
        <button class="btn" onclick="exportInventory()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" style="width:14px;height:14px"><path d="M8 2v8M5 7l3 3 3-3M2 12h12"/></svg>
          Export CSV
        </button>
        <button class="btn btn-primary" onclick="openProductModal()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          Add Product
        </button>
      </div>
    </div>
    <div class="page-content">
      <div class="card">
        <div class="table-toolbar">
          <div class="search-wrap">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
            <input placeholder="Search products, SKUs, suppliers…" id="inv-search" oninput="invSearch(this.value)" />
          </div>
          <div class="filter-group">
            <span class="filter-label">Status</span>
            <div class="filter-tabs" id="inv-status-tabs">
              <div class="tab active"         onclick="invFilter('')">All</div>
              <div class="tab"                onclick="invFilter('in_stock')">In Stock</div>
              <div class="tab"                onclick="invFilter('low_stock')">Low</div>
              <div class="tab"                onclick="invFilter('out_of_stock')">Out</div>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">Category</span>
            <select id="inv-cat-filter" onchange="invCategoryFilter(this.value)"
              style="width:auto;padding:5px 30px 5px 10px;font-size:12px">
              <option value="">All categories</option>
            </select>
          </div>
        </div>
        <div class="table-wrap" id="inv-table-wrap">
          <div style="padding:2.5rem;text-align:center;color:var(--text-3)">Loading…</div>
        </div>
        <div id="inv-pagination" class="pagination"></div>
      </div>
    </div>`;

  // Load categories for filter & product modal
  try {
    invState.categories = await api.getCategories();
    const sel = document.getElementById('inv-cat-filter');
    if (sel) {
      invState.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c._id; opt.textContent = c.name;
        sel.appendChild(opt);
      });
    }
  } catch {}

  await fetchInventory();
}

// ─── SEARCH & FILTER ─────────────────────────────────────────────────────────
let invSearchTimeout;
function invSearch(val) {
  clearTimeout(invSearchTimeout);
  invSearchTimeout = setTimeout(() => {
    invState.search = val;
    invState.page   = 1;
    fetchInventory();
  }, 300);
}

function invFilter(status) {
  invState.status = status;
  invState.page   = 1;
  document.querySelectorAll('#inv-status-tabs .tab').forEach((t, i) => {
    t.classList.toggle('active', ['', 'in_stock', 'low_stock', 'out_of_stock'][i] === status);
  });
  fetchInventory();
}

function invCategoryFilter(catId) {
  invState.category = catId;
  invState.page     = 1;
  fetchInventory();
}

// ─── FETCH & RENDER ──────────────────────────────────────────────────────────
async function fetchInventory() {
  const wrap = document.getElementById('inv-table-wrap');
  if (!wrap) return;
  wrap.innerHTML = `<div style="padding:2.5rem;text-align:center;color:var(--text-3)">
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" stroke="var(--accent)" style="width:30px;height:30px;display:block;margin:0 auto 8px"><g fill="none"><g transform="translate(1 1)" stroke-width="2"><circle stroke-opacity=".25" cx="18" cy="18" r="18"/><path d="M36 18c0-9.94-8.06-18-18-18"><animateTransform attributeName="transform" type="rotate" from="0 18 18" to="360 18 18" dur="0.8s" repeatCount="indefinite"/></path></g></g></svg>
    Loading products…</div>`;

  try {
    const params = { page: invState.page, limit: 15, sort: invState.sort };
    if (invState.search)   params.search   = invState.search;
    if (invState.status)   params.status   = invState.status;
    if (invState.category) params.category = invState.category;

    const { products, total, page, pages } = await api.getProducts(params);
    renderInventoryTable(products);
    renderInvPagination(total, page, pages);
  } catch (err) {
    wrap.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderInventoryTable(products) {
  const wrap = document.getElementById('inv-table-wrap');
  if (!products || products.length === 0) {
    wrap.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
      <p>No products found</p>
      <div class="empty-hint">${invState.search
        ? `No results for "${escapeHtml(invState.search)}" — try a different term`
        : 'Add your first product to get started'}</div>
      ${!invState.search ? `<button class="btn btn-primary" style="margin-top:12px" onclick="openProductModal()">+ Add Product</button>` : ''}
    </div>`;
    return;
  }

  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Product</th><th>SKU</th><th>Category</th>
      <th>Stock</th><th>Unit Price</th><th>Total Value</th>
      <th>Status</th><th style="text-align:center">Actions</th>
    </tr></thead>
    <tbody>
      ${products.map(p => {
        const status    = p.quantity === 0 ? 'out_of_stock' : p.quantity <= p.reorderLevel ? 'low_stock' : 'in_stock';
        const totalVal  = p.quantity * p.price;
        const stockColor= p.quantity === 0 ? 'var(--danger)' : p.quantity <= p.reorderLevel ? 'var(--warning)' : 'var(--success)';
        const maxStock  = Math.max(p.reorderLevel * 2, p.quantity, 1);
        const stockPct  = Math.round(Math.min(100, (p.quantity / maxStock) * 100));
        const catColor  = p.category?.color || '#5b60d6';
        return `<tr>
          <td>
            <div class="td-name">${escapeHtml(p.name)}</div>
            ${p.supplier ? `<div class="td-sub">📦 ${escapeHtml(p.supplier)}</div>` : ''}
            ${p.location ? `<div class="td-sub">📍 ${escapeHtml(p.location)}</div>` : ''}
          </td>
          <td><span class="td-mono">${escapeHtml(p.sku)}</span></td>
          <td>
            ${p.category
              ? `<span style="display:inline-flex;align-items:center;gap:6px;background:${catColor}18;padding:3px 8px;border-radius:999px">
                  <span style="width:7px;height:7px;border-radius:50%;background:${catColor}"></span>
                  <span style="font-size:12px;font-weight:600;color:${catColor}">${escapeHtml(p.category.name)}</span>
                </span>`
              : '<span style="color:var(--text-3)">—</span>'}
          </td>
          <td style="min-width:110px">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="qty-badge" style="color:${stockColor}">${p.quantity}</span>
              <span style="color:var(--text-3);font-size:11px">${escapeHtml(p.unit || 'pcs')}</span>
            </div>
            <div style="margin-top:4px;background:var(--border);height:4px;border-radius:2px;overflow:hidden;width:80px">
              <div style="height:100%;background:${stockColor};width:${stockPct}%;border-radius:2px;transition:width 0.4s"></div>
            </div>
          </td>
          <td style="font-weight:600">${fmtCurrency(p.price)}</td>
          <td style="font-weight:700">${fmtCurrency(totalVal)}</td>
          <td>${statusBadge(status)}</td>
          <td>
            <div class="actions-col" style="justify-content:center">
              <button class="btn-icon" title="Adjust stock"
                onclick="openAdjustModal('${p._id}','${escapeHtml(p.name)}',${p.quantity})">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="6"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="8" y1="5" x2="8" y2="11"/></svg>
              </button>
              <button class="btn-icon" title="Edit product" onclick="openProductModal('${p._id}')">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-9 9H2v-3z"/></svg>
              </button>
              <button class="btn-icon" title="Delete product" style="color:var(--danger)"
                onclick="deleteProduct('${p._id}','${escapeHtml(p.name)}')">
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 4 13 4"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;
}

function renderInvPagination(total, page, pages) {
  const el = document.getElementById('inv-pagination');
  if (!el) return;
  if (pages <= 1) {
    el.innerHTML = `<span class="page-info">${total} product${total !== 1 ? 's' : ''}</span>`;
    return;
  }
  el.innerHTML = `
    <span class="page-info">${total} products — page ${page} of ${pages}</span>
    <button class="btn btn-sm" onclick="invChangePage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
    <button class="btn btn-sm" onclick="invChangePage(${page + 1})" ${page >= pages ? 'disabled' : ''}>Next →</button>`;
}
function invChangePage(p) { invState.page = p; fetchInventory(); }

// ─── PRODUCT MODAL ───────────────────────────────────────────────────────────
async function openProductModal(id = null) {
  const cats = invState.categories;
  let p = null;
  if (id) {
    try {
      p = await api.getProduct(id);
    } catch (e) {
      toast(e.message, 'error');
      return;
    }
  }

  // Get selected category id handling populate object or raw id
  const selectedCatId = p?.category?._id || p?.category || '';

  const catOptions = cats.map(c =>
    `<option value="${c._id}" ${String(c._id) === String(selectedCatId) ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
  ).join('');

  openModal(id ? 'Edit Product' : 'Add Product', `
    <div class="modal-body">
      <div class="form-row">
        <div class="form-group">
          <label class="field-required">Product name</label>
          <input id="pf-name" value="${escapeHtml(p?.name || '')}" placeholder="e.g. Wireless Headphones X3" />
        </div>
        <div class="form-group">
          <label class="field-required">SKU</label>
          <input id="pf-sku" value="${escapeHtml(p?.sku || '')}" placeholder="e.g. WH-X3-BLK" />
          <div class="field-hint">Unique product identifier</div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-required">Category</label>
          <select id="pf-category">
            <option value="">Select category…</option>${catOptions}
          </select>
        </div>
        <div class="form-group">
          <label>Unit</label>
          <input id="pf-unit" value="${escapeHtml(p?.unit || 'pcs')}" placeholder="pcs, kg, box…" />
        </div>
      </div>

      <div class="separator"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-2);margin-bottom:10px">Pricing</div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-required">Selling price ($)</label>
          <input type="number" id="pf-price" value="${p?.price ?? ''}" min="0" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Cost price ($)</label>
          <input type="number" id="pf-costprice" value="${p?.costPrice ?? ''}" min="0" step="0.01" placeholder="0.00" />
          <div class="field-hint">Used for profit calculation</div>
        </div>
      </div>

      <div class="separator"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-2);margin-bottom:10px">Stock</div>
      <div class="form-row">
        <div class="form-group">
          <label class="field-required">Quantity</label>
          <input type="number" id="pf-qty" value="${p?.quantity ?? 0}" min="0" placeholder="0" />
        </div>
        <div class="form-group">
          <label>Reorder level</label>
          <input type="number" id="pf-reorder" value="${p?.reorderLevel ?? 10}" min="0" placeholder="10" />
          <div class="field-hint">Alert when stock drops below this</div>
        </div>
      </div>

      <div class="separator"></div>
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--text-2);margin-bottom:10px">Details</div>
      <div class="form-row">
        <div class="form-group">
          <label>Supplier</label>
          <input id="pf-supplier" value="${escapeHtml(p?.supplier || '')}" placeholder="Supplier name" />
        </div>
        <div class="form-group">
          <label>Location</label>
          <input id="pf-location" value="${escapeHtml(p?.location || '')}" placeholder="e.g. Warehouse A / Shelf 3" />
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="pf-desc" placeholder="Product notes…">${escapeHtml(p?.description || '')}</textarea>
      </div>
      ${p ? `<div style="background:var(--bg);border-radius:var(--radius);padding:10px 14px;font-size:12px;color:var(--text-3)">
        Last updated: ${fmtDateTime(p.updatedAt || p.createdAt)}
      </div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveProduct('${id || ''}')">
        ${id ? 'Save changes' : 'Add product'}
      </button>
    </div>`, true);
}

async function saveProduct(id) {
  const data = {
    name:         document.getElementById('pf-name').value.trim(),
    sku:          document.getElementById('pf-sku').value.trim(),
    category:     document.getElementById('pf-category').value || null,
    unit:         document.getElementById('pf-unit').value.trim() || 'pcs',
    price:        parseFloat(document.getElementById('pf-price').value) || 0,
    costPrice:    parseFloat(document.getElementById('pf-costprice').value) || 0,
    quantity:     parseInt(document.getElementById('pf-qty').value) || 0,
    reorderLevel: parseInt(document.getElementById('pf-reorder').value) || 10,
    supplier:     document.getElementById('pf-supplier').value.trim(),
    location:     document.getElementById('pf-location').value.trim(),
    description:  document.getElementById('pf-desc').value.trim()
  };

  if (!data.name)     { toast('Product name is required', 'error'); return; }
  if (!data.sku)      { toast('SKU is required', 'error'); return; }
  if (!data.category) { toast('Please select a category', 'error'); return; }
  if (data.price < 0) { toast('Price cannot be negative', 'error'); return; }

  try {
    if (id) {
      await api.updateProduct(id, data);
      toast('Product updated', 'success');
    } else {
      await api.createProduct(data);
      toast('Product added', 'success');
    }
    closeModal();
    fetchInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── ADJUST STOCK ────────────────────────────────────────────────────────────
function openAdjustModal(id, name, current) {
  openModal('Adjust Stock', `
    <div class="modal-body">
      <div style="background:var(--bg);border-radius:var(--radius);padding:14px;margin-bottom:1.25rem;display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;background:var(--accent-soft);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg viewBox="0 0 16 16" fill="none" stroke="var(--accent)" stroke-width="1.8" style="width:18px;height:18px"><rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="2" y1="6" x2="14" y2="6"/><line x1="6" y1="6" x2="6" y2="14"/></svg>
        </div>
        <div>
          <div style="font-weight:700;font-size:14px">${escapeHtml(name)}</div>
          <div style="font-size:12px;color:var(--text-2)">Current stock: <strong style="color:var(--text)">${current}</strong> units</div>
        </div>
      </div>

      <div class="form-group">
        <label>Adjustment type</label>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px" id="adj-type-group">
          <div class="adj-type-opt" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;text-align:center;transition:all 0.15s" onclick="selectAdjType('add',this)">
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--success)" stroke-width="2" style="width:20px;height:20px"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/></svg>
            <span style="font-size:12px;font-weight:700;color:var(--success)">Add</span>
            <span style="font-size:10px;color:var(--text-3)">Purchase / return</span>
          </div>
          <div class="adj-type-opt" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;text-align:center;transition:all 0.15s" onclick="selectAdjType('subtract',this)">
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--danger)" stroke-width="2" style="width:20px;height:20px"><circle cx="8" cy="8" r="6"/><line x1="5" y1="8" x2="11" y2="8"/></svg>
            <span style="font-size:12px;font-weight:700;color:var(--danger)">Remove</span>
            <span style="font-size:10px;color:var(--text-3)">Sale / loss</span>
          </div>
          <div class="adj-type-opt" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 8px;border:1.5px solid var(--border);border-radius:var(--radius);cursor:pointer;text-align:center;transition:all 0.15s" onclick="selectAdjType('set',this)">
            <svg viewBox="0 0 16 16" fill="none" stroke="var(--info)" stroke-width="2" style="width:20px;height:20px"><circle cx="8" cy="8" r="6"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="8" y1="5" x2="8" y2="11"/></svg>
            <span style="font-size:12px;font-weight:700;color:var(--info)">Set</span>
            <span style="font-size:10px;color:var(--text-3)">Exact count</span>
          </div>
        </div>
        <input type="hidden" id="adj-type" value="add" />
      </div>

      <div class="form-group">
        <label>Quantity <span id="adj-qty-label" style="font-weight:400;color:var(--text-3)">(to add)</span></label>
        <input type="number" id="adj-qty" min="0" placeholder="Enter quantity" data-current="${current}"
          oninput="updateAdjPreview(${current})" />
      </div>

      <div id="adj-preview" style="background:var(--bg);border-radius:var(--radius);padding:12px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--text-2);font-size:13px">New stock level</span>
        <span style="font-weight:700;font-size:16px" id="adj-new-qty">—</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="applyAdjust('${id}',${current})">Apply adjustment</button>
    </div>`);

  setTimeout(() => selectAdjType('add', document.querySelector('.adj-type-opt')), 60);
}

function selectAdjType(type, el) {
  document.querySelectorAll('.adj-type-opt').forEach(opt => {
    opt.style.borderColor = 'var(--border)';
    opt.style.background  = '';
  });
  if (el) {
    el.style.borderColor = 'var(--accent)';
    el.style.background  = 'var(--accent-soft)';
  }
  const typeInput = document.getElementById('adj-type');
  if (typeInput) typeInput.value = type;

  const lbl = document.getElementById('adj-qty-label');
  if (lbl) lbl.textContent = type === 'add' ? '(to add)' : type === 'subtract' ? '(to remove)' : '(new total)';

  const current = parseInt(document.getElementById('adj-qty')?.dataset.current || '0');
  updateAdjPreview(current);
}

function updateAdjPreview(current) {
  const type = document.getElementById('adj-type')?.value;
  const qty  = parseInt(document.getElementById('adj-qty')?.value) || 0;
  const el   = document.getElementById('adj-new-qty');
  if (!el) return;

  let newQty;
  if      (type === 'add')      newQty = current + qty;
  else if (type === 'subtract') newQty = Math.max(0, current - qty);
  else                          newQty = qty;

  el.textContent = isNaN(newQty) ? '—' : newQty;
  el.style.color = newQty === 0 ? 'var(--danger)' : newQty < 10 ? 'var(--warning)' : 'var(--success)';
}

async function applyAdjust(id, current) {
  const type = document.getElementById('adj-type').value;
  const qty  = parseInt(document.getElementById('adj-qty').value);

  if (isNaN(qty) || qty < 0) { toast('Enter a valid quantity (0 or more)', 'error'); return; }
  try {
    await api.adjustQuantity(id, qty, type);
    toast('Stock adjusted', 'success');
    closeModal();
    fetchInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────
async function deleteProduct(id, name) {
  if (!confirm(`Delete "${name}"?\n\nThis cannot be undone.`)) return;
  try {
    await api.deleteProduct(id);
    toast('Product deleted', 'success');
    fetchInventory();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// ─── EXPORT CSV ───────────────────────────────────────────────────────────────
async function exportInventory() {
  try {
    toast('Preparing export…', 'info');
    const { products } = await api.getProducts({ limit: 9999 });
    const rows = [['Name','SKU','Category','Quantity','Unit','Unit Price','Cost Price','Total Value','Status','Supplier','Location','Description']];
    products.forEach(p => {
      const status = p.quantity === 0 ? 'Out of stock' : p.quantity <= p.reorderLevel ? 'Low stock' : 'In stock';
      rows.push([
        p.name, p.sku, p.category?.name || '',
        p.quantity, p.unit || 'pcs',
        p.price, p.costPrice || 0,
        (p.quantity * p.price).toFixed(2),
        status, p.supplier || '', p.location || '', p.description || ''
      ]);
    });
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `inventory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(`Exported ${products.length} products`, 'success');
  } catch (err) {
    toast(err.message, 'error');
  }
}
