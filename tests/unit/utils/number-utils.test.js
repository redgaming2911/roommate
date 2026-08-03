import { describe, expect, it } from 'vitest';
import { toSafeNumber } from '../../../src/utils/number-utils.js';

describe('toSafeNumber', () => {
  it.each([
    [42, 42],
    ['42.5', 42.5],
    ['-12', -12],
    ['1e3', 1000]
  ])('chuyển %s thành number', (input, expected) => {
    expect(toSafeNumber(input)).toBe(expected);
  });

  it.each([
    ['', 0],
    ['   ', 0],
    [null, 0],
    [[], 0]
  ])('chuyển dữ liệu rỗng %s theo quy tắc Number', (input, expected) => {
    expect(toSafeNumber(input)).toBe(expected);
  });

  it('giữ đúng các giá trị biên 0 và số âm', () => {
    expect(toSafeNumber(0)).toBe(0);
    expect(toSafeNumber(-Number.MAX_SAFE_INTEGER)).toBe(-Number.MAX_SAFE_INTEGER);
  });

  it.each([
    'không-phải-số',
    undefined,
    Number.NaN,
    {}
  ])('từ chối dữ liệu không thể chuyển thành số: %s', (value) => {
    expect(() => toSafeNumber(value)).toThrow('Invalid number');
  });
});
