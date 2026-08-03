import { beforeEach, describe, expect, it } from 'vitest';
import { INVOICE_STATUS, ROOM_STATUS } from '../../src/constants/statuses.js';
import { ContractService } from '../../src/services/contract-service.js';
import * as InvoiceService from '../../src/services/invoice-service.js';
import { MeterReadingService } from '../../src/services/meter-reading-service.js';
import * as RoomService from '../../src/services/room-service.js';
import { ServiceConfigService } from '../../src/services/service-config-service.js';
import { TenantService } from '../../src/services/tenant-service.js';

const INVOICE_MONTH = '2026-07';

function createActiveRental(suffix) {
  const room = RoomService.createRoom({
    code: `P-${suffix}`,
    name: `Phòng ${suffix}`,
    type: 'standard',
    price: 2000000,
    maxOccupants: 3,
    status: ROOM_STATUS.EMPTY
  });

  const representative = TenantService.createTenant({
    name: `Người thuê ${suffix} A`,
    phone: `0900000${suffix}`,
    cccd: `0792060${suffix}`
  });
  const roommate = TenantService.createTenant({
    name: `Người thuê ${suffix} B`,
    phone: `0910000${suffix}`,
    cccd: `0792070${suffix}`
  });

  const draftContract = ContractService.createContract({
    code: `HD-${suffix}`,
    roomId: room.id,
    tenantId: representative.id,
    tenantIds: [representative.id, roommate.id],
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    rentAmount: 2400000,
    depositAmount: 2400000,
    paymentDay: 10
  });
  const contract = ContractService.activateContract(draftContract.id);

  return { room, representative, roommate, contract };
}

function createServiceConfigs() {
  const common = {
    status: 'active',
    startDate: '2026-01-01',
    endDate: null
  };

  return {
    electric: ServiceConfigService.create({
      ...common,
      code: 'DIEN',
      name: 'Điện',
      unit: 'kWh',
      unitPrice: 3500,
      calculationType: 'usage'
    }),
    water: ServiceConfigService.create({
      ...common,
      code: 'NUOC',
      name: 'Nước',
      unit: 'm3',
      unitPrice: 15000,
      calculationType: 'usage'
    }),
    internet: ServiceConfigService.create({
      ...common,
      code: 'INTERNET',
      name: 'Internet',
      unit: 'tháng',
      unitPrice: 100000,
      calculationType: 'fixed'
    }),
    cleaning: ServiceConfigService.create({
      ...common,
      code: 'VESINH',
      name: 'Vệ sinh',
      unit: 'người',
      unitPrice: 50000,
      calculationType: 'perPerson'
    })
  };
}

function createMeterReadings(roomId) {
  MeterReadingService.createReading({
    roomId,
    monthKey: '2026-06',
    electricIndex: 120,
    waterIndex: 30
  });

  return MeterReadingService.createReading({
    roomId,
    monthKey: INVOICE_MONTH,
    electricIndex: 165,
    waterIndex: 42
  }).data;
}

function findItem(invoice, code) {
  return invoice.items.find((item) => item.code === code);
}

describe('Business flow: phòng đang thuê → chỉ số và dịch vụ → hóa đơn', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('tạo hóa đơn với chỉ số tiêu thụ và các khoản tiền chính xác', () => {
    expect(localStorage).toBeInstanceOf(Storage);

    const { room, contract } = createActiveRental('101');
    const services = createServiceConfigs();
    const reading = createMeterReadings(room.id);

    expect(RoomService.getRoomById(room.id).status).toBe(ROOM_STATUS.RENTED);
    expect(reading.electricUsage).toBe(45);
    expect(reading.waterUsage).toBe(12);

    const invoice = InvoiceService.generateInvoiceForRoom(room.id, INVOICE_MONTH);
    const rentItem = invoice.items.find((item) => item.type === 'rent');
    const electricItem = findItem(invoice, services.electric.code);
    const waterItem = findItem(invoice, services.water.code);
    const internetItem = findItem(invoice, services.internet.code);
    const cleaningItem = findItem(invoice, services.cleaning.code);

    expect(electricItem).toMatchObject({
      quantity: 45,
      unitPrice: 3500,
      amount: 157500
    });
    expect(waterItem).toMatchObject({
      quantity: 12,
      unitPrice: 15000,
      amount: 180000
    });
    expect(rentItem).toMatchObject({
      unitPrice: contract.rentAmount,
      quantity: 1,
      amount: 2400000
    });
    expect(internetItem).toMatchObject({
      quantity: 1,
      unitPrice: 100000,
      amount: 100000
    });
    expect(cleaningItem).toMatchObject({
      quantity: 2,
      unitPrice: 50000,
      amount: 100000
    });
    expect(invoice.total).toBe(2937500);
    expect(invoice.remainingAmount).toBe(2937500);
    expect(invoice.paidAmount).toBe(0);
    expect(invoice.status).toBe(INVOICE_STATUS.DRAFT);

    expect(InvoiceService.getInvoiceById(invoice.id)).toEqual(invoice);
  });

  it('không tạo hóa đơn trùng phòng và tháng', () => {
    const { room } = createActiveRental('102');
    createServiceConfigs();
    createMeterReadings(room.id);

    const firstInvoice = InvoiceService.generateInvoiceForRoom(
      room.id,
      INVOICE_MONTH
    );

    expect(() => InvoiceService.generateInvoiceForRoom(
      room.id,
      INVOICE_MONTH
    )).toThrow();
    expect(InvoiceService.getInvoices()).toEqual([firstInvoice]);
  });

  it('không tạo hóa đơn khi phòng chưa có chỉ số trong tháng', () => {
    const { room } = createActiveRental('103');
    createServiceConfigs();

    expect(() => InvoiceService.generateInvoiceForRoom(
      room.id,
      INVOICE_MONTH
    )).toThrow();
    expect(InvoiceService.getInvoices()).toEqual([]);
  });
});
