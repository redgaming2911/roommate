/**
 * Đảm bảo giá trị là một số hữu hạn, không âm.
 *
 * @param {unknown} value
 * @param {string} fieldName
 * @returns {number}
 * @throws {Error}
 */
function requireNonNegativeNumber(value, fieldName) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    throw new Error(`${fieldName} phải là số hợp lệ`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} không được âm`);
  }

  return value;
}

/**
 * Tính tổng số tiền đã thanh toán.
 *
 * @param {Array<{amount: number}>} payments
 * @returns {number}
 * @throws {Error}
 */
export function calculateTotalPaid(payments = []) {
  if (!Array.isArray(payments)) {
    throw new Error(
      'Danh sách giao dịch thanh toán không hợp lệ'
    );
  }

  return payments.reduce(
    (total, payment, index) => {
      if (!payment || typeof payment !== 'object') {
        throw new Error(
          `Giao dịch thanh toán tại vị trí ${index} không hợp lệ`
        );
      }

      const amount = requireNonNegativeNumber(
        payment.amount,
        `Số tiền giao dịch tại vị trí ${index}`
      );

      return total + amount;
    },
    0
  );
}

/**
 * Tính số tiền còn phải thanh toán.
 *
 * @param {number} invoiceTotal
 * @param {Array<{amount: number}>} payments
 * @returns {number}
 * @throws {Error}
 */
export function calculateRemainingAmount(
  invoiceTotal,
  payments = []
) {
  requireNonNegativeNumber(
    invoiceTotal,
    'Tổng tiền hóa đơn'
  );

  const totalPaid = calculateTotalPaid(payments);

  return Math.max(invoiceTotal - totalPaid, 0);
}

/**
 * Xác định trạng thái thanh toán của hóa đơn.
 *
 * Kết quả:
 * - unpaid: chưa thanh toán.
 * - partial: thanh toán một phần.
 * - paid: đã thanh toán đủ.
 * - overdue: quá hạn và chưa thanh toán đủ.
 *
 * @param {number} invoiceTotal
 * @param {Array<{amount: number}>} payments
 * @param {string|null|undefined} dueDate
 * @param {string|Date} [currentDate=new Date()]
 * @returns {'unpaid'|'partial'|'paid'|'overdue'}
 * @throws {Error}
 */
export function determinePaymentStatus(
  invoiceTotal,
  payments = [],
  dueDate,
  currentDate = new Date()
) {
  requireNonNegativeNumber(
    invoiceTotal,
    'Tổng tiền hóa đơn'
  );

  const totalPaid = calculateTotalPaid(payments);

  if (totalPaid >= invoiceTotal) {
    return 'paid';
  }

  let isOverdue = false;

  if (dueDate) {
    const due = new Date(dueDate);
    const current = new Date(currentDate);

    if (Number.isNaN(due.getTime())) {
      throw new Error(
        'Hạn thanh toán không hợp lệ'
      );
    }

    if (Number.isNaN(current.getTime())) {
      throw new Error(
        'Ngày hiện tại không hợp lệ'
      );
    }

    isOverdue = current.getTime() > due.getTime();
  }

  if (isOverdue) {
    return 'overdue';
  }

  if (totalPaid === 0) {
    return 'unpaid';
  }

  return 'partial';
}

/**
 * Kiểm tra giao dịch có thể bị xóa hay không.
 *
 * Đây là kiểm tra nghiệp vụ tại tầng business.
 * Sau khi xóa, service phải tính lại paidAmount,
 * remainingAmount và trạng thái hóa đơn.
 *
 * @param {Object} payment
 * @param {Object} invoice
 * @returns {boolean}
 * @throws {Error}
 */
export function canDeletePayment(payment, invoice) {
  if (!payment || typeof payment !== 'object') {
    throw new Error(
      'Giao dịch thanh toán không hợp lệ'
    );
  }

  if (!invoice || typeof invoice !== 'object') {
    throw new Error('Hóa đơn không hợp lệ');
  }

  if (!payment.id) {
    throw new Error(
      'Giao dịch thanh toán thiếu ID'
    );
  }

  if (
    payment.invoiceId &&
    invoice.id &&
    payment.invoiceId !== invoice.id
  ) {
    throw new Error(
      'Giao dịch không thuộc hóa đơn này'
    );
  }

  const invoiceStatus =
    invoice.status === 'canceled'
      ? 'cancelled'
      : invoice.status;

  if (invoiceStatus === 'cancelled') {
    throw new Error(
      'Không thể xóa giao dịch của hóa đơn đã hủy'
    );
  }

  requireNonNegativeNumber(
    payment.amount,
    'Số tiền thanh toán'
  );

  return true;
}

/**
 * Nhóm giao dịch theo phương thức thanh toán.
 *
 * @param {Array<{method?: string, paymentMethod?: string}>} payments
 * @returns {Record<string, Array<Object>>}
 * @throws {Error}
 */
export function groupPaymentsByMethod(payments = []) {
  if (!Array.isArray(payments)) {
    throw new Error(
      'Danh sách giao dịch thanh toán không hợp lệ'
    );
  }

  return payments.reduce(
    (groups, payment, index) => {
      if (!payment || typeof payment !== 'object') {
        throw new Error(
          `Giao dịch thanh toán tại vị trí ${index} không hợp lệ`
        );
      }

      const method =
        payment.method ??
        payment.paymentMethod ??
        'unknown';

      if (!groups[method]) {
        groups[method] = [];
      }

      groups[method].push({
        ...payment
      });

      return groups;
    },
    {}
  );
}
