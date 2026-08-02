// tenant-service.js

import { validateTenant } from "../business/tenant-validator.js";
import { STORAGE_KEYS } from "../constants/storage-keys.js";
import { StorageService } from "./storage-service.js";

function getTenants(includeArchived = false) {
  const tenants = StorageService.get(STORAGE_KEYS.TENANTS) || [];
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  tenants.push(newTenant);
  StorageService.set(STORAGE_KEYS.TENANTS, tenants);

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

  StorageService.set(STORAGE_KEYS.TENANTS, tenants);

  return tenants[index];
}

function archiveTenant(id) {
  const tenants = getTenants(true);
  const tenant = tenants.find((t) => t.id === id);

  if (!tenant) throw new Error("Không tìm thấy người thuê");

  tenant.isArchived = true;
  tenant.updatedAt = new Date().toISOString();

  StorageService.set(STORAGE_KEYS.TENANTS, tenants);

  return tenant;
}

function deleteTenant(id) {
  const tenants = getTenants(true);
  const contracts = StorageService.get(STORAGE_KEYS.CONTRACTS) || [];

  const hasActiveContract = contracts.some(
    (c) => c.tenantId === id && c.status === "active"
  );

  if (hasActiveContract) {
    throw new Error("Không thể xóa người thuê có hợp đồng hiệu lực");
  }

  const newTenants = tenants.filter((t) => t.id !== id);

  StorageService.set(STORAGE_KEYS.TENANTS, newTenants);
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
  const contracts = StorageService.get(STORAGE_KEYS.CONTRACTS) || [];
  return contracts.filter((c) => c.tenantId === tenantId);
}

function getCurrentRoomOfTenant(tenantId) {
  const contracts = StorageService.get(STORAGE_KEYS.CONTRACTS) || [];
  const rooms = StorageService.get(STORAGE_KEYS.ROOMS) || [];

  const activeContract = contracts.find(
    (c) => c.tenantId === tenantId && c.status === "active"
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