/**
 * Helpers
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
 * Điện
 */
export function calculateElectricAmount(usage, unitPrice) {
  assertNumber(usage, 'Sản lượng điện');
  assertNumber(unitPrice, 'Đơn giá điện');

  return usage * unitPrice;
}

/**
 * Nước
 */
export function calculateWaterAmount(usage, unitPrice) {
  assertNumber(usage, 'Sản lượng nước');
  assertNumber(unitPrice, 'Đơn giá nước');

  return usage * unitPrice;
}

/**
 * Dịch vụ cố định
 */
export function calculateFixedServiceAmount(unitPrice) {
  assertNumber(unitPrice, 'Đơn giá dịch vụ');

  return unitPrice;
}

/**
 * Theo người
 */
export function calculatePerPersonAmount(personCount, unitPrice) {
  assertNumber(personCount, 'Số người');
  assertNumber(unitPrice, 'Đơn giá');

  return personCount * unitPrice;
}

/**
 * Theo xe
 */
export function calculatePerVehicleAmount(vehicleCount, unitPrice) {
  assertNumber(vehicleCount, 'Số xe');
  assertNumber(unitPrice, 'Đơn giá');

  return vehicleCount * unitPrice;
}

/**
 * Tổng tạm tính
 */
export function calculateSubtotal(items = []) {
  if (!Array.isArray(items)) {
    throw new Error('Danh sách items không hợp lệ');
  }

  const subtotal = items.reduce((sum, item) => {
    const amount = Number(item.amount);

    if (Number.isNaN(amount) || amount < 0) {
      throw new Error('Item amount không hợp lệ');
    }

    return sum + amount;
  }, 0);

  return subtotal;
}

/**
 * Giảm giá
 */
export function calculateDiscount(subtotal, discount = 0) {
  assertNumber(subtotal, 'Tạm tính');

  if (discount == null) discount = 0;

  assertNumber(discount, 'Giảm giá');

  if (discount > subtotal) {
    throw new Error('Giảm giá không được lớn hơn tạm tính');
  }

  return discount;
}

/**
 * Tổng hóa đơn
 */
export function calculateInvoiceTotal(items, discount = 0) {
  const subtotal = calculateSubtotal(items);
  const validDiscount = calculateDiscount(subtotal, discount);

  const total = subtotal - validDiscount;

  if (total < 0) {
    throw new Error('Tổng tiền không hợp lệ');
  }

  return total;
}

/**
 * Công nợ còn lại
 */
export function calculateRemainingDebt(total, paidAmount = 0) {
  assertNumber(total, 'Tổng tiền');

  if (paidAmount == null) paidAmount = 0;

  assertNumber(paidAmount, 'Đã thanh toán');

  const remaining = total - paidAmount;

  return remaining < 0 ? 0 : remaining;
}

/**
 * Trạng thái hóa đơn
 * unpaid | partial | paid | overdue
 */
export function determineInvoiceStatus(
  total,
  paidAmount = 0,
  dueDate,
  currentDate = new Date().toISOString()
) {
  assertNumber(total, 'Tổng tiền');

  if (paidAmount == null) paidAmount = 0;
  assertNumber(paidAmount, 'Đã thanh toán');

  const now = new Date(currentDate);
  const due = dueDate ? new Date(dueDate) : null;

  if (paidAmount >= total) {
    return 'paid';
  }

  if (paidAmount > 0 && paidAmount < total) {
    if (due && now > due) {
      return 'overdue';
    }
    return 'partial';
  }

  // chưa trả
  if (paidAmount === 0) {
    if (due && now > due) {
      return 'overdue';
    }
    return 'unpaid';
  }

  return 'unpaid';
}