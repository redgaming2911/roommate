export const REQUIRED_BACKUP_COLLECTIONS = Object.freeze([
  'rooms',
  'tenants',
  'contracts',
  'meterReadings',
  'serviceConfigs',
  'invoices',
  'payments'
]);

function isPlainObject(value) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

export function getBackupCollections(data) {
  if (!isPlainObject(data)) return null;

  if (isPlainObject(data.data)) return data.data;
  if (isPlainObject(data.collections)) return data.collections;

  return data;
}

function validateCollectionItems(collectionName, items, errors) {
  const ids = new Set();

  items.forEach((item, index) => {
    if (!isPlainObject(item)) {
      errors.push(
        `${collectionName}[${index}] phải là một object`
      );
      return;
    }

    if (item.id == null || item.id === '') return;

    const id = String(item.id);

    if (ids.has(id)) {
      errors.push(
        `${collectionName} chứa id trùng lặp: ${id}`
      );
      return;
    }

    ids.add(id);
  });
}

export function validateImportData(data) {
  const errors = [];
  const collections = getBackupCollections(data);

  if (!collections) {
    return {
      valid: false,
      errors: ['Dữ liệu backup phải là một object JSON'],
      collections: null
    };
  }

  REQUIRED_BACKUP_COLLECTIONS.forEach((collectionName) => {
    if (!Object.hasOwn(collections, collectionName)) {
      errors.push(`Thiếu collection bắt buộc: ${collectionName}`);
      return;
    }

    const items = collections[collectionName];

    if (!Array.isArray(items)) {
      errors.push(`${collectionName} phải là một array`);
      return;
    }

    validateCollectionItems(collectionName, items, errors);
  });

  return {
    valid: errors.length === 0,
    errors,
    collections: errors.length === 0 ? collections : null
  };
}

export function assertValidImportData(data) {
  const result = validateImportData(data);

  if (!result.valid) {
    const error = new Error(
      `Dữ liệu backup không hợp lệ: ${result.errors.join('; ')}`
    );
    error.validationErrors = [...result.errors];
    throw error;
  }

  return result.collections;
}
