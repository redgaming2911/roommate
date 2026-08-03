import { ServiceConfigService } from '../services/service-config-service.js';
import { ServiceConfigForm } from '../components/service-config-form.js';

function renderServicesPage(container) {
  const state = {
    keyword: '',
    status: 'all'
  };

  function loadData() {
    let list = ServiceConfigService.getAll();

    if (state.keyword) {
      list = ServiceConfigService.search(state.keyword);
    }

    if (state.status !== 'all') {
      list = list.filter(s => s.status === state.status);
    }

    render(list);
  }

  function render(list) {
    container.innerHTML = `
      <div>
        <h1>Cấu hình dịch vụ</h1>

        <div>
          <input placeholder="Tìm kiếm..." data-testid="search"/>
          <select data-testid="filter-status">
            <option value="all">Tất cả</option>
            <option value="active">Đang áp dụng</option>
            <option value="inactive">Ngưng</option>
          </select>
          <button data-testid="add-btn">+ Thêm</button>
        </div>

        <table data-testid="service-table">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tên</th>
              <th>Đơn giá</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${list.map(s => `
              <tr>
                <td>${s.code}</td>
                <td>${s.name}</td>
                <td>${s.unitPrice}</td>
                <td>${s.status}</td>
                <td>
                  <button data-id="${s.id}" class="edit">Sửa</button>
                  <button data-id="${s.id}" class="toggle">
                    ${s.status === 'active' ? 'Ngưng' : 'Kích hoạt'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelector('[data-testid="search"]')
      .addEventListener('input', e => {
        state.keyword = e.target.value;
        loadData();
      });

    container.querySelector('[data-testid="filter-status"]')
      .addEventListener('change', e => {
        state.status = e.target.value;
        loadData();
      });

    container.querySelector('[data-testid="add-btn"]')
      .addEventListener('click', () => {
        openForm();
      });

    container.querySelectorAll('.edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = ServiceConfigService.getById(btn.dataset.id);
        openForm(item);
      });
    });

    container.querySelectorAll('.toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = ServiceConfigService.getById(id);

        if (item.status === 'active') {
          ServiceConfigService.deactivate(id);
        } else {
          ServiceConfigService.activate(id);
        }

        loadData();
      });
    });
  }

  function openForm(data = null) {
    const modal = document.createElement('div');
    document.body.appendChild(modal);

    ServiceConfigForm({
      container: modal,
      data,
      onSuccess: () => {
        modal.remove();
        loadData();
      }
    });
  }

  loadData();
}

export const render = renderServicesPage;
