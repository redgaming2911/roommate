import { RoomService } from '../services/room-service.js';
import { openRoomForm } from '../components/room-form.js';
import { showToast } from '../components/toast.js';
import { confirmDialog } from '../components/confirm-dialog.js';

let state = {
  keyword: '',
  status: '',
  sort: ''
};

export function renderRoomsPage(container) {
  container.innerHTML = `
    <div class="rooms-page" data-testid="rooms-page">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h2>Quản lý phòng trọ</h2>
          <p class="text-muted">Theo dõi trạng thái và thông tin các phòng</p>
        </div>
        <button class="btn btn-primary" data-testid="btn-add-room">
          + Thêm phòng
        </button>
      </div>

      <div class="filters mb-3">
        <input class="form-control" placeholder="Tìm theo mã hoặc tên..." data-testid="input-search"/>
        <select class="form-select" data-testid="filter-status">
          <option value="">Tất cả trạng thái</option>
          <option value="available">Trống</option>
          <option value="occupied">Đang thuê</option>
          <option value="repairing">Sửa chữa</option>
        </select>
        <select class="form-select" data-testid="sort-price">
          <option value="">Sắp xếp theo giá</option>
          <option value="asc">Giá tăng dần</option>
          <option value="desc">Giá giảm dần</option>
        </select>
      </div>

      <div id="rooms-table"></div>
    </div>
  `;

  bindEvents(container);
  renderTable();
}

function bindEvents(container) {
  container.querySelector('[data-testid="btn-add-room"]')
    .addEventListener('click', () => openRoomForm(onSave));

  container.querySelector('[data-testid="input-search"]')
    .addEventListener('input', (e) => {
      state.keyword = e.target.value;
      renderTable();
    });

  container.querySelector('[data-testid="filter-status"]')
    .addEventListener('change', (e) => {
      state.status = e.target.value;
      renderTable();
    });

  container.querySelector('[data-testid="sort-price"]')
    .addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderTable();
    });
}

function getFilteredRooms() {
  let rooms = RoomService.getRooms();

  if (state.keyword) {
    rooms = RoomService.searchRooms(state.keyword);
  }

  if (state.status) {
    rooms = rooms.filter(r => r.status === state.status);
  }

  if (state.sort) {
    rooms.sort((a, b) =>
      state.sort === 'asc'
        ? a.price - b.price
        : b.price - a.price
    );
  }

  return rooms;
}

function renderTable() {
  const container = document.getElementById('rooms-table');
  const rooms = getFilteredRooms();

  if (!rooms.length) {
    container.innerHTML = `
      <div class="empty-state" data-testid="empty-state">
        Không có dữ liệu
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="table table-hover" data-testid="rooms-table">
      <thead>
        <tr>
          <th>Mã phòng</th>
          <th>Tên phòng</th>
          <th>Giá thuê</th>
          <th>Trạng thái</th>
          <th>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        ${rooms.map(r => `
          <tr>
            <td>${r.code}</td>
            <td>${r.name}</td>
            <td>${formatCurrency(r.price)}</td>
            <td>${renderBadge(r.status)}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary" data-id="${r.id}" data-action="edit">Sửa</button>
              <button class="btn btn-sm btn-outline-danger" data-id="${r.id}" data-action="delete">Xóa</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  bindTableEvents();
}

function bindTableEvents() {
  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      openRoomForm(onSave, id);
    });
  });

  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;

      const confirmed = await confirmDialog('Bạn có chắc muốn xóa?');
      if (!confirmed) return;

      try {
        RoomService.deleteRoom(id);
        showToast('Xóa thành công', 'success');
        renderTable();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function onSave() {
  renderTable();
}

function renderBadge(status) {
  const map = {
    available: 'bg-secondary',
    occupied: 'bg-success',
    repairing: 'bg-warning'
  };
  return `<span class="badge ${map[status] || 'bg-secondary'}">${status}</span>`;
}

function formatCurrency(v) {
  return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
}