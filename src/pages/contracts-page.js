import { ContractService } from '../services/contract-service.js';
import * as RoomService from '../services/room-service.js';
import { TenantService } from '../services/tenant-service.js';
import { CONTRACT_STATUS, CONTRACT_STATUS_LABEL } from '../constants/statuses.js';
import { renderContractForm, bindContractForm } from '../components/contract-form.js';
import { renderContractDetail, bindContractDetail } from '../components/contract-detail.js';
import { showToast } from '../components/toast.js';
import '../styles/contracts.css';

const state = { keyword: '', status: '', roomId: '' };
let pageContainer = null;

function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function formatCurrency(value) { return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`; }
function formatDate(value) { if (!value) return '—'; const [year, month, day] = value.slice(0, 10).split('-'); return `${day}/${month}/${year}`; }

function renderList() {
  const list = pageContainer.querySelector('[data-testid="contracts-list"]');
  const rows = ContractService.filterContracts(state);
  const rooms = new Map(RoomService.getRooms().map((room) => [room.id, room]));
  const tenants = new Map(TenantService.getTenants(true).map((tenant) => [tenant.id, tenant]));
  if (rows.length === 0) { list.innerHTML = '<div class="contract-empty" data-testid="contracts-empty">Không có hợp đồng phù hợp.</div>'; return; }
  list.innerHTML = `<div class="contract-row contract-row-header"><div>Mã</div><div>Phòng</div><div>Đại diện</div><div>Thời hạn</div><div>Giá thuê</div><div>Trạng thái</div><div>Thao tác</div></div>${rows.map((contract) => `<div class="contract-row" data-testid="contract-row">
    <div data-testid="contract-code"><strong>${escapeHtml(contract.code)}</strong></div><div>${escapeHtml(rooms.get(contract.roomId)?.code || contract.roomId)}</div><div>${escapeHtml(tenants.get(contract.tenantId)?.name || '—')}</div><div>${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}</div><div>${formatCurrency(contract.rentAmount)}</div><div data-testid="contract-status-value"><span class="contract-status contract-status-${contract.status}">${escapeHtml(CONTRACT_STATUS_LABEL[contract.status] || contract.status)}</span></div>
    <div class="actions"><button data-testid="btn-view-contract" data-action="view" data-id="${contract.id}">Xem</button><button data-testid="btn-edit-contract" data-action="edit" data-id="${contract.id}">Sửa</button>${[CONTRACT_STATUS.DRAFT, CONTRACT_STATUS.PENDING].includes(contract.status) ? `<button data-testid="btn-activate-contract" data-action="activate" data-id="${contract.id}">Kích hoạt</button>` : ''}${[CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.SOON_EXPIRE].includes(contract.status) ? `<button data-testid="btn-end-contract" data-action="end" data-id="${contract.id}">Kết thúc</button>` : ''}${![CONTRACT_STATUS.ENDED, CONTRACT_STATUS.CANCELLED].includes(contract.status) ? `<button data-testid="btn-cancel-contract" data-action="cancel" data-id="${contract.id}">Hủy</button>` : ''}</div>
  </div>`).join('')}`;
}

function closeModal() { pageContainer.querySelector('#contract-modal').innerHTML = ''; }
function openForm(contract = null) {
  const host = pageContainer.querySelector('#contract-modal');
  host.innerHTML = renderContractForm({ contract });
  bindContractForm(host, { onClose: closeModal, onSubmit: async (data) => {
    contract ? ContractService.updateContract(contract.id, data) : ContractService.createContract(data);
    showToast({ message: contract ? 'Cập nhật hợp đồng thành công' : 'Tạo hợp đồng thành công' }); closeModal(); renderList();
  }});
}
function openDetail(contract) {
  const host = pageContainer.querySelector('#contract-modal'); host.innerHTML = renderContractDetail(contract);
  bindContractDetail(host, { onClose: closeModal, onExtend: async (date) => { ContractService.extendContract(contract.id, date); showToast({ message: 'Gia hạn hợp đồng thành công' }); closeModal(); renderList(); } });
}

function executeAction(action, id) {
  const contract = ContractService.getContractById(id);
  if (action === 'view') return openDetail(contract);
  if (action === 'edit') return openForm(contract);
  const labels = { activate: 'Kích hoạt hợp đồng này?', end: 'Kết thúc hợp đồng này?', cancel: 'Hủy hợp đồng này?' };
  window.showConfirm(labels[action], () => {
    try {
      if (action === 'activate') ContractService.activateContract(id);
      if (action === 'end') ContractService.endContract(id);
      if (action === 'cancel') ContractService.cancelContract(id);
      showToast({ message: 'Cập nhật trạng thái hợp đồng thành công' }); renderList();
    } catch (error) { showToast({ message: error.message, type: 'error' }); }
  }, { confirmLabel: labels[action].replace(' này?', '') });
}

export function render(container) {
  pageContainer = container; Object.assign(state, { keyword: '', status: '', roomId: '' });
  const rooms = RoomService.getRooms();
  container.innerHTML = `<section class="contracts-page" data-testid="contracts-page"><header class="page-header"><div><h1>Quản lý hợp đồng</h1><p>Theo dõi vòng đời hợp đồng thuê phòng.</p></div><button data-testid="btn-create" class="btn btn-primary">+ Tạo hợp đồng</button></header>
    <div class="filters"><input class="form-control" data-testid="contract-search" placeholder="Tìm mã hợp đồng"><select class="form-select" data-testid="contract-status"><option value="">Tất cả trạng thái</option>${Object.values(CONTRACT_STATUS).map((status) => `<option value="${status}">${CONTRACT_STATUS_LABEL[status]}</option>`).join('')}</select><select class="form-select" data-testid="contract-room"><option value="">Tất cả phòng</option>${rooms.map((room) => `<option value="${room.id}">${escapeHtml(room.code)}</option>`).join('')}</select></div>
    <div data-testid="contracts-list" class="contracts-list"></div><div id="contract-modal"></div></section>`;
  container.querySelector('[data-testid="btn-create"]').addEventListener('click', () => openForm());
  [['contract-search', 'input', 'keyword'], ['contract-status', 'change', 'status'], ['contract-room', 'change', 'roomId']].forEach(([testId, eventName, key]) => container.querySelector(`[data-testid="${testId}"]`).addEventListener(eventName, (event) => { state[key] = event.target.value; renderList(); }));
  container.querySelector('[data-testid="contracts-list"]').addEventListener('click', (event) => { const button = event.target.closest('[data-action][data-id]'); if (button) executeAction(button.dataset.action, button.dataset.id); });
  renderList();
}
