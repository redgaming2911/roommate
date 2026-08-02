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
 * Validate hóa đơn
 * @typedef {Object} Invoice
 * @property {Array} items
 * @property {number} discount
 * @property {number} total
 * @property {number} paidAmount
 */
export function validateInvoice(invoice) {
  if (!invoice) {
    throw new Error('Hóa đơn không tồn tại');
  }

  const { items, discount = 0, total, paidAmount = 0 } = invoice;

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Hóa đơn phải có ít nhất 1 item');
  }

  items.forEach((item, index) => {
    if (!item) {
      throw new Error(`Item #${index} không tồn tại`);
    }

    assertNumber(item.amount, `Số tiền item #${index}`);
  });

  assertNumber(discount, 'Giảm giá');
  assertNumber(total, 'Tổng tiền');
  assertNumber(paidAmount, 'Đã thanh toán');

  if (discount > total) {
    throw new Error('Giảm giá không được lớn hơn tổng tiền');
  }

  if (paidAmount > total) {
    throw new Error('Số tiền thanh toán không được lớn hơn tổng tiền');
  }

  return true;
}