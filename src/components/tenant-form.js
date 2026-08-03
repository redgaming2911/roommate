import { TENANT_STATUS, TENANT_STATUS_LABEL } from '../constants/statuses.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderTenantForm({ tenant = null, onSubmit }) {
  const modal = document.createElement('div');
  modal.className = 'tenant-modal';
  modal.setAttribute('data-testid', 'tenant-form');
  modal.innerHTML = `
    <form class="tenant-modal-content">
      <div class="tenant-form-header"><h2>${tenant ? 'Sửa người thuê' : 'Thêm người thuê'}</h2><button type="button" class="btn-close" data-action="close"></button></div>
      <div class="tenant-form-grid">
        <label>Họ và tên *<input class="form-control" data-testid="tenant-input-name" name="name" value="${escapeHtml(tenant?.name)}" required></label>
        <label>Số điện thoại *<input class="form-control" data-testid="tenant-input-phone" name="phone" value="${escapeHtml(tenant?.phone)}" required></label>
        <label>CCCD<input class="form-control" data-testid="tenant-input-cccd" name="cccd" value="${escapeHtml(tenant?.cccd)}"></label>
        <label>Ngày sinh<input class="form-control" type="date" name="birthDate" value="${escapeHtml(tenant?.birthDate)}"></label>
        <label>Giới tính<select class="form-select" name="gender"><option value="">Không xác định</option><option value="male" ${tenant?.gender === 'male' ? 'selected' : ''}>Nam</option><option value="female" ${tenant?.gender === 'female' ? 'selected' : ''}>Nữ</option></select></label>
        <label>Nghề nghiệp<input class="form-control" name="occupation" value="${escapeHtml(tenant?.occupation)}"></label>
        <label class="tenant-form-wide">Địa chỉ thường trú<input class="form-control" name="permanentAddress" value="${escapeHtml(tenant?.permanentAddress)}"></label>
        <label>Biển số xe<input class="form-control" name="vehiclePlate" value="${escapeHtml(tenant?.vehiclePlate)}"></label>
        <label>Người liên hệ khẩn cấp<input class="form-control" name="emergencyContactName" value="${escapeHtml(tenant?.emergencyContactName)}"></label>
        <label>SĐT khẩn cấp<input class="form-control" name="emergencyContactPhone" value="${escapeHtml(tenant?.emergencyContactPhone)}"></label>
        <label>Trạng thái<select class="form-select" name="status">${Object.values(TENANT_STATUS).filter((status) => status !== TENANT_STATUS.ARCHIVED).map((status) => `<option value="${status}" ${status === (tenant?.status || TENANT_STATUS.INACTIVE) ? 'selected' : ''}>${TENANT_STATUS_LABEL[status]}</option>`).join('')}</select></label>
        <label class="tenant-form-wide">Ghi chú<textarea class="form-control" name="note">${escapeHtml(tenant?.note)}</textarea></label>
      </div>
      <p class="tenant-form-error" data-testid="tenant-form-error" role="alert"></p>
      <div class="actions"><button type="button" class="btn btn-secondary" data-action="close">Hủy</button><button type="submit" class="btn btn-primary" data-testid="tenant-submit">Lưu</button></div>
    </form>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelectorAll('[data-action="close"]').forEach((button) => button.addEventListener('click', close));
  modal.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    try {
      onSubmit(payload);
      close();
    } catch (error) {
      modal.querySelector('[data-testid="tenant-form-error"]').textContent = error.message;
    }
  });
}
