/**
 * Tạo ID chuỗi duy nhất (UUID đơn giản)
 * @returns {string}
 */
export function generateId() {
  return crypto.randomUUID();
}