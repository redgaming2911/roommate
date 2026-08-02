// contract-utils.js

/**
 * Kiểm tra 2 khoảng thời gian có bị chồng lấp không
 */
export function isDateRangeOverlap(startA, endA, startB, endB) {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Kiểm tra hợp đồng mới có bị trùng thời gian với các hợp đồng hiện có cùng phòng không
 */
export function hasOverlappingContract(newContract, existingContracts = []) {
  return existingContracts.some((c) => {
    if (c.roomId !== newContract.roomId) return false;

    return isDateRangeOverlap(
      newContract.startDate,
      newContract.endDate,
      c.startDate,
      c.endDate
    );
  });
}

/**
 * Xác định trạng thái hợp đồng theo thời gian
 */
export function determineContractStatus(contract, currentDate = new Date()) {
  const now = new Date(currentDate).getTime();
  const start = new Date(contract.startDate).getTime();
  const end = new Date(contract.endDate).getTime();

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "active";
  return "expired";
}

/**
 * Hợp đồng đang hiệu lực
 */
export function isContractActive(contract, currentDate = new Date()) {
  return determineContractStatus(contract, currentDate) === "active";
}

/**
 * Hợp đồng sắp hết hạn
 */
export function isContractExpiringSoon(
  contract,
  currentDate = new Date(),
  warningDays = 7
) {
  if (!isContractActive(contract, currentDate)) return false;

  const now = new Date(currentDate).getTime();
  const end = new Date(contract.endDate).getTime();

  const diffDays = (end - now) / (1000 * 60 * 60 * 24);

  return diffDays <= warningDays;
}

/**
 * Kiểm tra số người trong phòng
 */
export function validateOccupancyLimit(room, tenantIds = []) {
  if (!room) throw new Error("Phòng không tồn tại");

  const max = room.maxOccupancy || 0;

  if (tenantIds.length > max) {
    throw new Error("Số người vượt quá sức chứa phòng");
  }

  return true;
}