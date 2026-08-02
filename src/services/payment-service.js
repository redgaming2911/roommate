import {
  calculateTotalPaid,
  calculateRemainingAmount,
  determinePaymentStatus,
  canDeletePayment
} from '../business/payment-processor.js';
import { validatePayment } from '../business/payment-validator.js';
import { taoId } from '../utils/ma.js';
import StorageService from './storage-service.js';

const PAYMENT_KEY = 'payments';
const INVOICE_KEY = 'invoices';

/**
 * Lấy toàn bộ hóa đơn.
 *
 * @returns {Array<Object>}
 */
function getInvoices() {
  return StorageService.get(INVOICE_KEY) || [];
}

/**
 * Lấy hóa đơn theo ID.
 *
 * @param {string} invoiceId
 * @param {Array<Object>} [invoices]
 * @returns {Object|null}
 */
function findInvoiceById(
  invoiceId,
  invoices = getInvoices()
) {
  return (
    invoices.find(
      (invoice) => invoice.id === invoiceId
    ) ?? null
  );
}

/**
 * Tạo bản sao dữ liệu để phục vụ rollback.
 *
 * @param {unknown} value
 * @returns {unknown}
 */
function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Ghi đồng thời payments và invoices.
 *
 * Nếu việc cập nhật một collection thất bại, dữ liệu trước đó
 * sẽ được khôi phục để hạn chế trạng thái không nhất quán.
 *
 * @param {Array<Object>} nextPayments
 * @param {Array<Object>} nextInvoices
 * @param {Array<Object>} previousPayments
 * @param {Array<Object>} previousInvoices
 */
function commitPaymentAndInvoice({
  nextPayments,
  nextInvoices,
  previousPayments,
  previousInvoices
}) {
  let paymentsUpdated = false;

  try {
    StorageService.set(
      PAYMENT_KEY,
      nextPayments
    );

    paymentsUpdated = true;

    StorageService.set(
      INVOICE_KEY,
      nextInvoices
    );
  } catch (error) {
    try {
      if (paymentsUpdated) {
        StorageService.set(
          PAYMENT_KEY,
          previousPayments
        );
      }

      StorageService.set(
        INVOICE_KEY,
        previousInvoices
      );
    } catch (rollbackError) {
      console.error(
        'Không thể khôi phục dữ liệu thanh toán:',
        rollbackError
      );
    }

    throw new Error(
      `Không thể đồng bộ thanh toán và hóa đơn: ${error.message}`
    );
  }
}

/**
 * Tạo bản hóa đơn đã đồng bộ theo danh sách thanh toán.
 *
 * @param {Object} invoice
 * @param {Array<Object>} payments
 * @param {string|Date} [currentDate]
 * @returns {Object}
 */
function buildSyncedInvoice(
  invoice,
  payments,
  currentDate = new Date()
) {
  const total = Number(invoice.total);

  const paidAmount =
    calculateTotalPaid(payments);

  const remainingAmount =
    calculateRemainingAmount(
      total,
      payments
    );

  const status =
    determinePaymentStatus(
      total,
      payments,
      invoice.dueDate,
      currentDate
    );

  const now = new Date().toISOString();

  return {
    ...invoice,
    paidAmount,
    remainingAmount,
    status,
    updatedAt: now
  };
}

/**
 * Lấy tất cả giao dịch thanh toán.
 *
 * @returns {Array<Object>}
 */
export function getPayments() {
  return StorageService.get(PAYMENT_KEY) || [];
}

/**
 * Lấy giao dịch theo ID.
 *
 * @param {string} id
 * @returns {Object|null}
 */
export function getPaymentById(id) {
  if (!id) {
    return null;
  }

  return (
    getPayments().find(
      (payment) => payment.id === id
    ) ?? null
  );
}

/**
 * Lấy các giao dịch của một hóa đơn.
 *
 * @param {string} invoiceId
 * @returns {Array<Object>}
 */
export function getPaymentsByInvoice(
  invoiceId
) {
  if (!invoiceId) {
    return [];
  }

  return getPayments().filter(
    (payment) =>
      payment.invoiceId === invoiceId
  );
}

/**
 * Tạo giao dịch thanh toán mới.
 *
 * @param {Object} data
 * @returns {Object}
 */
export function createPayment(data) {
  if (!data || typeof data !== 'object') {
    throw new Error(
      'Dữ liệu thanh toán không hợp lệ'
    );
  }

  if (!data.invoiceId) {
    throw new Error(
      'Hóa đơn là bắt buộc'
    );
  }

  const payments = getPayments();
  const invoices = getInvoices();

  const invoice = findInvoiceById(
    data.invoiceId,
    invoices
  );

  if (!invoice) {
    throw new Error(
      'Không tìm thấy hóa đơn'
    );
  }

  const existingPayments =
    payments.filter(
      (payment) =>
        payment.invoiceId === invoice.id
    );

  const validatedPayment =
    validatePayment(
      {
        ...data,
        existingPayments
      },
      invoice
    );

  const now = new Date().toISOString();

  const newPayment = {
    ...validatedPayment,
    id: data.id || taoId(),
    invoiceId: invoice.id,
    paymentDate:
      data.paymentDate || now,
    createdAt: now,
    updatedAt: now
  };

  delete newPayment.existingPayments;

  const nextPayments = [
    ...payments,
    newPayment
  ];

  const invoicePayments =
    nextPayments.filter(
      (payment) =>
        payment.invoiceId === invoice.id
    );

  const updatedInvoice =
    buildSyncedInvoice(
      invoice,
      invoicePayments
    );

  const invoiceIndex =
    invoices.findIndex(
      (item) => item.id === invoice.id
    );

  const nextInvoices = [
    ...invoices
  ];

  nextInvoices[invoiceIndex] =
    updatedInvoice;

  commitPaymentAndInvoice({
    nextPayments,
    nextInvoices,
    previousPayments: cloneData(payments),
    previousInvoices: cloneData(invoices)
  });

  return newPayment;
}

/**
 * Xóa một giao dịch thanh toán.
 *
 * Sau khi xóa, hóa đơn liên quan được tính lại.
 *
 * @param {string} id
 * @returns {boolean}
 */
export function deletePayment(id) {
  const payments = getPayments();
  const invoices = getInvoices();

  const paymentIndex =
    payments.findIndex(
      (payment) => payment.id === id
    );

  if (paymentIndex === -1) {
    throw new Error(
      'Không tìm thấy giao dịch thanh toán'
    );
  }

  const payment =
    payments[paymentIndex];

  const invoice = findInvoiceById(
    payment.invoiceId,
    invoices
  );

  if (!invoice) {
    throw new Error(
      'Không tìm thấy hóa đơn của giao dịch'
    );
  }

  canDeletePayment(
    payment,
    invoice
  );

  const nextPayments =
    payments.filter(
      (item) => item.id !== id
    );

  const remainingPayments =
    nextPayments.filter(
      (item) =>
        item.invoiceId === invoice.id
    );

  const updatedInvoice =
    buildSyncedInvoice(
      invoice,
      remainingPayments
    );

  const invoiceIndex =
    invoices.findIndex(
      (item) => item.id === invoice.id
    );

  const nextInvoices = [
    ...invoices
  ];

  nextInvoices[invoiceIndex] =
    updatedInvoice;

  commitPaymentAndInvoice({
    nextPayments,
    nextInvoices,
    previousPayments: cloneData(payments),
    previousInvoices: cloneData(invoices)
  });

  return true;
}

/**
 * Lọc giao dịch thanh toán.
 *
 * Hỗ trợ:
 * - invoiceId
 * - method
 * - dateFrom
 * - dateTo
 * - keyword
 *
 * @param {Object} [filters]
 * @returns {Array<Object>}
 */
export function filterPayments(
  filters = {}
) {
  let payments = getPayments();

  if (filters.invoiceId) {
    payments = payments.filter(
      (payment) =>
        payment.invoiceId ===
        filters.invoiceId
    );
  }

  if (filters.method) {
    payments = payments.filter(
      (payment) =>
        (
          payment.method ??
          payment.paymentMethod
        ) === filters.method
    );
  }

  if (filters.dateFrom) {
    const dateFrom = new Date(
      filters.dateFrom
    );

    if (Number.isNaN(dateFrom.getTime())) {
      throw new Error(
        'Ngày bắt đầu lọc không hợp lệ'
      );
    }

    payments = payments.filter(
      (payment) => {
        const paymentDate = new Date(
          payment.paymentDate ??
          payment.createdAt
        );

        return (
          !Number.isNaN(
            paymentDate.getTime()
          ) &&
          paymentDate >= dateFrom
        );
      }
    );
  }

  if (filters.dateTo) {
    const dateTo = new Date(
      filters.dateTo
    );

    if (Number.isNaN(dateTo.getTime())) {
      throw new Error(
        'Ngày kết thúc lọc không hợp lệ'
      );
    }

    dateTo.setHours(
      23,
      59,
      59,
      999
    );

    payments = payments.filter(
      (payment) => {
        const paymentDate = new Date(
          payment.paymentDate ??
          payment.createdAt
        );

        return (
          !Number.isNaN(
            paymentDate.getTime()
          ) &&
          paymentDate <= dateTo
        );
      }
    );
  }

  if (filters.keyword) {
    const keyword = String(
      filters.keyword
    )
      .trim()
      .toLowerCase();

    payments = payments.filter(
      (payment) =>
        String(
          payment.id ?? ''
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          payment.invoiceId ?? ''
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          payment.referenceCode ?? ''
        )
          .toLowerCase()
          .includes(keyword) ||
        String(
          payment.note ?? ''
        )
          .toLowerCase()
          .includes(keyword)
    );
  }

  return payments;
}

/**
 * Tính tổng đã thanh toán của một hóa đơn.
 *
 * @param {string} invoiceId
 * @returns {number}
 */
export function getTotalPaidByInvoice(
  invoiceId
) {
  const payments =
    getPaymentsByInvoice(invoiceId);

  return calculateTotalPaid(payments);
}

/**
 * Đồng bộ paidAmount, remainingAmount và status của hóa đơn.
 *
 * @param {string} invoiceId
 * @returns {Object}
 */
export function syncInvoicePaymentStatus(
  invoiceId
) {
  const payments = getPayments();
  const invoices = getInvoices();

  const invoiceIndex =
    invoices.findIndex(
      (invoice) =>
        invoice.id === invoiceId
    );

  if (invoiceIndex === -1) {
    throw new Error(
      'Không tìm thấy hóa đơn'
    );
  }

  const invoice =
    invoices[invoiceIndex];

  const invoicePayments =
    payments.filter(
      (payment) =>
        payment.invoiceId === invoiceId
    );

  const updatedInvoice =
    buildSyncedInvoice(
      invoice,
      invoicePayments
    );

  const nextInvoices = [
    ...invoices
  ];

  nextInvoices[invoiceIndex] =
    updatedInvoice;

  try {
    StorageService.set(
      INVOICE_KEY,
      nextInvoices
    );
  } catch (error) {
    throw new Error(
      `Không thể cập nhật trạng thái hóa đơn: ${error.message}`
    );
  }

  return updatedInvoice;
}