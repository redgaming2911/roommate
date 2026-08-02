import { STORAGE_KEYS } from '../constants/storage-keys.js';
import * as storage from './storage-service.js';
import * as seed from '../data/seed-data.js';

/**
 * Kiểm tra key có dữ liệu chưa
 * @param {string} key
 * @returns {boolean}
 */
function hasData(key) {
  const items = storage.getAll(key);
  return Array.isArray(items) && items.length > 0;
}

/**
 * Seed nếu chưa có dữ liệu
 */
export function seedIfEmpty() {
  if (!hasData(STORAGE_KEYS.ROOMS)) {
    storage.replaceAll(STORAGE_KEYS.ROOMS, seed.rooms);
  }

  if (!hasData(STORAGE_KEYS.TENANTS)) {
    storage.replaceAll(STORAGE_KEYS.TENANTS, seed.tenants);
  }

  if (!hasData(STORAGE_KEYS.CONTRACTS)) {
    storage.replaceAll(STORAGE_KEYS.CONTRACTS, seed.contracts);
  }

  if (!hasData(STORAGE_KEYS.METER_READINGS)) {
    storage.replaceAll(STORAGE_KEYS.METER_READINGS, seed.meterReadings);
  }

  if (!hasData(STORAGE_KEYS.SERVICE_CONFIGS)) {
    storage.replaceAll(STORAGE_KEYS.SERVICE_CONFIGS, seed.services);
  }

  if (!hasData(STORAGE_KEYS.INVOICES)) {
    storage.replaceAll(STORAGE_KEYS.INVOICES, seed.invoices);
  }

  if (!hasData(STORAGE_KEYS.PAYMENTS)) {
    storage.replaceAll(STORAGE_KEYS.PAYMENTS, seed.payments);
  }
}

/**
 * Reset toàn bộ về seed data
 */
export function resetToSeedData() {
  storage.replaceAll(STORAGE_KEYS.ROOMS, seed.rooms);
  storage.replaceAll(STORAGE_KEYS.TENANTS, seed.tenants);
  storage.replaceAll(STORAGE_KEYS.CONTRACTS, seed.contracts);
  storage.replaceAll(STORAGE_KEYS.METER_READINGS, seed.meterReadings);
  storage.replaceAll(STORAGE_KEYS.SERVICE_CONFIGS, seed.services);
  storage.replaceAll(STORAGE_KEYS.INVOICES, seed.invoices);
  storage.replaceAll(STORAGE_KEYS.PAYMENTS, seed.payments);
}