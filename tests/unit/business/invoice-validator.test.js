import { describe, expect, it } from 'vitest';
import { validateInvoice } from '../../../src/business/invoice-validator.js';

function createInvoice(overrides = {}) {
  return {
    roomId: 'room-101',
    month: '2026-08',
    items: [
      {
        name: 'Tiền phòng',
        unitPrice: 2000000,
        quantity: 1,
        amount: 2000000
      }
    ],
    total: 2000000,
    paidAmount: 0,
    dueDate: '2026-08-10',
    ...overrides
  };
}

describe('InvoiceValidator', () => {
  it('chấp nhận hóa đơn hợp lệ', () => {
    expect(validateInvoice(createInvoice())).toBe(true);
  });

  it('chấp nhận các giá trị số bằng 0', () => {
    expect(validateInvoice(createInvoice({
      items: [{
        name: 'Khoản miễn phí',
        unitPrice: 0,
        quantity: 0,
        amount: 0
      }],
      total: 0,
      paidAmount: 0
    }))).toBe(true);
  });

  it.each([null, undefined, '', 0])
    ('từ chối dữ liệu hóa đơn rỗng hoặc sai kiểu: %s', (invoice) => {
      expect(() => validateInvoice(invoice)).toThrow('Hóa đơn không hợp lệ');
    });

  it('yêu cầu roomId', () => {
    expect(() => validateInvoice(createInvoice({ roomId: '' })))
      .toThrow('Thiếu roomId');
  });

  it('yêu cầu tháng hóa đơn', () => {
    expect(() => validateInvoice(createInvoice({ month: '' })))
      .toThrow('Thiếu tháng hóa đơn');
  });

  it.each([null, {}, []])
    ('yêu cầu ít nhất một khoản thu', (items) => {
      expect(() => validateInvoice(createInvoice({ items })))
        .toThrow('Hóa đơn phải có ít nhất 1 mục');
    });

  it('yêu cầu tên khoản thu', () => {
    expect(() => validateInvoice(createInvoice({
      items: [{ unitPrice: 100000, quantity: 1, amount: 100000 }]
    }))).toThrow('Item[0] thiếu tên');
  });

  it.each([
    ['unitPrice', Number.NaN, 'đơn giá không hợp lệ'],
    ['unitPrice', -1, 'đơn giá không hợp lệ'],
    ['unitPrice', '100000', 'đơn giá không hợp lệ'],
    ['quantity', Number.NaN, 'số lượng không hợp lệ'],
    ['quantity', -1, 'số lượng không hợp lệ'],
    ['quantity', '1', 'số lượng không hợp lệ'],
    ['amount', Number.NaN, 'thành tiền không hợp lệ'],
    ['amount', -1, 'thành tiền không hợp lệ'],
    ['amount', '100000', 'thành tiền không hợp lệ']
  ])('từ chối item có %s không hợp lệ', (field, value, message) => {
    const item = {
      name: 'Dịch vụ',
      unitPrice: 100000,
      quantity: 1,
      amount: 100000,
      [field]: value
    };

    expect(() => validateInvoice(createInvoice({ items: [item] })))
      .toThrow(message);
  });

  it.each([
    [-1, 'Tổng tiền không hợp lệ'],
    [Number.NaN, 'Tổng tiền không hợp lệ'],
    ['2000000', 'Tổng tiền không hợp lệ']
  ])('không chấp nhận tổng tiền không hợp lệ: %s', (total, message) => {
    expect(() => validateInvoice(createInvoice({ total }))).toThrow(message);
  });

  it.each([
    [-1, 'Số tiền đã trả không hợp lệ'],
    [Number.NaN, 'Số tiền đã trả không hợp lệ'],
    ['1000000', 'Số tiền đã trả không hợp lệ']
  ])('không chấp nhận tiền đã trả không hợp lệ: %s', (paidAmount, message) => {
    expect(() => validateInvoice(createInvoice({ paidAmount })))
      .toThrow(message);
  });

  it('không cho phép số tiền đã trả vượt quá tổng tiền', () => {
    expect(() => validateInvoice(createInvoice({ paidAmount: 2000001 })))
      .toThrow('Số tiền đã trả không được vượt quá tổng tiền');
  });

  it('không chấp nhận ngày hạn thanh toán sai', () => {
    expect(() => validateInvoice(createInvoice({ dueDate: 'không-phải-ngày' })))
      .toThrow('Ngày hạn thanh toán không hợp lệ');
  });

  it('cho phép bỏ trống ngày hạn thanh toán', () => {
    expect(validateInvoice(createInvoice({ dueDate: '' }))).toBe(true);
  });
});
