import { describe, expect, it } from 'vitest';
import {
  calculateDiscount,
  calculateElectricAmount,
  calculateFixedServiceAmount,
  calculateInvoiceTotal,
  calculatePerPersonAmount,
  calculatePerVehicleAmount,
  calculateRemainingDebt,
  calculateSubtotal,
  calculateWaterAmount,
  determineInvoiceStatus
} from '../../../src/business/invoice-calculator.js';

describe('InvoiceCalculator', () => {
  describe('tính từng khoản', () => {
    it('tính tiền điện', () => {
      expect(calculateElectricAmount(45, 3500)).toBe(157500);
    });

    it('tính tiền nước', () => {
      expect(calculateWaterAmount(3, 15000)).toBe(45000);
    });

    it('tính dịch vụ cố định', () => {
      expect(calculateFixedServiceAmount(100000)).toBe(100000);
    });

    it('tính dịch vụ theo người', () => {
      expect(calculatePerPersonAmount(3, 50000)).toBe(150000);
    });

    it('tính dịch vụ theo xe', () => {
      expect(calculatePerVehicleAmount(2, 70000)).toBe(140000);
    });

    it('trả về 0 khi sản lượng hoặc số lượng bằng 0', () => {
      expect(calculateElectricAmount(0, 3500)).toBe(0);
      expect(calculatePerPersonAmount(0, 50000)).toBe(0);
    });
  });

  describe('tạm tính, giảm giá và tổng tiền', () => {
    const items = [
      { name: 'Tiền phòng', amount: 2000000 },
      { name: 'Tiền điện', amount: 157500 },
      { name: 'Tiền nước', amount: 45000 },
      { name: 'Internet', amount: 100000 }
    ];

    it('tính tổng các khoản', () => {
      expect(calculateSubtotal(items)).toBe(2302500);
    });

    it('áp dụng giảm giá vào tổng hóa đơn', () => {
      expect(calculateInvoiceTotal(items, 102500)).toBe(2200000);
    });

    it('giữ nguyên tổng khi giảm giá bằng 0', () => {
      expect(calculateDiscount(2302500, 0)).toBe(0);
      expect(calculateInvoiceTotal(items, 0)).toBe(2302500);
    });

    it('báo lỗi khi giảm giá lớn hơn tạm tính', () => {
      expect(() => calculateDiscount(100000, 100001))
        .toThrow('Giảm giá không được lớn hơn tạm tính');
      expect(() => calculateInvoiceTotal(items, 2302501))
        .toThrow('Giảm giá không được lớn hơn tạm tính');
    });

    it('trả về 0 cho danh sách khoản thu rỗng', () => {
      expect(calculateSubtotal([])).toBe(0);
      expect(calculateInvoiceTotal([], 0)).toBe(0);
    });

    it('báo lỗi khi danh sách khoản thu không phải array', () => {
      expect(() => calculateSubtotal(null))
        .toThrow('Danh sách mục không hợp lệ');
    });

    it('không cho phép thành tiền hoặc giảm giá âm', () => {
      expect(() => calculateSubtotal([{ amount: -1 }]))
        .toThrow('Thành tiền không được âm');
      expect(() => calculateDiscount(100000, -1))
        .toThrow('Giảm giá không được âm');
    });
  });

  describe('công nợ', () => {
    it('tính số tiền còn nợ', () => {
      expect(calculateRemainingDebt(2500000, 1000000)).toBe(1500000);
    });

    it('trả về 0 khi đã trả đủ hoặc trả vượt', () => {
      expect(calculateRemainingDebt(2500000, 2500000)).toBe(0);
      expect(calculateRemainingDebt(2500000, 3000000)).toBe(0);
    });

    it('không chấp nhận tổng tiền âm', () => {
      expect(() => calculateRemainingDebt(-1, 0))
        .toThrow('Tổng tiền không được âm');
    });
  });

  describe('trạng thái hóa đơn', () => {
    const dueDate = '2026-08-10T00:00:00.000Z';
    const beforeDueDate = '2026-08-03T00:00:00.000Z';
    const afterDueDate = '2026-08-11T00:00:00.000Z';

    it('xác định hóa đơn chưa thanh toán', () => {
      expect(determineInvoiceStatus(2500000, 0, dueDate, beforeDueDate))
        .toBe('unpaid');
    });

    it('xác định hóa đơn thanh toán một phần', () => {
      expect(determineInvoiceStatus(2500000, 1000000, dueDate, beforeDueDate))
        .toBe('partial');
    });

    it('xác định hóa đơn đã thanh toán', () => {
      expect(determineInvoiceStatus(2500000, 2500000, dueDate, beforeDueDate))
        .toBe('paid');
    });

    it('xác định hóa đơn quá hạn khi vẫn còn nợ', () => {
      expect(determineInvoiceStatus(2500000, 0, dueDate, afterDueDate))
        .toBe('overdue');
      expect(determineInvoiceStatus(2500000, 1000000, dueDate, afterDueDate))
        .toBe('overdue');
    });

    it('ưu tiên trạng thái đã thanh toán dù ngày thanh toán đã quá hạn', () => {
      expect(determineInvoiceStatus(2500000, 2500000, dueDate, afterDueDate))
        .toBe('paid');
    });
  });

  describe('dữ liệu không hợp lệ', () => {
    it.each([
      () => calculateElectricAmount(Number.NaN, 3500),
      () => calculateWaterAmount(3, Number.NaN),
      () => calculateFixedServiceAmount(Number.NaN),
      () => calculatePerPersonAmount(Number.NaN, 50000),
      () => calculateSubtotal([{ amount: Number.NaN }]),
      () => calculateDiscount(Number.NaN, 0),
      () => calculateRemainingDebt(100000, Number.NaN),
      () => determineInvoiceStatus(Number.NaN, 0)
    ])('không chấp nhận NaN', (operation) => {
      expect(operation).toThrow('phải là số hợp lệ');
    });

    it.each([
      () => calculateElectricAmount('45', 3500),
      () => calculateWaterAmount(3, '15000'),
      () => calculateRemainingDebt('100000', 0)
    ])('không chấp nhận chuỗi số', (operation) => {
      expect(operation).toThrow('phải là số hợp lệ');
    });
  });
});
