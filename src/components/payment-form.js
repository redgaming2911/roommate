import * as PaymentService from '../services/payment-service.js';
import * as InvoiceService from '../services/invoice-service.js';
import * as RoomService from '../services/room-service.js';
import { TenantService } from '../services/tenant-service.js';
import * as ToastModule from './toast.js';

/**
 * Escape HTML.
 *
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Định dạng tiền.
 *
 * @param {unknown} value
 * @returns {string}
 */
function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0 ₫';
  }

  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
}

/**
 * Lấy ngày hiện tại.
 *
 * @returns {string}
 */
function getToday() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * Hiển thị toast.
 *
 * @param {string} message
 * @param {'success'|'warning'|'error'} type
 */
function showNotification(message, type = 'success') {
  ToastModule.showToast({
    message,
    type
  });
}

/**
 * Chuẩn hóa trạng thái hủy.
 *
 * @param {string} status
 * @returns {string}
 */
function normalizeStatus(status) {
  return status === 'canceled'
    ? 'cancelled'
    : status;
}

/**
 * Lấy danh sách hóa đơn còn nợ và có thể thanh toán.
 *
 * @returns {Array<Object>}
 */
function getPayableInvoices() {
  return InvoiceService.getInvoices().filter((invoice) => {
    const status = normalizeStatus(invoice.status);
    const total = Number(invoice.total) || 0;
    const paidAmount = Number(invoice.paidAmount) || 0;

    return (
      status !== 'draft' &&
      status !== 'cancelled' &&
      status !== 'paid' &&
      paidAmount < total
    );
  });
}

/**
 * Lấy phòng theo ID.
 *
 * @param {string} roomId
 * @returns {Object|null}
 */
function getRoomById(roomId) {
  if (!roomId) {
    return null;
  }

  if (typeof RoomService.getRoomById === 'function') {
    try {
      return RoomService.getRoomById(roomId);
    } catch {
      return null;
    }
  }

  if (typeof RoomService.getRooms === 'function') {
    return (
      RoomService.getRooms().find(
        (room) => room.id === roomId
      ) ?? null
    );
  }

  return null;
}

/**
 * Lấy người thuê theo hóa đơn.
 *
 * @param {Object} invoice
 * @returns {Object|null}
 */
function getTenant(invoice) {
  const tenantId =
    invoice.tenantId ??
    invoice.representativeTenantId ??
    invoice.representativeId;

  if (
    !tenantId ||
    typeof TenantService.getTenantById !== 'function'
  ) {
    return null;
  }

  try {
    return TenantService.getTenantById(tenantId);
  } catch {
    return null;
  }
}

/**
 * Lấy tên người thuê.
 *
 * @param {Object} invoice
 * @returns {string}
 */
function getTenantName(invoice) {
  const tenant = getTenant(invoice);

  return (
    invoice.tenantName ??
    invoice.representativeName ??
    tenant?.name ??
    tenant?.fullName ??
    '—'
  );
}

/**
 * Lấy nhãn phòng.
 *
 * @param {Object} invoice
 * @returns {string}
 */
function getRoomLabel(invoice) {
  const room = getRoomById(invoice.roomId);

  const code =
    room?.roomCode ??
    room?.code ??
    invoice.roomCode ??
    invoice.roomId ??
    '—';

  const name =
    room?.name ??
    invoice.roomName ??
    '';

  return name && name !== code
    ? `${code} - ${name}`
    : code;
}

/**
 * Lấy mã hóa đơn.
 *
 * @param {Object} invoice
 * @returns {string}
 */
function getInvoiceCode(invoice) {
  return invoice.invoiceCode ?? invoice.id ?? '—';
}

/**
 * Tính công nợ còn lại.
 *
 * @param {Object|null} invoice
 * @returns {number}
 */
function getRemainingAmount(invoice) {
  if (!invoice) {
    return 0;
  }

  return Math.max(
    Number(invoice.total ?? 0) -
      Number(invoice.paidAmount ?? 0),
    0
  );
}

/**
 * Mở form ghi nhận thanh toán.
 *
 * @param {Object} options
 * @param {string|null} options.invoiceId
 * @param {Function} options.onCompleted
 */
export function openPaymentForm({
  invoiceId = null,
  onCompleted = () => {}
} = {}) {
  const overlay = document.createElement('div');

  overlay.className = 'payment-modal-overlay';
  overlay.dataset.testid = 'payment-form-modal';

  document.body.appendChild(overlay);

  let selectedInvoiceId = invoiceId ?? '';
  let selectedInvoice = selectedInvoiceId
    ? InvoiceService.getInvoiceById(selectedInvoiceId)
    : null;

  /**
   * Đóng modal.
   */
  function closeModal() {
    overlay.remove();
  }

  /**
   * Xóa lỗi.
   */
  function clearErrors() {
    overlay
      .querySelectorAll('[data-error]')
      .forEach((element) => {
        element.textContent = '';
      });

    overlay
      .querySelectorAll('.is-invalid')
      .forEach((element) => {
        element.classList.remove('is-invalid');
      });

    const generalError = overlay.querySelector(
      '[data-testid="payment-form-general-error"]'
    );

    if (generalError) {
      generalError.hidden = true;
      generalError.textContent = '';
    }
  }

  /**
   * Hiển thị lỗi trường.
   *
   * @param {string} field
   * @param {string} message
   */
  function setFieldError(field, message) {
    const input = overlay.querySelector(
      `[name="${field}"]`
    );

    const error = overlay.querySelector(
      `[data-error="${field}"]`
    );

    input?.classList.add('is-invalid');

    if (error) {
      error.textContent = message;
    }
  }

  /**
   * Hiển thị lỗi chung.
   *
   * @param {string} message
   */
  function setGeneralError(message) {
    const element = overlay.querySelector(
      '[data-testid="payment-form-general-error"]'
    );

    if (!element) {
      return;
    }

    element.textContent = message;
    element.hidden = false;
  }

  /**
   * Đọc dữ liệu form.
   *
   * @returns {Object}
   */
  function readFormData() {
    return {
      invoiceId:
        overlay.querySelector('[name="invoiceId"]')?.value ??
        '',
      paymentDate:
        overlay.querySelector('[name="paymentDate"]')?.value ??
        '',
      amount: Number(
        overlay.querySelector('[name="amount"]')?.value ??
        0
      ),
      method:
        overlay.querySelector('[name="method"]')?.value ??
        '',
      referenceCode:
        overlay
          .querySelector('[name="referenceCode"]')
          ?.value.trim() ?? '',
      content:
        overlay
          .querySelector('[name="content"]')
          ?.value.trim() ?? '',
      note:
        overlay
          .querySelector('[name="note"]')
          ?.value.trim() ?? ''
    };
  }

  /**
   * Validate dữ liệu phía giao diện.
   *
   * @param {Object} data
   * @returns {boolean}
   */
  function validateForm(data) {
    clearErrors();

    let valid = true;

    if (!data.invoiceId) {
      setFieldError(
        'invoiceId',
        'Vui lòng chọn hóa đơn còn nợ.'
      );
      valid = false;
    }

    if (!data.paymentDate) {
      setFieldError(
        'paymentDate',
        'Ngày thanh toán là bắt buộc.'
      );
      valid = false;
    }

    if (
      !Number.isFinite(data.amount) ||
      data.amount <= 0
    ) {
      setFieldError(
        'amount',
        'Số tiền thanh toán phải lớn hơn 0.'
      );
      valid = false;
    }

    if (!data.method) {
      setFieldError(
        'method',
        'Vui lòng chọn phương thức thanh toán.'
      );
      valid = false;
    }

    if (selectedInvoice) {
      const remaining = getRemainingAmount(selectedInvoice);

      if (data.amount > remaining) {
        setFieldError(
          'amount',
          `Số tiền không được vượt quá công nợ ${formatCurrency(
            remaining
          )}.`
        );
        valid = false;
      }
    }

    return valid;
  }

  /**
   * Cập nhật hóa đơn được chọn.
   *
   * @param {string} nextInvoiceId
   */
  function changeSelectedInvoice(nextInvoiceId) {
    selectedInvoiceId = nextInvoiceId;

    selectedInvoice = nextInvoiceId
      ? InvoiceService.getInvoiceById(nextInvoiceId)
      : null;

    renderModal();
  }

  /**
   * Điền toàn bộ công nợ vào ô số tiền.
   */
  function fillFullRemainingAmount() {
    if (!selectedInvoice) {
      return;
    }

    const amountInput = overlay.querySelector(
      '[name="amount"]'
    );

    if (amountInput) {
      amountInput.value = String(
        getRemainingAmount(selectedInvoice)
      );

      updatePaymentPreview();
    }
  }

  /**
   * Cập nhật khu vực xem trước.
   */
  function updatePaymentPreview() {
    const amount = Number(
      overlay.querySelector('[name="amount"]')?.value ??
      0
    );

    const remaining = getRemainingAmount(selectedInvoice);

    const afterPayment =
      Number.isFinite(amount) && amount > 0
        ? Math.max(remaining - amount, 0)
        : remaining;

    const valueElement = overlay.querySelector(
      '[data-testid="payment-after-amount"]'
    );

    const deductionElement = overlay.querySelector(
      '[data-testid="payment-preview-deduction"]'
    );

    const currentElement = overlay.querySelector(
      '[data-testid="payment-preview-current"]'
    );

    if (valueElement) {
      valueElement.textContent =
        formatCurrency(afterPayment);
    }

    if (deductionElement) {
      deductionElement.textContent =
        `-${formatCurrency(
          Number.isFinite(amount) && amount > 0
            ? amount
            : 0
        )}`;
    }

    if (currentElement) {
      currentElement.textContent =
        formatCurrency(remaining);
    }
  }

  /**
   * Ghi nhận thanh toán.
   */
  function submitPayment() {
    const formData = readFormData();

    if (!validateForm(formData)) {
      return;
    }

    try {
      const payment =
        PaymentService.createPayment(formData);

      showNotification(
        'Ghi nhận thanh toán thành công'
      );

      onCompleted(payment);
      closeModal();
    } catch (error) {
      setGeneralError(error.message);
    }
  }

  /**
   * Render modal.
   */
  function renderModal() {
    const payableInvoices = getPayableInvoices();

    if (
      selectedInvoiceId &&
      !selectedInvoice
    ) {
      selectedInvoice = InvoiceService.getInvoiceById(
        selectedInvoiceId
      );
    }

    const invoiceStatus = normalizeStatus(
      selectedInvoice?.status
    );

    const invoiceIsBlocked =
      selectedInvoice &&
      (
        invoiceStatus === 'cancelled' ||
        invoiceStatus === 'paid' ||
        getRemainingAmount(selectedInvoice) <= 0
      );

    const total = Number(
      selectedInvoice?.total ?? 0
    );

    const paidAmount = Number(
      selectedInvoice?.paidAmount ?? 0
    );

    const remaining = getRemainingAmount(
      selectedInvoice
    );

    overlay.innerHTML = `
      <div
        class="payment-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-form-title"
      >
        <header class="payment-modal-header">
          <div class="payment-modal-title">
            <div class="payment-modal-icon" aria-hidden="true">
              ▤
            </div>

            <div>
              <h2 id="payment-form-title">
                Ghi nhận thanh toán
              </h2>

              <p>
                Ghi nhận thanh toán cho hóa đơn.
              </p>
            </div>
          </div>

          <button
            type="button"
            class="payment-modal-close"
            data-action="close"
            data-testid="payment-form-close"
            aria-label="Đóng"
          >
            ×
          </button>
        </header>

        <div class="payment-modal-body">
          <div
            class="payment-form-general-error"
            data-testid="payment-form-general-error"
            role="alert"
            hidden
          ></div>

          <section class="payment-invoice-selector">
            <div class="payment-field">
              <label for="payment-form-invoice">
                Hóa đơn còn nợ
                <span class="required">*</span>
              </label>

              <select
                id="payment-form-invoice"
                name="invoiceId"
                data-testid="payment-form-invoice"
              >
                <option value="">
                  Chọn hóa đơn còn nợ
                </option>

                ${payableInvoices
                  .map((invoice) => {
                    const selected =
                      invoice.id === selectedInvoiceId
                        ? 'selected'
                        : '';

                    return `
                      <option
                        value="${escapeHtml(invoice.id)}"
                        ${selected}
                      >
                        ${escapeHtml(
                          getInvoiceCode(invoice)
                        )}
                        —
                        ${escapeHtml(
                          getRoomLabel(invoice)
                        )}
                        —
                        Còn ${escapeHtml(
                          formatCurrency(
                            getRemainingAmount(invoice)
                          )
                        )}
                      </option>
                    `;
                  })
                  .join('')}
              </select>

              <div
                class="payment-field-error"
                data-error="invoiceId"
              ></div>
            </div>
          </section>

          ${
            selectedInvoice
              ? `
                <section class="payment-invoice-overview">
                  <div class="payment-overview-top">
                    <div>
                      <span>Mã hóa đơn</span>

                      <strong class="payment-overview-code">
                        ${escapeHtml(
                          getInvoiceCode(selectedInvoice)
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Phòng</span>

                      <strong>
                        ${escapeHtml(
                          getRoomLabel(selectedInvoice)
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>Người thuê</span>

                      <strong>
                        ${escapeHtml(
                          getTenantName(selectedInvoice)
                        )}
                      </strong>
                    </div>
                  </div>

                  <div class="payment-overview-amounts">
                    <div>
                      <span>Tổng hóa đơn</span>
                      <strong>${formatCurrency(total)}</strong>
                    </div>

                    <div>
                      <span>Đã thanh toán</span>
                      <strong class="payment-text-success">
                        ${formatCurrency(paidAmount)}
                      </strong>
                    </div>

                    <div>
                      <span>Còn nợ</span>
                      <strong class="payment-text-danger">
                        ${formatCurrency(remaining)}
                      </strong>
                    </div>
                  </div>
                </section>
              `
              : `
                <section class="payment-form-empty-invoice">
                  Chọn một hóa đơn còn nợ để ghi nhận thanh toán.
                </section>
              `
          }

          ${
            invoiceIsBlocked
              ? `
                <div class="payment-alert payment-alert-danger">
                  Không thể ghi nhận thanh toán cho hóa đơn đã hủy
                  hoặc đã thanh toán đầy đủ.
                </div>
              `
              : ''
          }

          <section class="payment-form-section">
            <h3>Thông tin thanh toán</h3>

            <div class="payment-form-grid">
              <div class="payment-field">
                <label for="payment-form-date">
                  Ngày thanh toán
                  <span class="required">*</span>
                </label>

                <input
                  id="payment-form-date"
                  type="date"
                  name="paymentDate"
                  value="${escapeHtml(getToday())}"
                  data-testid="payment-form-date"
                />

                <div
                  class="payment-field-error"
                  data-error="paymentDate"
                ></div>
              </div>

              <div class="payment-field payment-amount-field">
                <label for="payment-form-amount">
                  Số tiền thanh toán
                  <span class="required">*</span>
                </label>

                <div class="payment-amount-input-group">
                  <input
                    id="payment-form-amount"
                    type="number"
                    name="amount"
                    min="1"
                    max="${escapeHtml(remaining)}"
                    step="1000"
                    value=""
                    placeholder="Nhập số tiền"
                    data-testid="payment-form-amount"
                    ${invoiceIsBlocked ? 'disabled' : ''}
                  />

                  <span>₫</span>
                </div>

                <small>
                  Công nợ tối đa:
                  ${formatCurrency(remaining)}
                </small>

                <div
                  class="payment-field-error"
                  data-error="amount"
                ></div>
              </div>

              <div class="payment-full-amount-wrapper">
                <button
                  type="button"
                  class="btn btn-outline-primary"
                  data-action="fill-full-amount"
                  data-testid="payment-fill-full-amount"
                  ${invoiceIsBlocked || !selectedInvoice ? 'disabled' : ''}
                >
                  ▣ Thanh toán toàn bộ
                </button>
              </div>

              <div class="payment-field">
                <label for="payment-form-method">
                  Phương thức thanh toán
                  <span class="required">*</span>
                </label>

                <select
                  id="payment-form-method"
                  name="method"
                  data-testid="payment-form-method"
                  ${invoiceIsBlocked ? 'disabled' : ''}
                >
                  <option value="">Chọn phương thức</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                  <option value="momo">MoMo</option>
                  <option value="zalopay">ZaloPay</option>
                </select>

                <div
                  class="payment-field-error"
                  data-error="method"
                ></div>
              </div>

              <div class="payment-field">
                <label for="payment-form-reference">
                  Mã giao dịch
                </label>

                <input
                  id="payment-form-reference"
                  type="text"
                  name="referenceCode"
                  maxlength="100"
                  placeholder="Ví dụ: VCB123456789"
                  data-testid="payment-form-reference"
                  ${invoiceIsBlocked ? 'disabled' : ''}
                />
              </div>

              <div class="payment-field">
                <label for="payment-form-content">
                  Nội dung thanh toán
                </label>

                <input
                  id="payment-form-content"
                  type="text"
                  name="content"
                  maxlength="255"
                  value="${
                    selectedInvoice
                      ? escapeHtml(
                          `Thanh toán hóa đơn ${getInvoiceCode(
                            selectedInvoice
                          )}`
                        )
                      : ''
                  }"
                  placeholder="Nhập nội dung thanh toán"
                  data-testid="payment-form-content"
                  ${invoiceIsBlocked ? 'disabled' : ''}
                />
              </div>

              <div class="payment-field payment-note-field">
                <label for="payment-form-note">
                  Ghi chú
                </label>

                <textarea
                  id="payment-form-note"
                  name="note"
                  maxlength="500"
                  placeholder="Nhập ghi chú nếu có"
                  data-testid="payment-form-note"
                  ${invoiceIsBlocked ? 'disabled' : ''}
                ></textarea>
              </div>
            </div>
          </section>

          <div class="payment-alert payment-alert-info">
            Số tiền thanh toán sẽ được ghi nhận và trừ vào
            công nợ của hóa đơn này.
          </div>

          <section class="payment-after-preview">
            <div class="payment-preview-main">
              <div class="payment-preview-icon">▧</div>

              <div>
                <span>Số tiền còn lại sau thanh toán</span>

                <strong data-testid="payment-after-amount">
                  ${formatCurrency(remaining)}
                </strong>
              </div>
            </div>

            <div class="payment-preview-breakdown">
              <div>
                <span>Còn nợ hiện tại</span>

                <strong data-testid="payment-preview-current">
                  ${formatCurrency(remaining)}
                </strong>
              </div>

              <div>
                <span>Số tiền thanh toán</span>

                <strong
                  class="payment-text-success"
                  data-testid="payment-preview-deduction"
                >
                  -${formatCurrency(0)}
                </strong>
              </div>

              <div>
                <span>Còn lại sau thanh toán</span>

                <strong data-testid="payment-preview-result">
                  ${formatCurrency(remaining)}
                </strong>
              </div>
            </div>
          </section>
        </div>

        <footer class="payment-modal-footer">
          <button
            type="button"
            class="btn btn-light"
            data-action="close"
            data-testid="payment-form-cancel"
          >
            Hủy
          </button>

          <button
            type="button"
            class="btn btn-primary"
            data-action="submit"
            data-testid="payment-form-submit"
            ${invoiceIsBlocked || !selectedInvoice ? 'disabled' : ''}
          >
            ✓ Xác nhận thanh toán
          </button>
        </footer>
      </div>
    `;

    bindModalEvents();
  }

  /**
   * Gắn sự kiện cho modal.
   */
  function bindModalEvents() {
    overlay
      .querySelectorAll('[data-action="close"]')
      .forEach((button) => {
        button.addEventListener(
          'click',
          closeModal
        );
      });

    overlay
      .querySelector('[name="invoiceId"]')
      ?.addEventListener('change', (event) => {
        changeSelectedInvoice(event.target.value);
      });

    overlay
      .querySelector('[name="amount"]')
      ?.addEventListener(
        'input',
        updatePaymentPreview
      );

    overlay
      .querySelector('[data-action="fill-full-amount"]')
      ?.addEventListener(
        'click',
        fillFullRemainingAmount
      );

    overlay
      .querySelector('[data-action="submit"]')
      ?.addEventListener(
        'click',
        submitPayment
      );
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  renderModal();
}
