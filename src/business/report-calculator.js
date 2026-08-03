const EXCLUDED_INVOICE_STATUSES = new Set([
  'draft',
  'canceled',
  'cancelled'
]);

const RENTED_ROOM_STATUSES = new Set(['rented', 'occupied']);
const ACTIVE_CONTRACT_STATUSES = new Set(['active', 'soon_expire']);

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getMonth(item, fields) {
  for (const field of fields) {
    const value = item?.[field];

    if (typeof value === 'string') {
      const match = value.match(/^\d{4}-\d{2}/);
      if (match) return match[0];
    }
  }

  return null;
}

function toSortedSeries(grouped, valueKey) {
  return Array.from(grouped.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => ({
      [valueKey]: key,
      ...value
    }));
}

function isIncludedInvoice(invoice) {
  return !EXCLUDED_INVOICE_STATUSES.has(invoice?.status);
}

function createPaidAmountMap(payments = []) {
  const paidByInvoice = new Map();

  payments.forEach((payment) => {
    if (!payment?.invoiceId) return;

    paidByInvoice.set(
      payment.invoiceId,
      (paidByInvoice.get(payment.invoiceId) || 0) +
        toNumber(payment.amount)
    );
  });

  return paidByInvoice;
}

function getInvoicePaidAmount(invoice, paidByInvoice) {
  if (paidByInvoice.has(invoice.id)) {
    return paidByInvoice.get(invoice.id);
  }

  return toNumber(invoice.paidAmount);
}

function getRemainingDebt(invoice, paidByInvoice) {
  return Math.max(
    toNumber(invoice.total) -
      getInvoicePaidAmount(invoice, paidByInvoice),
    0
  );
}

function startOfDay(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Ngày báo cáo không hợp lệ');
  }

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

export function calculateTotalRooms(rooms = []) {
  return rooms.length;
}

export function calculateEmptyRooms(rooms = []) {
  return rooms.filter((room) => room.status === 'empty').length;
}

export function calculateRentedRooms(rooms = []) {
  return rooms.filter((room) =>
    RENTED_ROOM_STATUSES.has(room.status)
  ).length;
}

export function calculateRepairingRooms(rooms = []) {
  return rooms.filter((room) => room.status === 'repairing').length;
}

export function calculateOccupancyRate(rooms = []) {
  const totalRooms = calculateTotalRooms(rooms);

  if (totalRooms === 0) return 0;

  return Number(
    ((calculateRentedRooms(rooms) / totalRooms) * 100).toFixed(2)
  );
}

export function calculateCurrentTenantCount(contracts = []) {
  const tenantIds = new Set();

  contracts
    .filter((contract) => ACTIVE_CONTRACT_STATUSES.has(contract.status))
    .forEach((contract) => {
      if (Array.isArray(contract.tenantIds)) {
        contract.tenantIds.forEach((tenantId) => {
          if (tenantId) tenantIds.add(tenantId);
        });
      }

      if (contract.tenantId) tenantIds.add(contract.tenantId);
    });

  return tenantIds.size;
}

export function calculateRevenueByMonth(invoices = []) {
  const grouped = new Map();

  invoices.filter(isIncludedInvoice).forEach((invoice) => {
    const month = getMonth(invoice, ['month', 'monthKey', 'createdAt']);
    if (!month) return;

    const current = grouped.get(month) || {
      invoiceTotal: 0,
      invoiceCount: 0
    };

    current.invoiceTotal += toNumber(invoice.total);
    current.invoiceCount += 1;
    grouped.set(month, current);
  });

  return toSortedSeries(grouped, 'month');
}

export function calculateCollectedAmountByMonth(payments = []) {
  const grouped = new Map();

  payments.forEach((payment) => {
    const month = getMonth(payment, [
      'month',
      'paymentDate',
      'paidAt',
      'createdAt'
    ]);

    if (!month) return;

    const current = grouped.get(month) || {
      collectedAmount: 0,
      paymentCount: 0
    };

    current.collectedAmount += toNumber(payment.amount);
    current.paymentCount += 1;
    grouped.set(month, current);
  });

  return toSortedSeries(grouped, 'month');
}

export function calculateTotalDebt(invoices = [], payments = []) {
  const paidByInvoice = createPaidAmountMap(payments);

  return invoices
    .filter(isIncludedInvoice)
    .reduce(
      (total, invoice) =>
        total + getRemainingDebt(invoice, paidByInvoice),
      0
    );
}

export function calculateDebtByMonth(invoices = [], payments = []) {
  const grouped = new Map();
  const paidByInvoice = createPaidAmountMap(payments);

  invoices.filter(isIncludedInvoice).forEach((invoice) => {
    const month = getMonth(invoice, ['month', 'monthKey', 'createdAt']);
    if (!month) return;

    const current = grouped.get(month) || {
      debtAmount: 0,
      outstandingInvoiceCount: 0
    };
    const remainingDebt = getRemainingDebt(invoice, paidByInvoice);

    current.debtAmount += remainingDebt;
    if (remainingDebt > 0) current.outstandingInvoiceCount += 1;
    grouped.set(month, current);
  });

  return toSortedSeries(grouped, 'month');
}

export function calculateOverdueInvoiceCount(
  invoices = [],
  payments = [],
  currentDate = new Date()
) {
  const today = startOfDay(currentDate);
  const paidByInvoice = createPaidAmountMap(payments);

  return invoices.filter((invoice) => {
    if (!isIncludedInvoice(invoice)) return false;
    if (getRemainingDebt(invoice, paidByInvoice) <= 0) return false;
    if (invoice.status === 'overdue') return true;
    if (!invoice.dueDate) return false;

    return startOfDay(invoice.dueDate).getTime() < today.getTime();
  }).length;
}

export function calculateUtilityConsumptionByMonth(readings = []) {
  const grouped = new Map();

  readings.forEach((reading) => {
    const month = getMonth(reading, ['monthKey', 'month', 'createdAt']);
    if (!month) return;

    const current = grouped.get(month) || {
      electricUsage: 0,
      waterUsage: 0
    };

    current.electricUsage += toNumber(
      reading.electricUsage ?? reading.electricity
    );
    current.waterUsage += toNumber(
      reading.waterUsage ?? reading.water
    );
    grouped.set(month, current);
  });

  return toSortedSeries(grouped, 'month');
}

export function calculateElectricityConsumptionByRoom(readings = []) {
  const grouped = new Map();

  readings.forEach((reading) => {
    if (!reading?.roomId) return;

    const current = grouped.get(reading.roomId) || {
      electricUsage: 0
    };

    current.electricUsage += toNumber(
      reading.electricUsage ?? reading.electricity
    );
    grouped.set(reading.roomId, current);
  });

  return toSortedSeries(grouped, 'roomId');
}

export function calculateInvoiceStatusDistribution(invoices = []) {
  const grouped = new Map();

  invoices.forEach((invoice) => {
    const status =
      invoice.status === 'cancelled'
        ? 'canceled'
        : invoice.status || 'unknown';

    const current = grouped.get(status) || {
      count: 0,
      amount: 0
    };

    current.count += 1;
    current.amount += toNumber(invoice.total);
    grouped.set(status, current);
  });

  const totalCount = invoices.length;

  return Array.from(grouped.entries()).map(([status, value]) => ({
    status,
    ...value,
    percentage: totalCount === 0
      ? 0
      : Number(((value.count / totalCount) * 100).toFixed(2))
  }));
}

export function calculatePaymentsByMethod(payments = []) {
  const grouped = new Map();

  payments.forEach((payment) => {
    const method = payment.method ?? payment.paymentMethod ?? 'unknown';
    const current = grouped.get(method) || {
      amount: 0,
      count: 0
    };

    current.amount += toNumber(payment.amount);
    current.count += 1;
    grouped.set(method, current);
  });

  const totalAmount = payments.reduce(
    (total, payment) => total + toNumber(payment.amount),
    0
  );

  return Array.from(grouped.entries()).map(([method, value]) => ({
    method,
    ...value,
    percentage: totalAmount === 0
      ? 0
      : Number(((value.amount / totalAmount) * 100).toFixed(2))
  }));
}

export function calculateExpiringContracts(
  contracts = [],
  currentDate = new Date(),
  withinDays = 30
) {
  const today = startOfDay(currentDate);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + Math.max(toNumber(withinDays), 0));
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return contracts
    .filter((contract) => {
      if (!ACTIVE_CONTRACT_STATUSES.has(contract.status)) return false;
      if (!contract.endDate) return false;

      const contractEnd = startOfDay(contract.endDate);
      return contractEnd >= today && contractEnd <= endDate;
    })
    .map((contract) => {
      const contractEnd = startOfDay(contract.endDate);

      return {
        ...contract,
        daysRemaining: Math.ceil(
          (contractEnd.getTime() - today.getTime()) /
            millisecondsPerDay
        )
      };
    })
    .sort((first, second) =>
      first.endDate.localeCompare(second.endDate)
    );
}
