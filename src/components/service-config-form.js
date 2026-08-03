import { ServiceConfigService } from '../services/service-config-service.js';

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function ServiceConfigForm({ container, onSuccess, data = null }) {
  container.innerHTML = `<div class="service-modal" data-testid="service-form-modal"><div class="service-modal-content">
    <div class="service-form-header"><h2>${data ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h2><button type="button" class="btn-close" data-action="close"></button></div>
    <form data-testid="service-form" class="service-form-grid">
      <label>Mã dịch vụ *<input class="form-control" data-testid="service-input-code" name="code" value="${escapeHtml(data?.code)}" required></label>
      <label>Tên dịch vụ *<input class="form-control" data-testid="service-input-name" name="name" value="${escapeHtml(data?.name)}" required></label>
      <label>Đơn vị tính<input class="form-control" data-testid="service-input-unit" name="unit" value="${escapeHtml(data?.unit)}"></label>
      <label>Cách tính<select class="form-select" data-testid="service-input-calculation" name="calculationType">${[['usage','Theo lượng sử dụng'],['fixed','Cố định theo phòng'],['perPerson','Theo số người'],['perVehicle','Theo số xe'],['manual','Nhập thủ công']].map(([value,label]) => `<option value="${value}" ${data?.calculationType === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <label>Đơn giá *<input class="form-control" data-testid="service-input-price" type="number" min="0" name="unitPrice" value="${data?.unitPrice ?? ''}" required></label>
      <label>Trạng thái<select class="form-select" data-testid="service-input-status" name="status"><option value="active" ${data?.status !== 'inactive' ? 'selected' : ''}>Đang áp dụng</option><option value="inactive" ${data?.status === 'inactive' ? 'selected' : ''}>Ngưng áp dụng</option></select></label>
      <label>Ngày bắt đầu *<input class="form-control" data-testid="service-input-start-date" type="date" name="startDate" value="${escapeHtml(data?.startDate)}" required></label>
      <label>Ngày kết thúc<input class="form-control" type="date" name="endDate" value="${escapeHtml(data?.endDate)}"></label>
      <label class="service-form-wide">Ghi chú<textarea class="form-control" name="note">${escapeHtml(data?.note)}</textarea></label>
      <p class="service-form-error service-form-wide" data-testid="service-form-error" role="alert"></p>
      <div class="service-form-actions service-form-wide"><button type="button" class="btn btn-secondary" data-action="close">Hủy</button><button type="submit" class="btn btn-primary" data-testid="service-submit">Lưu</button></div>
    </form>
  </div></div>`;
  const close = () => container.remove();
  container.querySelectorAll('[data-action="close"]').forEach((button) => button.addEventListener('click', close));
  container.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault(); const formData = new FormData(event.currentTarget);
    const payload = { code: formData.get('code'), name: formData.get('name'), unit: formData.get('unit'), unitPrice: Number(formData.get('unitPrice')), calculationType: formData.get('calculationType'), status: formData.get('status'), startDate: formData.get('startDate'), endDate: formData.get('endDate') || null, note: formData.get('note') };
    try { data ? ServiceConfigService.update(data.id, payload) : ServiceConfigService.create(payload); onSuccess(); }
    catch (error) { container.querySelector('[data-testid="service-form-error"]').textContent = error.message; }
  });
}
