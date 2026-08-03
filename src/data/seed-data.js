import { ROOM_STATUS, CONTRACT_STATUS, INVOICE_STATUS } from '../constants/statuses.js';
import { PAYMENT_METHOD } from '../constants/payment-methods.js';

// ===== ROOMS =====
export const rooms = [
  { id: 'r1', code: 'P101', price: 1800000, status: ROOM_STATUS.RENTED },
  { id: 'r2', code: 'P102', price: 2000000, status: ROOM_STATUS.EMPTY },
  { id: 'r3', code: 'P103', price: 1700000, status: ROOM_STATUS.REPAIRING },
  { id: 'r4', code: 'P104', price: 2200000, status: ROOM_STATUS.RENTED },
  { id: 'r5', code: 'P105', price: 2100000, status: ROOM_STATUS.RENTED },
  { id: 'r6', code: 'P106', price: 1900000, status: ROOM_STATUS.EMPTY },
  { id: 'r7', code: 'P107', price: 2300000, status: ROOM_STATUS.RENTED },
  { id: 'r8', code: 'P108', price: 2000000, status: ROOM_STATUS.REPAIRING },
  { id: 'r9', code: 'P109', price: 1800000, status: ROOM_STATUS.RENTED },
  { id: 'r10', code: 'P110', price: 1750000, status: ROOM_STATUS.RENTED }
];

// ===== TENANTS =====
export const tenants = Array.from({ length: 15 }).map((_, i) => ({
  id: `t${i + 1}`,
  name: `Người thuê ${i + 1}`,
  phone: `09000000${(i + 1).toString().padStart(2, '0')}`
}));

// ===== CONTRACTS =====
export const contracts = [
  { id: 'c1', roomId: 'r1', tenantId: 't1', status: CONTRACT_STATUS.ACTIVE, endDate: '2026-12-31' },
  { id: 'c2', roomId: 'r4', tenantId: 't2', status: CONTRACT_STATUS.ACTIVE, endDate: '2026-11-01' },
  { id: 'c3', roomId: 'r5', tenantId: 't3', status: CONTRACT_STATUS.SOON_EXPIRE, endDate: '2026-08-30' },
  { id: 'c4', roomId: 'r7', tenantId: 't4', status: CONTRACT_STATUS.ACTIVE, endDate: '2026-10-10' },
  { id: 'c5', roomId: 'r9', tenantId: 't5', status: CONTRACT_STATUS.EXPIRED, endDate: '2025-06-01' },
  { id: 'c6', roomId: 'r10', tenantId: 't6', status: CONTRACT_STATUS.ACTIVE, endDate: '2026-09-01' },
  { id: 'c7', roomId: 'r1', tenantId: 't7', status: CONTRACT_STATUS.TERMINATED },
  { id: 'c8', roomId: 'r4', tenantId: 't8', status: CONTRACT_STATUS.ACTIVE, endDate: '2026-12-01' }
];

// ===== SERVICES =====
export const services = [
  { id: 's1', name: 'Điện', price: 3500 },
  { id: 's2', name: 'Nước', price: 15000 },
  { id: 's3', name: 'Internet', price: 100000 },
  { id: 's4', name: 'Rác', price: 20000 },
  { id: 's5', name: 'Giữ xe', price: 50000 },
  { id: 's6', name: 'Dọn vệ sinh', price: 70000 }
];

// ===== METERS (3 months) =====
export const meterReadings = [
  { id: 'm1', roomId: 'r1', month: '2026-06', electricity: 120, water: 15 },
  { id: 'm2', roomId: 'r1', month: '2026-07', electricity: 150, water: 18 },
  { id: 'm3', roomId: 'r1', month: '2026-08', electricity: 170, water: 20 }
];

// ===== INVOICES =====
export const invoices = [
  { id: 'i1', roomId: 'r1', month: '2026-03', total: 2500000, status: INVOICE_STATUS.UNPAID },
  { id: 'i2', roomId: 'r4', month: '2026-03', total: 2600000, status: INVOICE_STATUS.PARTIAL },
  { id: 'i3', roomId: 'r5', month: '2026-04', total: 2400000, status: INVOICE_STATUS.PAID },
  { id: 'i4', roomId: 'r7', month: '2026-05', total: 2800000, status: INVOICE_STATUS.OVERDUE },
  { id: 'i5', roomId: 'r9', month: '2026-06', total: 2300000, status: INVOICE_STATUS.UNPAID },
  { id: 'i6', roomId: 'r10', month: '2026-06', total: 2200000, status: INVOICE_STATUS.PAID },
  { id: 'i7', roomId: 'r1', month: '2026-07', total: 2600000, status: INVOICE_STATUS.PARTIAL },
  { id: 'i8', roomId: 'r4', month: '2026-07', total: 2550000, status: INVOICE_STATUS.UNPAID },
  { id: 'i9', roomId: 'r5', month: '2026-08', total: 2450000, status: INVOICE_STATUS.OVERDUE },
  { id: 'i10', roomId: 'r7', month: '2026-08', total: 2750000, status: INVOICE_STATUS.PAID }
];

// ===== PAYMENTS =====
export const payments = [
  { id: 'p1', invoiceId: 'i2', amount: 1000000, method: PAYMENT_METHOD.CASH, paymentDate: '2026-03-10' },
  { id: 'p2', invoiceId: 'i3', amount: 2400000, method: PAYMENT_METHOD.BANK_TRANSFER, paymentDate: '2026-04-08' },
  { id: 'p3', invoiceId: 'i6', amount: 2200000, method: PAYMENT_METHOD.MOMO, paymentDate: '2026-06-09' },
  { id: 'p4', invoiceId: 'i10', amount: 2750000, method: PAYMENT_METHOD.ZALOPAY, paymentDate: '2026-08-02' },
  { id: 'p5', invoiceId: 'i7', amount: 1500000, method: PAYMENT_METHOD.CASH, paymentDate: '2026-07-11' },
  { id: 'p6', invoiceId: 'i2', amount: 500000, method: PAYMENT_METHOD.CASH, paymentDate: '2026-03-18' },
  { id: 'p7', invoiceId: 'i8', amount: 1000000, method: PAYMENT_METHOD.BANK_TRANSFER, paymentDate: '2026-07-15' },
  { id: 'p8', invoiceId: 'i5', amount: 500000, method: PAYMENT_METHOD.CASH, paymentDate: '2026-06-20' }
];
