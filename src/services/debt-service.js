import * as InvoiceService from './invoice-service.js';
import * as PaymentService from './payment-service.js';

/**
 * Chuẩn hóa trạng thái hóa đơn bị hủy.
 *
 * @param {string} status
 * @returns {string}
 */
function normalizeInvoiceStatus(status) {
  return status === 'canceled' ? 'cancelled' : status;
}

/**
 * Kiểm tra giá trị là ngày hợp lệ.
 *
 * @param {string|Date} value
 * @param {string} fieldName
 * @returns {Date}
 */
function parseDate(value, fieldName) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return date;
}

/**
 * Chuẩn hóa ngày về đầu ngày để tránh sai lệch do giờ.
 *
 * @param {Date} date
 * @returns {Date}
 */
function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

/**
 * Tính tổng đã thanh toán của hóa đơn.
 *
 * Ưu tiên dữ liệu từ PaymentService để tránh phụ thuộc
 * vào trường paidAmount có thể chưa được đồng bộ.
 *
 * @param {Object} invoice
 * @returns {number}
 */
function getPaidAmount(invoice) {
  if (
    typeof PaymentService.getTotalPaidByInvoice === 'function'
  ) {
    return PaymentService.getTotalPaidByInvoice(invoice.id);
  }

  return Number(invoice.paidAmount) || 0;
}

/**
 * Tính công nợ còn lại của hóa đơn.
 *
 * @param {Object} invoice
 * @returns {number}
 */
function getRemainingDebt(invoice) {
  const total = Number(invoice.total);
  const paidAmount = getPaidAmount(invoice);

  if (!Number.isFinite(total) || total < 0) {
    throw new Error(
      `Tổng tiền hóa đơn ${invoice.id ?? ''} không hợp lệ`
    );
  }

  return Math.max(total - paidAmount, 0);
}

/**
 * Tính số ngày quá hạn.
 *
 * Chỉ trả về số dương khi:
 * - Hóa đơn còn nợ.
 * - currentDate lớn hơn dueDate.
 *
 * Nếu chưa tới hạn hoặc đã thanh toán đủ thì trả về 0.
 *
 * Có thể truyền thêm invoice để kiểm tra công nợ.
 * Nếu không truyền invoice, hàm chỉ tính chênh lệch ngày.
 *
 * @param {string|Date} dueDate
 * @param {string|Date} [currentDate=new Date()]
 * @param {Object|null} [invoice=null]
 * @returns {number}
 */
export function calculateDaysOverdue(
  dueDate,
  currentDate = new Date(),
  invoice = null
) {
  if (!dueDate) {
    return 0;
  }

  if (invoice && getRemainingDebt(invoice) <= 0) {
    return 0;
  }

  const due = startOfDay(
    parseDate(dueDate, 'Hạn thanh toán')
  );

  const current = startOfDay(
    parseDate(currentDate, 'Ngày hiện tại')
  );

  if (current.getTime() <= due.getTime()) {
    return 0;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.floor(
    (current.getTime() - due.getTime()) /
      millisecondsPerDay
  );
}

/**
 * Lấy các hóa đơn còn công nợ.
 *
 * Không lấy:
 * - Hóa đơn nháp.
 * - Hóa đơn đã hủy.
 * - Hóa đơn đã thanh toán đủ.
 *
 * @returns {Array<Object>}
 */
export function getOutstandingInvoices() {
  return InvoiceService.getInvoices()
    .filter((invoice) => {
      const status = normalizeInvoiceStatus(invoice.status);

      if (
        status === 'draft' ||
        status === 'cancelled'
      ) {
        return false;
      }

      return getRemainingDebt(invoice) > 0;
    })
    .map((invoice) => {
      const paidAmount = getPaidAmount(invoice);
      const remainingDebt = getRemainingDebt(invoice);

      return {
        ...invoice,
        paidAmount,
        remainingDebt
      };
    });
}

/**
 * Lấy hóa đơn quá hạn và còn nợ.
 *
 * @param {string|Date} [currentDate=new Date()]
 * @returns {Array<Object>}
 */
export function getOverdueInvoices(
  currentDate = new Date()
) {
  return getOutstandingInvoices()
    .map((invoice) => ({
      ...invoice,
      daysOverdue: calculateDaysOverdue(
        invoice.dueDate,
        currentDate,
        invoice
      )
    }))
    .filter((invoice) => invoice.daysOverdue > 0);
}

/**
 * Tổng công nợ còn lại.
 *
 * @returns {number}
 */
export function getTotalDebt() {
  return getOutstandingInvoices().reduce(
    (total, invoice) =>
      total + invoice.remainingDebt,
    0
  );
}

/**
 * Tổng hợp công nợ theo phòng.
 *
 * @param {string|Date} [currentDate=new Date()]
 * @returns {Array<Object>}
 */
export function getDebtByRoom(
  currentDate = new Date()
) {
  const grouped = new Map();

  getOutstandingInvoices().forEach((invoice) => {
    const roomId = invoice.roomId;

    if (!grouped.has(roomId)) {
      grouped.set(roomId, {
        roomId,
        invoiceCount: 0,
        invoiceTotal: 0,
        paidAmount: 0,
        remainingDebt: 0,
        overdueInvoiceCount: 0,
        maximumDaysOverdue: 0,
        nearestDueDate: null,
        invoiceIds: []
      });
    }

    const summary = grouped.get(roomId);

    const daysOverdue = calculateDaysOverdue(
      invoice.dueDate,
      currentDate,
      invoice
    );

    summary.invoiceCount += 1;
    summary.invoiceTotal += Number(invoice.total) || 0;
    summary.paidAmount += Number(invoice.paidAmount) || 0;
    summary.remainingDebt += invoice.remainingDebt;
    summary.invoiceIds.push(invoice.id);

    if (daysOverdue > 0) {
      summary.overdueInvoiceCount += 1;
    }

    summary.maximumDaysOverdue = Math.max(
      summary.maximumDaysOverdue,
      daysOverdue
    );

    if (
      invoice.dueDate &&
      (
        !summary.nearestDueDate ||
        invoice.dueDate < summary.nearestDueDate
      )
    ) {
      summary.nearestDueDate = invoice.dueDate;
    }
  });

  return Array.from(grouped.values()).sort(
    (first, second) =>
      second.remainingDebt - first.remainingDebt
  );
}

/**
 * Tổng hợp công nợ theo tháng hóa đơn.
 *
 * @returns {Array<Object>}
 */
export function getDebtByMonth() {
  const grouped = new Map();

  getOutstandingInvoices().forEach((invoice) => {
    const month = invoice.month ?? 'unknown';

    if (!grouped.has(month)) {
      grouped.set(month, {
        month,
        invoiceCount: 0,
        roomCount: 0,
        invoiceTotal: 0,
        paidAmount: 0,
        remainingDebt: 0,
        roomIds: new Set()
      });
    }

    const summary = grouped.get(month);

    summary.invoiceCount += 1;
    summary.invoiceTotal += Number(invoice.total) || 0;
    summary.paidAmount += Number(invoice.paidAmount) || 0;
    summary.remainingDebt += invoice.remainingDebt;
    summary.roomIds.add(invoice.roomId);
  });

  return Array.from(grouped.values())
    .map((summary) => ({
      ...summary,
      roomCount: summary.roomIds.size,
      roomIds: Array.from(summary.roomIds)
    }))
    .sort((first, second) =>
      second.month.localeCompare(first.month)
    );
}
