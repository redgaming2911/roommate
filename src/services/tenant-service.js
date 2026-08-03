// tenant-service.js

import * as StorageService from "./storage-service.js";
import { STORAGE_KEYS } from "../constants/storage-keys.js";
import { validateTenant } from "../business/tenant-validator.js";
import { CONTRACT_STATUS, TENANT_STATUS } from "../constants/statuses.js";

function getTenants(includeArchived = false) {
  const tenants = StorageService.getAll(STORAGE_KEYS.TENANTS);
  return includeArchived ? tenants : tenants.filter((t) => !t.isArchived);
}

function getTenantById(id) {
  const tenants = getTenants(true);
  return tenants.find((t) => t.id === id) || null;
}

function createTenant(data) {
  const tenants = getTenants(true);

  const validated = validateTenant(data, tenants);

  const newTenant = {
    ...validated,
    id: crypto.randomUUID(),
    isArchived: false,
    status: validated.status || TENANT_STATUS.INACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tenants.push(newTenant);
  StorageService.replaceAll(STORAGE_KEYS.TENANTS, tenants);

  return newTenant;
}

function updateTenant(id, data) {
  const tenants = getTenants(true);
  const index = tenants.findIndex((t) => t.id === id);

  if (index === -1) throw new Error("Không tìm thấy người thuê");

  const validated = validateTenant(data, tenants, true, id);

  tenants[index] = {
    ...tenants[index],
    ...validated,
    updatedAt: new Date().toISOString(),
  };

  StorageService.replaceAll(STORAGE_KEYS.TENANTS, tenants);

  return tenants[index];
}

function archiveTenant(id) {
  const tenants = getTenants(true);
  const tenant = tenants.find((t) => t.id === id);

  if (!tenant) throw new Error("Không tìm thấy người thuê");

  tenant.isArchived = true;
  tenant.status = TENANT_STATUS.ARCHIVED;
  tenant.updatedAt = new Date().toISOString();

  StorageService.replaceAll(STORAGE_KEYS.TENANTS, tenants);

  return tenant;
}

function deleteTenant(id) {
  const tenants = getTenants(true);
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);

  const hasActiveContract = contracts.some((contract) =>
    [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.SOON_EXPIRE].includes(contract.status) &&
    (contract.tenantId === id || contract.tenantIds?.includes(id))
  );

  if (hasActiveContract) {
    throw new Error("Không thể xóa người thuê có hợp đồng hiệu lực");
  }

  const newTenants = tenants.filter((t) => t.id !== id);

  StorageService.replaceAll(STORAGE_KEYS.TENANTS, newTenants);
}

function searchTenants(keyword) {
  const tenants = getTenants();

  if (!keyword) return tenants;

  const k = keyword.toLowerCase();

  return tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(k) ||
      t.phone.includes(k) ||
      (t.cccd && t.cccd.includes(k))
  );
}

function getTenantRentalHistory(tenantId) {
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);
  return contracts.filter((contract) =>
    contract.tenantId === tenantId || contract.tenantIds?.includes(tenantId)
  );
}

function getCurrentRoomOfTenant(tenantId) {
  const contracts = StorageService.getAll(STORAGE_KEYS.CONTRACTS);
  const rooms = StorageService.getAll(STORAGE_KEYS.ROOMS);

  const activeContract = contracts.find((contract) =>
    [CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.SOON_EXPIRE].includes(contract.status) &&
    (contract.tenantId === tenantId || contract.tenantIds?.includes(tenantId))
  );

  if (!activeContract) return null;

  return rooms.find((r) => r.id === activeContract.roomId) || null;
}

export const TenantService = {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  archiveTenant,
  deleteTenant,
  searchTenants,
  getTenantRentalHistory,
  getCurrentRoomOfTenant,
};
