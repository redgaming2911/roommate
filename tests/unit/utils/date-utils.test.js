import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  compareDates,
  diffDays,
  formatInputDateToDisplay,
  formatISOToDDMMYYYY,
  getCurrentISODateTime
} from '../../../src/utils/date-utils.js';

describe('date-utils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getCurrentISODateTime', () => {
    it('trả về thời gian hiện tại ở định dạng ISO', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-03T08:30:45.123Z'));

      expect(getCurrentISODateTime()).toBe('2026-08-03T08:30:45.123Z');
    });
  });

  describe('formatISOToDDMMYYYY', () => {
    it('định dạng ngày ISO bình thường', () => {
      expect(formatISOToDDMMYYYY('2026-08-03T12:00:00.000Z'))
        .toBe('03/08/2026');
    });

    it('xử lý đúng ngày nhuận', () => {
      expect(formatISOToDDMMYYYY('2024-02-29T12:00:00.000Z'))
        .toBe('29/02/2024');
    });

    it.each([null, undefined, ''])('từ chối dữ liệu rỗng: %s', (value) => {
      expect(() => formatISOToDDMMYYYY(value)).toThrow('Invalid ISO date');
    });

    it('từ chối chuỗi ngày không hợp lệ', () => {
      expect(() => formatISOToDDMMYYYY('không-phải-ngày'))
        .toThrow('Invalid date');
    });
  });

  describe('formatInputDateToDisplay', () => {
    it('đổi yyyy-mm-dd thành dd/mm/yyyy', () => {
      expect(formatInputDateToDisplay('2026-08-03')).toBe('03/08/2026');
    });

    it('xử lý ngày biên là ngày nhuận', () => {
      expect(formatInputDateToDisplay('2024-02-29')).toBe('29/02/2024');
    });

    it.each([null, undefined, ''])('từ chối dữ liệu rỗng: %s', (value) => {
      expect(() => formatInputDateToDisplay(value))
        .toThrow('Invalid date input');
    });

    it('từ chối chuỗi sai cấu trúc', () => {
      expect(() => formatInputDateToDisplay('2026/08/03'))
        .toThrow('Invalid format');
    });
  });

  describe('compareDates', () => {
    it.each([
      ['2026-08-01', '2026-08-02', -1],
      ['2026-08-02', '2026-08-02', 0],
      ['2026-08-03', '2026-08-02', 1]
    ])('so sánh %s với %s', (first, second, expected) => {
      expect(compareDates(first, second)).toBe(expected);
    });

    it.each([
      ['', '2026-08-01'],
      ['invalid', '2026-08-01'],
      ['2026-08-01', 'invalid']
    ])('từ chối ngày không hợp lệ', (first, second) => {
      expect(() => compareDates(first, second)).toThrow('Invalid date');
    });
  });

  describe('diffDays', () => {
    it('tính số ngày tuyệt đối ở cả hai chiều', () => {
      expect(diffDays('2026-08-01', '2026-08-11')).toBe(10);
      expect(diffDays('2026-08-11', '2026-08-01')).toBe(10);
    });

    it('trả về 0 cho cùng ngày và khoảng thời gian dưới 24 giờ', () => {
      expect(diffDays('2026-08-03', '2026-08-03')).toBe(0);
      expect(diffDays(
        '2026-08-03T00:00:00.000Z',
        '2026-08-03T23:59:59.999Z'
      )).toBe(0);
    });

    it.each([
      ['', '2026-08-01'],
      ['invalid', '2026-08-01'],
      ['2026-08-01', undefined]
    ])('từ chối dữ liệu ngày không hợp lệ', (first, second) => {
      expect(() => diffDays(first, second)).toThrow('Invalid date');
    });
  });
});
