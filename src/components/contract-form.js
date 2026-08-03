import * as RoomService from '../services/room-service.js';
import { TenantService } from '../services/tenant-service.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderContractForm({ contract = null } = {}) {
  const rooms = RoomService.getRooms();
  const tenants = TenantService.getTenants();
  const selectedTenantIds = new Set(contract?.tenantIds || (contract?.tenantId ? [contract.tenantId] : []));

  return `
    <div class="contract-modal" data-testid="contract-form">
      <form class="contract-modal-content">
        <div class="contract-form-header"><h2>${contract ? 'Sửa hợp đồng' : 'Tạo hợp đồng'}</h2><button type="button" class="btn-close" data-action="close"></button></div>
        <div class="contract-form-grid">
          <label>Mã hợp đồng *<input class="form-control" data-testid="contract-input-code" name="code" value="${escapeHtml(contract?.code)}" required></label>
          <label>Phòng *<select class="form-select" data-testid="contract-input-room" name="roomId" required><option value="">Chọn phòng</option>${rooms.map((room) => `<option value="${room.id}" ${room.id === contract?.roomId ? 'selected' : ''}>${escapeHtml(room.code)} - ${escapeHtml(room.name)}</option>`).join('')}</select></label>
          <label>Người đại diện *<select class="form-select" data-testid="contract-input-tenant" name="tenantId" required><option value="">Chọn người thuê</option>${tenants.map((tenant) => `<option value="${tenant.id}" ${tenant.id === contract?.tenantId ? 'selected' : ''}>${escapeHtml(tenant.name)} - ${escapeHtml(tenant.phone)}</option>`).join('')}</select></label>
          <label>Ngày bắt đầu *<input class="form-control" data-testid="contract-input-start-date" name="startDate" type="date" value="${escapeHtml(contract?.startDate)}" required></label>
          <label>Ngày kết thúc *<input class="form-control" data-testid="contract-input-end-date" name="endDate" type="date" value="${escapeHtml(contract?.endDate)}" required></label>
          <label>Giá thuê *<input class="form-control" data-testid="contract-input-rent" name="rentAmount" type="number" min="0" value="${contract?.rentAmount ?? ''}" required></label>
          <label>Tiền đặt cọc *<input class="form-control" data-testid="contract-input-deposit" name="depositAmount" type="number" min="0" value="${contract?.depositAmount ?? ''}" required></label>
          <label>Ngày thanh toán hàng tháng<input class="form-control" data-testid="contract-input-payment-day" name="paymentDay" type="number" min="1" max="31" value="${contract?.paymentDay ?? 10}"></label>
          <label>Số lượng xe<input class="form-control" name="vehicleCount" type="number" min="0" value="${contract?.vehicleCount ?? 0}"></label>
          <fieldset class="contract-occupants"><legend>Người ở cùng</legend>${tenants.map((tenant) => `<label><input type="checkbox" name="tenantIds" value="${tenant.id}" ${selectedTenantIds.has(tenant.id) ? 'checked' : ''}> ${escapeHtml(tenant.name)}</label>`).join('')}</fieldset>
          <label class="contract-form-wide">Điều khoản bổ sung<textarea class="form-control" name="terms">${escapeHtml(contract?.terms)}</textarea></label>
          <label class="contract-form-wide">Ghi chú<textarea class="form-control" name="note">${escapeHtml(contract?.note)}</textarea></label>
        </div>
        <p class="contract-form-error" data-testid="contract-form-error" role="alert"></p>
        <div class="actions"><button type="button" class="btn btn-secondary" data-action="close">Hủy</button><button type="submit" class="btn btn-primary" data-testid="contract-submit">Lưu hợp đồng</button></div>
      </form>
    </div>`;
}

export function bindContractForm(container, { onSubmit, onClose }) {
  const root = container.querySelector('[data-testid="contract-form"]');
  root.querySelectorAll('[data-action="close"]').forEach((button) => button.addEventListener('click', onClose));
  root.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const tenantId = formData.get('tenantId');
    const tenantIds = [...new Set([tenantId, ...formData.getAll('tenantIds')].filter(Boolean))];
    const payload = {
      code: formData.get('code'), roomId: formData.get('roomId'), tenantId, tenantIds,
      startDate: formData.get('startDate'), endDate: formData.get('endDate'),
      rentAmount: Number(formData.get('rentAmount')), depositAmount: Number(formData.get('depositAmount')),
      paymentDay: Number(formData.get('paymentDay')), vehicleCount: Number(formData.get('vehicleCount')),
      terms: formData.get('terms'), note: formData.get('note')
    };
    try { await onSubmit(payload); }
    catch (error) { root.querySelector('[data-testid="contract-form-error"]').textContent = error.message; }
  });
}
