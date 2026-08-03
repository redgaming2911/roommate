import { beforeEach, describe, expect, it } from 'vitest';
import { PAYMENT_METHOD } from '../../src/constants/payment-methods.js';
import { INVOICE_STATUS, ROOM_STATUS } from '../../src/constants/statuses.js';
import * as InvoiceService from '../../src/services/invoice-service.js';
import * as PaymentService from '../../src/services/payment-service.js';
import * as RoomService from '../../src/services/room-service.js';

const INVOICE_TOTAL = 2000000;

function createInvoice(suffix) {
  const room = RoomService.createRoom({
    code: `P-PAY-${suffix}`,
    name: `Phòng thanh toán ${suffix}`,
    type: 'standard',
    price: INVOICE_TOTAL,
    maxOccupants: 2,
    status: ROOM_STATUS.EMPTY
  });

  return InvoiceService.createInvoice({
    roomId: room.id,
    month: '2026-08',
    dueDate: '2099-12-31',
    items: [{
      type: 'rent',
      name: 'Tiền phòng',
      quantity: 1,
      unitPrice: INVOICE_TOTAL,
      amount: INVOICE_TOTAL
    }],
    total: INVOICE_TOTAL
  });
}

function pay(invoiceId, amount, method = PAYMENT_METHOD.BANK_TRANSFER) {
  return PaymentService.createPayment({
    invoiceId,
    amount,
    method,
    paymentDate: '2026-08-10T08:00:00.000Z'
  });
}

describe('Business flow: hóa đơn → thanh toán một phần → thanh toán đủ', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('cập nhật đúng công nợ và trạng thái sau hai lần thanh toán', () => {
    expect(localStorage).toBeInstanceOf(Storage);

    const invoice = createInvoice('101');
    expect(invoice.total).toBe(INVOICE_TOTAL);

    const firstPayment = pay(invoice.id, 1200000);
    const partiallyPaidInvoice = InvoiceService.getInvoiceById(invoice.id);

    expect(firstPayment).toMatchObject({
      invoiceId: invoice.id,
      amount: 1200000,
      method: PAYMENT_METHOD.BANK_TRANSFER
    });
    expect(partiallyPaidInvoice).toMatchObject({
      paidAmount: 1200000,
      remainingAmount: 800000,
      status: INVOICE_STATUS.PARTIAL
    });

    const secondPayment = pay(invoice.id, 800000, PAYMENT_METHOD.CASH);
    const fullyPaidInvoice = InvoiceService.getInvoiceById(invoice.id);

    expect(secondPayment).toMatchObject({
      invoiceId: invoice.id,
      amount: 800000,
      method: PAYMENT_METHOD.CASH
    });
    expect(fullyPaidInvoice).toMatchObject({
      paidAmount: INVOICE_TOTAL,
      remainingAmount: 0,
      status: INVOICE_STATUS.PAID
    });
    expect(PaymentService.getPaymentsByInvoice(invoice.id)).toHaveLength(2);
    expect(PaymentService.getTotalPaidByInvoice(invoice.id)).toBe(INVOICE_TOTAL);
  });

  it('không cho thanh toán vượt công nợ còn lại', () => {
    const invoice = createInvoice('102');
    const firstPayment = pay(invoice.id, 1200000);

    expect(() => pay(invoice.id, 800001)).toThrow();

    expect(PaymentService.getPaymentsByInvoice(invoice.id)).toEqual([
      firstPayment
    ]);
    expect(InvoiceService.getInvoiceById(invoice.id)).toMatchObject({
      paidAmount: 1200000,
      remainingAmount: 800000,
      status: INVOICE_STATUS.PARTIAL
    });
  });

  it('xóa giao dịch thanh toán và tính lại hóa đơn', () => {
    const invoice = createInvoice('103');
    const firstPayment = pay(invoice.id, 1200000);
    pay(invoice.id, 800000);

    expect(InvoiceService.getInvoiceById(invoice.id).status).toBe(
      INVOICE_STATUS.PAID
    );

    expect(PaymentService.deletePayment(firstPayment.id)).toBe(true);

    expect(PaymentService.getPaymentById(firstPayment.id)).toBeNull();
    expect(PaymentService.getPaymentsByInvoice(invoice.id)).toHaveLength(1);
    expect(InvoiceService.getInvoiceById(invoice.id)).toMatchObject({
      paidAmount: 800000,
      remainingAmount: 1200000,
      status: INVOICE_STATUS.PARTIAL
    });
  });

  it('không cho thanh toán hóa đơn đã hủy', () => {
    const invoice = createInvoice('104');
    const cancelledInvoice = InvoiceService.cancelInvoice(invoice.id);

    expect(cancelledInvoice.status).toBe(INVOICE_STATUS.CANCELLED);
    expect(() => pay(invoice.id, 100000)).toThrow();
    expect(PaymentService.getPaymentsByInvoice(invoice.id)).toEqual([]);
    expect(InvoiceService.getInvoiceById(invoice.id)).toMatchObject({
      paidAmount: 0,
      remainingAmount: INVOICE_TOTAL,
      status: INVOICE_STATUS.CANCELLED
    });
  });
});
