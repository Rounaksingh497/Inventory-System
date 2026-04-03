async function loadCategories() {
  const el = document.getElementById('page-categories');
  el.innerHTML = `
    <div class="page-header">
      <div class="page-title">Categories</div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openCategoryModal()">+ Add Category</button>
      </div>
    </div>
    <div class="page-content">
      <div class="card" id="cat-card"></div>
    </div>`;
  await fetchCategories();
}

async function fetchCategories() {
  const el = document.getElementById('cat-card');
  if (!el) return;
  el.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-3)">Loading...</div>`;
  try {
    const categories = await api.getCategories();
    renderCategories(categories);
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
  }
}

function renderCategories(categories) {
  const el = document.getElementById('cat-card');
  if (!categories.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="9" r="3"/><circle cx="13" cy="17" r="4"/></svg>
      <p>No categories yet</p>
      <button class="btn btn-primary" style="margin-top:1rem" onclick="openCategoryModal()">Add first category</button>
    </div>`;
    return;
  }
  el.innerHTML = `<table>
    <thead><tr><th>Name</th><th>Color</th><th>Description</th><th>Actions</th></tr></thead>
    <tbody>
      ${categories.map(c => `<tr>
        <td><span style="display:inline-flex;align-items:center;gap:8px">
          <span class="color-dot" style="background:${escapeHtml(c.color||'#6366f1')};width:12px;height:12px"></span>
          <span style="font-weight:500">${escapeHtml(c.name)}</span>
        </span></td>
        <td><span class="badge" style="background:${escapeHtml(c.color||'#6366f1')}22;color:${escapeHtml(c.color||'#6366f1')};font-family:monospace">${escapeHtml(c.color||'#6366f1')}</span></td>
        <td style="color:var(--text-2)">${escapeHtml(c.description||'—')}</td>
        <td>
          <div class="actions-col">
            <button class="btn-icon" title="Edit" onclick="openCategoryModal('${c._id}','${escapeHtml(c.name)}','${escapeHtml(c.color||'#6366f1')}','${escapeHtml(c.description||'')}')">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-9 9H2v-3z"/></svg>
            </button>
            <button class="btn-icon" title="Delete" onclick="deleteCategory('${c._id}','${escapeHtml(c.name)}')">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 4 13 4"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
            </button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody></table>`;
}

function openCategoryModal(id = '', name = '', color = '#6366f1', desc = '') {
  openModal(id ? 'Edit Category' : 'Add Category', `
    <div class="modal-body">
      <div class="form-group">
        <label>Category name *</label>
        <input id="cf-name" value="${escapeHtml(name)}" placeholder="e.g. Electronics" />
      </div>
      <div class="form-group">
        <label>Color</label>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="color" id="cf-color" value="${escapeHtml(color)}" style="width:44px;height:36px;padding:2px;cursor:pointer" />
          <input id="cf-color-hex" value="${escapeHtml(color)}" placeholder="#6366f1" style="flex:1" />
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="cf-desc" placeholder="Optional description...">${escapeHtml(desc)}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveCategory('${id}')">Save category</button>
    </div>`);

  // Sync color picker and hex input
  setTimeout(() => {
    const picker = document.getElementById('cf-color');
    const hex = document.getElementById('cf-color-hex');
    if (picker && hex) {
      picker.oninput = () => hex.value = picker.value;
      hex.oninput = () => { if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value; };
    }
  }, 50);
}

async function saveCategory(id) {
  const name = document.getElementById('cf-name').value.trim();
  const color = document.getElementById('cf-color-hex').value.trim() || '#6366f1';
  const description = document.getElementById('cf-desc').value.trim();
  if (!name) { toast('Category name is required', 'error'); return; }
  try {
    if (id) { await api.updateCategory(id, { name, color, description }); toast('Category updated', 'success'); }
    else { await api.createCategory({ name, color, description }); toast('Category created', 'success'); }
    closeModal();
    fetchCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Delete category "${name}"? Products in this category will need reassignment.`)) return;
  try {
    await api.deleteCategory(id);
    toast('Category deleted', 'success');
    fetchCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}
