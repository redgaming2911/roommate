import * as StorageService from './storage-service.js';
import {
  validateRoom,
  normalizeRoomCode,
  validateRoomStatus
} from '../business/room-validator.js';
import { ROOM_STATUS, CONTRACT_STATUS } from '../constants/statuses.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';

const KEY = STORAGE_KEYS.ROOMS;
const CONTRACT_KEY = STORAGE_KEYS.CONTRACTS;

/**
 * Lấy tất cả phòng
 * @returns {Array}
 */
export function getRooms() {
  return StorageService.getAll(KEY);
}

/**
 * Lấy phòng theo ID
 * @param {string} id
 * @returns {Object}
 */
export function getRoomById(id) {
  const room = StorageService.getById(KEY, id);
  if (!room) throw new Error('Không tìm thấy phòng');
  return room;
}

/**
 * Kiểm tra phòng có hợp đồng hiệu lực
 * @param {string} roomId
 * @returns {boolean}
 */
function hasActiveContract(roomId) {
  const contracts = StorageService.getAll(CONTRACT_KEY);
  const now = new Date();

  return contracts.some((contract) => {
    if (contract.roomId !== roomId) return false;
    if (![CONTRACT_STATUS.ACTIVE, CONTRACT_STATUS.SOON_EXPIRE].includes(contract.status)) {
      return false;
    }

    const start = new Date(contract.startDate);
    const end = contract.endDate ? new Date(contract.endDate) : null;

    return !Number.isNaN(start.getTime()) &&
      start <= now &&
      (!end || end >= now);
  });
}

/**
 * Tạo phòng mới
 * @param {Object} data
 * @returns {Object}
 */
export function createRoom(data) {
  validateRoom(data);

  const normalizedCode = normalizeRoomCode(data.code);

  const exists = StorageService.exists(KEY, r => r.code === normalizedCode);
  if (exists) {
    throw new Error('Mã phòng đã tồn tại');
  }

  const room = {
    ...data,
    code: normalizedCode,
    status: data.status || ROOM_STATUS.EMPTY
  };

  validateRoomStatus(room.status);

  return StorageService.create(KEY, room);
}

/**
 * Cập nhật phòng
 * @param {string} id
 * @param {Object} data
 * @returns {Object}
 */
export function updateRoom(id, data) {
  const existing = getRoomById(id);

  if (data.code) {
    const normalizedCode = normalizeRoomCode(data.code);

    const duplicate = StorageService.exists(
      KEY,
      r => r.code === normalizedCode && r.id !== id
    );

    if (duplicate) {
      throw new Error('Mã phòng đã tồn tại');
    }

    data.code = normalizedCode;
  }

  if (data.status) {
    validateRoomStatus(data.status);

    if (data.status === ROOM_STATUS.EMPTY && hasActiveContract(id)) {
      throw new Error('Không thể chuyển phòng thành trống khi có hợp đồng hiệu lực');
    }
  }

  validateRoom({ ...existing, ...data });

  return StorageService.update(KEY, id, data);
}

/**
 * Xóa phòng
 * @param {string} id
 */
export function deleteRoom(id) {
  if (hasActiveContract(id)) {
    throw new Error('Không thể xóa phòng có hợp đồng đang hiệu lực');
  }

  return StorageService.remove(KEY, id);
}

/**
 * Tìm kiếm phòng
 * @param {string} keyword
 * @returns {Array}
 */
export function searchRooms(keyword) {
  const rooms = getRooms();

  if (!keyword) return rooms;

  const kw = keyword.toLowerCase();

  return rooms.filter(r =>
    String(r.code ?? '').toLowerCase().includes(kw) ||
    String(r.name ?? '').toLowerCase().includes(kw)
  );
}

/**
 * Lọc phòng
 * @param {Object} filters
 * @returns {Array}
 */
export function filterRooms(filters = {}) {
  let rooms = getRooms();

  if (filters.status) {
    rooms = rooms.filter(r => r.status === filters.status);
  }

  if (filters.type) {
    rooms = rooms.filter(r => r.type === filters.type);
  }

  if (filters.minPrice != null) {
    rooms = rooms.filter(r => r.price >= filters.minPrice);
  }

  if (filters.maxPrice != null) {
    rooms = rooms.filter(r => r.price <= filters.maxPrice);
  }

  return rooms;
}

/**
 * Lấy phòng trống có thể cho thuê
 * @returns {Array}
 */
export function getAvailableRooms() {
  return getRooms().filter(r => r.status === ROOM_STATUS.EMPTY);
}

/**
 * Tính tỷ lệ sử dụng phòng
 * @param {string} roomId
 * @returns {number} (0 -> 1)
 */
export function getRoomOccupancy(roomId) {
  const room = getRoomById(roomId);

  if (room.status === ROOM_STATUS.EMPTY) return 0;
  if (room.status === ROOM_STATUS.REPAIRING) return 0;
  if (room.status === ROOM_STATUS.INACTIVE) return 0;

  return 1;
}
