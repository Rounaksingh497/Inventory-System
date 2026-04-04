async function loadCategories() {
  const el = document.getElementById('page-categories');
  el.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Categories</div>
        <div class="page-subtitle">Organise your products into groups</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" onclick="openCategoryModal()">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
          Add Category
        </button>
      </div>
    </div>
    <div class="page-content">
      <div class="card" id="cat-card">
        <div style="padding:2rem;text-align:center;color:var(--text-3)">Loading…</div>
      </div>
    </div>`;

  await fetchCategories();
}

async function fetchCategories() {
  const el = document.getElementById('cat-card');
  if (!el) return;
  el.innerHTML = `<div style="padding:2rem;text-align:center;color:var(--text-3)">Loading…</div>`;
  try {
    const categories = await api.getCategories();
    renderCategories(categories);
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
  }
}

function renderCategories(categories) {
  const el = document.getElementById('cat-card');
  if (!categories || categories.length === 0) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="9" r="3"/><circle cx="13" cy="17" r="4"/></svg>
      <p>No categories yet</p>
      <div class="empty-hint">Create categories to organise your products</div>
      <button class="btn btn-primary" style="margin-top:14px" onclick="openCategoryModal()">Add first category</button>
    </div>`;
    return;
  }

  el.innerHTML = `
    <div class="card-header">
      <div class="card-title">${categories.length} Categor${categories.length !== 1 ? 'ies' : 'y'}</div>
      <button class="btn btn-primary btn-sm" onclick="openCategoryModal()">+ Add</button>
    </div>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Color</th>
          <th>Description</th>
          <th style="width:90px;text-align:center">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${categories.map(c => `
          <tr>
            <td>
              <div style="display:inline-flex;align-items:center;gap:9px">
                <span style="
                  width:12px;height:12px;border-radius:50%;
                  background:${escapeHtml(c.color || '#5b60d6')};
                  flex-shrink:0;
                  box-shadow:0 0 0 3px ${escapeHtml(c.color || '#5b60d6')}22
                "></span>
                <span style="font-weight:700">${escapeHtml(c.name)}</span>
              </div>
            </td>
            <td>
              <span style="
                background:${escapeHtml(c.color || '#5b60d6')}18;
                color:${escapeHtml(c.color || '#5b60d6')};
                padding:3px 9px;
                border-radius:4px;
                font-family:'DM Mono',monospace;
                font-size:11px;
                font-weight:600;
                border:1px solid ${escapeHtml(c.color || '#5b60d6')}30
              ">${escapeHtml(c.color || '#5b60d6')}</span>
            </td>
            <td style="color:var(--text-2);font-size:13px">${escapeHtml(c.description || '—')}</td>
            <td>
              <div class="actions-col" style="justify-content:center">
                <button class="btn-icon" title="Edit"
                  onclick="openCategoryModal('${c._id}','${escapeHtml(c.name)}','${escapeHtml(c.color || '#5b60d6')}','${escapeHtml(c.description || '')}')">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 2l3 3-9 9H2v-3z"/></svg>
                </button>
                <button class="btn-icon" title="Delete" style="color:var(--danger)"
                  onclick="deleteCategory('${c._id}','${escapeHtml(c.name)}')">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="3 4 13 4"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M6 7v5M10 7v5M4 4l1 9h6l1-9"/></svg>
                </button>
              </div>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ─── CATEGORY MODAL ───────────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#5b60d6', '#0ba3a3', '#e8900a', '#e03e3e', '#059669',
  '#2e7cf6', '#8b55d6', '#c8740b', '#0f766e', '#b45309'
];

function openCategoryModal(id = '', name = '', color = '#5b60d6', desc = '') {
  const currentColor = color || '#5b60d6';

  openModal(id ? 'Edit Category' : 'New Category', `
    <div class="modal-body">
      <div class="form-group">
        <label class="field-required">Category name</label>
        <input id="cf-name" value="${escapeHtml(name)}" placeholder="e.g. Electronics, Furniture…" />
      </div>

      <div class="form-group">
        <label>Color</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px" id="color-presets">
          ${PRESET_COLORS.map(c => {
            const isSelected = c.toLowerCase() === currentColor.toLowerCase();
            return `<button type="button" onclick="pickColor('${c}')" style="
              width:30px;height:30px;border-radius:50%;
              background:${c};
              border:3px solid ${isSelected ? 'white' : c};
              box-shadow:${isSelected ? `0 0 0 3px ${c}` : 'none'};
              cursor:pointer;transition:all 0.15s;outline:none;
            " data-color="${c}" title="${c}"></button>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:10px;align-items:center">
          <input type="color" id="cf-color" value="${escapeHtml(currentColor)}"
            style="width:44px;height:36px;padding:2px;cursor:pointer;border-radius:var(--radius-sm);flex-shrink:0" />
          <input id="cf-color-hex" value="${escapeHtml(currentColor)}"
            placeholder="#5b60d6"
            style="flex:1;font-family:'DM Mono',monospace;font-size:13px" />
        </div>
      </div>

      <div class="form-group">
        <label>Description <span style="font-weight:400;color:var(--text-3)">(optional)</span></label>
        <textarea id="cf-desc" placeholder="What products go in this category?">${escapeHtml(desc)}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveCategory('${id}')">
        ${id ? 'Save changes' : 'Create category'}
      </button>
    </div>`);

  // Wire up color picker ↔ hex input sync
  setTimeout(() => {
    const picker = document.getElementById('cf-color');
    const hex    = document.getElementById('cf-color-hex');
    if (!picker || !hex) return;

    picker.addEventListener('input', () => {
      hex.value = picker.value;
      updatePresetSelection(picker.value);
    });
    hex.addEventListener('input', () => {
      if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) {
        picker.value = hex.value;
        updatePresetSelection(hex.value);
      }
    });
  }, 60);
}

function pickColor(color) {
  const picker = document.getElementById('cf-color');
  const hex    = document.getElementById('cf-color-hex');
  if (picker) picker.value = color;
  if (hex)    hex.value    = color;
  updatePresetSelection(color);
}

function updatePresetSelection(selectedColor) {
  document.querySelectorAll('#color-presets button').forEach(btn => {
    const c          = btn.dataset.color;
    const isSelected = c.toLowerCase() === selectedColor.toLowerCase();
    btn.style.border     = `3px solid ${isSelected ? 'white' : c}`;
    btn.style.boxShadow  = isSelected ? `0 0 0 3px ${c}` : 'none';
  });
}

async function saveCategory(id) {
  const name        = document.getElementById('cf-name')?.value.trim();
  const color       = document.getElementById('cf-color-hex')?.value.trim() || '#5b60d6';
  const description = document.getElementById('cf-desc')?.value.trim();

  if (!name) { toast('Category name is required', 'error'); return; }
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) { toast('Enter a valid hex color (e.g. #5b60d6)', 'error'); return; }

  try {
    if (id) {
      await api.updateCategory(id, { name, color, description });
      toast('Category updated', 'success');
    } else {
      await api.createCategory({ name, color, description });
      toast('Category created', 'success');
    }
    closeModal();
    fetchCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function deleteCategory(id, name) {
  if (!confirm(`Delete category "${name}"?\n\nProducts in this category will become uncategorised.`)) return;
  try {
    await api.deleteCategory(id);
    toast('Category deleted', 'success');
    fetchCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}
