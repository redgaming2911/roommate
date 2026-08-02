import { ServiceConfigService } from '../services/service-config-service.js';

export function ServiceConfigForm({ container, onSuccess, data = null }) {
  container.innerHTML = `
    <div class="modal">
      <div class="modal-content">
        <h2>${data ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h2>

        <form data-testid="service-form">
          <input placeholder="Mã dịch vụ" name="code" value="${data?.code || ''}" required />
          <input placeholder="Tên dịch vụ" name="name" value="${data?.name || ''}" required />
          <input placeholder="Đơn vị" name="unit" value="${data?.unit || ''}" />

          <select name="calculationType">
            <option value="usage">Theo lượng sử dụng</option>
            <option value="fixed">Cố định</option>
            <option value="perPerson">Theo người</option>
            <option value="perVehicle">Theo xe</option>
            <option value="manual">Thủ công</option>
          </select>

          <input type="number" name="unitPrice" placeholder="Đơn giá" value="${data?.unitPrice || ''}" />

          <input type="date" name="startDate" value="${data?.startDate || ''}" />
          <input type="date" name="endDate" value="${data?.endDate || ''}" />

          <textarea name="note" placeholder="Ghi chú">${data?.note || ''}</textarea>

          <button type="submit">Lưu</button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('form');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(form);

    const payload = {
      code: formData.get('code'),
      name: formData.get('name'),
      unit: formData.get('unit'),
      unitPrice: Number(formData.get('unitPrice')),
      calculationType: formData.get('calculationType'),
      startDate: formData.get('startDate'),
      endDate: formData.get('endDate') || null,
      note: formData.get('note'),
      status: 'active'
    };

    try {
      if (data) {
        ServiceConfigService.update(data.id, payload);
      } else {
        ServiceConfigService.create(payload);
      }

      onSuccess();
    } catch (err) {
      alert(err.message);
    }
  });
}