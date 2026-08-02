import { showToast } from "./toast.js";

export function renderTenantForm({ tenant = null, onSubmit }) {
  const modal = document.createElement("div");
  modal.className = "modal";

  modal.innerHTML = `
    <div class="modal-content">
      <h2>${tenant ? "Sửa người thuê" : "Thêm người thuê"}</h2>

      <input data-testid="name" placeholder="Họ tên" value="${tenant?.name || ""}" />
      <input data-testid="phone" placeholder="SĐT" value="${tenant?.phone || ""}" />
      <input data-testid="cccd" placeholder="CCCD" value="${tenant?.cccd || ""}" />

      <div class="actions">
        <button data-testid="cancel">Hủy</button>
        <button data-testid="submit" class="btn-primary">Lưu</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector("[data-testid='cancel']").onclick = () => modal.remove();

  modal.querySelector("[data-testid='submit']").onclick = () => {
    const data = {
      name: modal.querySelector("[data-testid='name']").value,
      phone: modal.querySelector("[data-testid='phone']").value,
      cccd: modal.querySelector("[data-testid='cccd']").value,
    };

    try {
      onSubmit(data);
      modal.remove();
    } catch (err) {
      showToast(err.message, "error");
    }
  };
}