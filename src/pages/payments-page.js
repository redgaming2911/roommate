import * as PaymentService from '../services/payment-service.js';
import * as InvoiceService from '../services/invoice-service.js';
import * as RoomService from '../services/room-service.js';
import { TenantService } from '../services/tenant-service.js';
import * as ToastModule from '../components/toast.js';
import { openPaymentForm } from '../components/payment-form.js';
import '../styles/payments.css';

const state = {
  keyword: '',
  roomId: '',
  method: '',
  dateFrom: getFirstDayOfCurrentMonth(),
  dateTo: getToday()
};

let pageContainer = null;

/**
 * Lấy ngày hiện tại theo định dạng YYYY-MM-DD.
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
 * Lấy ngày đầu tháng hiện tại.
 *
 * @returns {string}
 */
function getFirstDayOfCurrentMonth() {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    '01'
  ].join('-');
}

/**
 * Escape nội dung trước khi đưa vào HTML.
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
 * Định dạng tiền Việt Nam.
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
 * Định dạng ngày giờ.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatDateTime(value) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

/**
 * Hiển thị toast tương thích với component hiện có.
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
 * Hiển thị hộp thoại xác nhận.
 *
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function requestConfirmation(message) {
  return new Promise((resolve) => {
    window.showConfirm(message, () => resolve(true));
  });
}

/**
 * Lấy danh sách phòng.
 *
 * @returns {Array<Object>}
 */
function getRooms() {
  if (typeof RoomService.getRooms !== 'function') {
    return [];
  }

  try {
    return RoomService.getRooms();
  } catch (error) {
    console.error('Không thể tải danh sách phòng:', error);
    return [];
  }
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

  return (
    getRooms().find((room) => room.id === roomId) ??
    null
  );
}

/**
 * Lấy người thuê theo ID.
 *
 * @param {string} tenantId
 * @returns {Object|null}
 */
function getTenantById(tenantId) {
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
 * Lấy hóa đơn theo ID.
 *
 * @param {string} invoiceId
 * @returns {Object|null}
 */
function getInvoiceById(invoiceId) {
  return (
    InvoiceService.getInvoiceById(invoiceId) ??
    null
  );
}

/**
 * Lấy mã giao dịch hiển thị.
 *
 * @param {Object} payment
 * @returns {string}
 */
function getPaymentCode(payment) {
  return (
    payment.paymentCode ??
    payment.transactionCode ??
    payment.referenceCode ??
    payment.id ??
    '—'
  );
}

/**
 * Lấy mã hóa đơn hiển thị.
 *
 * @param {Object|null} invoice
 * @returns {string}
 */
function getInvoiceCode(invoice) {
  if (!invoice) {
    return '—';
  }

  return invoice.invoiceCode ?? invoice.id ?? '—';
}

/**
 * Lấy tên hoặc mã phòng.
 *
 * @param {Object|null} room
 * @param {Object|null} invoice
 * @returns {string}
 */
function getRoomLabel(room, invoice) {
  return (
    room?.roomCode ??
    room?.code ??
    room?.name ??
    invoice?.roomCode ??
    invoice?.roomId ??
    '—'
  );
}

/**
 * Lấy người thuê đại diện từ dữ liệu hóa đơn.
 *
 * @param {Object|null} invoice
 * @returns {Object|null}
 */
function getRepresentativeTenant(invoice) {
  if (!invoice) {
    return null;
  }

  const tenantId =
    invoice.tenantId ??
    invoice.representativeTenantId ??
    invoice.representativeId;

  return getTenantById(tenantId);
}

/**
 * Lấy tên người thuê.
 *
 * @param {Object|null} invoice
 * @returns {string}
 */
function getTenantName(invoice) {
  const tenant = getRepresentativeTenant(invoice);

  return (
    invoice?.tenantName ??
    invoice?.representativeName ??
    tenant?.name ??
    tenant?.fullName ??
    '—'
  );
}

/**
 * Lấy nhãn phương thức thanh toán.
 *
 * @param {string} method
 * @returns {string}
 */
function getPaymentMethodLabel(method) {
  const labels = {
    cash: 'Tiền mặt',
    bank_transfer: 'Chuyển khoản',
    momo: 'MoMo',
    zalopay: 'ZaloPay'
  };

  return labels[method] ?? method ?? 'Không xác định';
}

/**
 * Render badge phương thức thanh toán.
 *
 * @param {string} method
 * @returns {string}
 */
function renderMethodBadge(method) {
  const normalizedMethod = method || 'unknown';

  return `
    <span
      class="payment-method-badge payment-method-${escapeHtml(normalizedMethod)}"
      data-testid="payment-method-${escapeHtml(normalizedMethod)}"
    >
      ${escapeHtml(getPaymentMethodLabel(normalizedMethod))}
    </span>
  `;
}

/**
 * Lấy danh sách giao dịch theo bộ lọc.
 *
 * @returns {Array<Object>}
 */
function getFilteredPayments() {
  let payments = PaymentService.filterPayments({
    roomId: state.roomId,
    method: state.method,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo
  });

  /*
   * PaymentService hiện chưa lọc trực tiếp theo roomId.
   * Vì vậy page lọc thông qua invoice liên quan, nhưng không
   * truy cập LocalStorage trực tiếp.
   */
  if (state.roomId) {
    payments = payments.filter((payment) => {
      const invoice = getInvoiceById(payment.invoiceId);

      return invoice?.roomId === state.roomId;
    });
  }

  const keyword = state.keyword.trim().toLowerCase();

  if (keyword) {
    payments = payments.filter((payment) => {
      const invoice = getInvoiceById(payment.invoiceId);
      const tenantName = getTenantName(invoice);

      return [
        getPaymentCode(payment),
        getInvoiceCode(invoice),
        tenantName,
        payment.content,
        payment.note,
        payment.referenceCode
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword)
      );
    });
  }

  return [...payments].sort((first, second) => {
    const firstDate =
      first.paymentDate ?? first.createdAt ?? '';
    const secondDate =
      second.paymentDate ?? second.createdAt ?? '';

    return secondDate.localeCompare(firstDate);
  });
}

/**
 * Tạo dữ liệu thống kê.
 *
 * @param {Array<Object>} payments
 * @returns {Object}
 */
function buildPaymentSummary(payments) {
  const today = getToday();

  return payments.reduce(
    (summary, payment) => {
      const amount = Number(payment.amount) || 0;
      const method =
        payment.method ??
        payment.paymentMethod ??
        'unknown';

      const paymentDate = String(
        payment.paymentDate ??
        payment.createdAt ??
        ''
      ).slice(0, 10);

      summary.total += amount;
      summary.count += 1;

      if (method === 'cash') {
        summary.cash += amount;
      }

      if (method === 'bank_transfer') {
        summary.bankTransfer += amount;
      }

      if (paymentDate === today) {
        summary.todayAmount += amount;
        summary.todayCount += 1;
      }

      return summary;
    },
    {
      total: 0,
      count: 0,
      cash: 0,
      bankTransfer: 0,
      todayAmount: 0,
      todayCount: 0
    }
  );
}

/**
 * Render các card thống kê.
 */
function renderSummaryCards() {
  const container = pageContainer.querySelector(
    '[data-testid="payment-summary"]'
  );

  if (!container) {
    return;
  }

  const payments = PaymentService.filterPayments({
    dateFrom: state.dateFrom,
    dateTo: state.dateTo
  });

  const summary = buildPaymentSummary(payments);

  const cashPercent =
    summary.total > 0
      ? (summary.cash / summary.total) * 100
      : 0;

  const bankPercent =
    summary.total > 0
      ? (summary.bankTransfer / summary.total) * 100
      : 0;

  container.innerHTML = `
    ${createSummaryCard({
      modifier: 'primary',
      icon: '▣',
      label: 'Tổng tiền đã thu',
      value: summary.total,
      note: `${summary.count} giao dịch`
    })}

    ${createSummaryCard({
      modifier: 'success',
      icon: '▤',
      label: 'Thanh toán tiền mặt',
      value: summary.cash,
      note: `${cashPercent.toFixed(1)}% tổng số thu`
    })}

    ${createSummaryCard({
      modifier: 'purple',
      icon: '▥',
      label: 'Thanh toán chuyển khoản',
      value: summary.bankTransfer,
      note: `${bankPercent.toFixed(1)}% tổng số thu`
    })}

    ${createSummaryCard({
      modifier: 'warning',
      icon: '⌁',
      label: 'Giao dịch hôm nay',
      value: summary.todayAmount,
      note: `${summary.todayCount} giao dịch`
    })}
  `;
}

/**
 * Tạo HTML card thống kê.
 *
 * @param {Object} options
 * @returns {string}
 */
function createSummaryCard({
  modifier,
  icon,
  label,
  value,
  note
}) {
  return `
    <article class="payment-summary-card payment-summary-${modifier}">
      <div class="payment-summary-icon" aria-hidden="true">
        ${escapeHtml(icon)}
      </div>

      <div>
        <div class="payment-summary-label">
          ${escapeHtml(label)}
        </div>

        <strong class="payment-summary-value">
          ${formatCurrency(value)}
        </strong>

        <div class="payment-summary-note">
          ${escapeHtml(note)}
        </div>
      </div>
    </article>
  `;
}

/**
 * Render options phòng.
 */
function renderRoomOptions() {
  const roomSelect = pageContainer.querySelector(
    '[data-testid="payment-filter-room"]'
  );

  if (!roomSelect) {
    return;
  }

  roomSelect.innerHTML = `
    <option value="">Tất cả phòng</option>

    ${getRooms()
      .map((room) => {
        const label =
          room.roomCode ??
          room.code ??
          room.name ??
          room.id;

        return `
          <option value="${escapeHtml(room.id)}">
            ${escapeHtml(label)}
          </option>
        `;
      })
      .join('')}
  `;

  roomSelect.value = state.roomId;
}

/**
 * Render bảng giao dịch.
 */
function renderPaymentTable() {
  const wrapper = pageContainer.querySelector(
    '[data-testid="payment-table-wrapper"]'
  );

  if (!wrapper) {
    return;
  }

  const payments = getFilteredPayments();

  if (payments.length === 0) {
    wrapper.innerHTML = `
      <div
        class="payment-empty-state"
        data-testid="payment-empty-state"
      >
        <div class="payment-empty-icon" aria-hidden="true">
          ▤
        </div>

        <h3>Không có giao dịch thanh toán</h3>

        <p>
          Không tìm thấy giao dịch phù hợp với bộ lọc hiện tại.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          data-action="clear-filters"
          data-testid="payment-clear-empty-filters"
        >
          Xóa bộ lọc
        </button>
      </div>
    `;

    return;
  }

  wrapper.innerHTML = `
    <div class="payment-table-heading">
      <h2>Danh sách giao dịch</h2>
    </div>

    <div class="payment-table-scroll">
      <table
        class="payment-table"
        data-testid="payment-table"
      >
        <thead>
          <tr>
            <th>Mã giao dịch</th>
            <th>Ngày thanh toán</th>
            <th>Mã hóa đơn</th>
            <th>Phòng</th>
            <th>Người thuê</th>
            <th class="payment-text-end">Số tiền</th>
            <th>Phương thức</th>
            <th>Nội dung</th>
            <th>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          ${payments
            .map((payment) => renderPaymentRow(payment))
            .join('')}
        </tbody>
      </table>
    </div>

    <footer class="payment-table-footer">
      Hiển thị ${payments.length} giao dịch
    </footer>
  `;
}

/**
 * Render một dòng giao dịch.
 *
 * @param {Object} payment
 * @returns {string}
 */
function renderPaymentRow(payment) {
  const invoice = getInvoiceById(payment.invoiceId);
  const room = getRoomById(invoice?.roomId);
  const method =
    payment.method ??
    payment.paymentMethod ??
    'unknown';

  return `
    <tr
      data-testid="payment-row"
      data-payment-id="${escapeHtml(payment.id)}"
    >
      <td>
        <strong>
          ${escapeHtml(getPaymentCode(payment))}
        </strong>
      </td>

      <td>
        ${escapeHtml(
          formatDateTime(
            payment.paymentDate ??
            payment.createdAt
          )
        )}
      </td>

      <td>
        <span class="payment-invoice-code">
          ${escapeHtml(getInvoiceCode(invoice))}
        </span>
      </td>

      <td>
        ${escapeHtml(getRoomLabel(room, invoice))}
      </td>

      <td>
        ${escapeHtml(getTenantName(invoice))}
      </td>

      <td class="payment-text-end payment-amount">
        ${formatCurrency(payment.amount)}
      </td>

      <td>
        ${renderMethodBadge(method)}
      </td>

      <td>
        ${escapeHtml(
          payment.content ??
          payment.description ??
          payment.note ??
          '—'
        )}
      </td>

      <td>
        <div class="payment-row-actions">
          <button
            type="button"
            class="payment-icon-button"
            data-action="view"
            data-id="${escapeHtml(payment.id)}"
            data-testid="payment-view-${escapeHtml(payment.id)}"
            title="Xem giao dịch"
            aria-label="Xem giao dịch"
          >
            ◉
          </button>

          <button
            type="button"
            class="payment-icon-button payment-icon-danger"
            data-action="delete"
            data-id="${escapeHtml(payment.id)}"
            data-testid="payment-delete-${escapeHtml(payment.id)}"
            title="Xóa giao dịch nhập sai"
            aria-label="Xóa giao dịch"
          >
            🗑
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render biểu đồ tỷ lệ phương thức bằng CSS.
 */
function renderPaymentMethodChart() {
  const chartContainer = pageContainer.querySelector(
    '[data-testid="payment-method-chart"]'
  );

  if (!chartContainer) {
    return;
  }

  const payments = getFilteredPayments();
  const summary = buildPaymentSummary(payments);

  const cashPercent =
    summary.total > 0
      ? (summary.cash / summary.total) * 100
      : 0;

  const bankPercent =
    summary.total > 0
      ? (summary.bankTransfer / summary.total) * 100
      : 0;

  chartContainer.innerHTML = `
    <div class="payment-chart-card">
      <h2>Tỷ lệ phương thức thanh toán</h2>

      <div class="payment-chart-content">
        <div
          class="payment-donut-chart"
          style="
            --bank-percent: ${bankPercent};
            --cash-percent: ${cashPercent};
          "
          aria-label="Biểu đồ tỷ lệ phương thức thanh toán"
        >
          <div class="payment-donut-center">
            <strong>${formatCurrency(summary.total)}</strong>
            <span>Tổng tiền</span>
          </div>
        </div>

        <div class="payment-chart-legend">
          <div>
            <span class="payment-legend-dot payment-legend-bank"></span>
            <span>Chuyển khoản</span>
            <strong>
              ${formatCurrency(summary.bankTransfer)}
              (${bankPercent.toFixed(1)}%)
            </strong>
          </div>

          <div>
            <span class="payment-legend-dot payment-legend-cash"></span>
            <span>Tiền mặt</span>
            <strong>
              ${formatCurrency(summary.cash)}
              (${cashPercent.toFixed(1)}%)
            </strong>
          </div>
        </div>
      </div>
    </div>

    <aside class="payment-information-box">
      <strong>Thông tin</strong>

      <p>
        Số liệu thống kê dựa trên các giao dịch đã được ghi nhận
        trong khoảng thời gian đang chọn.
      </p>
    </aside>
  `;
}

/**
 * Render lại dữ liệu trang.
 */
function refreshPayments() {
  renderSummaryCards();
  renderPaymentTable();
  renderPaymentMethodChart();
}

/**
 * Mở form thanh toán.
 */
function handleOpenPaymentForm() {
  openPaymentForm({
    onCompleted: () => {
      refreshPayments();
    }
  });
}

/**
 * Hiển thị thông tin giao dịch.
 *
 * @param {string} paymentId
 */
function handleViewPayment(paymentId) {
  const payment =
    PaymentService.getPaymentById(paymentId);

  if (!payment) {
    showNotification(
      'Không tìm thấy giao dịch thanh toán',
      'error'
    );
    return;
  }

  const invoice = getInvoiceById(payment.invoiceId);

  window.alert(
    [
      `Mã giao dịch: ${getPaymentCode(payment)}`,
      `Mã hóa đơn: ${getInvoiceCode(invoice)}`,
      `Số tiền: ${formatCurrency(payment.amount)}`,
      `Phương thức: ${getPaymentMethodLabel(
        payment.method ?? payment.paymentMethod
      )}`,
      `Ngày thanh toán: ${formatDateTime(
        payment.paymentDate ?? payment.createdAt
      )}`,
      `Nội dung: ${payment.content ?? '—'}`,
      `Ghi chú: ${payment.note ?? '—'}`
    ].join('\n')
  );
}

/**
 * Xóa giao dịch nhập sai.
 *
 * @param {string} paymentId
 */
async function handleDeletePayment(paymentId) {
  try {
    const payment =
      PaymentService.getPaymentById(paymentId);

    if (!payment) {
      throw new Error(
        'Không tìm thấy giao dịch thanh toán'
      );
    }

    const confirmed = await requestConfirmation(
      `Xóa giao dịch ${getPaymentCode(payment)}? Hóa đơn liên quan sẽ được tính lại.`
    );

    if (!confirmed) {
      return;
    }

    PaymentService.deletePayment(paymentId);

    showNotification(
      'Đã xóa giao dịch và cập nhật lại hóa đơn'
    );

    refreshPayments();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Xóa các bộ lọc.
 */
function clearFilters() {
  state.keyword = '';
  state.roomId = '';
  state.method = '';
  state.dateFrom = getFirstDayOfCurrentMonth();
  state.dateTo = getToday();

  const keywordInput = pageContainer.querySelector(
    '[data-testid="payment-search"]'
  );

  const roomInput = pageContainer.querySelector(
    '[data-testid="payment-filter-room"]'
  );

  const methodInput = pageContainer.querySelector(
    '[data-testid="payment-filter-method"]'
  );

  const dateFromInput = pageContainer.querySelector(
    '[data-testid="payment-filter-date-from"]'
  );

  const dateToInput = pageContainer.querySelector(
    '[data-testid="payment-filter-date-to"]'
  );

  if (keywordInput) keywordInput.value = '';
  if (roomInput) roomInput.value = '';
  if (methodInput) methodInput.value = '';
  if (dateFromInput) dateFromInput.value = state.dateFrom;
  if (dateToInput) dateToInput.value = state.dateTo;

  refreshPayments();
}

/**
 * Gắn sự kiện cho trang.
 */
function bindPageEvents() {
  pageContainer
    .querySelector('[data-testid="payment-search"]')
    ?.addEventListener('input', (event) => {
      state.keyword = event.target.value;
      renderPaymentTable();
    });

  pageContainer
    .querySelector('[data-testid="payment-filter-room"]')
    ?.addEventListener('change', (event) => {
      state.roomId = event.target.value;
      refreshPayments();
    });

  pageContainer
    .querySelector('[data-testid="payment-filter-method"]')
    ?.addEventListener('change', (event) => {
      state.method = event.target.value;
      refreshPayments();
    });

  pageContainer
    .querySelector('[data-testid="payment-filter-date-from"]')
    ?.addEventListener('change', (event) => {
      state.dateFrom = event.target.value;
      refreshPayments();
    });

  pageContainer
    .querySelector('[data-testid="payment-filter-date-to"]')
    ?.addEventListener('change', (event) => {
      state.dateTo = event.target.value;
      refreshPayments();
    });

  pageContainer
    .querySelector('[data-testid="payment-create-button"]')
    ?.addEventListener('click', handleOpenPaymentForm);

  pageContainer.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-action]');

    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.action;
    const paymentId = actionElement.dataset.id;

    if (action === 'view' && paymentId) {
      handleViewPayment(paymentId);
      return;
    }

    if (action === 'delete' && paymentId) {
      handleDeletePayment(paymentId);
      return;
    }

    if (action === 'clear-filters') {
      clearFilters();
    }
  });
}

/**
 * Render trang quản lý thanh toán.
 *
 * @param {HTMLElement} container
 */
function renderPaymentsPage(container) {
  pageContainer = container;

  pageContainer.innerHTML = `
    <section
      class="payments-page"
      data-testid="payments-page"
    >
      <header class="payment-page-header">
        <div>
          <div class="payment-breadcrumb">
            Trang chủ
            <span aria-hidden="true">›</span>
            Thanh toán
            <span aria-hidden="true">›</span>
            <strong>Quản lý thanh toán</strong>
          </div>

          <h1>Quản lý thanh toán</h1>

          <p>
            Theo dõi và quản lý các giao dịch thanh toán.
          </p>
        </div>
      </header>

      <div
        class="payment-summary-grid"
        data-testid="payment-summary"
      ></div>

      <section class="payment-toolbar-card">
        <div class="payment-filters">
          <div class="payment-field payment-search-field">
            <label for="payment-search">
              Tìm hóa đơn hoặc giao dịch
            </label>

            <input
              id="payment-search"
              type="search"
              placeholder="Nhập mã hóa đơn, mã giao dịch, người thuê..."
              value="${escapeHtml(state.keyword)}"
              data-testid="payment-search"
            />
          </div>

          <div class="payment-field">
            <label for="payment-filter-room">
              Chọn phòng
            </label>

            <select
              id="payment-filter-room"
              data-testid="payment-filter-room"
            ></select>
          </div>

          <div class="payment-field">
            <label for="payment-filter-method">
              Phương thức
            </label>

            <select
              id="payment-filter-method"
              data-testid="payment-filter-method"
            >
              <option value="">Tất cả phương thức</option>
              <option value="cash">Tiền mặt</option>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="momo">MoMo</option>
              <option value="zalopay">ZaloPay</option>
            </select>
          </div>

          <div class="payment-date-range">
            <div class="payment-field">
              <label for="payment-filter-date-from">
                Từ ngày
              </label>

              <input
                id="payment-filter-date-from"
                type="date"
                value="${escapeHtml(state.dateFrom)}"
                data-testid="payment-filter-date-from"
              />
            </div>

            <div class="payment-field">
              <label for="payment-filter-date-to">
                Đến ngày
              </label>

              <input
                id="payment-filter-date-to"
                type="date"
                value="${escapeHtml(state.dateTo)}"
                data-testid="payment-filter-date-to"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-primary payment-create-button"
          data-testid="payment-create-button"
        >
          + Ghi nhận thanh toán
        </button>
      </section>

      <section
        class="payment-list-card"
        data-testid="payment-table-wrapper"
      ></section>

      <section
        class="payment-chart-section"
        data-testid="payment-method-chart"
      ></section>
    </section>
  `;

  renderRoomOptions();

  const methodFilter = pageContainer.querySelector(
    '[data-testid="payment-filter-method"]'
  );

  if (methodFilter) {
    methodFilter.value = state.method;
  }

  renderSummaryCards();
  renderPaymentTable();
  renderPaymentMethodChart();
  bindPageEvents();
}

export const render = renderPaymentsPage;
