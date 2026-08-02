/**
 * Định dạng tiền Việt Nam
 * @param {number} amount
 * @returns {string}
 */
export function formatVND(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Invalid amount');
  }

  return amount.toLocaleString('vi-VN', {
    style: 'currency',
    currency: 'VND'
  });
}