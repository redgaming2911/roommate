import { STORAGE_KEYS } from "../constants/storage-keys.js";
import * as StorageService from "./storage-service.js";
import * as RoomService from "./room-service.js";
import { CONTRACT_STATUS, ROOM_STATUS } from '../constants/statuses.js';

import { validateContract } from "../business/contract-validator.js";
import {
  isContractActive,
  isContractExpiringSoon,
} from "../business/contract-utils.js";

/**
 * Helpers
 */
function getAll() {
  return StorageService.getAll(STORAGE_KEYS.CONTRACTS);
}

function saveAll(contracts) {
  StorageService.replaceAll(STORAGE_KEYS.CONTRACTS, contracts);
}

function findIndexById(contracts, id) {
  return contracts.findIndex((c) => c.id === id);
}

function ensureNotEnded(contract) {
  if (contract.status === CONTRACT_STATUS.ENDED || contract.status === CONTRACT_STATUS.CANCELLED) {
    throw new Error("Không thể chỉnh sửa hợp đồng đã kết thúc");
  }
}

/**
 * Public APIs
 */

function getContracts() {
  return getAll();
}

function getContractById(id) {
  return getAll().find((c) => c.id === id) || null;
}

function createContract(data) {
  const contracts = getAll();

  const room = RoomService.getRoomById(data.roomId);
  if (!room) throw new Error("Phòng không tồn tại");

  const representative = StorageService.getById(
    STORAGE_KEYS.TENANTS,
    data.tenantId
  );
  if (!representative) throw new Error('Người đại diện không tồn tại');

  const duplicateCode = contracts.some((contract) =>
    String(contract.code).toUpperCase() ===
      String(data.code).trim().toUpperCase()
  );
  if (duplicateCode) throw new Error('Mã hợp đồng đã tồn tại');

  const validated = validateContract(data, {
    existingContracts: contracts,
    room,
    tenantIds: data.tenantIds || [],
  });

  const newContract = {
    ...validated,
    id: crypto.randomUUID(),
    status: CONTRACT_STATUS.DRAFT,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  contracts.push(newContract);
  saveAll(contracts);

  return newContract;
}

function updateContract(id, data) {
  const contracts = getAll();
  const index = findIndexById(contracts, id);

  if (index === -1) throw new Error("Không tìm thấy hợp đồng");

  const existing = contracts[index];
  ensureNotEnded(existing);

  if (data.code) {
    const duplicateCode = contracts.some((contract) =>
      contract.id !== id &&
      String(contract.code).toUpperCase() ===
        String(data.code).trim().toUpperCase()
    );
    if (duplicateCode) throw new Error('Mã hợp đồng đã tồn tại');
  }

  const room = RoomService.getRoomById(data.roomId || existing.roomId);

  const validated = validateContract(
    { ...existing, ...data },
    {
      existingContracts: contracts.filter((c) => c.id !== id),
      room,
      tenantIds: data.tenantIds || existing.tenantIds || [],
    }
  );

  contracts[index] = {
    ...existing,
    ...validated,
    updatedAt: new Date().toISOString(),
  };

  saveAll(contracts);
  return contracts[index];
}

function activateContract(id) {
  const contracts = getAll();
  const index = findIndexById(contracts, id);

  if (index === -1) throw new Error("Không tìm thấy hợp đồng");

  const contract = contracts[index];
  ensureNotEnded(contract);

  const room = RoomService.getRoomById(contract.roomId);

  validateContract(contract, {
    existingContracts: contracts.filter((c) => c.id !== id),
    room,
    tenantIds: contract.tenantIds || [],
  });

  // Update contract
  contract.status = CONTRACT_STATUS.ACTIVE;
  contract.updatedAt = new Date().toISOString();
  RoomService.updateRoom(room.id, { status: ROOM_STATUS.RENTED });
  saveAll(contracts);
  return contract;
}

function extendContract(id, newEndDate) {
  const contracts = getAll();
  const index = findIndexById(contracts, id);

  if (index === -1) throw new Error("Không tìm thấy hợp đồng");

  const contract = contracts[index];
  ensureNotEnded(contract);

  const updated = {
    ...contract,
    endDate: newEndDate,
  };

  const room = RoomService.getRoomById(contract.roomId);

  validateContract(updated, {
    existingContracts: contracts.filter((c) => c.id !== id),
    room,
    tenantIds: contract.tenantIds || [],
  });

  contracts[index] = {
    ...updated,
    updatedAt: new Date().toISOString(),
  };

  saveAll(contracts);
  return contracts[index];
}

function endContract(id, actualEndDate = new Date().toISOString()) {
  const contracts = getAll();
  const index = findIndexById(contracts, id);

  if (index === -1) throw new Error("Không tìm thấy hợp đồng");

  const contract = contracts[index];

  contract.status = CONTRACT_STATUS.ENDED;
  contract.actualEndDate = actualEndDate;
  contract.updatedAt = new Date().toISOString();

  // Check if room still has active contract
  const stillActive = contracts.some(
    (c) =>
      c.id !== id &&
      c.roomId === contract.roomId &&
      isContractActive(c)
  );

  saveAll(contracts);

  if (!stillActive) {
    RoomService.updateRoom(contract.roomId, {
      status: ROOM_STATUS.EMPTY,
    });
  }
  return contract;
}

function cancelContract(id) {
  const contracts = getAll();
  const index = findIndexById(contracts, id);

  if (index === -1) throw new Error("Không tìm thấy hợp đồng");

  const contract = contracts[index];
  ensureNotEnded(contract);

  contract.status = CONTRACT_STATUS.CANCELLED;
  contract.updatedAt = new Date().toISOString();

  saveAll(contracts);

  const stillActive = contracts.some((item) =>
    item.id !== id &&
    item.roomId === contract.roomId &&
    isContractActive(item)
  );

  if (!stillActive && RoomService.getRoomById(contract.roomId).status === ROOM_STATUS.RENTED) {
    RoomService.updateRoom(contract.roomId, { status: ROOM_STATUS.EMPTY });
  }

  return contract;
}

function searchContracts(keyword) {
  const contracts = getAll();

  if (!keyword) return contracts;

  const k = keyword.toLowerCase();

  return contracts.filter(
    (c) =>
      c.id.toLowerCase().includes(k) ||
      (c.roomId && c.roomId.toLowerCase().includes(k))
  );
}

function filterContracts(filters = {}) {
  let contracts = getAll();

  if (filters.keyword) {
    const keyword = String(filters.keyword).trim().toLowerCase();
    contracts = contracts.filter((contract) =>
      String(contract.code ?? contract.id).toLowerCase().includes(keyword)
    );
  }

  if (filters.status) {
    contracts = contracts.filter((c) => c.status === filters.status);
  }

  if (filters.roomId) {
    contracts = contracts.filter((c) => c.roomId === filters.roomId);
  }

  return contracts;
}

function getActiveContractByRoom(roomId) {
  return getAll().find(
    (c) => c.roomId === roomId &&
      [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.SOON_EXPIRE].includes(c.status)
  );
}

function getExpiringContracts(days = 7) {
  const now = new Date();

  return getAll().filter((c) =>
    isContractExpiringSoon(c, now, days)
  );
}

export const ContractService = {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  activateContract,
  extendContract,
  endContract,
  cancelContract,
  searchContracts,
  filterContracts,
  getActiveContractByRoom,
  getExpiringContracts,
};
