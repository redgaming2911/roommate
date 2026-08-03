// tenant-validator.js

const PHONE_REGEX = /^(0|\+84)[0-9]{9}$/;
const CCCD_REGEX = /^[0-9]{9,12}$/;

function normalizePhone(phone) {
  if (!phone) return "";
  let p = phone.trim().replace(/\s+/g, "");
  if (p.startsWith("+84")) {
    p = "0" + p.slice(3);
  }
  return p;
}

function normalizeCCCD(cccd) {
  return cccd ? cccd.trim() : "";
}

function validateTenant(data, existingTenants = [], isUpdate = false, currentId = null) {
  if (!data) throw new Error("Dữ liệu người thuê không hợp lệ");

  const name = data.name?.trim();
  if (!name) throw new Error("Họ tên là bắt buộc");

  const phone = normalizePhone(data.phone);
  if (!PHONE_REGEX.test(phone)) {
    throw new Error("Số điện thoại không hợp lệ");
  }

  const cccd = normalizeCCCD(data.cccd);

  // Kiểm tra trùng số điện thoại
  const phoneDuplicate = existingTenants.find(
    (t) => t.phone === phone && (!isUpdate || t.id !== currentId)
  );
  if (phoneDuplicate) {
    throw new Error("Số điện thoại đã tồn tại");
  }

  // Kiểm tra CCCD nếu có
  if (cccd) {
    if (!CCCD_REGEX.test(cccd)) {
      throw new Error("CCCD không hợp lệ");
    }

    const cccdDuplicate = existingTenants.find(
      (t) => t.cccd === cccd && (!isUpdate || t.id !== currentId)
    );

    if (cccdDuplicate) {
      throw new Error("CCCD đã tồn tại");
    }
  }

  return {
    ...data,
    name,
    phone,
    cccd,
  };
}

export {
  validateTenant,
  normalizePhone,
  normalizeCCCD,
};