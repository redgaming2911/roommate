import {
  REQUIRED_BACKUP_COLLECTIONS,
  assertValidImportData,
  validateImportData
} from '../business/import-validator.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { resetToSeedData } from './seed-service.js';
import * as StorageService from './storage-service.js';

const BACKUP_VERSION = 1;
const IMPORT_MODES = new Set(['overwrite', 'merge']);

function clone(value) {
  return structuredClone(value);
}

function createFilename(date = new Date()) {
  const timestamp = date
    .toISOString()
    .replace('T', '_')
    .replace(/[:.]/g, '-')
    .replace('Z', '');

  return `roommate-backup-${timestamp}.json`;
}

function createCollectionsSnapshot() {
  return Object.fromEntries(
    REQUIRED_BACKUP_COLLECTIONS.map((collectionName) => [
      collectionName,
      clone(StorageService.getAll(collectionName))
    ])
  );
}

function mergeCollection(currentItems, importedItems) {
  const merged = clone(currentItems);
  const existingIds = new Set(
    currentItems
      .filter((item) => item?.id != null && item.id !== '')
      .map((item) => String(item.id))
  );

  importedItems.forEach((item) => {
    const hasId = item?.id != null && item.id !== '';
    const id = hasId ? String(item.id) : null;

    if (id && existingIds.has(id)) return;

    merged.push(clone(item));
    if (id) existingIds.add(id);
  });

  return merged;
}

function normalizeImportMode(options = {}) {
  if (typeof options === 'string') return options;
  if (options.overwrite === true) return 'overwrite';
  if (options.merge === true) return 'merge';

  return options.mode ?? 'overwrite';
}

function replaceCollections(collections) {
  REQUIRED_BACKUP_COLLECTIONS.forEach((collectionName) => {
    StorageService.replaceAll(
      collectionName,
      clone(collections[collectionName])
    );
  });
}

export const BackupService = {
  exportData() {
    return {
      metadata: {
        application: 'RoomMate',
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString()
      },
      data: createCollectionsSnapshot()
    };
  },

  downloadBackup() {
    const data = this.exportData();
    const filename = createFilename();
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], {
      type: 'application/json;charset=utf-8'
    });

    if (
      typeof document !== 'undefined' &&
      typeof URL !== 'undefined' &&
      typeof URL.createObjectURL === 'function'
    ) {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');

      anchor.href = url;
      anchor.download = filename;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }

    return { filename, blob, content, data };
  },

  async readJsonFile(file) {
    if (!file || typeof file.text !== 'function') {
      throw new Error('File backup không hợp lệ');
    }

    const filename = String(file.name ?? '').toLowerCase();
    const mimeType = String(file.type ?? '').toLowerCase();
    const isJsonName = filename.endsWith('.json');
    const isJsonMime =
      mimeType === '' ||
      mimeType === 'application/json' ||
      mimeType === 'text/json';

    if (!isJsonName || !isJsonMime) {
      throw new Error('File backup phải có định dạng JSON');
    }

    let data;

    try {
      data = JSON.parse(await file.text());
    } catch {
      throw new Error('Nội dung file JSON không hợp lệ');
    }

    return data;
  },

  validateBackupData(data) {
    return validateImportData(data);
  },

  importData(data, options = {}) {
    const mode = normalizeImportMode(options);

    if (!IMPORT_MODES.has(mode)) {
      throw new Error('Chế độ import phải là overwrite hoặc merge');
    }

    const importedCollections = assertValidImportData(data);
    const backup = mode === 'overwrite'
      ? this.createBackupBeforeImport()
      : null;
    const rollbackData = backup
      ? assertValidImportData(backup.data)
      : createCollectionsSnapshot();
    const nextCollections = {};

    REQUIRED_BACKUP_COLLECTIONS.forEach((collectionName) => {
      nextCollections[collectionName] = mode === 'overwrite'
        ? clone(importedCollections[collectionName])
        : mergeCollection(
            StorageService.getAll(collectionName),
            importedCollections[collectionName]
          );
    });

    try {
      replaceCollections(nextCollections);
    } catch (error) {
      try {
        replaceCollections(rollbackData);
      } catch (rollbackError) {
        throw new AggregateError(
          [error, rollbackError],
          'Import thất bại và không thể khôi phục dữ liệu ban đầu'
        );
      }

      throw error;
    }

    return {
      mode,
      backup,
      importedCounts: Object.fromEntries(
        REQUIRED_BACKUP_COLLECTIONS.map((collectionName) => [
          collectionName,
          importedCollections[collectionName].length
        ])
      )
    };
  },

  createBackupBeforeImport() {
    return this.downloadBackup();
  },

  resetAllData() {
    Object.values(STORAGE_KEYS).forEach((key) => {
      StorageService.clearKey(key);
    });
    return true;
  },

  restoreSeedData() {
    resetToSeedData();
    return this.exportData();
  }
};
