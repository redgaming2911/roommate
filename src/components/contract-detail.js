export function renderContractDetail(contract) {
  return `<div class="contract-modal" data-testid="contract-detail"><div class="contract-modal-content">
    <h2>${contract.code}</h2><dl><dt>Phòng</dt><dd>${contract.roomId}</dd><dt>Ngày bắt đầu</dt><dd>${contract.startDate}</dd><dt>Ngày kết thúc</dt><dd>${contract.endDate}</dd><dt>Giá thuê</dt><dd>${new Intl.NumberFormat('vi-VN').format(contract.rentAmount)} ₫</dd><dt>Trạng thái</dt><dd>${contract.status}</dd></dl>
    <label>Gia hạn đến<input class="form-control" type="date" data-testid="extend-date"></label>
    <p data-testid="contract-detail-error" class="contract-form-error"></p>
    <div class="actions"><button class="btn btn-primary" data-testid="extend">Gia hạn</button><button class="btn btn-secondary" data-testid="close">Đóng</button></div>
  </div></div>`;
}

export function bindContractDetail(container, handlers) {
  const root = container.querySelector('[data-testid="contract-detail"]');
  root.querySelector('[data-testid="close"]').addEventListener('click', handlers.onClose);
  root.querySelector('[data-testid="extend"]').addEventListener('click', async () => {
    try { await handlers.onExtend(root.querySelector('[data-testid="extend-date"]').value); }
    catch (error) { root.querySelector('[data-testid="contract-detail-error"]').textContent = error.message; }
  });
}
