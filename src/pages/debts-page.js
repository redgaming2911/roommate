import * as DebtService from '../services/debt-service.js';
import * as InvoiceService from '../services/invoice-service.js';
import * as PaymentService from '../services/payment-service.js';
import * as RoomService from '../services/room-service.js';
import { TenantService } from '../services/tenant-service.js';
import * as ToastModule from '../components/toast.js';
import { openInvoiceDetail } from '../components/invoice-detail.js';
import { openPaymentForm } from '../components/payment-form.js';
import '../styles/debts.css';

const state = {
  keyword: '',
  roomId: '',
  month: '',
  minimumDebt: '',
  maximumDebt: '',
  overdueOnly: false,
  sort: 'debt-desc'
};

let pageContainer = null;

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
 * Định dạng ngày.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
function formatDate(value) {
  if (!value) {
    return '—';
  }

  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split('-');

  if (!year || !month || !day) {
    return String(value);
  }

  return `${day}/${month}/${year}`;
}

/**
 * Định dạng tháng.
 *
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
 * Lấy nhãn phòng.
 *
 * @param {string} roomId
 * @returns {string}
 */
function getRoomLabel(roomId) {
  const room = getRoomById(roomId);

  return (
    room?.roomCode ??
    room?.code ??
    room?.name ??
    roomId ??
    '—'
  );
}

/**
 * Lấy tên phòng đầy đủ.
 *
 * @param {string} roomId
 * @returns {string}
 */
function getRoomFullLabel(roomId) {
  const room = getRoomById(roomId);
  const code = getRoomLabel(roomId);
  const name = room?.name ?? '';

  return name && name !== code
    ? `${code} - ${name}`
    : code;
}

/**
 * Lấy người thuê hiện tại của phòng.
 *
 * @param {string} roomId
 * @returns {Object|null}
 */
function getCurrentTenantByRoom(roomId) {
  if (
    typeof TenantService.getTenants !== 'function' ||
    typeof TenantService.getCurrentRoomOfTenant !== 'function'
  ) {
    return null;
  }

  try {
    return (
      TenantService.getTenants().find((tenant) => {
        const room =
          TenantService.getCurrentRoomOfTenant(tenant.id);

        return room?.id === roomId;
      }) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Lấy tên người thuê.
 *
 * @param {string} roomId
 * @returns {string}
 */
function getTenantName(roomId) {
  const tenant = getCurrentTenantByRoom(roomId);

  return (
    tenant?.name ??
    tenant?.fullName ??
    'Chưa xác định'
  );
}

/**
 * Lấy các hóa đơn còn nợ của một phòng.
 *
 * @param {string} roomId
 * @returns {Array<Object>}
 */
function getOutstandingInvoicesByRoom(roomId) {
  return DebtService.getOutstandingInvoices().filter(
    (invoice) => invoice.roomId === roomId
  );
}

/**
 * Lấy lịch sử thanh toán của phòng.
 *
 * @param {string} roomId
 * @returns {Array<Object>}
 */
function getPaymentHistoryByRoom(roomId) {
  const invoiceIds = new Set(
    InvoiceService.getInvoices()
      .filter((invoice) => invoice.roomId === roomId)
      .map((invoice) => invoice.id)
  );

  return PaymentService.getPayments()
    .filter((payment) =>
      invoiceIds.has(payment.invoiceId)
    )
    .sort((first, second) => {
      const firstDate =
        first.paymentDate ?? first.createdAt ?? '';

      const secondDate =
        second.paymentDate ?? second.createdAt ?? '';

      return secondDate.localeCompare(firstDate);
    });
}

/**
 * Tạo dữ liệu dòng công nợ theo phòng.
 *
 * @returns {Array<Object>}
 */
function getDebtRows() {
  let rows = DebtService.getDebtByRoom().map((debt) => {
    const invoices = getOutstandingInvoicesByRoom(
      debt.roomId
    );

    const latestDueDate = invoices.reduce(
      (latest, invoice) => {
        if (!invoice.dueDate) {
          return latest;
        }

        return !latest || invoice.dueDate > latest
          ? invoice.dueDate
          : latest;
      },
      null
    );

    return {
      ...debt,
      roomLabel: getRoomLabel(debt.roomId),
      roomFullLabel: getRoomFullLabel(debt.roomId),
      tenantName: getTenantName(debt.roomId),
      invoices,
      latestDueDate,
      months: Array.from(
        new Set(invoices.map((invoice) => invoice.month))
      )
    };
  });

  const keyword = state.keyword.trim().toLowerCase();

  if (keyword) {
    rows = rows.filter((row) =>
      [
        row.roomLabel,
        row.roomFullLabel,
        row.tenantName
      ].some((value) =>
        String(value ?? '')
          .toLowerCase()
          .includes(keyword)
      )
    );
  }

  if (state.roomId) {
    rows = rows.filter(
      (row) => row.roomId === state.roomId
    );
  }

  if (state.month) {
    rows = rows
      .map((row) => {
        const filteredInvoices = row.invoices.filter(
          (invoice) => invoice.month === state.month
        );

        if (filteredInvoices.length === 0) {
          return null;
        }

        const invoiceTotal = filteredInvoices.reduce(
          (total, invoice) =>
            total + Number(invoice.total ?? 0),
          0
        );

        const paidAmount = filteredInvoices.reduce(
          (total, invoice) =>
            total + Number(invoice.paidAmount ?? 0),
          0
        );

        const remainingDebt = filteredInvoices.reduce(
          (total, invoice) =>
            total + Number(invoice.remainingDebt ?? 0),
          0
        );

        const maximumDaysOverdue = filteredInvoices.reduce(
          (maximum, invoice) =>
            Math.max(
              maximum,
              DebtService.calculateDaysOverdue(
                invoice.dueDate,
                new Date(),
                invoice
              )
            ),
          0
        );

        return {
          ...row,
          invoices: filteredInvoices,
          invoiceCount: filteredInvoices.length,
          invoiceTotal,
          paidAmount,
          remainingDebt,
          maximumDaysOverdue,
          overdueInvoiceCount: filteredInvoices.filter(
            (invoice) =>
              DebtService.calculateDaysOverdue(
                invoice.dueDate,
                new Date(),
                invoice
              ) > 0
          ).length
        };
      })
      .filter(Boolean);
  }

  const minimumDebt =
    state.minimumDebt === ''
      ? null
      : Number(state.minimumDebt);

  const maximumDebt =
    state.maximumDebt === ''
      ? null
      : Number(state.maximumDebt);

  if (
    minimumDebt !== null &&
    Number.isFinite(minimumDebt)
  ) {
    rows = rows.filter(
      (row) => row.remainingDebt >= minimumDebt
    );
  }

  if (
    maximumDebt !== null &&
    Number.isFinite(maximumDebt)
  ) {
    rows = rows.filter(
      (row) => row.remainingDebt <= maximumDebt
    );
  }

  if (state.overdueOnly) {
    rows = rows.filter(
      (row) => row.maximumDaysOverdue > 0
    );
  }

  rows.sort((first, second) => {
    if (state.sort === 'debt-asc') {
      return first.remainingDebt - second.remainingDebt;
    }

    if (state.sort === 'days-desc') {
      return (
        second.maximumDaysOverdue -
        first.maximumDaysOverdue
      );
    }

    if (state.sort === 'room-asc') {
      return first.roomLabel.localeCompare(
        second.roomLabel,
        'vi'
      );
    }

    return second.remainingDebt - first.remainingDebt;
  });

  return rows;
}

/**
 * Xác định mức cảnh báo.
 *
 * @param {number} daysOverdue
 * @returns {{className: string, label: string}}
 */
function getWarningLevel(daysOverdue) {
  if (daysOverdue > 7) {
    return {
      className: 'critical',
      label: 'Quá hạn > 7 ngày'
    };
  }

  if (daysOverdue > 0) {
    return {
      className: 'overdue',
      label: 'Quá hạn ≤ 7 ngày'
    };
  }

  return {
    className: 'upcoming',
    label: 'Sắp đến hạn'
  };
}

/**
 * Render card thống kê.
 */
function renderSummaryCards() {
  const container = pageContainer.querySelector(
    '[data-testid="debt-summary"]'
  );

  if (!container) {
    return;
  }

  const outstandingInvoices =
    DebtService.getOutstandingInvoices();

  const overdueInvoices =
    DebtService.getOverdueInvoices(new Date());

  const roomDebts = DebtService.getDebtByRoom();

  const totalDebt = DebtService.getTotalDebt();

  const overdueDebt = overdueInvoices.reduce(
    (total, invoice) =>
      total + Number(invoice.remainingDebt ?? 0),
    0
  );

  container.innerHTML = `
    ${createSummaryCard({
      modifier: 'primary',
      icon: '▣',
      label: 'Tổng công nợ',
      value: formatCurrency(totalDebt),
      note: 'Tổng số tiền còn nợ'
    })}

    ${createSummaryCard({
      modifier: 'danger',
      icon: '◷',
      label: 'Công nợ quá hạn',
      value: formatCurrency(overdueDebt),
      note:
        totalDebt > 0
          ? `${(
              (overdueDebt / totalDebt) *
              100
            ).toFixed(1)}% tổng công nợ`
          : '0% tổng công nợ'
    })}

    ${createSummaryCard({
      modifier: 'success',
      icon: '⌂',
      label: 'Số phòng còn nợ',
      value: `${roomDebts.length}`,
      note: 'Phòng có hóa đơn còn nợ'
    })}

    ${createSummaryCard({
      modifier: 'purple',
      icon: '▤',
      label: 'Hóa đơn quá hạn',
      value: `${overdueInvoices.length}`,
      note: `${outstandingInvoices.length} hóa đơn còn nợ`
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
    <article class="debt-summary-card debt-summary-${modifier}">
      <div class="debt-summary-icon">
        ${escapeHtml(icon)}
      </div>

      <div>
        <div class="debt-summary-label">
          ${escapeHtml(label)}
        </div>

        <strong class="debt-summary-value">
          ${escapeHtml(value)}
        </strong>

        <div class="debt-summary-note">
          ${escapeHtml(note)}
        </div>
      </div>
    </article>
  `;
}

/**
 * Render tổng hợp công nợ theo tháng.
 */
function renderMonthlyDebt() {
  const container = pageContainer.querySelector(
    '[data-testid="debt-by-month"]'
  );

  if (!container) {
    return;
  }

  const monthlyDebt = DebtService.getDebtByMonth();

  if (monthlyDebt.length === 0) {
    container.innerHTML = `
      <div class="debt-month-empty">
        Chưa có công nợ theo tháng.
      </div>
    `;
    return;
  }

  container.innerHTML = monthlyDebt
    .slice(0, 6)
    .map(
      (item) => `
        <article
          class="debt-month-card"
          data-testid="debt-month-card"
        >
          <div>
            <span>Tháng</span>

            <strong>
              ${escapeHtml(formatMonth(item.month))}
            </strong>
          </div>

          <div>
            <span>Còn nợ</span>

            <strong class="debt-month-amount">
              ${formatCurrency(item.remainingDebt)}
            </strong>
          </div>

          <div class="debt-month-meta">
            ${item.invoiceCount} hóa đơn ·
            ${item.roomCount} phòng
          </div>
        </article>
      `
    )
    .join('');
}

/**
 * Render option phòng và tháng.
 */
function renderFilterOptions() {
  const roomSelect = pageContainer.querySelector(
    '[data-testid="debt-filter-room"]'
  );

  const monthSelect = pageContainer.querySelector(
    '[data-testid="debt-filter-month"]'
  );

  if (roomSelect) {
    roomSelect.innerHTML = `
      <option value="">Tất cả phòng</option>

      ${getRooms()
        .map(
          (room) => `
            <option value="${escapeHtml(room.id)}">
              ${escapeHtml(
                room.roomCode ??
                room.code ??
                room.name ??
                room.id
              )}
            </option>
          `
        )
        .join('')}
    `;

    roomSelect.value = state.roomId;
  }

  if (monthSelect) {
    const months = DebtService.getDebtByMonth();

    monthSelect.innerHTML = `
      <option value="">Tất cả tháng</option>

      ${months
        .map(
          (item) => `
            <option value="${escapeHtml(item.month)}">
              ${escapeHtml(formatMonth(item.month))}
            </option>
          `
        )
        .join('')}
    `;

    monthSelect.value = state.month;
  }
}

/**
 * Render bảng công nợ.
 */
function renderDebtTable() {
  const wrapper = pageContainer.querySelector(
    '[data-testid="debt-table-wrapper"]'
  );

  if (!wrapper) {
    return;
  }

  const rows = getDebtRows();

  if (rows.length === 0) {
    wrapper.innerHTML = `
      <div
        class="debt-empty-state"
        data-testid="debt-empty-state"
      >
        <div class="debt-empty-icon">▣</div>

        <h3>Không có công nợ phù hợp</h3>

        <p>
          Không tìm thấy phòng còn nợ theo điều kiện đang chọn.
        </p>

        <button
          type="button"
          class="btn btn-primary"
          data-action="clear-filters"
          data-testid="debt-clear-empty-filters"
        >
          Xóa bộ lọc
        </button>
      </div>
    `;

    return;
  }

  wrapper.innerHTML = `
    <div class="debt-table-heading">
      <h2>Danh sách công nợ</h2>
    </div>

    <div class="debt-table-scroll">
      <table
        class="debt-table"
        data-testid="debt-table"
      >
        <thead>
          <tr>
            <th>Phòng</th>
            <th>Người thuê</th>
            <th class="debt-text-center">Số HĐ còn nợ</th>
            <th class="debt-text-end">Tổng tiền</th>
            <th class="debt-text-end">Đã thanh toán</th>
            <th class="debt-text-end">Còn nợ</th>
            <th>Hạn gần nhất</th>
            <th class="debt-text-center">Số ngày quá hạn</th>
            <th>Mức độ cảnh báo</th>
            <th>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(renderDebtRow).join('')}
        </tbody>
      </table>
    </div>

    <footer class="debt-table-footer">
      Hiển thị ${rows.length} phòng còn nợ
    </footer>
  `;
}

/**
 * Render một dòng công nợ.
 *
 * @param {Object} row
 * @returns {string}
 */
function renderDebtRow(row) {
  const warning = getWarningLevel(
    row.maximumDaysOverdue
  );

  return `
    <tr
      data-testid="debt-row"
      data-room-id="${escapeHtml(row.roomId)}"
    >
      <td>
        <strong class="debt-room-code">
          ${escapeHtml(row.roomLabel)}
        </strong>
      </td>

      <td>${escapeHtml(row.tenantName)}</td>

      <td class="debt-text-center">
        ${row.invoiceCount}
      </td>

      <td class="debt-text-end">
        ${formatCurrency(row.invoiceTotal)}
      </td>

      <td class="debt-text-end">
        ${formatCurrency(row.paidAmount)}
      </td>

      <td class="debt-text-end debt-remaining">
        ${formatCurrency(row.remainingDebt)}
      </td>

      <td>
        ${escapeHtml(formatDate(row.nearestDueDate))}
      </td>

      <td
        class="debt-text-center ${
          row.maximumDaysOverdue > 0
            ? 'debt-days-overdue'
            : ''
        }"
      >
        ${row.maximumDaysOverdue} ngày
      </td>

      <td>
        <span class="debt-warning debt-warning-${warning.className}">
          ${escapeHtml(warning.label)}
        </span>
      </td>

      <td>
        <div class="debt-actions">
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            data-action="record-payment"
            data-room-id="${escapeHtml(row.roomId)}"
            data-testid="debt-record-payment-${escapeHtml(row.roomId)}"
          >
            Ghi nhận TT
          </button>

          <button
            type="button"
            class="debt-icon-button"
            data-action="view-invoices"
            data-room-id="${escapeHtml(row.roomId)}"
            data-testid="debt-view-invoices-${escapeHtml(row.roomId)}"
            title="Xem hóa đơn"
          >
            ◉
          </button>

          <button
            type="button"
            class="debt-icon-button"
            data-action="view-history"
            data-room-id="${escapeHtml(row.roomId)}"
            data-testid="debt-view-history-${escapeHtml(row.roomId)}"
            title="Xem lịch sử thanh toán"
          >
            ⋮
          </button>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Mở hóa đơn còn nợ đầu tiên của phòng.
 *
 * @param {string} roomId
 */
function openRoomInvoice(roomId) {
  const invoices = getOutstandingInvoicesByRoom(roomId);

  if (invoices.length === 0) {
    showNotification(
      'Phòng không còn hóa đơn công nợ',
      'warning'
    );
    return;
  }

  const invoice = [...invoices].sort(
    (first, second) =>
      String(first.dueDate ?? '').localeCompare(
        String(second.dueDate ?? '')
      )
  )[0];

  openInvoiceDetail({
    invoiceId: invoice.id
  });
}

/**
 * Mở form thanh toán cho hóa đơn ưu tiên của phòng.
 *
 * @param {string} roomId
 */
function openRoomPayment(roomId) {
  const invoices = getOutstandingInvoicesByRoom(roomId);

  if (invoices.length === 0) {
    showNotification(
      'Phòng không còn công nợ để thanh toán',
      'warning'
    );
    return;
  }

  const invoice = [...invoices].sort(
    (first, second) =>
      String(first.dueDate ?? '').localeCompare(
        String(second.dueDate ?? '')
      )
  )[0];

  openPaymentForm({
    invoiceId: invoice.id,
    onCompleted: refreshDebts
  });
}

/**
 * Hiển thị lịch sử thanh toán phòng.
 *
 * @param {string} roomId
 */
function showRoomPaymentHistory(roomId) {
  const payments = getPaymentHistoryByRoom(roomId);

  const modal = document.createElement('div');

  modal.className = 'debt-history-overlay';
  modal.dataset.testid = 'debt-payment-history';

  modal.innerHTML = `
    <section
      class="debt-history-dialog"
      role="dialog"
      aria-modal="true"
    >
      <header>
        <div>
          <h2>
            Lịch sử thanh toán ${escapeHtml(
              getRoomFullLabel(roomId)
            )}
          </h2>

          <p>${payments.length} giao dịch</p>
        </div>

        <button
          type="button"
          class="debt-history-close"
          data-action="close-history"
          aria-label="Đóng"
        >
          ×
        </button>
      </header>

      <div class="debt-history-body">
        ${
          payments.length === 0
            ? `
              <div class="debt-history-empty">
                Phòng chưa có giao dịch thanh toán.
              </div>
            `
            : `
              <div class="debt-history-list">
                ${payments
                  .map((payment) => {
                    const invoice =
                      InvoiceService.getInvoiceById(
                        payment.invoiceId
                      );

                    return `
                      <article class="debt-history-item">
                        <div>
                          <strong>
                            ${escapeHtml(
                              payment.paymentCode ??
                              payment.referenceCode ??
                              payment.id
                            )}
                          </strong>

                          <span>
                            ${escapeHtml(
                              invoice?.invoiceCode ??
                              invoice?.id ??
                              '—'
                            )}
                          </span>
                        </div>

                        <div>
                          <span>
                            ${escapeHtml(
                              formatDate(
                                payment.paymentDate ??
                                payment.createdAt
                              )
                            )}
                          </span>

                          <strong>
                            ${formatCurrency(payment.amount)}
                          </strong>
                        </div>
                      </article>
                    `;
                  })
                  .join('')}
              </div>
            `
        }
      </div>
    </section>
  `;

  document.body.appendChild(modal);

  modal
    .querySelector('[data-action="close-history"]')
    ?.addEventListener('click', () => {
      modal.remove();
    });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });
}

/**
 * Xóa bộ lọc.
 */
function clearFilters() {
  state.keyword = '';
  state.roomId = '';
  state.month = '';
  state.minimumDebt = '';
  state.maximumDebt = '';
  state.overdueOnly = false;
  state.sort = 'debt-desc';

  renderPageFilterValues();
  renderDebtTable();
}

/**
 * Cập nhật giá trị bộ lọc trên giao diện.
 */
function renderPageFilterValues() {
  const mappings = [
    ['debt-search', state.keyword],
    ['debt-filter-room', state.roomId],
    ['debt-filter-month', state.month],
    ['debt-filter-minimum', state.minimumDebt],
    ['debt-filter-maximum', state.maximumDebt],
    ['debt-sort', state.sort]
  ];

  mappings.forEach(([testId, value]) => {
    const element = pageContainer.querySelector(
      `[data-testid="${testId}"]`
    );

    if (element) {
      element.value = value;
    }
  });

  const overdueInput = pageContainer.querySelector(
    '[data-testid="debt-filter-overdue"]'
  );

  if (overdueInput) {
    overdueInput.checked = state.overdueOnly;
  }
}

/**
 * Render lại dữ liệu.
 */
function refreshDebts() {
  renderSummaryCards();
  renderMonthlyDebt();
  renderFilterOptions();
  renderDebtTable();
}

/**
 * Gắn sự kiện.
 */
function bindEvents() {
  const fieldBindings = [
    ['debt-search', 'input', 'keyword'],
    ['debt-filter-room', 'change', 'roomId'],
    ['debt-filter-month', 'change', 'month'],
    ['debt-filter-minimum', 'input', 'minimumDebt'],
    ['debt-filter-maximum', 'input', 'maximumDebt'],
    ['debt-sort', 'change', 'sort']
  ];

  fieldBindings.forEach(
    ([testId, eventName, stateKey]) => {
      pageContainer
        .querySelector(`[data-testid="${testId}"]`)
        ?.addEventListener(eventName, (event) => {
          state[stateKey] = event.target.value;
          renderDebtTable();
        });
    }
  );

  pageContainer
    .querySelector('[data-testid="debt-filter-overdue"]')
    ?.addEventListener('change', (event) => {
      state.overdueOnly = event.target.checked;
      renderDebtTable();
    });

  pageContainer.addEventListener('click', (event) => {
    const actionElement = event.target.closest(
      '[data-action]'
    );

    if (!actionElement) {
      return;
    }

    const action = actionElement.dataset.action;
    const roomId = actionElement.dataset.roomId;

    if (action === 'record-payment' && roomId) {
      openRoomPayment(roomId);
      return;
    }

    if (action === 'view-invoices' && roomId) {
      openRoomInvoice(roomId);
      return;
    }

    if (action === 'view-history' && roomId) {
      showRoomPaymentHistory(roomId);
      return;
    }

    if (action === 'clear-filters') {
      clearFilters();
    }
  });
}

/**
 * Render trang theo dõi công nợ.
 *
 * @param {HTMLElement} container
 */
function renderDebtsPage(container) {
  pageContainer = container;

  pageContainer.innerHTML = `
    <section
      class="debts-page"
      data-testid="debts-page"
    >
      <header class="debt-page-header">
        <div class="debt-breadcrumb">
          Trang chủ
          <span>›</span>
          Thanh toán
          <span>›</span>
          <strong>Theo dõi công nợ</strong>
        </div>

        <h1>Theo dõi công nợ</h1>

        <p>
          Theo dõi tình trạng công nợ của các phòng và người thuê.
        </p>
      </header>

      <section
        class="debt-summary-grid"
        data-testid="debt-summary"
      ></section>

      <section class="debt-month-section">
        <div class="debt-section-heading">
          <div>
            <h2>Công nợ theo tháng</h2>

            <p>
              Tổng hợp riêng theo tháng phát sinh hóa đơn.
            </p>
          </div>
        </div>

        <div
          class="debt-month-grid"
          data-testid="debt-by-month"
        ></div>
      </section>

      <section class="debt-filter-card">
        <div class="debt-filter-grid">
          <div class="debt-field debt-search-field">
            <label for="debt-search">Tìm kiếm</label>

            <input
              id="debt-search"
              type="search"
              placeholder="Tìm tên người thuê hoặc mã phòng..."
              data-testid="debt-search"
            />
          </div>

          <div class="debt-field">
            <label for="debt-filter-room">Phòng</label>

            <select
              id="debt-filter-room"
              data-testid="debt-filter-room"
            ></select>
          </div>

          <div class="debt-field">
            <label for="debt-filter-month">Tháng</label>

            <select
              id="debt-filter-month"
              data-testid="debt-filter-month"
            ></select>
          </div>

          <div class="debt-field">
            <label for="debt-filter-minimum">
              Nợ tối thiểu
            </label>

            <input
              id="debt-filter-minimum"
              type="number"
              min="0"
              step="100000"
              placeholder="0"
              data-testid="debt-filter-minimum"
            />
          </div>

          <div class="debt-field">
            <label for="debt-filter-maximum">
              Nợ tối đa
            </label>

            <input
              id="debt-filter-maximum"
              type="number"
              min="0"
              step="100000"
              placeholder="Không giới hạn"
              data-testid="debt-filter-maximum"
            />
          </div>

          <div class="debt-field">
            <label for="debt-sort">Sắp xếp</label>

            <select
              id="debt-sort"
              data-testid="debt-sort"
            >
              <option value="debt-desc">
                Công nợ cao nhất
              </option>

              <option value="debt-asc">
                Công nợ thấp nhất
              </option>

              <option value="days-desc">
                Quá hạn lâu nhất
              </option>

              <option value="room-asc">
                Mã phòng A–Z
              </option>
            </select>
          </div>
        </div>

        <label class="debt-overdue-toggle">
          <input
            type="checkbox"
            data-testid="debt-filter-overdue"
          />

          <span>Chỉ hiển thị hóa đơn quá hạn</span>
        </label>
      </section>

      <section
        class="debt-list-card"
        data-testid="debt-table-wrapper"
      ></section>

      <aside class="debt-warning-guide">
        <strong>Hướng dẫn mức độ cảnh báo</strong>

        <div>
          <span class="debt-guide-upcoming">
            ● Sắp đến hạn: Chưa quá hạn
          </span>

          <span class="debt-guide-overdue">
            ● Quá hạn ≤ 7 ngày
          </span>

          <span class="debt-guide-critical">
            ● Quá hạn > 7 ngày
          </span>
        </div>
      </aside>
    </section>
  `;

  renderSummaryCards();
  renderMonthlyDebt();
  renderFilterOptions();
  renderPageFilterValues();
  renderDebtTable();
  bindEvents();
}

export const render = renderDebtsPage;
