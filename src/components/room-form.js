import * as RoomService from '../services/room-service.js';
import { ROOM_STATUS, ROOM_STATUS_LABEL } from '../constants/statuses.js';
import { showToast } from './toast.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function option(value, label, selectedValue) {
  return `<option value="${value}" ${value === selectedValue ? 'selected' : ''}>${label}</option>`;
}

export function openRoomForm(onSuccess, id = null) {
  const room = id ? RoomService.getRoomById(id) : {};
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop-custom';

  modal.innerHTML = `
    <div class="modal-content-custom" data-testid="room-form">
      <div class="room-form-header">
        <h4>${id ? 'Sửa phòng' : 'Thêm phòng mới'}</h4>
        <button type="button" class="btn-close" data-testid="btn-cancel" aria-label="Đóng"></button>
      </div>

      <div class="room-form-grid">
        <label>Mã phòng *<input class="form-control" data-testid="input-code" value="${escapeHtml(room.code)}"></label>
        <label>Tên phòng *<input class="form-control" data-testid="input-name" value="${escapeHtml(room.name)}"></label>
        <label>Loại phòng<input class="form-control" data-testid="input-type" value="${escapeHtml(room.type || 'standard')}"></label>
        <label>Giá thuê *<input type="number" min="0" class="form-control" data-testid="input-price" value="${room.price ?? ''}"></label>
        <label>Diện tích (m²)<input type="number" min="0" class="form-control" data-testid="input-area" value="${room.area ?? ''}"></label>
        <label>Số người tối đa *<input type="number" min="1" class="form-control" data-testid="input-max-occupants" value="${room.maxOccupants ?? ''}"></label>
        <label>Tầng<input type="number" min="0" class="form-control" data-testid="input-floor" value="${room.floor ?? ''}"></label>
        <label>Khu vực<input class="form-control" data-testid="input-area-name" value="${escapeHtml(room.areaName)}"></label>
        <label>Trạng thái
          <select class="form-select" data-testid="input-status">
            ${Object.values(ROOM_STATUS).map((status) => option(status, ROOM_STATUS_LABEL[status], room.status || ROOM_STATUS.EMPTY)).join('')}
          </select>
        </label>
        <label class="room-form-note">Ghi chú<textarea class="form-control" data-testid="input-note">${escapeHtml(room.note)}</textarea></label>
      </div>

      <div class="error" data-testid="room-form-error" role="alert"></div>
      <div class="mt-3 d-flex justify-content-end gap-2">
        <button class="btn btn-secondary" type="button" data-testid="btn-cancel-footer">Hủy</button>
        <button class="btn btn-primary" type="button" data-testid="btn-save">Lưu</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('[data-testid="btn-cancel"]').addEventListener('click', close);
  modal.querySelector('[data-testid="btn-cancel-footer"]').addEventListener('click', close);

  modal.querySelector('[data-testid="btn-save"]').addEventListener('click', () => {
    const get = (testId) => modal.querySelector(`[data-testid="${testId}"]`).value;
    const data = {
      code: get('input-code').trim(),
      name: get('input-name').trim(),
      type: get('input-type').trim(),
      price: Number(get('input-price')),
      area: Number(get('input-area')),
      maxOccupants: Number(get('input-max-occupants')),
      floor: Number(get('input-floor')),
      areaName: get('input-area-name').trim(),
      status: get('input-status'),
      note: get('input-note').trim()
    };

    try {
      id ? RoomService.updateRoom(id, data) : RoomService.createRoom(data);
      showToast({ message: 'Lưu phòng thành công', type: 'success' });
      close();
      onSuccess?.();
    } catch (error) {
      modal.querySelector('[data-testid="room-form-error"]').textContent = error.message;
    }
  });
}
