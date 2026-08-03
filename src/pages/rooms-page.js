import * as RoomService from '../services/room-service.js';
import { ContractService } from '../services/contract-service.js';
import { TenantService } from '../services/tenant-service.js';
import { ReportService } from '../services/report-service.js';
import { ROOM_STATUS, ROOM_STATUS_LABEL } from '../constants/statuses.js';
import { openRoomForm } from '../components/room-form.js';
import { showToast } from '../components/toast.js';
import '../styles/rooms.css';

const state = { keyword: '', status: '', type: '', sort: '' };
let pageContainer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value) || 0)} ₫`;
}

function getRows() {
  let rooms = RoomService.filterRooms({ status: state.status, type: state.type });
  if (state.keyword) {
    const matchingIds = new Set(RoomService.searchRooms(state.keyword).map((room) => room.id));
    rooms = rooms.filter((room) => matchingIds.has(room.id));
  }

  return [...rooms].sort((first, second) => {
    if (state.sort === 'price-asc') return first.price - second.price;
    if (state.sort === 'price-desc') return second.price - first.price;
    if (state.sort === 'code') return first.code.localeCompare(second.code, 'vi', { numeric: true });
    return 0;
  });
}

function getContextMaps() {
  const tenants = new Map(TenantService.getTenants(true).map((tenant) => [tenant.id, tenant]));
  const debts = new Map(ReportService.getDebtByRoom().map((row) => [row.roomId, row.debtAmount]));
  return { tenants, debts };
}

function renderTable() {
  const target = pageContainer.querySelector('[data-testid="rooms-table-wrapper"]');
  const rooms = getRows();
  if (rooms.length === 0) {
    target.innerHTML = '<div class="empty-state" data-testid="rooms-empty-state">Không có phòng phù hợp.</div>';
    return;
  }

  const { tenants, debts } = getContextMaps();
  target.innerHTML = `
    <div class="table-responsive"><table class="table table-hover" data-testid="rooms-table">
      <thead><tr><th>Mã phòng</th><th>Tên phòng</th><th>Loại</th><th>Giá thuê</th><th>Trạng thái</th><th>Đang ở</th><th>Đại diện</th><th>Công nợ</th><th>Thao tác</th></tr></thead>
      <tbody>${rooms.map((room) => {
        const contract = ContractService.getActiveContractByRoom(room.id);
        const tenantIds = contract?.tenantIds?.length ? contract.tenantIds : contract?.tenantId ? [contract.tenantId] : [];
        const representative = tenants.get(contract?.tenantId);
        return `<tr data-testid="room-row" data-room-code="${escapeHtml(room.code)}">
          <td data-testid="room-code"><strong>${escapeHtml(room.code)}</strong></td><td data-testid="room-name">${escapeHtml(room.name)}</td><td>${escapeHtml(room.type)}</td>
          <td data-testid="room-price">${formatCurrency(room.price)}</td><td data-testid="room-status"><span class="badge room-status-${room.status}">${escapeHtml(ROOM_STATUS_LABEL[room.status] || room.status)}</span></td>
          <td>${tenantIds.length}/${room.maxOccupants}</td><td>${escapeHtml(representative?.name || '—')}</td><td>${formatCurrency(debts.get(room.id) || 0)}</td>
          <td><button class="btn btn-sm btn-outline-primary" data-testid="btn-edit-room" data-id="${room.id}" data-action="edit">Sửa</button> <button class="btn btn-sm btn-outline-danger" data-testid="btn-delete-room" data-id="${room.id}" data-action="delete">Xóa</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

  target.querySelectorAll('[data-action="edit"]').forEach((button) => button.addEventListener('click', () => openRoomForm(renderTable, button.dataset.id)));
  target.querySelectorAll('[data-action="delete"]').forEach((button) => button.addEventListener('click', () => {
    window.showConfirm('Bạn có chắc muốn xóa phòng này?', () => {
      try {
        RoomService.deleteRoom(button.dataset.id);
        showToast({ message: 'Xóa phòng thành công', type: 'success' });
        renderTable();
      } catch (error) {
        showToast({ message: error.message, type: 'error' });
      }
    }, { confirmLabel: 'Xóa phòng' });
  }));
}

function bindEvents() {
  const bindings = [
    ['room-search', 'input', 'keyword'],
    ['room-filter-status', 'change', 'status'],
    ['room-filter-type', 'change', 'type'],
    ['room-sort', 'change', 'sort']
  ];
  bindings.forEach(([testId, eventName, key]) => pageContainer.querySelector(`[data-testid="${testId}"]`).addEventListener(eventName, (event) => {
    state[key] = event.target.value;
    renderTable();
  }));
  pageContainer.querySelector('[data-testid="btn-add-room"]').addEventListener('click', () => openRoomForm(renderTable));
}

export function render(container) {
  pageContainer = container;
  Object.assign(state, { keyword: '', status: '', type: '', sort: '' });
  const types = [...new Set(RoomService.getRooms().map((room) => room.type).filter(Boolean))];
  container.innerHTML = `
    <section class="rooms-page" data-testid="rooms-page">
      <header class="d-flex justify-content-between align-items-center mb-3"><div><h1>Quản lý phòng trọ</h1><p class="text-muted">Theo dõi trạng thái, người thuê và công nợ từng phòng.</p></div><button class="btn btn-primary" data-testid="btn-add-room">+ Thêm phòng</button></header>
      <div class="rooms-filters mb-3">
        <input class="form-control" placeholder="Tìm theo mã hoặc tên phòng" data-testid="room-search">
        <select class="form-select" data-testid="room-filter-status"><option value="">Tất cả trạng thái</option>${Object.values(ROOM_STATUS).map((status) => `<option value="${status}">${ROOM_STATUS_LABEL[status]}</option>`).join('')}</select>
        <select class="form-select" data-testid="room-filter-type"><option value="">Tất cả loại phòng</option>${types.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(type)}</option>`).join('')}</select>
        <select class="form-select" data-testid="room-sort"><option value="">Mặc định</option><option value="code">Theo mã phòng</option><option value="price-asc">Giá tăng dần</option><option value="price-desc">Giá giảm dần</option></select>
      </div>
      <div data-testid="rooms-table-wrapper"></div>
    </section>`;
  bindEvents();
  renderTable();
}
