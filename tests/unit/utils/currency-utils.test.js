import { describe, expect, it } from 'vitest';
import { formatVND } from '../../../src/utils/currency-utils.js';

describe('formatVND', () => {
  it('định dạng số tiền VND bình thường', () => {
    expect(formatVND(1234567)).toMatch(/^1\.234\.567\s₫$/);
  });

  it('định dạng đúng giá trị biên bằng 0', () => {
    expect(formatVND(0)).toMatch(/^0\s₫$/);
  });

  it('giữ dấu âm cho số tiền âm', () => {
    expect(formatVND(-50000)).toMatch(/^-50\.000\s₫$/);
  });

  it.each([
    '1000',
    null,
    undefined,
    Number.NaN,
    {},
    []
  ])('từ chối dữ liệu không hợp lệ: %s', (value) => {
    expect(() => formatVND(value)).toThrow('Invalid amount');
  });
});
