import { describe, expect, it } from 'vitest';
import {
  calculateElectricUsage,
  calculateUsage,
  calculateWaterUsage
} from '../../../src/business/meter-calculator.js';

describe('MeterCalculator', () => {
  it('tính chỉ số cũ 120, chỉ số mới 165 thành 45', () => {
    expect(calculateElectricUsage(120, 165)).toBe(45);
  });

  it('trả về 0 khi chỉ số cũ bằng chỉ số mới', () => {
    expect(calculateWaterUsage(120, 120)).toBe(0);
  });

  it('báo lỗi khi chỉ số mới nhỏ hơn chỉ số cũ', () => {
    expect(() => calculateUsage(165, 120))
      .toThrow('không được nhỏ hơn chỉ số cũ');
  });

  it.each([
    [-1, 10],
    [10, -1]
  ])('báo lỗi khi có chỉ số âm: %s, %s', (oldIndex, newIndex) => {
    expect(() => calculateUsage(oldIndex, newIndex)).toThrow('không được âm');
  });

  it.each([
    ['120', 165],
    [120, '165']
  ])(
    'từ chối chuỗi số vì implementation chỉ hỗ trợ number: %s, %s',
    (oldIndex, newIndex) => {
      expect(() => calculateUsage(oldIndex, newIndex)).toThrow('phải là number');
    }
  );

  it.each([
    [Number.NaN, 165],
    [120, Number.NaN]
  ])('báo lỗi khi chỉ số là NaN', (oldIndex, newIndex) => {
    expect(() => calculateUsage(oldIndex, newIndex))
      .toThrow('không hợp lệ (NaN)');
  });

  it('dùng nhãn chỉ số trong thông báo lỗi', () => {
    expect(() => calculateUsage(20, 10, 'gas'))
      .toThrow('Chỉ số mới (gas) không được nhỏ hơn chỉ số cũ');
  });
});
