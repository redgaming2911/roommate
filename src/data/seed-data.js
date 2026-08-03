import {
  CONTRACT_STATUS,
  INVOICE_STATUS,
  ROOM_STATUS,
  TENANT_STATUS
} from '../constants/statuses.js';
import { PAYMENT_METHOD } from '../constants/payment-methods.js';

const CREATED_AT = '2026-01-01T00:00:00.000Z';

export const rooms = [
  ['r1', 'P101', 'Phòng 101', ROOM_STATUS.RENTED, 1800000, 4, 1],
  ['r2', 'P102', 'Phòng 102', ROOM_STATUS.EMPTY, 2000000, 4, 1],
  ['r3', 'P103', 'Phòng 103', ROOM_STATUS.REPAIRING, 1700000, 3, 1],
  ['r4', 'P104', 'Phòng 104', ROOM_STATUS.RENTED, 2200000, 4, 1],
  ['r5', 'P105', 'Phòng 105', ROOM_STATUS.RENTED, 2100000, 4, 1],
  ['r6', 'P201', 'Phòng 201', ROOM_STATUS.EMPTY, 1900000, 3, 2],
  ['r7', 'P202', 'Phòng 202', ROOM_STATUS.RENTED, 2300000, 4, 2],
  ['r8', 'P203', 'Phòng 203', ROOM_STATUS.REPAIRING, 2000000, 3, 2],
  ['r9', 'P204', 'Phòng 204', ROOM_STATUS.EMPTY, 1800000, 3, 2],
  ['r10', 'P205', 'Phòng 205', ROOM_STATUS.RENTED, 1750000, 3, 2]
].map(([id, code, name, status, price, maxOccupants, floor]) => ({
  id,
  code,
  name,
  type: 'standard',
  price,
  area: 24,
  maxOccupants,
  floor,
  areaName: `Tầng ${floor}`,
  status,
  note: '',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT
}));

export const tenants = Array.from({ length: 15 }, (_, index) => ({
  id: `t${index + 1}`,
  name: `Người thuê ${index + 1}`,
  phone: `09000000${String(index + 1).padStart(2, '0')}`,
  cccd: `07920600${String(index + 1).padStart(4, '0')}`,
  birthDate: `199${index % 10}-01-01`,
  gender: index % 2 === 0 ? 'male' : 'female',
  permanentAddress: 'TP. Hồ Chí Minh',
  occupation: 'Nhân viên văn phòng',
  vehiclePlate: '',
  emergencyContactName: `Liên hệ ${index + 1}`,
  emergencyContactPhone: `09100000${String(index + 1).padStart(2, '0')}`,
  note: '',
  status: [0, 1, 2, 3, 5].includes(index)
    ? TENANT_STATUS.ACTIVE
    : TENANT_STATUS.INACTIVE,
  isArchived: false,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT
}));

export const contracts = [
  ['c1', 'HD001', 'r1', 't1', '2026-01-01', '2026-12-31', 1800000, CONTRACT_STATUS.ACTIVE],
  ['c2', 'HD002', 'r4', 't2', '2026-02-01', '2026-11-01', 2200000, CONTRACT_STATUS.ACTIVE],
  ['c3', 'HD003', 'r5', 't3', '2026-03-01', '2026-08-30', 2100000, CONTRACT_STATUS.SOON_EXPIRE],
  ['c4', 'HD004', 'r7', 't4', '2026-01-15', '2026-10-10', 2300000, CONTRACT_STATUS.ACTIVE],
  ['c5', 'HD005', 'r9', 't5', '2025-01-01', '2025-06-01', 1800000, CONTRACT_STATUS.ENDED],
  ['c6', 'HD006', 'r10', 't6', '2026-03-01', '2026-09-01', 1750000, CONTRACT_STATUS.ACTIVE],
  ['c7', 'HD007', 'r1', 't7', '2025-01-01', '2025-12-31', 1700000, CONTRACT_STATUS.ENDED],
  ['c8', 'HD008', 'r4', 't8', '2025-01-01', '2025-12-31', 2000000, CONTRACT_STATUS.ENDED]
].map(([id, code, roomId, tenantId, startDate, endDate, rentAmount, status]) => ({
  id,
  code,
  roomId,
  tenantId,
  tenantIds: [tenantId],
  startDate,
  endDate,
  actualEndDate: status === CONTRACT_STATUS.ENDED ? endDate : null,
  rentAmount,
  depositAmount: rentAmount,
  paymentDay: 10,
  vehicleCount: 1,
  status,
  terms: '',
  note: '',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT
}));

export const services = [
  ['s1', 'DIEN', 'Điện', 'kWh', 3500, 'usage'],
  ['s2', 'NUOC', 'Nước', 'm³', 15000, 'usage'],
  ['s3', 'INTERNET', 'Internet', 'phòng', 100000, 'fixed'],
  ['s4', 'VESINH', 'Phí vệ sinh', 'phòng', 20000, 'fixed'],
  ['s5', 'XEMAY', 'Giữ xe', 'xe', 50000, 'perVehicle'],
  ['s6', 'QUANLY', 'Phí quản lý', 'phòng', 70000, 'fixed']
].map(([id, code, name, unit, unitPrice, calculationType]) => ({
  id,
  code,
  name,
  unit,
  unitPrice,
  calculationType,
  status: 'active',
  startDate: '2026-01-01',
  endDate: null,
  note: '',
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT
}));

export const meterReadings = [
  ['m1', 'r1', '2026-06', 120, 15, 120, 15],
  ['m2', 'r1', '2026-07', 150, 18, 30, 3],
  ['m3', 'r1', '2026-08', 170, 20, 20, 2]
].map(([id, roomId, monthKey, electricIndex, waterIndex, electricUsage, waterUsage]) => ({
  id,
  roomId,
  monthKey,
  electricIndex,
  waterIndex,
  electricUsage,
  waterUsage,
  recordedAt: `${monthKey}-01T00:00:00.000Z`,
  recordedBy: 'Admin',
  note: '',
  createdAt: `${monthKey}-01T00:00:00.000Z`,
  updatedAt: `${monthKey}-01T00:00:00.000Z`
}));

const invoiceSeeds = [
  ['i1', 'r1', 'c1', '2026-03', 2500000, INVOICE_STATUS.OVERDUE],
  ['i2', 'r4', 'c2', '2026-03', 2600000, INVOICE_STATUS.OVERDUE],
  ['i3', 'r5', 'c3', '2026-04', 2400000, INVOICE_STATUS.PAID],
  ['i4', 'r7', 'c4', '2026-05', 2800000, INVOICE_STATUS.OVERDUE],
  ['i5', 'r10', 'c6', '2026-06', 2300000, INVOICE_STATUS.OVERDUE],
  ['i6', 'r10', 'c6', '2026-07', 2200000, INVOICE_STATUS.PAID],
  ['i7', 'r1', 'c1', '2026-07', 2600000, INVOICE_STATUS.OVERDUE],
  ['i8', 'r4', 'c2', '2026-07', 2550000, INVOICE_STATUS.OVERDUE],
  ['i9', 'r5', 'c3', '2026-08', 2450000, INVOICE_STATUS.UNPAID],
  ['i10', 'r7', 'c4', '2026-08', 2750000, INVOICE_STATUS.PAID]
];

const paidByInvoice = {
  i2: 1500000,
  i3: 2400000,
  i5: 500000,
  i6: 2200000,
  i7: 1500000,
  i8: 1000000,
  i10: 2750000
};

export const invoices = invoiceSeeds.map(([
  id,
  roomId,
  contractId,
  month,
  total,
  status
], index) => {
  const paidAmount = paidByInvoice[id] || 0;

  return {
    id,
    invoiceCode: `HD-${month.replace('-', '')}-${String(index + 1).padStart(3, '0')}`,
    roomId,
    contractId,
    month,
    issueDate: `${month}-01`,
    dueDate: `${month}-10`,
    items: [{
      id: `${id}-rent`,
      type: 'rent',
      name: 'Tiền phòng và dịch vụ',
      unitPrice: total,
      quantity: 1,
      amount: total
    }],
    discount: 0,
    total,
    paidAmount,
    remainingAmount: Math.max(total - paidAmount, 0),
    status,
    note: '',
    createdAt: `${month}-01T00:00:00.000Z`,
    updatedAt: `${month}-01T00:00:00.000Z`
  };
});

export const payments = [
  ['p1', 'i2', 1000000, PAYMENT_METHOD.CASH, '2026-03-10'],
  ['p2', 'i3', 2400000, PAYMENT_METHOD.BANK_TRANSFER, '2026-04-08'],
  ['p3', 'i6', 2200000, PAYMENT_METHOD.MOMO, '2026-07-09'],
  ['p4', 'i10', 2750000, PAYMENT_METHOD.ZALOPAY, '2026-08-02'],
  ['p5', 'i7', 1500000, PAYMENT_METHOD.CASH, '2026-07-11'],
  ['p6', 'i2', 500000, PAYMENT_METHOD.CASH, '2026-03-18'],
  ['p7', 'i8', 1000000, PAYMENT_METHOD.BANK_TRANSFER, '2026-07-15'],
  ['p8', 'i5', 500000, PAYMENT_METHOD.CASH, '2026-06-20']
].map(([id, invoiceId, amount, method, paymentDate]) => ({
  id,
  code: `TT-${id.slice(1).padStart(3, '0')}`,
  invoiceId,
  amount,
  method,
  paymentDate,
  referenceCode: '',
  content: 'Thanh toán hóa đơn',
  note: '',
  createdAt: `${paymentDate}T00:00:00.000Z`,
  updatedAt: `${paymentDate}T00:00:00.000Z`
}));
