/**
 * StorageService - thao tác LocalStorage an toàn
 * Không phụ thuộc UI, dễ unit test
 */

import { generateId } from '../utils/id-utils.js';
import { getCurrentISODateTime } from '../utils/date-utils.js';

/**
 * Parse JSON an toàn
 * @param {string|null} value
 * @param {any} fallback
 * @returns {any}
 */
export function safeParse(value, fallback = []) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (e) {
    return fallback;
  }
}

/**
 * Lấy toàn bộ dữ liệu theo key
 * @param {string} key
 * @returns {Array}
 */
export function getAll(key) {
  const raw = localStorage.getItem(key);
  return safeParse(raw, []);
}

/**
 * Lấy item theo id
 * @param {string} key
 * @param {string} id
 * @returns {Object|null}
 */
export function getById(key, id) {
  const items = getAll(key);
  return items.find((item) => item.id === id) || null;
}

/**
 * Kiểm tra tồn tại theo predicate
 * @param {string} key
 * @param {(item:any)=>boolean} predicate
 * @returns {boolean}
 */
export function exists(key, predicate) {
  const items = getAll(key);
  return items.some(predicate);
}

/**
 * Ghi đè toàn bộ dữ liệu
 * @param {string} key
 * @param {Array} items
 */
export function replaceAll(key, items) {
  if (!Array.isArray(items)) {
    throw new Error('Items must be an array');
  }
  localStorage.setItem(key, JSON.stringify([...items]));
}

/**
 * Tạo mới item
 * @param {string} key
 * @param {Object} item
 * @returns {Object}
 */
export function create(key, item) {
  if (!item || typeof item !== 'object') {
    throw new Error('Invalid item');
  }

  const items = getAll(key);

  const newItem = {
    ...structuredClone(item),
    id: item.id || generateId(),
    createdAt: getCurrentISODateTime(),
    updatedAt: getCurrentISODateTime()
  };

  const isDuplicate = items.some((i) => i.id === newItem.id);
  if (isDuplicate) {
    throw new Error('Duplicate ID');
  }

  items.push(newItem);
  replaceAll(key, items);

  return newItem;
}

/**
 * Cập nhật item
 * @param {string} key
 * @param {string} id
 * @param {Object} changes
 * @returns {Object}
 */
export function update(key, id, changes) {
  if (!id) throw new Error('ID is required');
  if (!changes || typeof changes !== 'object') {
    throw new Error('Invalid changes');
  }

  const items = getAll(key);
  const index = items.findIndex((i) => i.id === id);

  if (index === -1) {
    throw new Error('Item not found');
  }

  const updatedItem = {
    ...items[index],
    ...structuredClone(changes),
    id, // không cho đổi id
    updatedAt: getCurrentISODateTime()
  };

  items[index] = updatedItem;
  replaceAll(key, items);

  return updatedItem;
}

/**
 * Xóa item theo id
 * @param {string} key
 * @param {string} id
 * @returns {boolean}
 */
export function remove(key, id) {
  const items = getAll(key);
  const newItems = items.filter((i) => i.id !== id);

  if (newItems.length === items.length) {
    throw new Error('Item not found');
  }

  replaceAll(key, newItems);
  return true;
}

/**
 * Xóa toàn bộ theo key
 * @param {string} key
 */
export function clearKey(key) {
  localStorage.removeItem(key);
}

/**
 * Xóa toàn bộ LocalStorage
 */
export function clearAll() {
  localStorage.clear();
}

/**
 * Export toàn bộ dữ liệu
 * @returns {Object}
 */
export function exportAll() {
  const data = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = safeParse(localStorage.getItem(key), []);
  }

  return data;
}

/**
 * Import toàn bộ dữ liệu
 * @param {Object} data
 */
export function importAll(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid import data');
  }

  Object.keys(data).forEach((key) => {
    const value = data[key];

    if (!Array.isArray(value)) {
      throw new Error(`Invalid data at key: ${key}`);
    }

    replaceAll(key, value);
  });
}