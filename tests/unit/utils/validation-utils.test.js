import { describe, expect, it } from 'vitest';
import {
  isEmpty,
  isNonNegativeNumber,
  isValidDate,
  isValidVietnamPhone
} from '../../../src/utils/validation-utils.js';

describe('validation-utils', () => {
  describe('isEmpty', () => {
    it.each([null, undefined, '', '   ', '\n\t'])
      ('xác định dữ liệu rỗng: %s', (value) => {
        expect(isEmpty(value)).toBe(true);
      });

    it.each(['RoomMate', '  dữ liệu  ', '0'])
      ('xác định chuỗi có dữ liệu: %s', (value) => {
        expect(isEmpty(value)).toBe(false);
      });

    it.each([1, true, {}, []])
      ('từ chối kiểu dữ liệu không phải chuỗi: %s', (value) => {
        expect(() => isEmpty(value)).toThrow(TypeError);
      });
  });

  describe('isValidVietnamPhone', () => {
    it.each([
      '0901234567',
      '0351234567',
      '+84901234567'
    ])('chấp nhận số điện thoại hợp lệ: %s', (phone) => {
      expect(isValidVietnamPhone(phone)).toBe(true);
    });

    it.each([
      null,
      undefined,
      '',
      '0201234567',
      '090123456',
      '09012345678',
      '09012abc67',
      ' 0901234567 '
    ])('từ chối số điện thoại không hợp lệ: %s', (phone) => {
      expect(isValidVietnamPhone(phone)).toBe(false);
    });
  });

  describe('isNonNegativeNumber', () => {
    it.each([0, 1, 12.5, Number.MAX_SAFE_INTEGER])
      ('chấp nhận số không âm: %s', (value) => {
        expect(isNonNegativeNumber(value)).toBe(true);
      });

    it.each([-1, -0.01, Number.NaN, '1', null, undefined, {}, []])
      ('từ chối dữ liệu không hợp lệ: %s', (value) => {
        expect(isNonNegativeNumber(value)).toBe(false);
      });
  });

  describe('isValidDate', () => {
    it.each([
      '2026-08-03',
      '2024-02-29',
      '2026-08-03T08:30:00.000Z'
    ])('chấp nhận ngày hợp lệ: %s', (value) => {
      expect(isValidDate(value)).toBe(true);
    });

    it.each([
      '',
      undefined,
      'không-phải-ngày',
      '2026-13-01'
    ])('từ chối ngày rỗng hoặc không hợp lệ: %s', (value) => {
      expect(isValidDate(value)).toBe(false);
    });
  });
});
