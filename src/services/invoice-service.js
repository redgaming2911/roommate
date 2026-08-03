import * as InvoiceCalculator from '../business/invoice-calculator.js';
import { validateInvoice } from '../business/invoice-validator.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import {
  CONTRACT_STATUS,
  INVOICE_STATUS
} from '../constants/statuses.js';
import { generateId } from '../utils/ma.js';
import * as StorageService from './storage-service.js';

const KEY = STORAGE_KEYS.INVOICES;
const ACTIVE_CONTRACT_STATUSES = new Set([
  CONTRACT_STATUS.ACTIVE,
  CONTRACT_STATUS.SOON_EXPIRE
]);

function getAllContracts() {
  return StorageService.getAll(STORAGE_KEYS.CONTRACTS);
}

function getAllMeters() {
  return StorageService.getAll(STORAGE_KEYS.METER_READINGS);
}

function getAllServices() {
  return StorageService.getAll(STORAGE_KEYS.SERVICE_CONFIGS);
}

function getRoomById(roomId) {
  return StorageService.getById(STORAGE_KEYS.ROOMS, roomId);
}

function toNonNegativeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function calculateDueDate(contract, month) {
  const paymentDay = Number(contract.paymentDay);

  if (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31) {
    throw new Error('Ngày thanh toán hàng tháng trong hợp đồng không hợp lệ');
  }

  const [year, monthNumber] = String(month).split('-').map(Number);

  if (!Number.isInteger(year) || !Number.isInteger(monthNumber) ||
      monthNumber < 1 || monthNumber > 12) {
    throw new Error('Tháng hóa đơn không hợp lệ');
  }

  const day = Math.min(paymentDay, new Date(year, monthNumber, 0).getDate());
  return `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function createInvoiceCode(month, room) {
  const roomCode = room?.code ?? room?.roomCode;
  if (!roomCode) throw new Error('Không thể tạo mã hóa đơn vì phòng chưa có mã');

  return `HD-${month.replace('-', '')}-${String(roomCode).trim().toUpperCase()}`;
}

function getMonthRange(month) {
  const [year, monthNumber] = String(month).split('-').map(Number);
  return {
    start: new Date(year, monthNumber - 1, 1),
    end: new Date(year, monthNumber, 0, 23, 59, 59, 999)
  };
}

function isContractActive(contract, month) {
  if (!ACTIVE_CONTRACT_STATUSES.has(contract.status)) return false;

  const range = getMonthRange(month);
  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : null;

  return !Number.isNaN(start.getTime()) && start <= range.end &&
    (!end || (!Number.isNaN(end.getTime()) && end >= range.start));
}

function getContractByRoomAndMonth(roomId, month) {
  return getAllContracts().find((contract) =>
    contract.roomId === roomId && isContractActive(contract, month)
  );
}

function getMeterReading(roomId, month) {
  return getAllMeters().find((reading) =>
    reading.roomId === roomId &&
    (reading.monthKey ?? reading.month) === month
  );
}

function isServiceApplicable(service, month) {
  if (service.status !== 'active') return false;

  const range = getMonthRange(month);
  const start = service.startDate ? new Date(service.startDate) : null;
  const end = service.endDate ? new Date(service.endDate) : null;

  if (start && !Number.isNaN(start.getTime()) && start > range.end) return false;
  if (end && !Number.isNaN(end.getTime()) && end < range.start) return false;
  return true;
}

function getUsage(service, meter, contract) {
  const code = String(service.code ?? '').trim().toUpperCase();

  if (service.calculationType === 'usage') {
    if (code === 'DIEN' || code.includes('DIEN')) {
      return toNonNegativeNumber(meter.electricUsage);
    }
    if (code === 'NUOC' || code.includes('NUOC')) {
      return toNonNegativeNumber(meter.waterUsage);
    }
    return 0;
  }

  if (service.calculationType === 'perPerson') {
    const tenantIds = Array.isArray(contract.tenantIds)
      ? contract.tenantIds.filter(Boolean)
      : [];
    return tenantIds.length || (contract.tenantId ? 1 : 0);
  }

  if (service.calculationType === 'perVehicle') {
    return toNonNegativeNumber(contract.vehicleCount);
  }

  return 1;
}

function buildInvoiceItems({ contract, meter, services }) {
  const rentAmount = toNonNegativeNumber(contract.rentAmount);
  const items = [{
    type: 'rent',
    name: 'Tiền phòng',
    unitPrice: rentAmount,
    quantity: 1,
    amount: rentAmount
  }];

  services.forEach((service) => {
    if (service.calculationType === 'manual') return;

    const quantity = getUsage(service, meter, contract);
    const unitPrice = toNonNegativeNumber(service.unitPrice);

    items.push({
      serviceId: service.id,
      type: 'service',
      code: service.code,
      name: service.name,
      unit: service.unit,
      unitPrice,
      quantity,
      amount: quantity * unitPrice
    });
  });

  return items;
}

function getApplicableServices(month) {
  return getAllServices().filter((service) => isServiceApplicable(service, month));
}

export function getInvoices() {
  return StorageService.getAll(KEY);
}

export function getInvoiceById(id) {
  return getInvoices().find((invoice) => invoice.id === id);
}

export function getInvoiceByRoomAndMonth(roomId, month) {
  return getInvoices().find((invoice) =>
    invoice.roomId === roomId && invoice.month === month
  );
}

export function createInvoice(data) {
  if (getInvoiceByRoomAndMonth(data.roomId, data.month)) {
    throw new Error('Đã tồn tại hóa đơn cho phòng trong tháng này');
  }

  const room = getRoomById(data.roomId);
  if (!room) throw new Error('Không tìm thấy phòng');

  const invoice = {
    id: generateId(),
    invoiceCode: data.invoiceCode ?? createInvoiceCode(data.month, room),
    status: INVOICE_STATUS.DRAFT,
    paidAmount: 0,
    remainingAmount: toNonNegativeNumber(data.total),
    createdAt: new Date().toISOString(),
    ...data
  };

  validateInvoice(invoice);
  return StorageService.create(KEY, invoice);
}

export function generateInvoiceForRoom(roomId, month, discount = 0) {
  if (getInvoiceByRoomAndMonth(roomId, month)) {
    throw new Error('Hóa đơn đã tồn tại');
  }

  const room = getRoomById(roomId);
  if (!room) throw new Error('Không tìm thấy phòng');

  const contract = getContractByRoomAndMonth(roomId, month);
  if (!contract) throw new Error('Không có hợp đồng hiệu lực');

  const meter = getMeterReading(roomId, month);
  if (!meter) throw new Error('Chưa có chỉ số điện nước');

  const items = buildInvoiceItems({
    contract,
    meter,
    services: getApplicableServices(month)
  });
  const normalizedDiscount = toNonNegativeNumber(discount);
  const total = InvoiceCalculator.calculateInvoiceTotal(items, normalizedDiscount);
  const now = new Date().toISOString();

  const invoice = {
    id: generateId(),
    invoiceCode: createInvoiceCode(month, room),
    roomId,
    contractId: contract.id,
    month,
    dueDate: calculateDueDate(contract, month),
    items,
    discount: normalizedDiscount,
    total,
    paidAmount: 0,
    remainingAmount: total,
    status: INVOICE_STATUS.DRAFT,
    createdAt: now,
    updatedAt: now
  };

  validateInvoice(invoice);
  return StorageService.create(KEY, invoice);
}

export function generateInvoicesForMonth(month, discount = 0) {
  return getAllContracts()
    .filter((contract) => isContractActive(contract, month))
    .map((contract) => {
      try {
        return {
          success: true,
          invoice: generateInvoiceForRoom(contract.roomId, month, discount)
        };
      } catch (error) {
        return { success: false, roomId: contract.roomId, error: error.message };
      }
    });
}

export function updateDraftInvoice(id, data) {
  const invoice = getInvoiceById(id);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('Chỉ được sửa hóa đơn nháp');
  }

  const updated = { ...invoice, ...data, updatedAt: new Date().toISOString() };
  updated.total = InvoiceCalculator.calculateInvoiceTotal(
    updated.items,
    toNonNegativeNumber(updated.discount)
  );
  updated.remainingAmount = Math.max(updated.total - toNonNegativeNumber(updated.paidAmount), 0);
  validateInvoice(updated);
  return StorageService.update(KEY, id, updated);
}

export function addManualItem(invoiceId, item) {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('Chỉ được thêm khoản phát sinh vào hóa đơn nháp');
  }

  const name = typeof item?.name === 'string' ? item.name.trim() : '';
  if (!name) throw new Error('Tên khoản phát sinh là bắt buộc');

  const quantity = toNonNegativeNumber(item.quantity, 1);
  const unitPrice = toNonNegativeNumber(item.unitPrice);
  const manualItem = {
    id: generateId(),
    type: 'manual',
    name,
    quantity,
    unitPrice,
    amount: item.amount == null
      ? quantity * unitPrice
      : toNonNegativeNumber(item.amount),
    note: typeof item.note === 'string' ? item.note.trim() : ''
  };

  updateDraftInvoice(invoiceId, {
    items: [...invoice.items, manualItem]
  });
  return manualItem;
}

export function removeManualItem(invoiceId, itemId) {
  const invoice = getInvoiceById(invoiceId);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('Chỉ được sửa hóa đơn nháp');
  }

  const item = invoice.items.find((current) => current.id === itemId);
  if (!item) throw new Error('Không tìm thấy khoản phát sinh');
  if (item.type !== 'manual') {
    throw new Error('Chỉ được xóa khoản phát sinh thủ công');
  }

  return updateDraftInvoice(invoiceId, {
    items: invoice.items.filter((current) => current.id !== itemId)
  });
}

export function finalizeInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('Chỉ hóa đơn nháp mới được chốt');
  }
  if (!invoice.dueDate) throw new Error('Hóa đơn chưa có hạn thanh toán');

  const now = new Date().toISOString();
  const finalized = {
    ...invoice,
    status: InvoiceCalculator.determineInvoiceStatus(
      invoice.total,
      invoice.paidAmount ?? 0,
      invoice.dueDate,
      now
    ),
    finalizedAt: now,
    updatedAt: now
  };

  validateInvoice(finalized);
  return StorageService.update(KEY, id, finalized);
}

export function cancelInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status === INVOICE_STATUS.PAID) {
    throw new Error('Không thể hủy hóa đơn đã thanh toán');
  }
  if ([INVOICE_STATUS.CANCELLED, 'canceled'].includes(invoice.status)) {
    throw new Error('Hóa đơn đã được hủy');
  }

  const now = new Date().toISOString();
  return StorageService.update(KEY, id, {
    ...invoice,
    status: INVOICE_STATUS.CANCELLED,
    cancelledAt: now,
    updatedAt: now
  });
}

export function deleteDraftInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('Chỉ xóa được hóa đơn nháp');
  }
  if (toNonNegativeNumber(invoice.paidAmount) > 0) {
    throw new Error('Không thể xóa hóa đơn đã có thanh toán');
  }

  return StorageService.remove(KEY, id);
}

export function filterInvoices(filters = {}) {
  return getInvoices().filter((invoice) =>
    (!filters.roomId || invoice.roomId === filters.roomId) &&
    (!filters.month || invoice.month === filters.month) &&
    (!filters.status || invoice.status === filters.status)
  );
}

export function recalculateInvoice(id) {
  const invoice = getInvoiceById(id);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');
  if (invoice.status !== INVOICE_STATUS.DRAFT) {
    throw new Error('Chỉ hóa đơn nháp mới được tính lại');
  }

  const contract = getContractByRoomAndMonth(invoice.roomId, invoice.month);
  if (!contract) throw new Error('Không có hợp đồng hiệu lực');

  const meter = getMeterReading(invoice.roomId, invoice.month);
  if (!meter) throw new Error('Chưa có chỉ số điện nước');

  const automaticItems = buildInvoiceItems({
    contract,
    meter,
    services: getApplicableServices(invoice.month)
  });
  const manualItems = invoice.items.filter((item) => item.type === 'manual');

  return updateDraftInvoice(id, {
    contractId: contract.id,
    items: [...automaticItems, ...manualItems]
  });
}
