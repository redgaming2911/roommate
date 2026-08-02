// invoice-calculator.js

function ensureValidNumber(value, name) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${name} phải là số hợp lệ`);
  }
  if (value < 0) {
    throw new Error(`${name} không được âm`);
  }
}

export function calculateElectricAmount(usage, unitPrice) {
  ensureValidNumber(usage, 'Sản lượng điện');
  ensureValidNumber(unitPrice, 'Đơn giá điện');
  return usage * unitPrice;
}

export function calculateWaterAmount(usage, unitPrice) {
  ensureValidNumber(usage, 'Sản lượng nước');
  ensureValidNumber(unitPrice, 'Đơn giá nước');
  return usage * unitPrice;
}

export function calculateFixedServiceAmount(unitPrice) {
  ensureValidNumber(unitPrice, 'Đơn giá dịch vụ cố định');
  return unitPrice;
}

export function calculatePerPersonAmount(personCount, unitPrice) {
  ensureValidNumber(personCount, 'Số người');
  ensureValidNumber(unitPrice, 'Đơn giá/người');
  return personCount * unitPrice;
}

export function calculatePerVehicleAmount(vehicleCount, unitPrice) {
  ensureValidNumber(vehicleCount, 'Số xe');
  ensureValidNumber(unitPrice, 'Đơn giá/xe');
  return vehicleCount * unitPrice;
}

export function calculateSubtotal(items) {
  if (!Array.isArray(items)) {
    throw new Error('Danh sách mục không hợp lệ');
  }

  return items.reduce((sum, item) => {
    ensureValidNumber(item.amount, 'Thành tiền');
    return sum + item.amount;
  }, 0);
}

export function calculateDiscount(subtotal, discount) {
  ensureValidNumber(subtotal, 'Tạm tính');
  ensureValidNumber(discount, 'Giảm giá');

  if (discount > subtotal) {
    throw new Error('Giảm giá không được lớn hơn tạm tính');
  }

  return discount;
}

export function calculateInvoiceTotal(items, discount = 0) {
  const subtotal = calculateSubtotal(items);
  const validDiscount = calculateDiscount(subtotal, discount);
  const total = subtotal - validDiscount;

  if (total < 0) {
    throw new Error('Tổng tiền không hợp lệ');
  }

  return total;
}

export function calculateRemainingDebt(total, paidAmount) {
  ensureValidNumber(total, 'Tổng tiền');
  ensureValidNumber(paidAmount, 'Số tiền đã trả');

  const remaining = total - paidAmount;
  return remaining < 0 ? 0 : remaining;
}

export function determineInvoiceStatus(
  total,
  paidAmount = 0,
  dueDate,
  currentDate = new Date()
) {
  ensureValidNumber(total, 'Tổng tiền');
  ensureValidNumber(paidAmount, 'Đã trả');

  const remaining = calculateRemainingDebt(total, paidAmount);

  const isOverdue =
    dueDate && new Date(currentDate).getTime() > new Date(dueDate).getTime();

  if (paidAmount === 0) {
    return isOverdue ? 'overdue' : 'unpaid';
  }

  if (remaining > 0) {
    return isOverdue ? 'overdue' : 'partial';
  }

  return 'paid';
}