import { STORAGE_KEYS } from '../constants/storage-keys.js';
import * as ReportCalculator from '../business/report-calculator.js';
import * as StorageService from './storage-service.js';

function getReportData() {
  return {
    rooms: StorageService.getAll(STORAGE_KEYS.ROOMS),
    tenants: StorageService.getAll(STORAGE_KEYS.TENANTS),
    contracts: StorageService.getAll(STORAGE_KEYS.CONTRACTS),
    invoices: StorageService.getAll(STORAGE_KEYS.INVOICES),
    payments: StorageService.getAll(STORAGE_KEYS.PAYMENTS),
    meterReadings: StorageService.getAll(STORAGE_KEYS.METER_READINGS)
  };
}

function isMonthInRange(month, fromMonth, toMonth) {
  if (!month) return false;
  if (fromMonth && month < fromMonth) return false;
  if (toMonth && month > toMonth) return false;
  return true;
}

function getItemMonth(item, fields) {
  for (const field of fields) {
    const value = item?.[field];

    if (typeof value === 'string') {
      const match = value.match(/^\d{4}-\d{2}/);
      if (match) return match[0];
    }
  }

  return null;
}

function filterReportData(
  data,
  { fromMonth = '', toMonth = '', roomId = '' } = {}
) {
  const invoices = data.invoices.filter((invoice) => {
    const matchesRoom = !roomId || invoice.roomId === roomId;
    const month = getItemMonth(invoice, ['month', 'monthKey', 'createdAt']);
    const matchesMonth =
      !fromMonth && !toMonth
        ? true
        : isMonthInRange(month, fromMonth, toMonth);

    return matchesRoom && matchesMonth;
  });

  const invoiceIds = new Set(invoices.map((invoice) => invoice.id));

  const payments = data.payments.filter((payment) => {
    if (roomId && !invoiceIds.has(payment.invoiceId)) return false;

    const month = getItemMonth(payment, [
      'month',
      'paymentDate',
      'paidAt',
      'createdAt'
    ]);

    return !fromMonth && !toMonth
      ? true
      : isMonthInRange(month, fromMonth, toMonth);
  });

  const invoicePayments = data.payments.filter((payment) =>
    invoiceIds.has(payment.invoiceId)
  );

  const meterReadings = data.meterReadings.filter((reading) => {
    const matchesRoom = !roomId || reading.roomId === roomId;
    const month = getItemMonth(reading, [
      'monthKey',
      'month',
      'createdAt'
    ]);
    const matchesMonth =
      !fromMonth && !toMonth
        ? true
        : isMonthInRange(month, fromMonth, toMonth);

    return matchesRoom && matchesMonth;
  });

  return {
    ...data,
    rooms: roomId
      ? data.rooms.filter((room) => room.id === roomId)
      : data.rooms,
    contracts: roomId
      ? data.contracts.filter((contract) => contract.roomId === roomId)
      : data.contracts,
    invoices,
    payments,
    invoicePayments,
    meterReadings
  };
}

function getRoomStatistics(rooms) {
  return {
    totalRooms: ReportCalculator.calculateTotalRooms(rooms),
    emptyRooms: ReportCalculator.calculateEmptyRooms(rooms),
    rentedRooms: ReportCalculator.calculateRentedRooms(rooms),
    repairingRooms: ReportCalculator.calculateRepairingRooms(rooms),
    occupancyRate: ReportCalculator.calculateOccupancyRate(rooms)
  };
}

function mergeMonthlyFinancialData(revenue, collected, debt) {
  const grouped = new Map();

  revenue.forEach((item) => {
    grouped.set(item.month, {
      month: item.month,
      invoiceTotal: item.invoiceTotal,
      invoiceCount: item.invoiceCount,
      collectedAmount: 0,
      paymentCount: 0
    });
  });

  collected.forEach((item) => {
    const current = grouped.get(item.month) || {
      month: item.month,
      invoiceTotal: 0,
      invoiceCount: 0,
      collectedAmount: 0,
      paymentCount: 0
    };

    current.collectedAmount = item.collectedAmount;
    current.paymentCount = item.paymentCount;
    grouped.set(item.month, current);
  });

  debt.forEach((item) => {
    const current = grouped.get(item.month) || {
      month: item.month,
      invoiceTotal: 0,
      invoiceCount: 0,
      collectedAmount: 0,
      paymentCount: 0
    };

    current.debtAmount = item.debtAmount;
    current.outstandingInvoiceCount = item.outstandingInvoiceCount;
    grouped.set(item.month, current);
  });

  return Array.from(grouped.values())
    .sort((first, second) => first.month.localeCompare(second.month))
    .map((item) => ({
      ...item,
      debtAmount: item.debtAmount || 0,
      outstandingInvoiceCount: item.outstandingInvoiceCount || 0
    }));
}

export const ReportService = {
  getReport({
    fromMonth = '',
    toMonth = '',
    roomId = '',
    currentDate = new Date(),
    expiringWithinDays = 30
  } = {}) {
    const data = filterReportData(getReportData(), {
      fromMonth,
      toMonth,
      roomId
    });

    const revenueByMonth =
      ReportCalculator.calculateRevenueByMonth(data.invoices);
    const collectedByMonth =
      ReportCalculator.calculateCollectedAmountByMonth(data.payments);
    const debtByMonth = ReportCalculator.calculateDebtByMonth(
      data.invoices,
      data.invoicePayments
    );
    const utilityByMonth =
      ReportCalculator.calculateUtilityConsumptionByMonth(
        data.meterReadings
      );

    return {
      roomStatistics: getRoomStatistics(data.rooms),
      currentTenantCount:
        ReportCalculator.calculateCurrentTenantCount(data.contracts),
      revenueByMonth,
      collectedByMonth,
      debtByMonth,
      financialByMonth: mergeMonthlyFinancialData(
        revenueByMonth,
        collectedByMonth,
        debtByMonth
      ),
      totalDebt: ReportCalculator.calculateTotalDebt(
        data.invoices,
        data.invoicePayments
      ),
      overdueInvoiceCount:
        ReportCalculator.calculateOverdueInvoiceCount(
          data.invoices,
          data.invoicePayments,
          currentDate
        ),
      utilityByMonth,
      totalElectricUsage: utilityByMonth.reduce(
        (total, item) => total + item.electricUsage,
        0
      ),
      totalWaterUsage: utilityByMonth.reduce(
        (total, item) => total + item.waterUsage,
        0
      ),
      electricityByRoom:
        ReportCalculator.calculateElectricityConsumptionByRoom(
          data.meterReadings
        ),
      invoiceStatusDistribution:
        ReportCalculator.calculateInvoiceStatusDistribution(data.invoices),
      paymentsByMethod:
        ReportCalculator.calculatePaymentsByMethod(data.payments),
      expiringContracts:
        ReportCalculator.calculateExpiringContracts(
          data.contracts,
          currentDate,
          expiringWithinDays
        )
    };
  },

  getRoomStatistics(options = {}) {
    return this.getReport(options).roomStatistics;
  },

  getCurrentTenantCount(options = {}) {
    return this.getReport(options).currentTenantCount;
  },

  getRevenueByMonth(options = {}) {
    return this.getReport(options).revenueByMonth;
  },

  getCollectedAmountByMonth(options = {}) {
    return this.getReport(options).collectedByMonth;
  },

  getDebtByMonth(options = {}) {
    return this.getReport(options).debtByMonth;
  },

  getTotalDebt(options = {}) {
    return this.getReport(options).totalDebt;
  },

  getOverdueInvoiceCount(options = {}) {
    return this.getReport(options).overdueInvoiceCount;
  },

  getUtilityConsumptionByMonth(options = {}) {
    return this.getReport(options).utilityByMonth;
  },

  getElectricityConsumptionByRoom(options = {}) {
    return this.getReport(options).electricityByRoom;
  },

  getInvoiceStatusDistribution(options = {}) {
    return this.getReport(options).invoiceStatusDistribution;
  },

  getPaymentsByMethod(options = {}) {
    return this.getReport(options).paymentsByMethod;
  },

  getExpiringContracts(options = {}) {
    return this.getReport(options).expiringContracts;
  }
};
