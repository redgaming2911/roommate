export const PAYMENT_METHOD = Object.freeze({
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  MOMO: 'momo',
  ZALOPAY: 'zalopay'
});

export const PAYMENT_METHOD_LABEL = Object.freeze({
  [PAYMENT_METHOD.CASH]: 'Tiền mặt',
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Chuyển khoản',
  [PAYMENT_METHOD.MOMO]: 'MoMo',
  [PAYMENT_METHOD.ZALOPAY]: 'ZaloPay'
});