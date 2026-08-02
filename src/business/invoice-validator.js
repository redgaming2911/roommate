// invoice-validator.js

function isValidNumber(value) {
  return typeof value === 'number' && !isNaN(value) && value >= 0;
}

export function validateInvoice(invoice) {
  if (!invoice || typeof invoice !== 'object') {
    throw new Error('Hóa đơn không hợp lệ');
  }

  const {
    roomId,
    month,
    items,
    total,
    paidAmount = 0,
    dueDate
  } = invoice;

  if (!roomId) {
    throw new Error('Thiếu roomId');
  }

  if (!month) {
    throw new Error('Thiếu tháng hóa đơn');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Hóa đơn phải có ít nhất 1 mục');
  }

  items.forEach((item, index) => {
    if (!item.name) {
      throw new Error(`Item[${index}] thiếu tên`);
    }

    if (!isValidNumber(item.unitPrice)) {
      throw new Error(`Item[${index}] đơn giá không hợp lệ`);
    }

    if (!isValidNumber(item.quantity)) {
      throw new Error(`Item[${index}] số lượng không hợp lệ`);
    }

    if (!isValidNumber(item.amount)) {
      throw new Error(`Item[${index}] thành tiền không hợp lệ`);
    }
  });

  if (!isValidNumber(total)) {
    throw new Error('Tổng tiền không hợp lệ');
  }

  if (!isValidNumber(paidAmount)) {
    throw new Error('Số tiền đã trả không hợp lệ');
  }

  if (paidAmount > total) {
    throw new Error('Số tiền đã trả không được vượt quá tổng tiền');
  }

  if (dueDate && isNaN(new Date(dueDate).getTime())) {
    throw new Error('Ngày hạn thanh toán không hợp lệ');
  }

  return true;
}