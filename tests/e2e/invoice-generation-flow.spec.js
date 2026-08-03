import { expect, test } from '@playwright/test';

const DATA = {
  suffix: '301',
  roomCode: 'E2E-P-301',
  roomName: 'Phòng hóa đơn 301',
  tenantName: 'Người thuê hóa đơn 301',
  tenantPhone: '0900000301',
  tenantCccd: '079206000301',
  contractCode: 'E2E-HD-301',
  previousMonth: '2026-06',
  invoiceMonth: '2026-07',
  previousElectric: 120,
  currentElectric: 165,
  previousWater: 30,
  currentWater: 42,
  electricUsage: 45,
  waterUsage: 12,
  rentAmount: 2400000,
  electricPrice: 3500,
  waterPrice: 15000,
  electricAmount: 157500,
  waterAmount: 180000,
  invoiceTotal: 2737500
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.bootstrap) {
      window.bootstrap = {
        Modal: class {
          constructor(element) {
            this.element = element;
          }

          show() {
            this.element.style.display = 'block';
            this.element.classList.add('show');
          }

          hide() {
            this.element.style.display = 'none';
            this.element.classList.remove('show');
            this.element.dispatchEvent(new Event('hidden.bs.modal'));
          }
        }
      };
    }
  });

  await page.goto('/#/rooms');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('rooms-page')).toBeVisible();
});

async function createRoom(page) {
  await page.goto('/#/rooms');
  await page.getByTestId('btn-add-room').click();
  await page.getByTestId('input-code').fill(DATA.roomCode);
  await page.getByTestId('input-name').fill(DATA.roomName);
  await page.getByTestId('input-type').fill('standard');
  await page.getByTestId('input-price').fill('2000000');
  await page.getByTestId('input-max-occupants').fill('2');
  await page.getByTestId('input-status').selectOption('empty');
  await page.getByTestId('btn-save').click();

  await expect(
    page.getByTestId('room-row').filter({ hasText: DATA.roomCode })
  ).toBeVisible();
}

async function createTenant(page) {
  await page.goto('/#/tenants');
  await expect(page.getByTestId('tenants-page')).toBeVisible();
  await page.getByTestId('btn-add-tenant').click();
  await page.getByTestId('tenant-input-name').fill(DATA.tenantName);
  await page.getByTestId('tenant-input-phone').fill(DATA.tenantPhone);
  await page.getByTestId('tenant-input-cccd').fill(DATA.tenantCccd);
  await page.getByTestId('tenant-submit').click();

  await expect(
    page.getByTestId('tenant-row').filter({ hasText: DATA.tenantName })
  ).toBeVisible();
}

async function createAndActivateContract(page) {
  await page.goto('/#/contracts');
  await expect(page.getByTestId('contracts-page')).toBeVisible();
  await page.getByTestId('btn-create').click();
  await page.getByTestId('contract-input-code').fill(DATA.contractCode);
  await page.getByTestId('contract-input-room').selectOption({
    label: `${DATA.roomCode} - ${DATA.roomName}`
  });
  await page.getByTestId('contract-input-tenant').selectOption({
    label: `${DATA.tenantName} - ${DATA.tenantPhone}`
  });
  await page.getByTestId('contract-input-start-date').fill('2026-01-01');
  await page.getByTestId('contract-input-end-date').fill('2026-12-31');
  await page.getByTestId('contract-input-rent').fill(String(DATA.rentAmount));
  await page.getByTestId('contract-input-deposit').fill(String(DATA.rentAmount));
  await page.getByTestId('contract-input-payment-day').fill('10');
  await page.getByTestId('contract-submit').click();

  const contractRow = page.getByTestId('contract-row').filter({
    hasText: DATA.contractCode
  });
  await expect(contractRow).toBeVisible();
  await contractRow.getByTestId('btn-activate-contract').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-ok').click();
  await expect(contractRow.getByTestId('contract-status-value')).toHaveText(
    'Đang hiệu lực'
  );
}

async function createUsageService(page, service) {
  await page.getByTestId('service-add').click();
  await page.getByTestId('service-input-code').fill(service.code);
  await page.getByTestId('service-input-name').fill(service.name);
  await page.getByTestId('service-input-unit').fill(service.unit);
  await page.getByTestId('service-input-calculation').selectOption('usage');
  await page.getByTestId('service-input-price').fill(String(service.price));
  await page.getByTestId('service-input-status').selectOption('active');
  await page.getByTestId('service-input-start-date').fill('2026-01-01');
  await page.getByTestId('service-submit').click();
  await expect(page.getByTestId('service-form-modal')).toHaveCount(0);
  await expect(page.getByTestId('service-table')).toContainText(service.code);
}

async function createServiceConfigs(page) {
  await page.goto('/#/services');
  await expect(page.getByTestId('services-page')).toBeVisible();
  await createUsageService(page, {
    code: 'DIEN',
    name: 'Điện',
    unit: 'kWh',
    price: DATA.electricPrice
  });
  await createUsageService(page, {
    code: 'NUOC',
    name: 'Nước',
    unit: 'm3',
    price: DATA.waterPrice
  });
}

function getMeterRow(page) {
  return page.getByTestId('meter-row').filter({ hasText: DATA.roomCode });
}

async function saveMeterReading(page, month, electricIndex, waterIndex) {
  await page.getByTestId('month-picker').fill(month);
  const meterRow = getMeterRow(page);
  await expect(meterRow).toBeVisible();
  await meterRow.locator('[data-testid^="electric-new-"]').fill(
    String(electricIndex)
  );
  await meterRow.locator('[data-testid^="water-new-"]').fill(
    String(waterIndex)
  );
  await meterRow.locator('[data-testid^="save-"]').click();
}

async function createMeterReadings(page) {
  await page.goto('/#/meters');
  await expect(page.getByTestId('meter-table')).toBeVisible();

  await saveMeterReading(
    page,
    DATA.previousMonth,
    DATA.previousElectric,
    DATA.previousWater
  );

  await page.getByTestId('month-picker').fill(DATA.invoiceMonth);
  const meterRow = getMeterRow(page);
  await meterRow.locator('[data-testid^="electric-new-"]').fill(
    String(DATA.currentElectric)
  );
  await meterRow.locator('[data-testid^="water-new-"]').fill(
    String(DATA.currentWater)
  );
  await expect(
    meterRow.locator('[data-testid^="usage-electric-"]')
  ).toHaveText(String(DATA.electricUsage));
  await expect(
    meterRow.locator('[data-testid^="usage-water-"]')
  ).toHaveText(String(DATA.waterUsage));
  await meterRow.locator('[data-testid^="save-"]').click();
}

test('tạo hóa đơn từ hợp đồng, chỉ số và đơn giá cố định', async ({ page }) => {
  await createRoom(page);
  await createTenant(page);
  await createAndActivateContract(page);
  await createServiceConfigs(page);
  await createMeterReadings(page);

  await page.goto('/#/invoices');
  await expect(page.getByTestId('invoices-page')).toBeVisible();
  await page.getByTestId('invoice-filter-month').fill(DATA.invoiceMonth);
  await page.getByTestId('invoice-filter-month').press('Tab');
  await expect(page.getByTestId('invoice-filter-month')).toHaveValue(
    DATA.invoiceMonth
  );
  await page.getByTestId('invoice-create-button').click();
  await page.getByTestId('invoice-form-room').selectOption({
    label: `${DATA.roomCode} - ${DATA.roomName}`
  });
  await page.getByTestId('invoice-form-month').fill(DATA.invoiceMonth);
  await page.getByTestId('invoice-form-due-date').fill('2099-12-31');
  await page.getByTestId('invoice-form-save-draft').click();

  const rentItem = page.getByTestId('invoice-item-row').filter({
    hasText: 'Tiền phòng'
  });
  const electricItem = page.getByTestId('invoice-item-row').filter({
    hasText: 'Điện'
  });
  const waterItem = page.getByTestId('invoice-item-row').filter({
    hasText: 'Nước'
  });

  await expect(rentItem).toContainText('2.400.000');
  await expect(electricItem).toContainText(String(DATA.electricUsage));
  await expect(electricItem).toContainText('3.500');
  await expect(electricItem).toContainText('157.500');
  await expect(waterItem).toContainText(String(DATA.waterUsage));
  await expect(waterItem).toContainText('15.000');
  await expect(waterItem).toContainText('180.000');
  await expect(page.getByTestId('invoice-form-modal')).toContainText(
    '2.737.500'
  );

  await page.getByTestId('invoice-form-finalize').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-ok').click();

  const invoiceRow = page.getByTestId('invoice-row').filter({
    hasText: DATA.roomCode
  });
  await expect(invoiceRow).toBeVisible();
  await expect(invoiceRow.getByTestId('invoice-total')).toContainText(
    '2.737.500'
  );
  await expect(invoiceRow.getByTestId('invoice-paid-amount')).toContainText('0');
  await expect(invoiceRow.getByTestId('invoice-remaining-amount')).toContainText(
    '2.737.500'
  );
  await expect(invoiceRow.getByTestId('invoice-status-unpaid')).toHaveText(
    'Chưa thanh toán'
  );
});
