export function renderLayout(container) {
  container.innerHTML = `
    <div class="sidebar" data-testid="sidebar">
      <div class="logo">🏠 RoomMate</div>

      <div class="menu">
        ${menuItem('dashboard', 'Tổng quan')}
        ${menuItem('rooms', 'Phòng trọ')}
        ${menuItem('tenants', 'Người thuê')}
        ${menuItem('contracts', 'Hợp đồng')}
        ${menuItem('meters', 'Điện nước')}
        ${menuItem('services', 'Dịch vụ')}
        ${menuItem('invoices', 'Hóa đơn')}
        ${menuItem('payments', 'Thanh toán')}
        ${menuItem('debts', 'Công nợ')}
        ${menuItem('reports', 'Báo cáo')}
        ${menuItem('settings', 'Cài đặt')}
      </div>
    </div>

    <div class="main">
      <div class="topbar" data-testid="topbar">
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline-secondary btn-sm" id="toggle-sidebar" data-testid="toggle-sidebar">
            ☰
          </button>

          <input 
            type="text" 
            class="form-control search" 
            placeholder="Tìm kiếm..." 
            data-testid="search-input"
          />
        </div>

        <div>
          <span data-testid="user-info">Quản lý nhà trọ</span>
        </div>
      </div>

      <div id="main-content" class="main-content" data-testid="main-content"></div>
    </div>
  `;

  bindEvents();
}

function menuItem(page, label) {
  return `
    <a href="javascript:void(0)" 
       data-page="${page}" 
       data-testid="menu-${page}">
      ${label}
    </a>
  `;
}

function bindEvents() {
  const toggleBtn = document.getElementById('toggle-sidebar');
  const sidebar = document.querySelector('.sidebar');

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
}