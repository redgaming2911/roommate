import { beforeEach, describe, expect, it } from 'vitest';
import * as StorageService from '../../../src/services/storage-service.js';

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('safeParse', () => {
    it('parse JSON hợp lệ', () => {
      expect(StorageService.safeParse('[{"id":"room-1"}]'))
        .toEqual([{ id: 'room-1' }]);
      expect(StorageService.safeParse('{"enabled":true}'))
        .toEqual({ enabled: true });
    });

    it('trả về fallback khi JSON bị lỗi', () => {
      expect(StorageService.safeParse('{json lỗi')).toEqual([]);
      expect(StorageService.safeParse('{json lỗi', { recovered: true }))
        .toEqual({ recovered: true });
    });

    it('trả về fallback khi dữ liệu rỗng', () => {
      expect(StorageService.safeParse(null)).toEqual([]);
      expect(StorageService.safeParse('', ['fallback']))
        .toEqual(['fallback']);
    });
  });

  describe('getAll và getById', () => {
    it('getAll trả về mảng rỗng khi chưa có dữ liệu', () => {
      expect(StorageService.getAll('rooms')).toEqual([]);
    });

    it('getById tìm thấy bản ghi', () => {
      localStorage.setItem('rooms', JSON.stringify([
        { id: 'room-1', code: 'P101' },
        { id: 'room-2', code: 'P102' }
      ]));

      expect(StorageService.getById('rooms', 'room-2'))
        .toEqual({ id: 'room-2', code: 'P102' });
    });

    it('getById trả về null khi không tìm thấy', () => {
      localStorage.setItem('rooms', JSON.stringify([
        { id: 'room-1', code: 'P101' }
      ]));

      expect(StorageService.getById('rooms', 'missing-id')).toBeNull();
    });
  });

  describe('create', () => {
    it('tạo bản ghi thành công', () => {
      const created = StorageService.create('rooms', {
        id: 'room-1',
        code: 'P101'
      });

      expect(created).toMatchObject({
        id: 'room-1',
        code: 'P101'
      });
      expect(created.createdAt).toEqual(expect.any(String));
      expect(created.updatedAt).toEqual(expect.any(String));
      expect(StorageService.getAll('rooms')).toEqual([created]);
    });

    it('tự tạo ID khi dữ liệu chưa có ID', () => {
      const created = StorageService.create('rooms', { code: 'P101' });

      expect(created.id).toEqual(expect.any(String));
      expect(created.id.length).toBeGreaterThan(0);
    });

    it('không tạo bản ghi có ID trùng', () => {
      StorageService.create('rooms', { id: 'room-1', code: 'P101' });

      expect(() => StorageService.create('rooms', {
        id: 'room-1',
        code: 'P102'
      })).toThrow('Duplicate ID');

      expect(StorageService.getAll('rooms')).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('cập nhật bản ghi thành công và không cho đổi ID', () => {
      StorageService.create('rooms', { id: 'room-1', code: 'P101' });

      const updated = StorageService.update('rooms', 'room-1', {
        id: 'room-khác',
        code: 'P201',
        status: 'empty'
      });

      expect(updated).toMatchObject({
        id: 'room-1',
        code: 'P201',
        status: 'empty'
      });
      expect(StorageService.getById('rooms', 'room-1')).toEqual(updated);
      expect(StorageService.getById('rooms', 'room-khác')).toBeNull();
    });

    it('báo lỗi khi ID không tồn tại', () => {
      expect(() => StorageService.update('rooms', 'missing-id', {
        code: 'P999'
      })).toThrow('Item not found');
    });
  });

  describe('remove', () => {
    it('xóa bản ghi thành công', () => {
      StorageService.replaceAll('rooms', [
        { id: 'room-1', code: 'P101' },
        { id: 'room-2', code: 'P102' }
      ]);

      expect(StorageService.remove('rooms', 'room-1')).toBe(true);
      expect(StorageService.getAll('rooms'))
        .toEqual([{ id: 'room-2', code: 'P102' }]);
    });

    it('báo lỗi khi xóa ID không tồn tại', () => {
      expect(() => StorageService.remove('rooms', 'missing-id'))
        .toThrow('Item not found');
    });
  });

  describe('replaceAll', () => {
    it('ghi đè toàn bộ collection', () => {
      StorageService.replaceAll('rooms', [{ id: 'old-room' }]);
      const replacement = [
        { id: 'room-1', code: 'P101' },
        { id: 'room-2', code: 'P102' }
      ];

      StorageService.replaceAll('rooms', replacement);

      expect(StorageService.getAll('rooms')).toEqual(replacement);
    });

    it('từ chối dữ liệu không phải array', () => {
      expect(() => StorageService.replaceAll('rooms', {}))
        .toThrow('Items must be an array');
    });
  });

  describe('exportAll và importAll', () => {
    it('exportAll xuất toàn bộ dữ liệu LocalStorage đã parse', () => {
      localStorage.setItem('rooms', JSON.stringify([
        { id: 'room-1', code: 'P101' }
      ]));
      localStorage.setItem('tenants', JSON.stringify([
        { id: 'tenant-1', name: 'Nguyễn Văn A' }
      ]));

      expect(StorageService.exportAll()).toEqual({
        rooms: [{ id: 'room-1', code: 'P101' }],
        tenants: [{ id: 'tenant-1', name: 'Nguyễn Văn A' }]
      });
    });

    it('importAll nhập dữ liệu hợp lệ', () => {
      const data = {
        rooms: [{ id: 'room-1', code: 'P101' }],
        tenants: [{ id: 'tenant-1', name: 'Nguyễn Văn A' }]
      };

      StorageService.importAll(data);

      expect(StorageService.getAll('rooms')).toEqual(data.rooms);
      expect(StorageService.getAll('tenants')).toEqual(data.tenants);
    });

    it.each([null, undefined, [], 'invalid'])
      ('importAll từ chối dữ liệu gốc không hợp lệ: %s', (data) => {
        expect(() => StorageService.importAll(data))
          .toThrow('Invalid import data');
      });

    it('importAll từ chối collection không phải array', () => {
      expect(() => StorageService.importAll({ rooms: {} }))
        .toThrow('Invalid data at key: rooms');
    });
  });

  describe('clearKey và clearAll', () => {
    it('clearKey chỉ xóa collection được chọn', () => {
      StorageService.replaceAll('rooms', [{ id: 'room-1' }]);
      StorageService.replaceAll('tenants', [{ id: 'tenant-1' }]);

      StorageService.clearKey('rooms');

      expect(StorageService.getAll('rooms')).toEqual([]);
      expect(StorageService.getAll('tenants'))
        .toEqual([{ id: 'tenant-1' }]);
    });

    it('clearAll xóa toàn bộ LocalStorage', () => {
      StorageService.replaceAll('rooms', [{ id: 'room-1' }]);
      StorageService.replaceAll('tenants', [{ id: 'tenant-1' }]);
      localStorage.setItem('unrelated-key', 'value');

      StorageService.clearAll();

      expect(localStorage.length).toBe(0);
      expect(StorageService.getAll('rooms')).toEqual([]);
      expect(StorageService.getAll('tenants')).toEqual([]);
    });
  });
});
