export const ROOM_STATUS = Object.freeze({
  EMPTY: 'empty',
  RENTED: 'rented',
  REPAIRING: 'repairing',
  INACTIVE: 'inactive'
});

export const ROOM_STATUS_LABEL = Object.freeze({
  [ROOM_STATUS.EMPTY]: 'Trống',
  [ROOM_STATUS.RENTED]: 'Đang thuê',
  [ROOM_STATUS.REPAIRING]: 'Đang sửa chữa',
  [ROOM_STATUS.INACTIVE]: 'Tạm ngưng sử dụng'
});

export const TENANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  ARCHIVED: 'archived'
});

export const TENANT_STATUS_LABEL = Object.freeze({
  [TENANT_STATUS.ACTIVE]: 'Đang thuê',
  [TENANT_STATUS.INACTIVE]: 'Đã trả phòng',
  [TENANT_STATUS.SUSPENDED]: 'Tạm ngưng',
  [TENANT_STATUS.ARCHIVED]: 'Đã lưu trữ'
});

export const CONTRACT_STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  ACTIVE: 'active',
  SOON_EXPIRE: 'soon_expire',
  EXPIRED: 'expired',
  ENDED: 'ended',
  CANCELLED: 'cancelled'
});

export const CONTRACT_STATUS_LABEL = Object.freeze({
  [CONTRACT_STATUS.DRAFT]: 'Bản nháp',
  [CONTRACT_STATUS.PENDING]: 'Chờ hiệu lực',
  [CONTRACT_STATUS.ACTIVE]: 'Đang hiệu lực',
  [CONTRACT_STATUS.SOON_EXPIRE]: 'Sắp hết hạn',
  [CONTRACT_STATUS.EXPIRED]: 'Đã hết hạn',
  [CONTRACT_STATUS.ENDED]: 'Đã kết thúc',
  [CONTRACT_STATUS.CANCELLED]: 'Đã hủy'
});

export const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  UNPAID: 'unpaid',
  PARTIAL: 'partial',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled'
});

export const INVOICE_STATUS_LABEL = Object.freeze({
  [INVOICE_STATUS.DRAFT]: 'Bản nháp',
  [INVOICE_STATUS.UNPAID]: 'Chưa thanh toán',
  [INVOICE_STATUS.PARTIAL]: 'Thanh toán một phần',
  [INVOICE_STATUS.PAID]: 'Đã thanh toán',
  [INVOICE_STATUS.OVERDUE]: 'Quá hạn',
  [INVOICE_STATUS.CANCELLED]: 'Đã hủy'
});
