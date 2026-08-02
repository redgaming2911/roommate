/**
 * Validate 1 bản ghi chỉ số điện nước
 * @typedef {Object} MeterReading
 * @property {string} roomId
 * @property {string} monthKey (YYYY-MM)
 * @property {number} electricIndex
 * @property {number} waterIndex
 */

function assertNumber(value, name) {
  if (value == null || Number.isNaN(value)) {
    throw new Error(`${name} không hợp lệ (NaN)`);
  }

  if (typeof value !== 'number') {
    throw new Error(`${name} phải là number`);
  }

  if (value < 0) {
    throw new Error(`${name} không được âm`);
  }
}

/**
 * Validate bản ghi nhập
 */
export function validateMeterReading(reading) {
  if (!reading) {
    throw new Error('Dữ liệu chỉ số không tồn tại');
  }

  const { roomId, monthKey, electricIndex, waterIndex } = reading;

  if (!roomId) throw new Error('Thiếu roomId');
  if (!monthKey) throw new Error('Thiếu tháng (monthKey)');

  assertNumber(electricIndex, 'Chỉ số điện');
  assertNumber(waterIndex, 'Chỉ số nước');

  return true;
}

/**
 * Kiểm tra chỉ số so với tháng trước
 */
export function validatePreviousIndex(currentReading, previousReading) {
  if (!previousReading) return true;

  if (currentReading.electricIndex < previousReading.electricIndex) {
    throw new Error('Chỉ số điện mới không được nhỏ hơn tháng trước');
  }

  if (currentReading.waterIndex < previousReading.waterIndex) {
    throw new Error('Chỉ số nước mới không được nhỏ hơn tháng trước');
  }

  return true;
}

/**
 * Phát hiện tiêu thụ bất thường
 */
export function detectAbnormalUsage(
  currentUsage,
  previousUsage,
  thresholdPercent = 50
) {
  assertNumber(currentUsage, 'Sử dụng hiện tại');

  if (previousUsage == null) return false;

  assertNumber(previousUsage, 'Sử dụng tháng trước');

  if (previousUsage === 0) return false;

  const changePercent =
    ((currentUsage - previousUsage) / previousUsage) * 100;

  return changePercent >= thresholdPercent;
}

/**
 * Lấy tháng trước (YYYY-MM)
 */
export function getPreviousMonthKey(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) {
    throw new Error('monthKey không hợp lệ (YYYY-MM)');
  }

  const [yearStr, monthStr] = monthKey.split('-');
  let year = Number(yearStr);
  let month = Number(monthStr);

  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }

  const newMonth = String(month).padStart(2, '0');

  return `${year}-${newMonth}`;
}