/**
 * Chuyển giá trị nhập thành number an toàn
 * @param {any} value
 * @returns {number}
 */
export function toSafeNumber(value) {
  const num = Number(value);

  if (isNaN(num)) {
    throw new Error('Invalid number');
  }

  return num;
}