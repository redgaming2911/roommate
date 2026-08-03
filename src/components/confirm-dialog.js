let confirmCallback = null;

export function initConfirmDialog() {
  const root = document.getElementById('confirm-dialog-root');

  root.innerHTML = `
    <div class="modal fade" id="confirmModal" tabindex="-1" data-testid="confirm-modal">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Xác nhận</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>

          <div class="modal-body" id="confirm-message">
            Bạn có chắc chắn?
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal" data-testid="confirm-cancel">
              Hủy
            </button>
            <button class="btn btn-danger" id="confirm-ok" data-testid="confirm-ok">
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const modalEl = document.getElementById('confirmModal');
  const modal = new bootstrap.Modal(modalEl);
  const confirmButton = document.getElementById('confirm-ok');

  confirmButton.addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
    modal.hide();
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    confirmCallback = null;
  });

  window.showConfirm = (message, callback, options = {}) => {
    confirmCallback = callback;
    document.getElementById('confirm-message').innerText = message;
    confirmButton.textContent = options.confirmLabel ?? 'Xác nhận';
    confirmButton.className = `btn btn-${options.variant ?? 'danger'}`;
    modal.show();
  };
}
