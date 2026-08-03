import { describe, expect, it } from 'vitest';
import {
  detectAbnormalUsage,
  getPreviousMonthKey,
  validateMeterReading,
  validatePreviousIndex
} from '../../../src/business/meter-validator.js';

function createReading(overrides = {}) {
  return {
    roomId: 'room-101',
    monthKey: '2026-08',
    electricIndex: 165,
    waterIndex: 42,
    ...overrides
  };
}

describe('MeterValidator', () => {
  describe('validateMeterReading', () => {
    it('chấp nhận bản ghi chỉ số hợp lệ', () => {
      expect(validateMeterReading(createReading())).toBe(true);
    });

    it.each([
      [null, 'Dữ liệu chỉ số không tồn tại'],
      [createReading({ roomId: '' }), 'Thiếu roomId'],
      [createReading({ monthKey: '' }), 'Thiếu tháng (monthKey)']
    ])('báo lỗi khi dữ liệu bắt buộc bị rỗng', (reading, message) => {
      expect(() => validateMeterReading(reading)).toThrow(message);
    });

    it.each([
      [createReading({ electricIndex: -1 }), 'Chỉ số điện không được âm'],
      [createReading({ waterIndex: -1 }), 'Chỉ số nước không được âm']
    ])('báo lỗi khi chỉ số âm', (reading, message) => {
      expect(() => validateMeterReading(reading)).toThrow(message);
    });

    it.each([
      [createReading({ electricIndex: Number.NaN }), 'Chỉ số điện không hợp lệ'],
      [createReading({ waterIndex: Number.NaN }), 'Chỉ số nước không hợp lệ']
    ])('báo lỗi khi chỉ số là NaN', (reading, message) => {
      expect(() => validateMeterReading(reading)).toThrow(message);
    });

    it.each([
      [createReading({ electricIndex: '165' }), 'Chỉ số điện phải là number'],
      [createReading({ waterIndex: '42' }), 'Chỉ số nước phải là number']
    ])('từ chối chuỗi số vì source không hỗ trợ ép kiểu', (reading, message) => {
      expect(() => validateMeterReading(reading)).toThrow(message);
    });
  });

  describe('validatePreviousIndex', () => {
    const previous = createReading({
      monthKey: '2026-07',
      electricIndex: 120,
      waterIndex: 30
    });

    it('chấp nhận chỉ số mới lớn hơn hoặc bằng tháng trước', () => {
      expect(validatePreviousIndex(createReading(), previous)).toBe(true);
      expect(validatePreviousIndex(createReading({
        electricIndex: 120,
        waterIndex: 30
      }), previous)).toBe(true);
    });

    it('báo lỗi khi chỉ số điện nhỏ hơn tháng trước', () => {
      expect(() => validatePreviousIndex(
        createReading({ electricIndex: 119 }),
        previous
      )).toThrow('Chỉ số điện mới không được nhỏ hơn tháng trước');
    });

    it('báo lỗi khi chỉ số nước nhỏ hơn tháng trước', () => {
      expect(() => validatePreviousIndex(
        createReading({ waterIndex: 29 }),
        previous
      )).toThrow('Chỉ số nước mới không được nhỏ hơn tháng trước');
    });

    it('bỏ qua so sánh khi chưa có chỉ số tháng trước', () => {
      expect(validatePreviousIndex(createReading(), null)).toBe(true);
    });
  });

  describe('detectAbnormalUsage', () => {
    it('phát hiện mức tiêu thụ tăng bất thường', () => {
      expect(detectAbnormalUsage(160, 100, 50)).toBe(true);
    });

    it('coi mức tăng đúng ngưỡng là bất thường', () => {
      expect(detectAbnormalUsage(150, 100, 50)).toBe(true);
    });

    it('không cảnh báo khi mức tăng thấp hơn ngưỡng', () => {
      expect(detectAbnormalUsage(149, 100, 50)).toBe(false);
    });

    it('không cảnh báo khi chưa có kỳ trước hoặc kỳ trước bằng 0', () => {
      expect(detectAbnormalUsage(100, null)).toBe(false);
      expect(detectAbnormalUsage(100, 0)).toBe(false);
    });

    it.each([
      [Number.NaN, 100],
      [100, Number.NaN]
    ])('báo lỗi khi mức tiêu thụ là NaN', (current, previousUsage) => {
      expect(() => detectAbnormalUsage(current, previousUsage))
        .toThrow('không hợp lệ (NaN)');
    });
  });

  describe('getPreviousMonthKey', () => {
    it('trả về tháng trước trong cùng năm', () => {
      expect(getPreviousMonthKey('2026-08')).toBe('2026-07');
    });

    it('xử lý đúng biên tháng 1 sang tháng 12 năm trước', () => {
      expect(getPreviousMonthKey('2026-01')).toBe('2025-12');
    });

    it.each([null, undefined, '', '2026/08', '08-2026'])
      ('báo lỗi với monthKey không hợp lệ: %s', (monthKey) => {
        expect(() => getPreviousMonthKey(monthKey))
          .toThrow('monthKey không hợp lệ (YYYY-MM)');
      });
  });
});
