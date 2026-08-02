// ======================
// ROOM STATUS
// ======================
export const ROOM_STATUS = Object.freeze({
  EMPTY: 'empty',
  RENTED: 'rented',
  REPAIRING: 'repairing'
});

export const ROOM_STATUS_LABEL = Object.freeze({
  [ROOM_STATUS.EMPTY]: 'Trống',
  [ROOM_STATUS.RENTED]: 'Đang thuê',
  [ROOM_STATUS.REPAIRING]: 'Đang sửa'
});

// ======================
// TENANT STATUS
// ======================
export const TENANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive'
});

export const TENANT_STATUS_LABEL = Object.freeze({
  [TENANT_STATUS.ACTIVE]: 'Đang ở',
  [TENANT_STATUS.INACTIVE]: 'Đã rời'
});

// ======================
// CONTRACT STATUS
// ======================
export const CONTRACT_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  TERMINATED: 'terminated',
  SOON_EXPIRE: 'soon_expire'
});

export const CONTRACT_STATUS_LABEL = Object.freeze({
  [CONTRACT_STATUS.ACTIVE]: 'Còn hiệu lực',
  [CONTRACT_STATUS.EXPIRED]: 'Hết hạn',
  [CONTRACT_STATUS.TERMINATED]: 'Đã hủy',
  [CONTRACT_STATUS.SOON_EXPIRE]: 'Sắp hết hạn'
});

// ======================
// INVOICE STATUS
// ======================
export const INVOICE_STATUS = Object.freeze({
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue'
});

export const INVOICE_STATUS_LABEL = Object.freeze({
  [INVOICE_STATUS.UNPAID]: 'Chưa thanh toán',
  [INVOICE_STATUS.PARTIAL]: 'Thanh toán một phần',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.OVERDUE]: 'Quá hạn'
});