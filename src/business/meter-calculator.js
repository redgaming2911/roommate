/**
 * Đảm bảo giá trị là số hợp lệ
 */
function assertValidNumber(value, fieldName) {
  if (value == null || Number.isNaN(value)) {
    throw new Error(`${fieldName} không hợp lệ (NaN)`);
  }

  if (typeof value !== 'number') {
    throw new Error(`${fieldName} phải là number`);
  }

  if (value < 0) {
    throw new Error(`${fieldName} không được âm`);
  }
}

/**
 * Tính điện tiêu thụ
 */
export function calculateElectricUsage(oldIndex, newIndex) {
  return calculateUsage(oldIndex, newIndex, 'điện');
}

/**
 * Tính nước tiêu thụ
 */
export function calculateWaterUsage(oldIndex, newIndex) {
  return calculateUsage(oldIndex, newIndex, 'nước');
}

/**
 * Hàm chung tính usage
 */
export function calculateUsage(oldIndex, newIndex, label = 'chỉ số') {
  assertValidNumber(oldIndex, `Chỉ số cũ (${label})`);
  assertValidNumber(newIndex, `Chỉ số mới (${label})`);

  if (newIndex < oldIndex) {
    throw new Error(`Chỉ số mới (${label}) không được nhỏ hơn chỉ số cũ`);
  }

  const usage = newIndex - oldIndex;

  if (Number.isNaN(usage)) {
    throw new Error(`Kết quả tính ${label} không hợp lệ`);
  }

  return usage;
}