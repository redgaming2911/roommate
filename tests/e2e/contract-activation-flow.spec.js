import { expect, test } from '@playwright/test';

async function prepareCleanApp(page) {
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
}

async function createRoom(page, suffix) {
  const code = `E2E-P-${suffix}`;
  const name = `Phòng hợp đồng ${suffix}`;

  await page.goto('/#/rooms');
  await expect(page.getByTestId('rooms-page')).toBeVisible();
  await page.getByTestId('btn-add-room').click();
  await page.getByTestId('input-code').fill(code);
  await page.getByTestId('input-name').fill(name);
  await page.getByTestId('input-type').fill('standard');
  await page.getByTestId('input-price').fill('2500000');
  await page.getByTestId('input-max-occupants').fill('2');
  await page.getByTestId('input-status').selectOption('empty');
  await page.getByTestId('btn-save').click();

  const roomRow = page.getByTestId('room-row').filter({ hasText: code });
  await expect(roomRow).toBeVisible();
  return { code, name };
}

async function createTenant(page, suffix) {
  const name = `Người thuê E2E ${suffix}`;
  const phone = `0900000${suffix}`;
  const cccd = `0792060${suffix}`;

  await page.goto('/#/tenants');
  await expect(page.getByTestId('tenants-page')).toBeVisible();
  await page.getByTestId('btn-add-tenant').click();
  await page.getByTestId('tenant-input-name').fill(name);
  await page.getByTestId('tenant-input-phone').fill(phone);
  await page.getByTestId('tenant-input-cccd').fill(cccd);
  await page.getByTestId('tenant-submit').click();

  const tenantRow = page.getByTestId('tenant-row').filter({ hasText: name });
  await expect(tenantRow).toBeVisible();
  return { name, phone };
}

async function createContract(page, { code, room, tenant, startDate, endDate }) {
  await page.goto('/#/contracts');
  await expect(page.getByTestId('contracts-page')).toBeVisible();
  await page.getByTestId('btn-create').click();
  await expect(page.getByTestId('contract-form')).toBeVisible();

  await page.getByTestId('contract-input-code').fill(code);
  await page.getByTestId('contract-input-room').selectOption({
    label: `${room.code} - ${room.name}`
  });
  await page.getByTestId('contract-input-tenant').selectOption({
    label: `${tenant.name} - ${tenant.phone}`
  });
  await page.getByTestId('contract-input-start-date').fill(startDate);
  await page.getByTestId('contract-input-end-date').fill(endDate);
  await page.getByTestId('contract-input-rent').fill('2400000');
  await page.getByTestId('contract-input-deposit').fill('2400000');
  await page.getByTestId('contract-input-payment-day').fill('10');
  await page.getByTestId('contract-submit').click();
}

test.beforeEach(async ({ page }) => {
  await prepareCleanApp(page);
});

test('tạo và kích hoạt hợp đồng làm phòng chuyển sang đang thuê', async ({ page }) => {
  const room = await createRoom(page, '201');
  const tenant = await createTenant(page, '201');
  const contractCode = 'E2E-HD-201';

  await createContract(page, {
    code: contractCode,
    room,
    tenant,
    startDate: '2026-08-01',
    endDate: '2027-07-31'
  });

  let contractRow = page.getByTestId('contract-row').filter({
    hasText: contractCode
  });
  await expect(contractRow).toBeVisible();
  await expect(contractRow.getByTestId('contract-status-value')).toHaveText(
    'Bản nháp'
  );

  await contractRow.getByTestId('btn-activate-contract').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-ok').click();

  contractRow = page.getByTestId('contract-row').filter({
    hasText: contractCode
  });
  await expect(contractRow.getByTestId('contract-status-value')).toHaveText(
    'Đang hiệu lực'
  );

  await page.goto('/#/rooms');
  await expect(page.getByTestId('rooms-page')).toBeVisible();
  const roomRow = page.getByTestId('room-row').filter({ hasText: room.code });
  await expect(roomRow.getByTestId('room-status')).toHaveText('Đang thuê');

  await page.goto('/#/contracts');
  await expect(page.getByTestId('contracts-page')).toBeVisible();
  contractRow = page.getByTestId('contract-row').filter({
    hasText: contractCode
  });
  await expect(contractRow).toBeVisible();
  await expect(contractRow.getByTestId('contract-code')).toHaveText(
    contractCode
  );
});

test('không cho tạo hợp đồng trùng thời gian và hiển thị đúng lỗi', async ({ page }) => {
  const room = await createRoom(page, '202');
  const tenant = await createTenant(page, '202');

  await createContract(page, {
    code: 'E2E-HD-202-A',
    room,
    tenant,
    startDate: '2026-08-01',
    endDate: '2027-07-31'
  });
  await expect(page.getByTestId('contract-form')).toHaveCount(0);

  await createContract(page, {
    code: 'E2E-HD-202-B',
    room,
    tenant,
    startDate: '2027-01-01',
    endDate: '2027-12-31'
  });

  await expect(page.getByTestId('contract-form')).toBeVisible();
  await expect(page.getByTestId('contract-form-error')).toHaveText(
    'Phòng đã có hợp đồng trong khoảng thời gian này'
  );
  await expect(page.getByTestId('contract-row')).toHaveCount(1);
  await expect(
    page.getByTestId('contract-row').filter({ hasText: 'E2E-HD-202-A' })
  ).toBeVisible();
});
