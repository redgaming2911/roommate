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
  const seededCollections = [];

  if (!hasData(STORAGE_KEYS.ROOMS)) {
    storage.replaceAll(STORAGE_KEYS.ROOMS, seed.rooms);
    seededCollections.push(STORAGE_KEYS.ROOMS);
  }

  if (!hasData(STORAGE_KEYS.TENANTS)) {
    storage.replaceAll(STORAGE_KEYS.TENANTS, seed.tenants);
    seededCollections.push(STORAGE_KEYS.TENANTS);
  }

  if (!hasData(STORAGE_KEYS.CONTRACTS)) {
    storage.replaceAll(STORAGE_KEYS.CONTRACTS, seed.contracts);
    seededCollections.push(STORAGE_KEYS.CONTRACTS);
  }

  if (!hasData(STORAGE_KEYS.METER_READINGS)) {
    storage.replaceAll(STORAGE_KEYS.METER_READINGS, seed.meterReadings);
    seededCollections.push(STORAGE_KEYS.METER_READINGS);
  }

  if (!hasData(STORAGE_KEYS.SERVICE_CONFIGS)) {
    storage.replaceAll(STORAGE_KEYS.SERVICE_CONFIGS, seed.services);
    seededCollections.push(STORAGE_KEYS.SERVICE_CONFIGS);
  }

  if (!hasData(STORAGE_KEYS.INVOICES)) {
    storage.replaceAll(STORAGE_KEYS.INVOICES, seed.invoices);
    seededCollections.push(STORAGE_KEYS.INVOICES);
  }

  if (!hasData(STORAGE_KEYS.PAYMENTS)) {
    storage.replaceAll(STORAGE_KEYS.PAYMENTS, seed.payments);
    seededCollections.push(STORAGE_KEYS.PAYMENTS);
  }

  return {
    seededCollections,
    count: seededCollections.length
  };
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
