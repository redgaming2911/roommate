import * as InvoiceService from '../services/invoice-service.js';
import * as PaymentService from '../services/payment-service.js';
import * as RoomService from '../services/room-service.js';

/**
 * Escape nội dung HTML.
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
 * Định dạng ngày.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) {
    return '—';
  }

  const datePart = String(value).slice(0, 10);
  const parts = datePart.split('-');

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Định dạng ngày giờ.
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

/**
 * Chuẩn hóa status.
 * @param {string} status
 * @returns {string}
 */
function normalizeStatus(status) {
  return status === 'cancelled'
    ? 'canceled'
    : status || 'draft';
}

/**
 * Nhãn trạng thái.
 * @param {string} status
 * @returns {string}
 */
function getStatusLabel(status) {
  const labels = {
    draft: 'Bản nháp',
    unpaid: 'Chưa thanh toán',
    partial: 'Thanh toán một phần',
    paid: 'Đã thanh toán',
    overdue: 'Quá hạn',
    canceled: 'Đã hủy'
  };

  return labels[normalizeStatus(status)] ?? status;
}

/**
 * Lấy phòng.
 * @param {string} roomId
 * @returns {Object|null}
 */
function getRoom(roomId) {
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
 * Lấy lịch sử thanh toán.
 * Ưu tiên API của InvoiceService nếu được bổ sung sau này.
 * @param {Object} invoice
 * @returns {Array}
 */
function getPaymentHistory(invoice) {
  return PaymentService.getPaymentsByInvoice(invoice.id);
}

/**
 * Render badge.
 * @param {string} status
 * @returns {string}
 */
function renderStatusBadge(status) {
  const normalizedStatus = normalizeStatus(status);

  return `
    <span
      class="invoice-status-badge invoice-status-${escapeHtml(normalizedStatus)}"
    >
      ${escapeHtml(getStatusLabel(normalizedStatus))}
    </span>
  `;
}

/**
 * Mở màn hình chi tiết hóa đơn.
 * @param {Object} options
 * @param {string} options.invoiceId
 * @param {Function} options.onClose
 * @param {Function} options.onEdit
 * @param {Function} options.onChanged
 */
export function openInvoiceDetail({
  invoiceId,
  onClose = () => {},
  onEdit = () => {},
  onChanged = () => {}
}) {
  let invoice =
    InvoiceService.getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const overlay = document.createElement('div');
  overlay.className = 'invoice-detail-overlay';
  overlay.dataset.testid = 'invoice-detail-modal';

  document.body.appendChild(overlay);

  /**
   * Đóng chi tiết.
   */
  function closeDetail() {
    overlay.remove();
    onClose();
  }

  /**
   * Render lịch sử thanh toán.
   * @returns {string}
   */
  function renderPayments() {
    const payments = getPaymentHistory(invoice);

    if (payments.length === 0) {
      return `
        <div class="invoice-detail-empty">
          Chưa có giao dịch thanh toán.
        </div>
      `;
    }

    return `
      <div class="invoice-payment-list">
        ${payments
          .map((payment, index) => {
            const paymentDate =
              payment.paymentDate ??
              payment.date ??
              payment.createdAt;

            const method =
              payment.methodLabel ??
              payment.method ??
              '—';

            return `
              <div class="invoice-payment-row">
                <span>${index + 1}</span>

                <span>
                  ${escapeHtml(
                    formatDateTime(paymentDate)
                  )}
                </span>

                <span>
                  ${escapeHtml(method)}
                </span>

                <strong>
                  ${formatCurrency(payment.amount)}
                </strong>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  /**
   * Render lịch sử trạng thái.
   * @returns {string}
   */
  function renderStatusHistory() {
    const history = Array.isArray(
      invoice.statusHistory
    )
      ? invoice.statusHistory
      : [];

    const normalizedHistory =
      history.length > 0
        ? history
        : [
            {
              status: invoice.status,
              changedAt:
                invoice.updatedAt ??
                invoice.finalizedAt ??
                invoice.createdAt,
              note: 'Trạng thái hiện tại'
            }
          ];

    return `
      <div class="invoice-status-history">
        ${normalizedHistory
          .map(
            (entry) => `
              <div class="invoice-status-history-item">
                <span class="invoice-history-dot"></span>

                <div>
                  <strong>
                    ${escapeHtml(
                      getStatusLabel(entry.status)
                    )}
                  </strong>

                  <small>
                    ${escapeHtml(
                      formatDateTime(
                        entry.changedAt ??
                          entry.createdAt
                      )
                    )}
                  </small>

                  ${
                    entry.note
                      ? `
                        <p>
                          ${escapeHtml(entry.note)}
                        </p>
                      `
                      : ''
                  }
                </div>
              </div>
            `
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render chi tiết.
   */
  function renderDetail() {
    invoice =
      InvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      closeDetail();
      return;
    }

    const room = getRoom(invoice.roomId);

    const roomCode =
      invoice.roomCode ??
      room?.roomCode ??
      room?.code ??
      invoice.roomId;

    const roomName =
      invoice.roomName ??
      room?.name ??
      '';

    const items = Array.isArray(invoice.items)
      ? invoice.items
      : [];

    const payments = getPaymentHistory(invoice);

    const remainingDebt = Math.max(
      Number(invoice.total ?? 0) -
        Number(invoice.paidAmount ?? 0),
      0
    );

    overlay.innerHTML = `
      <article
        class="invoice-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <header class="invoice-detail-header">
          <div class="invoice-detail-title-wrapper">
            <div class="invoice-detail-icon">
              ▤
            </div>

            <div>
              <div class="invoice-detail-label">
                Chi tiết hóa đơn
              </div>

              <div class="invoice-detail-title-line">
                <h2 id="invoice-detail-title">
                  ${escapeHtml(
                    invoice.invoiceCode ??
                    invoice.id
                  )}
                </h2>

                ${renderStatusBadge(invoice.status)}
              </div>

              <p>
                Hóa đơn tháng
                ${escapeHtml(
                  invoice.month ?? '—'
                )}
              </p>
            </div>
          </div>

          <div class="invoice-detail-header-actions">
            ${
              invoice.status === 'draft'
                ? `
                  <button
                    type="button"
                    class="btn btn-outline-primary no-print"
                    data-action="edit"
                    data-testid="invoice-detail-edit"
                  >
                    ✎ Sửa bản nháp
                  </button>
                `
                : ''
            }

            <button
              type="button"
              class="btn btn-outline-primary no-print"
              data-action="print"
              data-testid="invoice-detail-print"
            >
              🖨 In hóa đơn
            </button>

            <button
              type="button"
              class="invoice-modal-close no-print"
              data-action="close"
              data-testid="invoice-detail-close"
              aria-label="Đóng"
            >
              ×
            </button>
          </div>
        </header>

        <div class="invoice-detail-body">
          <section class="invoice-detail-information">
            <div>
              <span>Phòng</span>

              <strong>
                ${escapeHtml(roomCode)}
                ${
                  roomName
                    ? ` - ${escapeHtml(roomName)}`
                    : ''
                }
              </strong>
            </div>

            <div>
              <span>Người thuê</span>

              <strong>
                ${escapeHtml(
                  invoice.tenantName ??
                  invoice.representativeName ??
                  '—'
                )}
              </strong>
            </div>

            <div>
              <span>Số điện thoại</span>

              <strong>
                ${escapeHtml(
                  invoice.tenantPhone ?? '—'
                )}
              </strong>
            </div>

            <div>
              <span>Ngày lập</span>

              <strong>
                ${escapeHtml(
                  formatDateTime(invoice.createdAt)
                )}
              </strong>
            </div>

            <div>
              <span>Hạn thanh toán</span>

              <strong
                class="${
                  normalizeStatus(invoice.status) ===
                  'overdue'
                    ? 'invoice-due-overdue'
                    : ''
                }"
              >
                ${escapeHtml(
                  formatDate(invoice.dueDate)
                )}
              </strong>
            </div>
          </section>

          <div class="invoice-detail-main-grid">
            <section class="invoice-detail-items-card">
              <h3>Chi tiết các khoản</h3>

              <div class="invoice-detail-items-table">
                <div class="invoice-detail-item-header">
                  <span>#</span>
                  <span>Nội dung</span>
                  <span>Số lượng</span>
                  <span>Đơn giá</span>
                  <span>Thành tiền</span>
                </div>

                ${items
                  .map(
                    (item, index) => `
                      <div class="invoice-detail-item-row">
                        <span>${index + 1}</span>

                        <span>
                          <strong>
                            ${escapeHtml(item.name)}
                          </strong>

                          ${
                            item.note
                              ? `
                                <small>
                                  ${escapeHtml(item.note)}
                                </small>
                              `
                              : ''
                          }
                        </span>

                        <span>
                          ${escapeHtml(
                            item.quantity ?? 0
                          )}
                        </span>

                        <span>
                          ${formatCurrency(
                            item.unitPrice
                          )}
                        </span>

                        <strong>
                          ${formatCurrency(item.amount)}
                        </strong>
                      </div>
                    `
                  )
                  .join('')}
              </div>
            </section>

            <aside class="invoice-detail-summary-card">
              <h3>Tổng kết hóa đơn</h3>

              <div class="invoice-summary-line">
                <span>Tổng hóa đơn</span>

                <strong>
                  ${formatCurrency(invoice.total)}
                </strong>
              </div>

              <div class="invoice-summary-line">
                <span>Giảm giá</span>

                <strong class="invoice-summary-discount">
                  -${formatCurrency(
                    invoice.discount ?? 0
                  )}
                </strong>
              </div>

              <div class="invoice-summary-line">
                <span>Đã thanh toán</span>

                <strong class="invoice-amount-paid">
                  ${formatCurrency(
                    invoice.paidAmount
                  )}
                </strong>
              </div>

              <div class="invoice-summary-total">
                <span>Còn nợ</span>

                <strong>
                  ${formatCurrency(remainingDebt)}
                </strong>
              </div>

              <div class="invoice-detail-note">
                <span>Ghi chú</span>

                <p>
                  ${escapeHtml(
                    invoice.note ||
                    'Không có ghi chú.'
                  )}
                </p>
              </div>
            </aside>
          </div>

          <div class="invoice-detail-secondary-grid">
            <section class="invoice-detail-card">
              <h3>
                Lịch sử thanh toán
                <span>(${payments.length})</span>
              </h3>

              ${renderPayments()}
            </section>

            <section class="invoice-detail-card">
              <h3>Lịch sử trạng thái</h3>

              ${renderStatusHistory()}
            </section>
          </div>
        </div>
      </article>
    `;

    bindDetailEvents();
  }

  /**
   * Gắn sự kiện.
   */
  function bindDetailEvents() {
    overlay
      .querySelector('[data-action="close"]')
      ?.addEventListener(
        'click',
        closeDetail
      );

    overlay
      .querySelector('[data-action="print"]')
      ?.addEventListener('click', () => {
        window.print();
      });

    overlay
      .querySelector('[data-action="edit"]')
      ?.addEventListener('click', () => {
        closeDetail();
        onEdit(invoice.id);
      });
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeDetail();
    }
  });

  renderDetail();

  return {
    refresh() {
      renderDetail();
      onChanged();
    },

    close: closeDetail
  };
}
