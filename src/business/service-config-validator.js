/**
 * @typedef {Object} ServiceConfig
 * @property {string} id
 * @property {string} code
 * @property {string} name
 * @property {string} unit
 * @property {number} unitPrice
 * @property {'usage'|'fixed'|'perPerson'|'perVehicle'|'manual'} calculationType
 * @property {'active'|'inactive'} status
 * @property {string} startDate
 * @property {string|null} endDate
 * @property {string} note
 */

const VALID_CALCULATION_TYPES = Object.freeze([
  'usage',
  'fixed',
  'perPerson',
  'perVehicle',
  'manual'
]);

export function normalizeServiceConfig(data) {
  return {
    ...data,
    code: data.code?.trim().toUpperCase(),
    name: data.name?.trim(),
    unit: data.unit?.trim(),
    note: data.note?.trim() || '',
    status: data.status || 'active'
  };
}

export function validateServiceConfig(data, existing = []) {
  const errors = [];

  if (!data.code) errors.push('Mã dịch vụ bắt buộc');
  if (!data.name) errors.push('Tên dịch vụ bắt buộc');

  if (data.unitPrice == null || data.unitPrice < 0) {
    errors.push('Đơn giá phải >= 0');
  }

  if (!VALID_CALCULATION_TYPES.includes(data.calculationType)) {
    errors.push('Cách tính không hợp lệ');
  }

  if (!['active', 'inactive'].includes(data.status)) {
    errors.push('Trạng thái dịch vụ không hợp lệ');
  }

  if (!data.startDate) {
    errors.push('Ngày bắt đầu áp dụng bắt buộc');
  }

  if (data.endDate && data.endDate < data.startDate) {
    errors.push('Ngày kết thúc phải sau ngày bắt đầu');
  }

  const isDuplicate = existing.some(
    (s) => s.code === data.code && s.id !== data.id
  );

  if (isDuplicate) {
    errors.push('Mã dịch vụ đã tồn tại');
  }

  if (errors.length) {
    throw new Error(errors.join(' | '));
  }

  return true;
}
