import { RoomService } from '../services/room-service.js';
import { showToast } from './toast.js';

export function openRoomForm(onSuccess, id = null) {
  const room = id ? RoomService.getRoomById(id) : {};

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop-custom';

  modal.innerHTML = `
    <div class="modal-content-custom" data-testid="room-form">
      <h4>${id ? 'Sửa phòng' : 'Thêm phòng mới'}</h4>

      <div class="form-group">
        <label>Mã phòng *</label>
        <input class="form-control" data-testid="input-code" value="${room?.code || ''}"/>
        <div class="error" data-error="code"></div>
      </div>

      <div class="form-group">
        <label>Tên phòng *</label>
        <input class="form-control" data-testid="input-name" value="${room?.name || ''}"/>
        <div class="error" data-error="name"></div>
      </div>

      <div class="form-group">
        <label>Giá thuê *</label>
        <input type="number" class="form-control" data-testid="input-price" value="${room?.price || ''}"/>
        <div class="error" data-error="price"></div>
      </div>

      <div class="form-group">
        <label>Trạng thái</label>
        <select class="form-select" data-testid="input-status">
          <option value="available">Trống</option>
          <option value="occupied">Đang thuê</option>
          <option value="repairing">Sửa chữa</option>
        </select>
      </div>

      <div class="mt-3 d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" data-testid="btn-cancel">Hủy</button>
        <button class="btn btn-primary" data-testid="btn-save">Lưu</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const inputs = {
    code: modal.querySelector('[data-testid="input-code"]'),
    name: modal.querySelector('[data-testid="input-name"]'),
    price: modal.querySelector('[data-testid="input-price"]'),
    status: modal.querySelector('[data-testid="input-status"]')
  };

  modal.querySelector('[data-testid="btn-cancel"]').onclick = () => modal.remove();

  modal.querySelector('[data-testid="btn-save"]').onclick = () => {
    clearErrors(modal);

    const data = {
      code: inputs.code.value.trim(),
      name: inputs.name.value.trim(),
      price: Number(inputs.price.value),
      status: inputs.status.value
    };

    try {
      if (id) {
        RoomService.updateRoom(id, data);
      } else {
        RoomService.createRoom(data);
      }

      showToast('Lưu thành công', 'success');
      modal.remove();
      onSuccess && onSuccess();

    } catch (err) {
      showErrors(modal, err);
    }
  };
}

function showErrors(modal, err) {
  const el = modal.querySelector('[data-error="code"]');
  el.textContent = err.message;
}

function clearErrors(modal) {
  modal.querySelectorAll('.error').forEach(e => e.textContent = '');
}