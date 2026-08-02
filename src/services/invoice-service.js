// invoice-service.js

import * as InvoiceCalculator from '../business/invoice-calculator.js';
import { validateInvoice } from '../business/invoice-validator.js';
import { taoId } from '../utils/ma.js';
import StorageService from './storage-service.js';

// giả định các storage key
const KEY = 'invoices';
const CONTRACT_KEY = 'contracts';
const METER_KEY = 'meterReadings';
const SERVICE_KEY = 'serviceConfigs';
const ROOM_KEY = 'rooms';

// ======================
// Helpers
// ======================

function getAllContracts() {
  return StorageService.get(CONTRACT_KEY) || [];
}

function getAllMeters() {
  return StorageService.get(METER_KEY) || [];
}

function getAllServices() {
  return StorageService.get(SERVICE_KEY) || [];
}

function getAllRooms() {
  return StorageService.get(ROOM_KEY) || [];
}

function getRoomById(roomId) {
  return getAllRooms().find(
    (room) => room.id === roomId
  );
}

function calculateDueDate(contract, month) {
  const paymentDay = Number(
    contract.paymentDay ??
    contract.monthlyPaymentDay ??
    contract.dueDay
  );

  if (
    !Number.isInteger(paymentDay) ||
    paymentDay < 1 ||
    paymentDay > 31
  ) {
    throw new Error(
      'Ngày thanh toán hàng tháng trong hợp đồng không hợp lệ'
    );
  }

  const [year, monthNumber] = month
    .split('-')
    .map(Number);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthNumber) ||
    monthNumber < 1 ||
    monthNumber > 12
  ) {
    throw new Error('Tháng hóa đơn không hợp lệ');
  }

  const lastDayOfMonth = new Date(
    year,
    monthNumber,
    0
  ).getDate();

  const normalizedDay = Math.min(
    paymentDay,
    lastDayOfMonth
  );

  return [
    year,
    String(monthNumber).padStart(2, '0'),
    String(normalizedDay).padStart(2, '0')
  ].join('-');
}

function createInvoiceCode(month, room) {
  const roomCode =
    room?.roomCode ??
    room?.code;

  if (!roomCode) {
    throw new Error(
      'Không thể tạo mã hóa đơn vì phòng chưa có mã'
    );
  }

  const normalizedMonth = month.replace('-', '');

  return `HD-${normalizedMonth}-${String(roomCode)
    .trim()
    .toUpperCase()}`;
}

function isContractActive(contract, month) {
  const start = new Date(contract.startDate);
  const end = contract.endDate ? new Date(contract.endDate) : null;
  const m = new Date(`${month}-01`);

  return start <= m && (!end || end >= m);
}

function getContractByRoomAndMonth(roomId, month) {
  return getAllContracts().find(
    (contract) =>
      contract.roomId === roomId &&
      isContractActive(contract, month)
  );
}

function getMeterReading(roomId, month) {
  return getAllMeters().find(
    (reading) =>
      reading.roomId === roomId &&
      reading.month === month
  );
}

function buildInvoiceItems({ contract, meter, services }) {
  const items = [];

  // Tiền phòng
  items.push({
    type: 'rent',
    name: 'Tiền phòng',
    unitPrice: contract.rentPrice,
    quantity: 1,
    amount: contract.rentPrice
  });

  // Điện
  if (meter.electricUsage != null) {
    const amount = InvoiceCalculator.calculateElectricAmount(
      meter.electricUsage,
      meter.electricPrice
    );

    items.push({
      type: 'electric',
      name: 'Tiền điện',
      unitPrice: meter.electricPrice,
      quantity: meter.electricUsage,
      amount
    });
  }

  // Nước
  if (meter.waterUsage != null) {
    const amount = InvoiceCalculator.calculateWaterAmount(
      meter.waterUsage,
      meter.waterPrice
    );

    items.push({
      type: 'water',
      name: 'Tiền nước',
      unitPrice: meter.waterPrice,
      quantity: meter.waterUsage,
      amount
    });
  }

  // Dịch vụ
  services.forEach((service) => {
    let amount = 0;

    if (service.type === 'fixed') {
      amount = InvoiceCalculator.calculateFixedServiceAmount(
        service.price
      );
    }

    if (service.type === 'per_person') {
      amount = InvoiceCalculator.calculatePerPersonAmount(
        contract.personCount || 1,
        service.price
      );
    }

    if (service.type === 'per_vehicle') {
      amount = InvoiceCalculator.calculatePerVehicleAmount(
        contract.vehicleCount || 0,
        service.price
      );
    }

    items.push({
      type: 'service',
      name: service.name,
      unitPrice: service.price,
      quantity: 1,
      amount
    });
  });

  return items;
}

// ======================
// Service functions
// ======================

export function getInvoices() {
  return StorageService.get(KEY) || [];
}

export function getInvoiceById(id) {
  return getInvoices().find((invoice) => invoice.id === id);
}

export function getInvoiceByRoomAndMonth(roomId, month) {
  return getInvoices().find(
    (invoice) =>
      invoice.roomId === roomId &&
      invoice.month === month
  );
}

export function createInvoice(data) {
  const invoices = getInvoices();

  if (getInvoiceByRoomAndMonth(data.roomId, data.month)) {
    throw new Error(
      'Đã tồn tại hóa đơn cho phòng trong tháng này'
    );
  }

  const room = getRoomById(data.roomId);

  if (!room) {
    throw new Error('Không tìm thấy phòng');
  }

  const invoice = {
    id: taoId(),
    invoiceCode:
      data.invoiceCode ??
      createInvoiceCode(data.month, room),
    status: 'draft',
    paidAmount: 0,
    createdAt: new Date().toISOString(),
    ...data
  };

  validateInvoice(invoice);

  invoices.push(invoice);
  StorageService.set(KEY, invoices);

  return invoice;
}

export function generateInvoiceForRoom(
  roomId,
  month,
  discount = 0
) {
  if (getInvoiceByRoomAndMonth(roomId, month)) {
    throw new Error('Hóa đơn đã tồn tại');
  }

  const room = getRoomById(roomId);

  if (!room) {
    throw new Error('Không tìm thấy phòng');
  }

  const contract = getContractByRoomAndMonth(
    roomId,
    month
  );

  if (!contract) {
    throw new Error('Không có hợp đồng hiệu lực');
  }

  const meter = getMeterReading(roomId, month);

  if (!meter) {
    throw new Error('Chưa có chỉ số điện nước');
  }

  const services = getAllServices().filter(
    (service) => service.active
  );

  const items = buildInvoiceItems({
    contract,
    meter,
    services
  });

  const total =
    InvoiceCalculator.calculateInvoiceTotal(
      items,
      discount
    );

  const dueDate = calculateDueDate(
    contract,
    month
  );

  const invoice = {
    id: taoId(),
    invoiceCode: createInvoiceCode(
      month,
      room
    ),
    roomId,
    month,
    dueDate,
    items,
    discount,
    total,
    paidAmount: 0,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  validateInvoice(invoice);

  const invoices = getInvoices();

  invoices.push(invoice);
  StorageService.set(KEY, invoices);

  return invoice;
}

export function generateInvoicesForMonth(
  month,
  discount = 0
) {
  const contracts = getAllContracts().filter(
    (contract) => isContractActive(contract, month)
  );

  const results = [];

  contracts.forEach((contract) => {
    try {
      const invoice = generateInvoiceForRoom(
        contract.roomId,
        month,
        discount
      );

      results.push({
        success: true,
        invoice
      });
    } catch (error) {
      results.push({
        success: false,
        roomId: contract.roomId,
        error: error.message
      });
    }
  });

  return results;
}

export function updateDraftInvoice(id, data) {
  const invoices = getInvoices();
  const index = invoices.findIndex(
    (invoice) => invoice.id === id
  );

  if (index === -1) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const invoice = invoices[index];

  if (invoice.status !== 'draft') {
    throw new Error('Chỉ được sửa hóa đơn nháp');
  }

  const updated = {
    ...invoice,
    ...data,
    updatedAt: new Date().toISOString()
  };

  const discount = updated.discount ?? 0;

  updated.total = InvoiceCalculator.calculateInvoiceTotal(
    updated.items,
    discount
  );

  validateInvoice(updated);

  invoices[index] = updated;
  StorageService.set(KEY, invoices);

  return updated;
}

export function addManualItem(invoiceId, item) {
  const invoices = getInvoices();
  const index = invoices.findIndex(
    (invoice) => invoice.id === invoiceId
  );

  if (index === -1) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const invoice = invoices[index];

  if (invoice.status !== 'draft') {
    throw new Error(
      'Chỉ được thêm khoản phát sinh vào hóa đơn nháp'
    );
  }

  if (!item || typeof item !== 'object') {
    throw new Error('Khoản phát sinh không hợp lệ');
  }

  const name =
    typeof item.name === 'string'
      ? item.name.trim()
      : '';

  if (!name) {
    throw new Error('Tên khoản phát sinh là bắt buộc');
  }

  const quantity = item.quantity ?? 1;
  const unitPrice = item.unitPrice;
  const amount =
    item.amount ??
    Number(quantity) * Number(unitPrice);

  const manualItem = {
    id: taoId(),
    type: 'manual',
    name,
    quantity,
    unitPrice,
    amount,
    note:
      typeof item.note === 'string'
        ? item.note.trim()
        : ''
  };

  const updatedInvoice = {
    ...invoice,
    items: [...invoice.items, manualItem],
    updatedAt: new Date().toISOString()
  };

  updatedInvoice.total =
    InvoiceCalculator.calculateInvoiceTotal(
      updatedInvoice.items,
      updatedInvoice.discount ?? 0
    );

  validateInvoice(updatedInvoice);

  invoices[index] = updatedInvoice;
  StorageService.set(KEY, invoices);

  return manualItem;
}

export function removeManualItem(invoiceId, itemId) {
  const invoices = getInvoices();
  const index = invoices.findIndex(
    (invoice) => invoice.id === invoiceId
  );

  if (index === -1) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const invoice = invoices[index];

  if (invoice.status !== 'draft') {
    throw new Error('Chỉ được sửa hóa đơn nháp');
  }

  const item = invoice.items.find(
    (invoiceItem) => invoiceItem.id === itemId
  );

  if (!item) {
    throw new Error('Không tìm thấy khoản phát sinh');
  }

  if (item.type !== 'manual') {
    throw new Error(
      'Chỉ được xóa khoản phát sinh thủ công'
    );
  }

  const updatedInvoice = {
    ...invoice,
    items: invoice.items.filter(
      (invoiceItem) => invoiceItem.id !== itemId
    ),
    updatedAt: new Date().toISOString()
  };

  updatedInvoice.total =
    InvoiceCalculator.calculateInvoiceTotal(
      updatedInvoice.items,
      updatedInvoice.discount ?? 0
    );

  validateInvoice(updatedInvoice);

  invoices[index] = updatedInvoice;
  StorageService.set(KEY, invoices);

  return updatedInvoice;
}

export function finalizeInvoice(id) {
  const invoices = getInvoices();

  const index = invoices.findIndex(
    (invoice) => invoice.id === id
  );

  if (index === -1) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const invoice = invoices[index];

  if (invoice.status !== 'draft') {
    throw new Error(
      'Chỉ hóa đơn nháp mới được chốt'
    );
  }

  if (!invoice.dueDate) {
    throw new Error(
      'Hóa đơn chưa có hạn thanh toán'
    );
  }

  const now = new Date().toISOString();

  const status =
    InvoiceCalculator.determineInvoiceStatus(
      invoice.total,
      invoice.paidAmount ?? 0,
      invoice.dueDate,
      now
    );

  const finalizedInvoice = {
    ...invoice,
    status,
    finalizedAt: now,
    updatedAt: now
  };

  validateInvoice(finalizedInvoice);

  invoices[index] = finalizedInvoice;
  StorageService.set(KEY, invoices);

  return finalizedInvoice;
}

export function cancelInvoice(id) {
  const invoices = getInvoices();
  const index = invoices.findIndex(
    (invoice) => invoice.id === id
  );

  if (index === -1) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const invoice = invoices[index];

  if (invoice.status === 'paid') {
    throw new Error(
      'Không thể hủy hóa đơn đã thanh toán'
    );
  }

  if (invoice.status === 'canceled') {
    throw new Error('Hóa đơn đã được hủy');
  }

  const canceledInvoice = {
    ...invoice,
    status: 'canceled',
    canceledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  invoices[index] = canceledInvoice;
  StorageService.set(KEY, invoices);

  return canceledInvoice;
}

export function deleteDraftInvoice(id) {
  const invoices = getInvoices();
  const invoice = invoices.find(
    (item) => item.id === id
  );

  if (!invoice) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  if (invoice.status !== 'draft') {
    throw new Error('Chỉ xóa được hóa đơn nháp');
  }

  if ((invoice.paidAmount ?? 0) > 0) {
    throw new Error(
      'Không thể xóa hóa đơn đã có thanh toán'
    );
  }

  const filteredInvoices = invoices.filter(
    (item) => item.id !== id
  );

  StorageService.set(KEY, filteredInvoices);

  return true;
}

export function filterInvoices(filters = {}) {
  let invoices = getInvoices();

  if (filters.roomId) {
    invoices = invoices.filter(
      (invoice) => invoice.roomId === filters.roomId
    );
  }

  if (filters.month) {
    invoices = invoices.filter(
      (invoice) => invoice.month === filters.month
    );
  }

  if (filters.status) {
    invoices = invoices.filter(
      (invoice) => invoice.status === filters.status
    );
  }

  return invoices;
}

export function recalculateInvoice(id) {
  const invoices = getInvoices();
  const index = invoices.findIndex(
    (invoice) => invoice.id === id
  );

  if (index === -1) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  const invoice = invoices[index];

  if (invoice.status !== 'draft') {
    throw new Error(
      'Chỉ hóa đơn nháp mới được tính lại'
    );
  }

  const contract = getContractByRoomAndMonth(
    invoice.roomId,
    invoice.month
  );

  if (!contract) {
    throw new Error('Không có hợp đồng hiệu lực');
  }

  const meter = getMeterReading(
    invoice.roomId,
    invoice.month
  );

  if (!meter) {
    throw new Error('Chưa có chỉ số điện nước');
  }

  const services = getAllServices().filter(
    (service) => service.active
  );

  const automaticItems = buildInvoiceItems({
    contract,
    meter,
    services
  });

  const manualItems = invoice.items.filter(
    (item) => item.type === 'manual'
  );

  const items = [
    ...automaticItems,
    ...manualItems
  ];

  const total =
    InvoiceCalculator.calculateInvoiceTotal(
      items,
      invoice.discount ?? 0
    );

  const updatedInvoice = {
    ...invoice,
    items,
    total,
    updatedAt: new Date().toISOString()
  };

  validateInvoice(updatedInvoice);

  invoices[index] = updatedInvoice;
  StorageService.set(KEY, invoices);

  return updatedInvoice;
}