import * as InvoiceService from '../services/invoice-service.js';
import * as RoomService from '../services/room-service.js';
import * as ToastModule from '../components/toast.js';
import { openInvoiceForm } from '../components/invoice-form.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';
import '../styles/invoices.css';

const state = {
  month: getCurrentMonth(),
  roomId: '',
  status: '',
  keyword: ''
};

let pageContainer = null;

/**
 * Lấy tháng hiện tại theo định dạng YYYY-MM.
 * @returns {string}
 */
function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

/**
 * Escape nội dung trước khi đưa vào HTML.
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
 * Định dạng tiền VND.
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
 * Định dạng tháng YYYY-MM thành MM/YYYY.
 * @param {string} month
 * @returns {string}
 */
function formatMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month ?? '')) {
    return month || '—';
  }

  const [year, monthNumber] = month.split('-');
  return `${monthNumber}/${year}`;
}

/**
 * Định dạng ngày ISO hoặc YYYY-MM-DD.
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
 * Hiển thị toast tương thích với các phiên bản Toast hiện có.
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
 * @returns {Array}
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
 * @param {string} roomId
 * @returns {Object|null}
 */
function findRoom(roomId) {
  const rooms = getRooms();
  return rooms.find((room) => room.id === roomId) ?? null;
}

/**
 * Lấy nhãn phòng cho hóa đơn.
 * @param {Object} invoice
 * @returns {string}
 */
function getRoomLabel(invoice) {
  if (invoice.roomCode) {
    return invoice.roomCode;
  }

  const room = findRoom(invoice.roomId);

  return (
    room?.roomCode ??
    room?.code ??
    room?.name ??
    invoice.roomId ??
    '—'
  );
}

/**
 * Lấy mã hóa đơn dễ đọc.
 * @param {Object} invoice
 * @returns {string}
 */
function getInvoiceCode(invoice) {
  return invoice.invoiceCode ?? invoice.id ?? '—';
}

/**
 * Tính số tiền còn nợ để hiển thị.
 * Tổng hóa đơn đã được InvoiceService tính.
 * @param {Object} invoice
 * @returns {number}
 */
function getRemainingDebt(invoice) {
  const total = Number(invoice.total) || 0;
  const paidAmount = Number(invoice.paidAmount) || 0;

  return Math.max(total - paidAmount, 0);
}

/**
 * Chuẩn hóa trạng thái để hiển thị.
 * @param {string} status
 * @returns {string}
 */
function normalizeStatus(status) {
  if (status === 'canceled') {
    return 'cancelled';
  }

  return status || 'draft';
}

/**
 * Lấy nhãn trạng thái tiếng Việt.
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
    cancelled: 'Đã hủy'
  };

  return labels[normalizeStatus(status)] ?? status ?? 'Không xác định';
}

/**
 * Render badge trạng thái.
 * @param {string} status
 * @returns {string}
 */
function renderStatusBadge(status) {
  const normalizedStatus = normalizeStatus(status);

  return `
    <span
      class="invoice-status-badge invoice-status-${escapeHtml(normalizedStatus)}"
      data-testid="invoice-status-${escapeHtml(normalizedStatus)}"
    >
      ${escapeHtml(getStatusLabel(normalizedStatus))}
    </span>
  `;
}

/**
 * Lấy danh sách hóa đơn theo bộ lọc.
 * @returns {Array}
 */
function getFilteredInvoices() {
  let invoices = InvoiceService.filterInvoices({
    month: state.month,
    roomId: state.roomId,
    status: state.status
  });

  const keyword = state.keyword.trim().toLowerCase();

  if (keyword) {
    invoices = invoices.filter((invoice) => {
      const invoiceCode = getInvoiceCode(invoice).toLowerCase();
      const roomLabel = getRoomLabel(invoice).toLowerCase();

      return (
        invoiceCode.includes(keyword) ||
        roomLabel.includes(keyword)
      );
    });
  }

  return [...invoices].sort((first, second) => {
    const firstDate =
      first.createdAt ?? `${first.month ?? ''}-01`;
    const secondDate =
      second.createdAt ?? `${second.month ?? ''}-01`;

    return secondDate.localeCompare(firstDate);
  });
}

/**
 * Tạo dữ liệu thống kê hóa đơn.
 * @param {Array} invoices
 * @returns {Object}
 */
function buildInvoiceSummary(invoices) {
  return invoices.reduce(
    (summary, invoice) => {
      const status = normalizeStatus(invoice.status);
      const total = Number(invoice.total) || 0;

      summary.totalAmount += total;
      summary.totalCount += 1;

      if (status === 'paid') {
        summary.paidAmount += total;
        summary.paidCount += 1;
      }

      if (status === 'unpaid') {
        summary.unpaidAmount += total;
        summary.unpaidCount += 1;
      }

      if (status === 'partial') {
        summary.partialAmount += total;
        summary.partialCount += 1;
      }

      if (status === 'overdue') {
        summary.overdueAmount += total;
        summary.overdueCount += 1;
      }

      return summary;
    },
    {
      totalAmount: 0,
      totalCount: 0,
      paidAmount: 0,
      paidCount: 0,
      unpaidAmount: 0,
      unpaidCount: 0,
      partialAmount: 0,
      partialCount: 0,
      overdueAmount: 0,
      overdueCount: 0
    }
  );
}

/**
 * Render các thẻ thống kê.
 */
function renderSummaryCards() {
  const summaryContainer = pageContainer.querySelector(
    '[data-testid="invoice-summary"]'
  );

  if (!summaryContainer) {
    return;
  }

  const invoices = InvoiceService.filterInvoices({
    month: state.month
  });

  const summary = buildInvoiceSummary(invoices);

  summaryContainer.innerHTML = `
    ${createSummaryCard({
      modifier: 'primary',
      icon: '▣',
      label: 'Tổng hóa đơn tháng',
      amount: summary.totalAmount,
      count: summary.totalCount,
      suffix: 'hóa đơn'
    })}

    ${createSummaryCard({
      modifier: 'success',
      icon: '✓',
      label: 'Đã thanh toán',
      amount: summary.paidAmount,
      count: summary.paidCount,
      suffix: 'hóa đơn'
    })}

    ${createSummaryCard({
      modifier: 'warning',
      icon: '!',
      label: 'Chưa thanh toán',
      amount: summary.unpaidAmount,
      count: summary.unpaidCount,
      suffix: 'hóa đơn'
    })}

    ${createSummaryCard({
      modifier: 'purple',
      icon: '◐',
      label: 'Thanh toán một phần',
      amount: summary.partialAmount,
      count: summary.partialCount,
      suffix: 'hóa đơn'
    })}

    ${createSummaryCard({
      modifier: 'danger',
      icon: '⚠',
      label: 'Quá hạn',
      amount: summary.overdueAmount,
      count: summary.overdueCount,
      suffix: 'hóa đơn'
    })}
  `;
}

/**
 * Tạo HTML cho một thẻ thống kê.
 * @param {Object} options
 * @returns {string}
 */
function createSummaryCard({
  modifier,
  icon,
  label,
  amount,
  count,
  suffix
}) {
  return `
    <article class="invoice-summary-card invoice-summary-${modifier}">
      <div class="invoice-summary-icon" aria-hidden="true">
        ${escapeHtml(icon)}
      </div>

      <div>
        <div class="invoice-summary-label">
          ${escapeHtml(label)}
        </div>

        <strong class="invoice-summary-value">
          ${formatCurrency(amount)}
        </strong>

        <div class="invoice-summary-count">
          ${count} ${escapeHtml(suffix)}
        </div>
      </div>
    </article>
  `;
}

/**
 * Render options phòng.
 */
function renderRoomFilterOptions() {
  const roomFilter = pageContainer.querySelector(
    '[data-testid="invoice-filter-room"]'
  );

  if (!roomFilter) {
    return;
  }

  const rooms = getRooms();

  roomFilter.innerHTML = `
    <option value="">Tất cả phòng</option>

    ${rooms
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

  roomFilter.value = state.roomId;
}

/**
 * Render bảng hóa đơn.
 */
function renderInvoiceTable() {
  const tableWrapper = pageContainer.querySelector(
    '[data-testid="invoice-table-wrapper"]'
  );

  if (!tableWrapper) {
    return;
  }

  const invoices = getFilteredInvoices();

  if (invoices.length === 0) {
    tableWrapper.innerHTML = `
      <div
        class="invoice-empty-state"
        data-testid="invoice-empty-state"
      >
        <div class="invoice-empty-icon" aria-hidden="true">
          ▤
        </div>

        <h3>Không có hóa đơn</h3>

        <p>
          Không tìm thấy hóa đơn phù hợp với bộ lọc hiện tại.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          data-action="clear-filters"
          data-testid="invoice-clear-empty-filters"
        >
          Xóa bộ lọc
        </button>
      </div>
    `;

    return;
  }

  tableWrapper.innerHTML = `
    <div class="invoice-table-scroll">
      <table
        class="invoice-table"
        data-testid="invoice-table"
      >
        <thead>
          <tr>
            <th>Mã hóa đơn</th>
            <th>Phòng</th>
            <th>Tháng</th>
            <th class="invoice-text-end">Tổng tiền</th>
            <th class="invoice-text-end">Đã trả</th>
            <th class="invoice-text-end">Còn nợ</th>
            <th>Hạn thanh toán</th>
            <th>Trạng thái</th>
            <th class="invoice-actions-column">Thao tác</th>
          </tr>
        </thead>

        <tbody>
          ${invoices
            .map((invoice) => renderInvoiceRow(invoice))
            .join('')}
        </tbody>
      </table>
    </div>

    <footer class="invoice-table-footer">
      Hiển thị ${invoices.length} hóa đơn
    </footer>
  `;
}

/**
 * Render một dòng hóa đơn.
 * @param {Object} invoice
 * @returns {string}
 */
function renderInvoiceRow(invoice) {
  const status = normalizeStatus(invoice.status);
  const remainingDebt = getRemainingDebt(invoice);
  const isDraft = status === 'draft';
  const isCanceled = status === 'cancelled';
  const canCancel =
    !isDraft &&
    !isCanceled &&
    status !== 'paid';

  return `
    <tr
      class="${status === 'overdue' ? 'invoice-row-overdue' : ''}"
      data-testid="invoice-row"
      data-invoice-id="${escapeHtml(invoice.id)}"
    >
      <td>
        <button
          type="button"
          class="invoice-code-button"
          data-action="view"
          data-id="${escapeHtml(invoice.id)}"
          data-testid="invoice-code-${escapeHtml(invoice.id)}"
        >
          ${escapeHtml(getInvoiceCode(invoice))}
        </button>
      </td>

      <td>
        <strong>${escapeHtml(getRoomLabel(invoice))}</strong>
      </td>

      <td>${escapeHtml(formatMonth(invoice.month))}</td>

      <td class="invoice-text-end">
        ${formatCurrency(invoice.total)}
      </td>

      <td
        class="invoice-text-end ${
          Number(invoice.paidAmount) > 0
            ? 'invoice-amount-paid'
            : ''
        }"
      >
        ${formatCurrency(invoice.paidAmount)}
      </td>

      <td
        class="invoice-text-end ${
          remainingDebt > 0
            ? 'invoice-amount-debt'
            : ''
        }"
      >
        ${formatCurrency(remainingDebt)}
      </td>

      <td>${escapeHtml(formatDate(invoice.dueDate))}</td>

      <td>${renderStatusBadge(status)}</td>

      <td>
        <div class="invoice-row-actions">
          <button
            type="button"
            class="invoice-icon-button"
            data-action="view"
            data-id="${escapeHtml(invoice.id)}"
            data-testid="invoice-view-${escapeHtml(invoice.id)}"
            aria-label="Xem chi tiết hóa đơn"
            title="Xem chi tiết"
          >
            ◉
          </button>

          ${
            isDraft
              ? `
                <button
                  type="button"
                  class="invoice-icon-button"
                  data-action="edit"
                  data-id="${escapeHtml(invoice.id)}"
                  data-testid="invoice-edit-${escapeHtml(invoice.id)}"
                  aria-label="Sửa hóa đơn bản nháp"
                  title="Sửa bản nháp"
                >
                  ✎
                </button>

                <button
                  type="button"
                  class="invoice-icon-button invoice-icon-success"
                  data-action="finalize"
                  data-id="${escapeHtml(invoice.id)}"
                  data-testid="invoice-finalize-${escapeHtml(invoice.id)}"
                  aria-label="Chốt hóa đơn"
                  title="Chốt hóa đơn"
                >
                  ✓
                </button>

                <button
                  type="button"
                  class="invoice-icon-button invoice-icon-danger"
                  data-action="delete"
                  data-id="${escapeHtml(invoice.id)}"
                  data-testid="invoice-delete-${escapeHtml(invoice.id)}"
                  aria-label="Xóa hóa đơn bản nháp"
                  title="Xóa bản nháp"
                >
                  🗑
                </button>
              `
              : ''
          }

          ${
            canCancel
              ? `
                <button
                  type="button"
                  class="invoice-icon-button invoice-icon-danger"
                  data-action="cancel"
                  data-id="${escapeHtml(invoice.id)}"
                  data-testid="invoice-cancel-${escapeHtml(invoice.id)}"
                  aria-label="Hủy hóa đơn"
                  title="Hủy hóa đơn"
                >
                  ⊘
                </button>
              `
              : ''
          }
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render lại dữ liệu thay đổi.
 */
function refreshInvoices() {
  renderSummaryCards();
  renderInvoiceTable();
}

/**
 * Mở form tạo hoặc sửa hóa đơn.
 * @param {string|null} invoiceId
 */
function handleOpenInvoiceForm(invoiceId = null) {
  openInvoiceForm({
    invoiceId,
    defaultMonth: state.month,
    onChanged: () => {
      refreshInvoices();
    },
    onCompleted: () => {
      refreshInvoices();
    }
  });
}

/**
 * Mở chi tiết hóa đơn.
 * @param {string} invoiceId
 */
function handleOpenInvoiceDetail(invoiceId) {
  openInvoiceDetail({
    invoiceId,
    onClose: () => {},
    onEdit: (id) => {
      handleOpenInvoiceForm(id);
    },
    onChanged: () => {
      refreshInvoices();
    }
  });
}

/**
 * Chốt hóa đơn.
 * @param {string} invoiceId
 */
async function handleFinalizeInvoice(invoiceId) {
  try {
    const invoice = InvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    if (!invoice.dueDate) {
      throw new Error(
        'Vui lòng nhập hạn thanh toán trước khi chốt hóa đơn'
      );
    }

    const confirmed = await requestConfirmation(
      `Chốt hóa đơn ${getInvoiceCode(invoice)}?`
    );

    if (!confirmed) {
      return;
    }

    InvoiceService.finalizeInvoice(invoiceId);

    showNotification('Chốt hóa đơn thành công');
    refreshInvoices();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Hủy hóa đơn.
 * @param {string} invoiceId
 */
async function handleCancelInvoice(invoiceId) {
  try {
    const invoice = InvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    const confirmed = await requestConfirmation(
      `Bạn có chắc muốn hủy hóa đơn ${getInvoiceCode(invoice)}?`
    );

    if (!confirmed) {
      return;
    }

    InvoiceService.cancelInvoice(invoiceId);

    showNotification('Đã hủy hóa đơn');
    refreshInvoices();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Xóa hóa đơn nháp.
 * @param {string} invoiceId
 */
async function handleDeleteDraftInvoice(invoiceId) {
  try {
    const invoice = InvoiceService.getInvoiceById(invoiceId);

    if (!invoice) {
      throw new Error('Không tìm thấy hóa đơn');
    }

    const confirmed = await requestConfirmation(
      `Xóa vĩnh viễn bản nháp ${getInvoiceCode(invoice)}?`
    );

    if (!confirmed) {
      return;
    }

    InvoiceService.deleteDraftInvoice(invoiceId);

    showNotification('Xóa hóa đơn bản nháp thành công');
    refreshInvoices();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Tạo hóa đơn hàng loạt.
 */
async function handleGenerateBatch() {
  if (!state.month) {
    showNotification('Vui lòng chọn tháng lập hóa đơn', 'warning');
    return;
  }

  const confirmed = await requestConfirmation(
    `Tạo hóa đơn hàng loạt cho tháng ${formatMonth(state.month)}?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const results =
      InvoiceService.generateInvoicesForMonth(state.month);

    const successCount = results.filter(
      (result) => result.success
    ).length;

    const failedResults = results.filter(
      (result) => !result.success
    );

    if (successCount > 0) {
      showNotification(
        `Đã tạo ${successCount} hóa đơn thành công`
      );
    }

    if (failedResults.length > 0) {
      const firstError =
        failedResults[0]?.error ??
        'Một số phòng không thể tạo hóa đơn';

      showNotification(
        `${failedResults.length} phòng bị bỏ qua: ${firstError}`,
        'warning'
      );
    }

    refreshInvoices();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

/**
 * Xóa bộ lọc.
 */
function clearFilters() {
  state.month = getCurrentMonth();
  state.roomId = '';
  state.status = '';
  state.keyword = '';

  const monthInput = pageContainer.querySelector(
    '[data-testid="invoice-filter-month"]'
  );
  const roomInput = pageContainer.querySelector(
    '[data-testid="invoice-filter-room"]'
  );
  const statusInput = pageContainer.querySelector(
    '[data-testid="invoice-filter-status"]'
  );
  const keywordInput = pageContainer.querySelector(
    '[data-testid="invoice-search"]'
  );

  if (monthInput) monthInput.value = state.month;
  if (roomInput) roomInput.value = '';
  if (statusInput) statusInput.value = '';
  if (keywordInput) keywordInput.value = '';

  refreshInvoices();
}

/**
 * Gắn sự kiện cho trang.
 */
function bindPageEvents() {
  pageContainer
    .querySelector('[data-testid="invoice-filter-month"]')
    ?.addEventListener('change', (event) => {
      state.month = event.target.value;
      refreshInvoices();
    });

  pageContainer
    .querySelector('[data-testid="invoice-filter-room"]')
    ?.addEventListener('change', (event) => {
      state.roomId = event.target.value;
      renderInvoiceTable();
    });

  pageContainer
    .querySelector('[data-testid="invoice-filter-status"]')
    ?.addEventListener('change', (event) => {
      state.status = event.target.value;
      renderInvoiceTable();
    });

  pageContainer
    .querySelector('[data-testid="invoice-search"]')
    ?.addEventListener('input', (event) => {
      state.keyword = event.target.value;
      renderInvoiceTable();
    });

  pageContainer
    .querySelector('[data-testid="invoice-create-button"]')
    ?.addEventListener('click', () => {
      handleOpenInvoiceForm();
    });

  pageContainer
    .querySelector('[data-testid="invoice-batch-button"]')
    ?.addEventListener('click', () => {
      handleGenerateBatch();
    });

  pageContainer.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-action]');

    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.action;
    const invoiceId = actionElement.dataset.id;

    if (action === 'view' && invoiceId) {
      handleOpenInvoiceDetail(invoiceId);
      return;
    }

    if (action === 'edit' && invoiceId) {
      handleOpenInvoiceForm(invoiceId);
      return;
    }

    if (action === 'finalize' && invoiceId) {
      handleFinalizeInvoice(invoiceId);
      return;
    }

    if (action === 'cancel' && invoiceId) {
      handleCancelInvoice(invoiceId);
      return;
    }

    if (action === 'delete' && invoiceId) {
      handleDeleteDraftInvoice(invoiceId);
      return;
    }

    if (action === 'clear-filters') {
      clearFilters();
    }
  });
}

/**
 * Render trang quản lý hóa đơn.
 * @param {HTMLElement} container
 */
function renderInvoicesPage(container) {
  pageContainer = container;

  pageContainer.innerHTML = `
    <section
      class="invoices-page"
      data-testid="invoices-page"
    >
      <header class="invoice-page-header">
        <div>
          <div class="invoice-breadcrumb">
            Trang chủ
            <span aria-hidden="true">›</span>
            Hóa đơn
            <span aria-hidden="true">›</span>
            <strong>Quản lý hóa đơn</strong>
          </div>

          <h1>Quản lý hóa đơn</h1>

          <p>
            Theo dõi và quản lý tất cả hóa đơn trong hệ thống.
          </p>
        </div>
      </header>

      <div
        class="invoice-summary-grid"
        data-testid="invoice-summary"
      ></div>

      <section class="invoice-toolbar-card">
        <div class="invoice-filters">
          <div class="invoice-field invoice-field-month">
            <label for="invoice-filter-month">
              Tháng
            </label>

            <input
              id="invoice-filter-month"
              type="month"
              value="${escapeHtml(state.month)}"
              data-testid="invoice-filter-month"
            />
          </div>

          <div class="invoice-field invoice-field-search">
            <label for="invoice-search">
              Tìm kiếm
            </label>

            <input
              id="invoice-search"
              type="search"
              placeholder="Tìm theo mã hóa đơn hoặc phòng..."
              value="${escapeHtml(state.keyword)}"
              data-testid="invoice-search"
            />
          </div>

          <div class="invoice-field">
            <label for="invoice-filter-room">
              Phòng
            </label>

            <select
              id="invoice-filter-room"
              data-testid="invoice-filter-room"
            ></select>
          </div>

          <div class="invoice-field">
            <label for="invoice-filter-status">
              Trạng thái
            </label>

            <select
              id="invoice-filter-status"
              data-testid="invoice-filter-status"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="draft">Bản nháp</option>
              <option value="unpaid">Chưa thanh toán</option>
              <option value="partial">Thanh toán một phần</option>
              <option value="paid">Đã thanh toán</option>
              <option value="overdue">Quá hạn</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>

        <div class="invoice-toolbar-actions">
          <button
            type="button"
            class="btn btn-outline-primary"
            data-testid="invoice-create-button"
          >
            + Tạo hóa đơn
          </button>

          <button
            type="button"
            class="btn btn-primary"
            data-testid="invoice-batch-button"
          >
            ⚡ Tạo hóa đơn hàng loạt
          </button>
        </div>
      </section>

      <section
        class="invoice-list-card"
        data-testid="invoice-table-wrapper"
      ></section>

      <div class="invoice-information-note">
        <span aria-hidden="true">●</span>

        <span>
          Hóa đơn sau khi chốt sẽ không tự thay đổi khi cập
          nhật đơn giá dịch vụ. Vui lòng kiểm tra kỹ trước khi
          chốt hóa đơn.
        </span>
      </div>
    </section>
  `;

  renderRoomFilterOptions();

  const statusFilter = pageContainer.querySelector(
    '[data-testid="invoice-filter-status"]'
  );

  if (statusFilter) {
    statusFilter.value = state.status;
  }

  renderSummaryCards();
  renderInvoiceTable();
  bindPageEvents();
}

export const render = renderInvoicesPage;
