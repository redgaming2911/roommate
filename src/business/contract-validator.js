// contract-validator.js

import {
  hasOverlappingContract,
  validateOccupancyLimit,
} from "./contract-utils.js";

/**
 * Validate hợp đồng
 */
export function validateContract(contract, context = {}) {
  const {
    existingContracts = [],
    room = null,
    tenantIds = [],
  } = context;

  if (!contract) {
    throw new Error("Dữ liệu hợp đồng không hợp lệ");
  }

  const {
    startDate,
    endDate,
    rentAmount,
    depositAmount,
    roomId,
  } = contract;

  // Validate ngày
  if (!startDate || !endDate) {
    throw new Error("Ngày bắt đầu và kết thúc là bắt buộc");
  }

  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  if (isNaN(start) || isNaN(end)) {
    throw new Error("Ngày không hợp lệ");
  }

  if (end <= start) {
    throw new Error("Ngày kết thúc phải sau ngày bắt đầu");
  }

  // Validate tiền
  if (rentAmount < 0) {
    throw new Error("Giá thuê không hợp lệ");
  }

  if (depositAmount < 0) {
    throw new Error("Tiền cọc không hợp lệ");
  }

  // Validate phòng
  if (!roomId) {
    throw new Error("Phòng là bắt buộc");
  }

  if (room) {
    if (room.status === "repairing" || room.status === "inactive") {
      throw new Error("Không thể ký hợp đồng cho phòng đang sửa chữa hoặc tạm ngưng");
    }

    validateOccupancyLimit(room, tenantIds);
  }

  // Validate trùng hợp đồng
  if (hasOverlappingContract(contract, existingContracts)) {
    throw new Error("Phòng đã có hợp đồng trong khoảng thời gian này");
  }

  return {
    ...contract,
    startDate,
    endDate,
  };
}