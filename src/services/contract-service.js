import { STORAGE_KEYS } from "../constants/storage-keys.js";
import * as StorageService from "./storage-service.js";
import * as RoomService from "./room-service.js";

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
  if (contract.status === "ended" || contract.status === "cancelled") {
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

  const validated = validateContract(data, {
    existingContracts: contracts,
    room,
    tenantIds: data.tenantIds || [],
  });

  const newContract = {
    ...validated,
    id: crypto.randomUUID(),
    status: "draft",
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
  contract.status = "active";
  contract.updatedAt = new Date().toISOString();

  // Update room (atomic intent)
  RoomService.updateRoom(room.id, {
    status: "occupied",
  });

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

  contract.status = "ended";
  contract.actualEndDate = actualEndDate;
  contract.updatedAt = new Date().toISOString();

  // Check if room still has active contract
  const stillActive = contracts.some(
    (c) =>
      c.id !== id &&
      c.roomId === contract.roomId &&
      isContractActive(c)
  );

  if (!stillActive) {
    RoomService.updateRoom(contract.roomId, {
      status: "empty",
    });
  }

  saveAll(contracts);
  return contract;
}

function cancelContract(id) {
  const contracts = getAll();
  const index = findIndexById(contracts, id);

  if (index === -1) throw new Error("Không tìm thấy hợp đồng");

  const contract = contracts[index];
  ensureNotEnded(contract);

  contract.status = "cancelled";
  contract.updatedAt = new Date().toISOString();

  saveAll(contracts);
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
    (c) => c.roomId === roomId && c.status === "active"
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
