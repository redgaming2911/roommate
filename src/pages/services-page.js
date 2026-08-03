import { ServiceConfigService } from '../services/service-config-service.js';
import { ServiceConfigForm } from '../components/service-config-form.js';
import { showToast } from '../components/toast.js';
import '../styles/services.css';

const state = { keyword: '', status: 'all' };
let pageContainer = null;
function escapeHtml(value) { return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;'); }
function formatCurrency(value) { return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`; }
const calculationLabels = { usage: 'Theo sử dụng', fixed: 'Cố định/phòng', perPerson: 'Theo người', perVehicle: 'Theo xe', manual: 'Thủ công' };

function getRows() {
  let rows = state.keyword ? ServiceConfigService.search(state.keyword) : ServiceConfigService.getAll();
  if (state.status !== 'all') rows = rows.filter((service) => service.status === state.status);
  return rows;
}

function renderTable() {
  const target = pageContainer.querySelector('[data-testid="service-table-wrapper"]'); const rows = getRows();
  if (!rows.length) { target.innerHTML = '<div class="service-empty" data-testid="service-empty">Không có dịch vụ phù hợp.</div>'; return; }
  target.innerHTML = `<div class="table-responsive"><table class="table table-hover" data-testid="service-table"><thead><tr><th>Mã</th><th>Tên</th><th>Đơn vị</th><th>Cách tính</th><th>Đơn giá</th><th>Thời gian áp dụng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${rows.map((service) => `<tr><td><strong>${escapeHtml(service.code)}</strong></td><td>${escapeHtml(service.name)}</td><td>${escapeHtml(service.unit)}</td><td>${escapeHtml(calculationLabels[service.calculationType] || service.calculationType)}</td><td>${formatCurrency(service.unitPrice)}</td><td>${escapeHtml(service.startDate)} – ${escapeHtml(service.endDate || 'Không giới hạn')}</td><td><span class="service-status service-status-${service.status}">${service.status === 'active' ? 'Đang áp dụng' : 'Ngưng áp dụng'}</span></td><td><button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${service.id}">Sửa</button> <button class="btn btn-sm btn-outline-secondary" data-action="toggle" data-id="${service.id}">${service.status === 'active' ? 'Ngưng' : 'Kích hoạt'}</button> <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${service.id}">Xóa</button></td></tr>`).join('')}</tbody></table></div>`;
}

function openForm(data = null) { const host = document.createElement('div'); document.body.appendChild(host); ServiceConfigForm({ container: host, data, onSuccess: () => { host.remove(); showToast({ message: 'Lưu dịch vụ thành công' }); renderTable(); } }); }
function bindEvents() {
  pageContainer.querySelector('[data-testid="service-search"]').addEventListener('input', (event) => { state.keyword = event.target.value; renderTable(); });
  pageContainer.querySelector('[data-testid="service-filter-status"]').addEventListener('change', (event) => { state.status = event.target.value; renderTable(); });
  pageContainer.querySelector('[data-testid="service-add"]').addEventListener('click', () => openForm());
  pageContainer.querySelector('[data-testid="service-table-wrapper"]').addEventListener('click', (event) => { const button = event.target.closest('[data-action][data-id]'); if (!button) return; const item = ServiceConfigService.getById(button.dataset.id); if (button.dataset.action === 'edit') return openForm(item); if (button.dataset.action === 'toggle') { item.status === 'active' ? ServiceConfigService.deactivate(item.id) : ServiceConfigService.activate(item.id); showToast({ message: 'Cập nhật trạng thái dịch vụ thành công' }); renderTable(); } if (button.dataset.action === 'delete') window.showConfirm('Xóa dịch vụ này?', () => { try { ServiceConfigService.remove(item.id); showToast({ message: 'Xóa dịch vụ thành công' }); renderTable(); } catch (error) { showToast({ message: error.message, type: 'error' }); } }, { confirmLabel: 'Xóa dịch vụ' }); });
}

export function render(container) {
  pageContainer = container; Object.assign(state, { keyword: '', status: 'all' });
  container.innerHTML = `<section class="services-page" data-testid="services-page"><header class="services-header"><div><h1>Cấu hình dịch vụ</h1><p>Quản lý các khoản thu và đơn giá áp dụng.</p></div><button class="btn btn-primary" data-testid="service-add">+ Thêm dịch vụ</button></header><div class="service-filters"><input class="form-control" placeholder="Tìm mã hoặc tên dịch vụ" data-testid="service-search"><select class="form-select" data-testid="service-filter-status"><option value="all">Tất cả trạng thái</option><option value="active">Đang áp dụng</option><option value="inactive">Ngưng áp dụng</option></select></div><div data-testid="service-table-wrapper"></div></section>`;
  bindEvents(); renderTable();
}
