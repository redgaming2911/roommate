import { StorageService } from './storage-service.js';
import {
  normalizeServiceConfig,
  validateServiceConfig
} from '../business/service-config-validator.js';
import { generateId } from '../utils/id-utils.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';

const KEY = STORAGE_KEYS.SERVICE_CONFIGS;
const INVOICE_KEY = STORAGE_KEYS.INVOICES;

export const ServiceConfigService = {
  getAll() {
    return StorageService.getAll(KEY);
  },

  getById(id) {
    return StorageService.getById(KEY, id);
  },

  create(data) {
    const list = this.getAll();
    const normalized = normalizeServiceConfig(data);

    validateServiceConfig(normalized, list);

    const newItem = {
      id: generateId(),
      ...normalized,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return StorageService.create(KEY, newItem);
  },

  update(id, changes) {
    const list = this.getAll();
    const current = this.getById(id);

    if (!current) throw new Error('Không tìm thấy dịch vụ');

    const updated = normalizeServiceConfig({
      ...current,
      ...changes
    });

    validateServiceConfig(updated, list);

    return StorageService.update(KEY, id, {
      ...updated,
      updatedAt: new Date().toISOString()
    });
  },

  deactivate(id) {
    return this.update(id, { status: 'inactive' });
  },

  activate(id) {
    return this.update(id, { status: 'active' });
  },

  remove(id) {
    const invoices = StorageService.getAll(INVOICE_KEY);

    const isUsed = invoices.some(inv =>
      inv.items?.some(i => i.serviceId === id)
    );

    if (isUsed) {
      throw new Error('Dịch vụ đã dùng trong hóa đơn, không thể xóa');
    }

    return StorageService.remove(KEY, id);
  },

  search(keyword) {
    const list = this.getAll();
    const k = keyword.toLowerCase();

    return list.filter(s =>
      s.code.toLowerCase().includes(k) ||
      s.name.toLowerCase().includes(k)
    );
  },

  filter({ status }) {
    let list = this.getAll();

    if (status && status !== 'all') {
      list = list.filter(s => s.status === status);
    }

    return list;
  }
};