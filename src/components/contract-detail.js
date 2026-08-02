export function renderContractDetail(contract, handlers) {
  return `
    <div class="modal" data-testid="contract-detail">
      <h2>${contract.code}</h2>

      <div>Phòng: ${contract.roomId}</div>
      <div>Ngày bắt đầu: ${contract.startDate}</div>
      <div>Ngày kết thúc: ${contract.endDate}</div>
      <div>Trạng thái: ${contract.status}</div>

      <input type="date" data-testid="extend-date"/>

      <div class="actions">
        <button data-testid="extend">Gia hạn</button>
        <button data-testid="close">Đóng</button>
      </div>
    </div>
  `;
}

export function bindContractDetail(el, handlers) {
  el.querySelector("[data-testid='close']").onclick = handlers.onClose;

  el.querySelector("[data-testid='extend']").onclick = () => {
    const date = el.querySelector("[data-testid='extend-date']").value;
    handlers.onExtend(date);
  };
}