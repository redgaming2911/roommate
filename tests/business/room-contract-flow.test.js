import { beforeEach, describe, expect, it } from 'vitest';
import { CONTRACT_STATUS, ROOM_STATUS } from '../../src/constants/statuses.js';
import { STORAGE_KEYS } from '../../src/constants/storage-keys.js';
import { ContractService } from '../../src/services/contract-service.js';
import * as RoomService from '../../src/services/room-service.js';
import * as StorageService from '../../src/services/storage-service.js';
import { TenantService } from '../../src/services/tenant-service.js';

function createEmptyRoom(overrides = {}) {
  return RoomService.createRoom({
    code: 'P-TEST-101',
    name: 'Phòng test 101',
    type: 'standard',
    price: 2000000,
    maxOccupants: 3,
    status: ROOM_STATUS.EMPTY,
    ...overrides
  });
}

function createTestTenant(overrides = {}) {
  return TenantService.createTenant({
    name: 'Nguyễn Văn Test',
    phone: '0901234567',
    cccd: '079206001234',
    ...overrides
  });
}

function createDraftContract(room, tenant, overrides = {}) {
  return ContractService.createContract({
    code: 'HD-TEST-001',
    roomId: room.id,
    tenantId: tenant.id,
    tenantIds: [tenant.id],
    startDate: '2026-08-01',
    endDate: '2027-07-31',
    rentAmount: room.price,
    depositAmount: room.price,
    paymentDay: 10,
    ...overrides
  });
}

describe('Business flow: phòng → người thuê → hợp đồng → kích hoạt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('kích hoạt hợp đồng và chuyển phòng trống thành đang thuê', () => {
    expect(localStorage).toBeInstanceOf(Storage);

    const room = createEmptyRoom();
    expect(RoomService.getRoomById(room.id).status).toBe(ROOM_STATUS.EMPTY);

    const tenant = createTestTenant();
    const draftContract = createDraftContract(room, tenant);

    const storedDraft = ContractService.getContractById(draftContract.id);
    expect(storedDraft).not.toBeNull();
    expect(storedDraft.status).toBe(CONTRACT_STATUS.DRAFT);
    expect(storedDraft.roomId).toBe(room.id);
    expect(storedDraft.tenantId).toBe(tenant.id);
    expect(storedDraft.tenantIds).toEqual([tenant.id]);

    const activatedContract = ContractService.activateContract(draftContract.id);

    expect(activatedContract.status).toBe(CONTRACT_STATUS.ACTIVE);

    const storedContracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);
    expect(storedContracts).toHaveLength(1);
    expect(storedContracts[0]).toMatchObject({
      id: draftContract.id,
      roomId: room.id,
      tenantId: tenant.id,
      tenantIds: [tenant.id],
      status: CONTRACT_STATUS.ACTIVE
    });

    const rentedRoom = RoomService.getRoomById(room.id);
    expect(rentedRoom.status).toBe(ROOM_STATUS.RENTED);

    const linkedTenant = TenantService.getTenantById(tenant.id);
    expect(linkedTenant).toMatchObject({
      id: tenant.id,
      name: 'Nguyễn Văn Test',
      phone: '0901234567'
    });
    expect(TenantService.getCurrentRoomOfTenant(tenant.id)?.id).toBe(room.id);
  });

  it('không cho tạo hợp đồng trùng thời gian cho cùng một phòng', () => {
    const room = createEmptyRoom({ code: 'P-TEST-OVERLAP' });
    const firstTenant = createTestTenant();
    const secondTenant = createTestTenant({
      name: 'Trần Thị Test',
      phone: '0912345678',
      cccd: '079206005678'
    });

    const firstContract = createDraftContract(room, firstTenant);

    expect(() => createDraftContract(room, secondTenant, {
      code: 'HD-TEST-002',
      startDate: '2027-01-01',
      endDate: '2027-12-31'
    })).toThrow('Phòng đã có hợp đồng trong khoảng thời gian này');

    const storedContracts = ContractService.getContracts();
    expect(storedContracts).toHaveLength(1);
    expect(storedContracts[0].id).toBe(firstContract.id);
    expect(storedContracts[0].tenantId).toBe(firstTenant.id);
    expect(RoomService.getRoomById(room.id).status).toBe(ROOM_STATUS.EMPTY);
  });
});
