import { ContractService } from "../services/contract-service.js";

export function renderContractForm({ onSubmit }) {
  return `
    <div class="modal" data-testid="contract-form">
      <h2>Tạo hợp đồng</h2>

      <input data-testid="room" placeholder="Room ID" />
      <input data-testid="tenant" placeholder="Tenant ID" />
      <input data-testid="start" type="date" />
      <input data-testid="end" type="date" />
      <input data-testid="rent" placeholder="Giá thuê" />

      <div class="errors" data-testid="errors"></div>

      <button data-testid="submit">Lưu</button>
    </div>
  `;
}

export function bindContractForm(el, { onSubmit }) {
  el.querySelector("[data-testid='submit']").onclick = async () => {
    const data = {
      roomId: el.querySelector("[data-testid='room']").value,
      tenantId: el.querySelector("[data-testid='tenant']").value,
      startDate: el.querySelector("[data-testid='start']").value,
      endDate: el.querySelector("[data-testid='end']").value,
      rent: Number(el.querySelector("[data-testid='rent']").value),
    };

    try {
      await ContractService.createContract(data);
      onSubmit(data);
    } catch (err) {
      el.querySelector("[data-testid='errors']").textContent = err.message;
    }
  };
}