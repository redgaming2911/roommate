import { TenantService } from "../services/tenant-service.js";
import { showToast } from "../components/toast.js";
import { renderTenantForm } from "../components/tenant-form.js";

let state = {
  keyword: "",
  status: "all",
  tenants: [],
};

function loadData() {
  state.tenants = TenantService.getTenants();
}

function getFilteredTenants() {
  let result = TenantService.searchTenants(state.keyword);

  if (state.status !== "all") {
    result = result.filter((t) => {
      if (state.status === "renting") return t.currentRoom;
      if (state.status === "inactive") return !t.currentRoom;
      return true;
    });
  }

  return result;
}

function renderTable() {
  const container = document.querySelector("[data-testid='tenant-table-body']");
  const empty = document.querySelector("[data-testid='tenant-empty']");

  const tenants = getFilteredTenants();

  if (!tenants.length) {
    container.innerHTML = "";
    empty.style.display = "block";
    return;
  }

  empty.style.display = "none";

  container.innerHTML = tenants
    .map((t) => {
      const room = TenantService.getCurrentRoomOfTenant(t.id);

      return `
      <tr>
        <td>${t.name}</td>
        <td>${t.phone}</td>
        <td>${t.cccd || "-"}</td>
        <td>${room ? room.name : "Không có phòng"}</td>
        <td>
          <span class="badge ${room ? "badge-success" : "badge-gray"}">
            ${room ? "Đang thuê" : "Đã rời"}
          </span>
        </td>
        <td>
          <button data-id="${t.id}" class="btn-view" data-testid="btn-view">👁</button>
          <button data-id="${t.id}" class="btn-edit" data-testid="btn-edit">✏️</button>
          <button data-id="${t.id}" class="btn-archive" data-testid="btn-archive">📦</button>
          <button data-id="${t.id}" class="btn-delete" data-testid="btn-delete">🗑</button>
        </td>
      </tr>
      `;
    })
    .join("");
}

function bindEvents() {
  document.querySelector("[data-testid='tenant-search']").addEventListener("input", (e) => {
    state.keyword = e.target.value;
    renderTable();
  });

  document.querySelector("[data-testid='tenant-filter']").addEventListener("change", (e) => {
    state.status = e.target.value;
    renderTable();
  });

  document.querySelector("[data-testid='btn-add-tenant']").addEventListener("click", () => {
    renderTenantForm({
      onSubmit: handleCreate,
    });
  });

  document.addEventListener("click", async (e) => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains("btn-edit")) {
      const tenant = TenantService.getTenantById(id);
      renderTenantForm({
        tenant,
        onSubmit: (data) => handleUpdate(id, data),
      });
    }

    if (e.target.classList.contains("btn-archive")) {
      window.showConfirm("Lưu trữ người thuê này?", () => {
        TenantService.archiveTenant(id);
        showToast({ message: "Đã lưu trữ" });
        refresh();
      });
    }

    if (e.target.classList.contains("btn-delete")) {
      try {
        window.showConfirm("Xóa người thuê này?", () => {
          TenantService.deleteTenant(id);
          showToast({ message: "Đã xóa" });
          refresh();
        });
      } catch (err) {
        showToast({ message: err.message, type: "error" });
      }
    }

    if (e.target.classList.contains("btn-view")) {
      const history = TenantService.getTenantRentalHistory(id);
      showToast({ message: `Lịch sử: ${history.length} hợp đồng` });
    }
  });
}

function handleCreate(data) {
  try {
    TenantService.createTenant(data);
    showToast({ message: "Tạo người thuê thành công" });
    refresh();
  } catch (err) {
    showToast({ message: err.message, type: "error" });
  }
}

function handleUpdate(id, data) {
  try {
    TenantService.updateTenant(id, data);
    showToast({ message: "Cập nhật thành công" });
    refresh();
  } catch (err) {
    showToast({ message: err.message, type: "error" });
  }
}

function refresh() {
  loadData();
  renderTable();
}

function renderTenantsPage(container) {
  container.innerHTML = `
    <div class="tenants-page">
      <div class="page-header">
        <h1>Quản lý người thuê</h1>
        <button data-testid="btn-add-tenant" class="btn-primary">+ Thêm người thuê</button>
      </div>

      <div class="filters">
        <input placeholder="Tìm kiếm..." data-testid="tenant-search"/>
        <select data-testid="tenant-filter">
          <option value="all">Tất cả</option>
          <option value="renting">Đang thuê</option>
          <option value="inactive">Đã rời</option>
        </select>
      </div>

      <table class="tenant-table">
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>SĐT</th>
            <th>CCCD</th>
            <th>Phòng</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody data-testid="tenant-table-body"></tbody>
      </table>

      <div class="empty" data-testid="tenant-empty" style="display:none">
        Không có dữ liệu
      </div>
    </div>
  `;

  loadData();
  renderTable();
  bindEvents();
}

export const render = renderTenantsPage;
