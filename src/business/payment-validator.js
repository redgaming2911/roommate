import {
  calculateRemainingAmount,
  calculateTotalPaid
} from './payment-processor.js';

/**
 * Kiểm tra trạng thái hóa đơn đã bị hủy hay chưa.
 *
 * @param {string} status
 * @returns {boolean}
 */
function isCanceledStatus(status) {
  return (
    status === 'canceled' ||
    status === 'cancelled'
  );
}

/**
 * Kiểm tra một giá trị có phải số dương hữu hạn.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function isPositiveNumber(value) {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0
  );
}

/**
 * Validate giao dịch thanh toán so với hóa đơn.
 *
 * Có thể truyền các giao dịch đã tồn tại qua:
 * - payment.existingPayments
 * - invoice.payments
 *
 * @param {Object} payment
 * @param {Object} invoice
 * @returns {Object} Bản sao dữ liệu payment đã được kiểm tra.
 * @throws {Error}
 */
export function validatePayment(
  payment,
  invoice
) {
  if (!payment || typeof payment !== 'object') {
    throw new Error(
      'Dữ liệu thanh toán không hợp lệ'
    );
  }

  if (!invoice || typeof invoice !== 'object') {
    throw new Error('Hóa đơn không hợp lệ');
  }

  if (!invoice.id) {
    throw new Error('Hóa đơn thiếu ID');
  }

  if (
    payment.invoiceId &&
    payment.invoiceId !== invoice.id
  ) {
    throw new Error(
      'Giao dịch không thuộc hóa đơn này'
    );
  }

  if (isCanceledStatus(invoice.status)) {
    throw new Error(
      'Không thể thanh toán hóa đơn đã hủy'
    );
  }

  const invoiceTotal = Number(invoice.total);

  if (
    !Number.isFinite(invoiceTotal) ||
    invoiceTotal < 0
  ) {
    throw new Error(
      'Tổng tiền hóa đơn không hợp lệ'
    );
  }

  if (!isPositiveNumber(payment.amount)) {
    throw new Error(
      'Số tiền thanh toán phải lớn hơn 0'
    );
  }

  const existingPayments = Array.isArray(
    payment.existingPayments
  )
    ? payment.existingPayments
    : Array.isArray(invoice.payments)
      ? invoice.payments
      : [];

  const totalPaid = calculateTotalPaid(
    existingPayments
  );

  if (totalPaid >= invoiceTotal) {
    throw new Error(
      'Hóa đơn đã được thanh toán đầy đủ'
    );
  }

  const remainingAmount =
    calculateRemainingAmount(
      invoiceTotal,
      existingPayments
    );

  if (payment.amount > remainingAmount) {
    throw new Error(
      `Số tiền thanh toán không được vượt quá công nợ còn lại (${remainingAmount})`
    );
  }

  return {
    ...payment,
    invoiceId: invoice.id,
    amount: payment.amount
  };
}