/**
 * Lấy ngày giờ hiện tại dạng ISO
 * @returns {string}
 */
export function getCurrentISODateTime() {
  return new Date().toISOString();
}

/**
 * Chuyển ISO sang dd/mm/yyyy
 * @param {string} iso
 * @returns {string}
 */
export function formatISOToDDMMYYYY(iso) {
  if (!iso) throw new Error('Invalid ISO date');

  const date = new Date(iso);
  if (isNaN(date)) throw new Error('Invalid date');

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Chuyển yyyy-mm-dd sang dd/mm/yyyy
 * @param {string} input
 * @returns {string}
 */
export function formatInputDateToDisplay(input) {
  if (!input) throw new Error('Invalid date input');

  const [yyyy, mm, dd] = input.split('-');
  if (!yyyy || !mm || !dd) throw new Error('Invalid format');

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * So sánh hai ngày
 * @param {string} date1
 * @param {string} date2
 * @returns {number} -1 | 0 | 1
 */
export function compareDates(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1) || isNaN(d2)) throw new Error('Invalid date');

  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

/**
 * Tính số ngày giữa hai ngày
 * @param {string} date1
 * @param {string} date2
 * @returns {number}
 */
export function diffDays(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (isNaN(d1) || isNaN(d2)) throw new Error('Invalid date');

  const diff = Math.abs(d2 - d1);
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}