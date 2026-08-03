/**
 * Room Validator
 * Chứa các hàm kiểm tra dữ liệu phòng
 */

import { ROOM_STATUS } from '../constants/statuses.js';

/**
 * Chuẩn hóa mã phòng
 * @param {string} code
 * @returns {string}
 */
export function normalizeRoomCode(code) {
  if (typeof code !== 'string') {
    throw new Error('Mã phòng phải là chuỗi');
  }
  return code.trim().toUpperCase();
}

/**
 * Kiểm tra dữ liệu phòng hợp lệ
 * @param {Object} data
 */
export function validateRoom(data) {
  if (!data) throw new Error('Dữ liệu phòng không hợp lệ');

  const { code, name, price, maxOccupants } = data;

  if (!code || !code.trim()) {
    throw new Error('Mã phòng là bắt buộc');
  }

  if (!name || !name.trim()) {
    throw new Error('Tên phòng là bắt buộc');
  }

  if (price == null || isNaN(price)) {
    throw new Error('Giá thuê không hợp lệ');
  }

  if (Number(price) < 0) {
    throw new Error('Giá thuê không được âm');
  }

  if (maxOccupants == null || isNaN(maxOccupants)) {
    throw new Error('Số người tối đa không hợp lệ');
  }

  if (Number(maxOccupants) <= 0) {
    throw new Error('Số người tối đa phải lớn hơn 0');
  }
}

/**
 * Kiểm tra trạng thái phòng hợp lệ
 * @param {string} status
 */
export function validateRoomStatus(status) {
  const allowed = Object.values(ROOM_STATUS);
  if (!allowed.includes(status)) {
    throw new Error('Trạng thái phòng không hợp lệ');
  }
}
