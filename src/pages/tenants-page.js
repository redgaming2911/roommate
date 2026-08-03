import { TenantService } from '../services/tenant-service.js';
import { TENANT_STATUS, TENANT_STATUS_LABEL } from '../constants/statuses.js';
import { showToast } from '../components/toast.js';
import { renderTenantForm } from '../components/tenant-form.js';
import '../styles/tenants.css';

const state = { keyword: '', status: 'all' };
let pageContainer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getRows() {
  return TenantService.searchTenants(state.keyword).filter((tenant) =>
    state.status === 'all' || tenant.status === state.status
  );
}

function renderTable() {
  const body = pageContainer.querySelector('[data-testid="tenant-table-body"]');
  const empty = pageContainer.querySelector('[data-testid="tenant-empty"]');
  const tenants = getRows();
  empty.hidden = tenants.length > 0;
  body.innerHTML = tenants.map((tenant) => {
    const room = TenantService.getCurrentRoomOfTenant(tenant.id);
    return `<tr>
      <td><strong>${escapeHtml(tenant.name)}</strong></td><td>${escapeHtml(tenant.phone)}</td><td>${escapeHtml(tenant.cccd || '—')}</td>
      <td>${escapeHtml(room ? `${room.code} - ${room.name}` : 'Không có phòng')}</td>
      <td><span class="badge tenant-status-${tenant.status}">${escapeHtml(TENANT_STATUS_LABEL[tenant.status] || tenant.status)}</span></td>
      <td><button class="btn btn-sm btn-outline-secondary" data-action="history" data-id="${tenant.id}">Lịch sử</button> <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${tenant.id}">Sửa</button> <button class="btn btn-sm btn-outline-warning" data-action="archive" data-id="${tenant.id}">Lưu trữ</button> <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${tenant.id}">Xóa</button></td>
    </tr>`;
  }).join('');
}

function refresh() { renderTable(); }

function createTenant(data) {
  TenantService.createTenant(data);
  showToast({ message: 'Tạo người thuê thành công' });
  refresh();
}

function updateTenant(id, data) {
  TenantService.updateTenant(id, data);
  showToast({ message: 'Cập nhật người thuê thành công' });
  refresh();
}

function bindEvents() {
  pageContainer.querySelector('[data-testid="tenant-search"]').addEventListener('input', (event) => { state.keyword = event.target.value; renderTable(); });
  pageContainer.querySelector('[data-testid="tenant-filter"]').addEventListener('change', (event) => { state.status = event.target.value; renderTable(); });
  pageContainer.querySelector('[data-testid="btn-add-tenant"]').addEventListener('click', () => renderTenantForm({ onSubmit: createTenant }));
  pageContainer.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action][data-id]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'edit') renderTenantForm({ tenant: TenantService.getTenantById(id), onSubmit: (data) => updateTenant(id, data) });
    if (action === 'history') showToast({ message: `Người thuê có ${TenantService.getTenantRentalHistory(id).length} hợp đồng trong lịch sử.` });
    if (action === 'archive') window.showConfirm('Lưu trữ người thuê này?', () => { TenantService.archiveTenant(id); showToast({ message: 'Đã lưu trữ người thuê' }); refresh(); }, { confirmLabel: 'Lưu trữ' });
    if (action === 'delete') window.showConfirm('Xóa người thuê này?', () => {
      try { TenantService.deleteTenant(id); showToast({ message: 'Đã xóa người thuê' }); refresh(); }
      catch (error) { showToast({ message: error.message, type: 'error' }); }
    }, { confirmLabel: 'Xóa người thuê' });
  });
}

export function render(container) {
  pageContainer = container;
  Object.assign(state, { keyword: '', status: 'all' });
  container.innerHTML = `<section class="tenants-page" data-testid="tenants-page">
    <header class="page-header"><div><h1>Quản lý người thuê</h1><p>Quản lý hồ sơ và lịch sử thuê phòng.</p></div><button data-testid="btn-add-tenant" class="btn btn-primary">+ Thêm người thuê</button></header>
    <div class="filters"><input class="form-control" placeholder="Tìm theo tên, SĐT hoặc CCCD" data-testid="tenant-search"><select class="form-select" data-testid="tenant-filter"><option value="all">Tất cả trạng thái</option>${Object.values(TENANT_STATUS).filter((status) => status !== TENANT_STATUS.ARCHIVED).map((status) => `<option value="${status}">${TENANT_STATUS_LABEL[status]}</option>`).join('')}</select></div>
    <div class="table-responsive"><table class="tenant-table"><thead><tr><th>Họ tên</th><th>SĐT</th><th>CCCD</th><th>Phòng hiện tại</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody data-testid="tenant-table-body"></tbody></table></div>
    <div class="empty" data-testid="tenant-empty" hidden>Không có người thuê phù hợp.</div>
  </section>`;
  bindEvents();
  renderTable();
}
