/**
 * Kiểm tra chuỗi rỗng
 * @param {string} value
 * @returns {boolean}
 */
export function isEmpty(value) {
  return !value || value.trim().length === 0;
}

/**
 * Kiểm tra số điện thoại Việt Nam cơ bản
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidVietnamPhone(phone) {
  if (!phone) return false;

  const regex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return regex.test(phone);
}

/**
 * Kiểm tra số không âm
 * @param {number} value
 * @returns {boolean}
 */
export function isNonNegativeNumber(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

/**
 * Kiểm tra ngày hợp lệ
 * @param {string} date
 * @returns {boolean}
 */
export function isValidDate(date) {
  const d = new Date(date);
  return !isNaN(d);
}