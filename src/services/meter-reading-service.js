import * as StorageService from './storage-service.js';
import {
  calculateElectricUsage,
  calculateWaterUsage
} from '../business/meter-calculator.js';
import {
  validateMeterReading,
  validatePreviousIndex,
  getPreviousMonthKey
} from '../business/meter-validator.js';
import { STORAGE_KEYS } from '../constants/storage-keys.js';
import { generateId } from '../utils/ma.js';
import { ContractService } from './contract-service.js';
import * as RoomService from './room-service.js';

const KEY = STORAGE_KEYS.METER_READINGS;
const INVOICE_KEY = STORAGE_KEYS.INVOICES;

export const MeterReadingService = {
  // ================= GET =================
  getReadings() {
    return StorageService.getAll(KEY);
  },

  getReadingById(id) {
    return StorageService.getById(KEY, id);
  },

  getReadingByRoomAndMonth(roomId, month) {
    return this.getReadings().find(
      r => r.roomId === roomId && r.monthKey === month
    );
  },

  // ================= CREATE =================
  createReading(data) {
    validateMeterReading(data);

    const { roomId, monthKey } = data;

    // 1. Kiểm tra trùng
    const existed = this.getReadingByRoomAndMonth(roomId, monthKey);
    if (existed) {
      throw new Error('Phòng đã có chỉ số trong tháng này');
    }

    // 2. Kiểm tra phòng có hợp đồng hiệu lực
    const activeContract = ContractService.getActiveContractByRoom(roomId);

    if (!activeContract) {
      throw new Error('Phòng chưa có hợp đồng hiệu lực');
    }

    // 3. Lấy tháng trước
    const previous = this.getPreviousReading(roomId, monthKey);

    // 4. Validate chỉ số so với tháng trước
    validatePreviousIndex(data, previous);

    // 5. Tính usage
    const oldElectric = previous?.electricIndex || 0;
    const oldWater = previous?.waterIndex || 0;

    const electricUsage = calculateElectricUsage(
      oldElectric,
      data.electricIndex
    );

    const waterUsage = calculateWaterUsage(
      oldWater,
      data.waterIndex
    );

    // 6. Cảnh báo nếu lệch chỉ số cũ
    let warning = null;
    if (previous) {
      if (
        data.oldElectricIndex != null &&
        data.oldElectricIndex !== previous.electricIndex
      ) {
        warning = 'Chỉ số điện cũ không khớp tháng trước';
      }

      if (
        data.oldWaterIndex != null &&
        data.oldWaterIndex !== previous.waterIndex
      ) {
        warning = 'Chỉ số nước cũ không khớp tháng trước';
      }
    }

    const newReading = {
      id: generateId(),
      roomId,
      monthKey,
      electricIndex: data.electricIndex,
      waterIndex: data.waterIndex,
      electricUsage,
      waterUsage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    StorageService.create(KEY, newReading);

    return {
      data: newReading,
      warning
    };
  },

  // ================= UPDATE =================
  updateReading(id, data) {
    const current = this.getReadingById(id);
    if (!current) throw new Error('Không tìm thấy bản ghi');

    validateMeterReading({
      ...current,
      ...data
    });

    // Check invoice tồn tại
    const invoices = StorageService.getAll(INVOICE_KEY);
    const relatedInvoice = invoices.find(
      inv => inv.roomId === current.roomId && inv.monthKey === current.monthKey
    );

    const previous = this.getPreviousReading(
      current.roomId,
      current.monthKey
    );

    const merged = {
      ...current,
      ...data
    };

    validatePreviousIndex(merged, previous);

    const oldElectric = previous?.electricIndex || 0;
    const oldWater = previous?.waterIndex || 0;

    const electricUsage = calculateElectricUsage(
      oldElectric,
      merged.electricIndex
    );

    const waterUsage = calculateWaterUsage(
      oldWater,
      merged.waterIndex
    );

    const updated = {
      ...merged,
      electricUsage,
      waterUsage,
      updatedAt: new Date().toISOString()
    };

    StorageService.update(KEY, id, updated);

    return {
      data: updated,
      warning: relatedInvoice
        ? 'Đã tồn tại hóa đơn liên quan, cần kiểm tra lại'
        : null
    };
  },

  // ================= DELETE =================
  deleteReading(id) {
    const current = this.getReadingById(id);
    if (!current) throw new Error('Không tìm thấy bản ghi');

    const invoices = StorageService.getAll(INVOICE_KEY);
    const related = invoices.some(
      inv => inv.roomId === current.roomId && inv.monthKey === current.monthKey
    );

    if (related) {
      throw new Error('Không thể xóa do đã có hóa đơn');
    }

    return StorageService.remove(KEY, id);
  },

  // ================= HELPER =================
  getPreviousReading(roomId, month) {
    const prevMonth = getPreviousMonthKey(month);

    return this.getReadingByRoomAndMonth(roomId, prevMonth);
  },

  getRoomsWithoutReading(month) {
    const rooms = RoomService.getRooms();
    const readings = this.getReadings();

    return rooms.filter(room => {
      const hasReading = readings.some(
        r => r.roomId === room.id && r.monthKey === month
      );

      return !hasReading;
    });
  },

  // ================= FILTER =================
  filterReadings(filters = {}) {
    let list = this.getReadings();

    if (filters.roomId) {
      list = list.filter(r => r.roomId === filters.roomId);
    }

    if (filters.monthKey) {
      list = list.filter(r => r.monthKey === filters.monthKey);
    }

    if (filters.keyword) {
      const k = filters.keyword.toLowerCase();
      list = list.filter(
        r =>
          r.roomId.toLowerCase().includes(k) ||
          r.monthKey.toLowerCase().includes(k)
      );
    }

    return list;
  }
};
