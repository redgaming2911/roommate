import { expect, test } from '@playwright/test';

const TEST_DATA = {
  roomId: 'e2e-payment-room-401',
  roomCode: 'E2E-PAY-401',
  tenantId: 'e2e-payment-tenant-401',
  tenantName: 'Người thuê thanh toán E2E 401',
  invoiceId: 'e2e-payment-invoice-401',
  invoiceCode: 'E2E-HDT-401',
  invoiceTotal: 2_000_000,
  firstPayment: 1_200_000,
  remainingPayment: 800_000
};

function formatDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function getCurrentMonth() {
  return formatDate(new Date()).slice(0, 7);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/#/payments');

  await page.evaluate(({ data, month, today }) => {
    localStorage.clear();

    const createdAt = `${today}T08:00:00.000Z`;

    localStorage.setItem('rooms', JSON.stringify([{
      id: data.roomId,
      code: data.roomCode,
      name: 'Phòng thanh toán E2E 401',
      status: 'rented',
      price: data.invoiceTotal,
      maxOccupants: 2,
      createdAt,
      updatedAt: createdAt
    }]));

    localStorage.setItem('tenants', JSON.stringify([{
      id: data.tenantId,
      name: data.tenantName,
      phone: '0900000401',
      cccd: '079206000401',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    }]));

    localStorage.setItem('contracts', JSON.stringify([]));
    localStorage.setItem('meterReadings', JSON.stringify([]));
    localStorage.setItem('serviceConfigs', JSON.stringify([]));
    localStorage.setItem('payments', JSON.stringify([]));
    localStorage.setItem('invoices', JSON.stringify([{
      id: data.invoiceId,
      invoiceCode: data.invoiceCode,
      roomId: data.roomId,
      tenantId: data.tenantId,
      month,
      dueDate: '2999-12-31',
      subtotal: data.invoiceTotal,
      discount: 0,
      total: data.invoiceTotal,
      paidAmount: 0,
      remainingAmount: data.invoiceTotal,
      status: 'unpaid',
      items: [{
        code: 'RENT',
        name: 'Tiền phòng',
        quantity: 1,
        unitPrice: data.invoiceTotal,
        amount: data.invoiceTotal
      }],
      createdAt,
      updatedAt: createdAt
    }]));
  }, {
    data: TEST_DATA,
    month: getCurrentMonth(),
    today: formatDate(new Date())
  });

  await page.reload();
  await expect(page.getByTestId('payments-page')).toBeVisible();
});

async function openPaymentForm(page) {
  await page.getByTestId('payment-create-button').click();
  await expect(page.getByTestId('payment-form-modal')).toBeVisible();
  await page.getByTestId('payment-form-invoice').selectOption(
    TEST_DATA.invoiceId
  );
}

async function submitPayment(page, amount, method, referenceCode) {
  await openPaymentForm(page);
  await page.getByTestId('payment-form-amount').fill(String(amount));
  await page.getByTestId('payment-form-method').selectOption(method);
  await page.getByTestId('payment-form-reference').fill(referenceCode);
  await page.getByTestId('payment-form-submit').click();
  await expect(page.getByTestId('payment-form-modal')).toHaveCount(0);
}

async function getInvoiceRow(page) {
  await page.goto('/#/invoices');
  await expect(page.getByTestId('invoices-page')).toBeVisible();
  await page.getByTestId('invoice-filter-month').fill(getCurrentMonth());
  await page.getByTestId('invoice-filter-month').press('Tab');

  const row = page.getByTestId('invoice-row').filter({
    hasText: TEST_DATA.invoiceCode
  });

  await expect(row).toBeVisible();
  return row;
}

async function expectStoredPaymentState(page, expected) {
  const state = await page.evaluate((invoiceId) => {
    const invoices = JSON.parse(localStorage.getItem('invoices') ?? '[]');
    const payments = JSON.parse(localStorage.getItem('payments') ?? '[]');

    return {
      invoice: invoices.find((invoice) => invoice.id === invoiceId),
      payments: payments.filter((payment) => payment.invoiceId === invoiceId)
    };
  }, TEST_DATA.invoiceId);

  expect(state.invoice).toMatchObject({
    id: TEST_DATA.invoiceId,
    paidAmount: expected.paidAmount,
    remainingAmount: expected.remainingAmount,
    status: expected.status
  });
  expect(state.payments).toHaveLength(expected.paymentCount);
  expect(
    state.payments.reduce((total, payment) => total + payment.amount, 0)
  ).toBe(expected.paidAmount);
}

test('thanh toán từng phần, thanh toán đủ và cập nhật Dashboard sau reload', async ({ page }) => {
  await page.goto('/#/dashboard');
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
  await expect(page.getByTestId('stat-monthly-revenue-value')).toContainText(
    '2.000.000'
  );
  await expect(page.getByTestId('stat-total-debt-value')).toContainText(
    '2.000.000'
  );

  await page.goto('/#/payments');
  await submitPayment(page, TEST_DATA.firstPayment, 'cash', 'E2E-PAYMENT-401-A');

  await expect(page.getByTestId('payment-row')).toHaveCount(1);
  await expect(page.getByTestId('payment-row')).toContainText('1.200.000');

  let invoiceRow = await getInvoiceRow(page);
  await expect(invoiceRow.getByTestId('invoice-paid-amount')).toContainText(
    '1.200.000'
  );
  await expect(invoiceRow.getByTestId('invoice-remaining-amount')).toContainText(
    '800.000'
  );
  await expect(invoiceRow.getByTestId('invoice-status-partial')).toBeVisible();

  await page.reload();
  invoiceRow = page.getByTestId('invoice-row').filter({
    hasText: TEST_DATA.invoiceCode
  });
  await expect(invoiceRow.getByTestId('invoice-remaining-amount')).toContainText(
    '800.000'
  );
  await expect(invoiceRow.getByTestId('invoice-status-partial')).toBeVisible();
  await expectStoredPaymentState(page, {
    paidAmount: TEST_DATA.firstPayment,
    remainingAmount: TEST_DATA.remainingPayment,
    status: 'partial',
    paymentCount: 1
  });

  await page.goto('/#/payments');
  await submitPayment(
    page,
    TEST_DATA.remainingPayment,
    'bank_transfer',
    'E2E-PAYMENT-401-B'
  );

  await expect(page.getByTestId('payment-row')).toHaveCount(2);
  await expect(page.getByTestId('payment-summary')).toContainText('2.000.000');

  invoiceRow = await getInvoiceRow(page);
  await expect(invoiceRow.getByTestId('invoice-paid-amount')).toContainText(
    '2.000.000'
  );
  await expect(invoiceRow.getByTestId('invoice-remaining-amount')).toContainText(
    '0'
  );
  await expect(invoiceRow.getByTestId('invoice-status-paid')).toBeVisible();

  await page.reload();
  invoiceRow = page.getByTestId('invoice-row').filter({
    hasText: TEST_DATA.invoiceCode
  });
  await expect(invoiceRow.getByTestId('invoice-status-paid')).toBeVisible();
  await expectStoredPaymentState(page, {
    paidAmount: TEST_DATA.invoiceTotal,
    remainingAmount: 0,
    status: 'paid',
    paymentCount: 2
  });

  await page.goto('/#/dashboard');
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
  await expect(page.getByTestId('stat-monthly-revenue-value')).toContainText(
    '2.000.000'
  );
  await expect(page.getByTestId('stat-total-debt-value')).toContainText('0');

  await page.reload();
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
  await expect(page.getByTestId('stat-monthly-revenue-value')).toContainText(
    '2.000.000'
  );
  await expect(page.getByTestId('stat-total-debt-value')).toContainText('0');
  await expectStoredPaymentState(page, {
    paidAmount: TEST_DATA.invoiceTotal,
    remainingAmount: 0,
    status: 'paid',
    paymentCount: 2
  });
});
