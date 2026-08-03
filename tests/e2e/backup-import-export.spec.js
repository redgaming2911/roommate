import { expect, test } from '@playwright/test';

const ORIGINAL_DATA = {
  rooms: [
    {
      id: 'e2e-backup-room-501',
      code: 'E2E-BACKUP-501',
      name: 'Phòng backup 501',
      status: 'empty',
      price: 2_500_000
    },
    {
      id: 'e2e-backup-room-502',
      code: 'E2E-BACKUP-502',
      name: 'Phòng backup 502',
      status: 'repairing',
      price: 2_800_000
    }
  ],
  tenants: [
    {
      id: 'e2e-backup-tenant-501',
      name: 'Người thuê backup 501',
      phone: '0900000501',
      status: 'active'
    }
  ],
  contracts: [],
  meterReadings: [],
  serviceConfigs: [],
  invoices: [],
  payments: []
};

const REPLACEMENT_DATA = {
  rooms: [
    {
      id: 'e2e-replacement-room-599',
      code: 'E2E-REPLACE-599',
      name: 'Phòng sẽ không được ghi đè',
      status: 'empty',
      price: 3_000_000
    }
  ],
  tenants: [],
  contracts: [],
  meterReadings: [],
  serviceConfigs: [],
  invoices: [],
  payments: []
};

function createBackupPayload(data) {
  return {
    metadata: {
      application: 'RoomMate',
      version: 1,
      exportedAt: '2026-08-03T08:00:00.000Z'
    },
    data
  };
}

async function downloadToBuffer(download) {
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();

  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));

  return Buffer.concat(chunks);
}

async function chooseGeneratedFile(page, { name, mimeType, buffer }) {
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('label[for="backup-file-input"]').click();
  const chooser = await chooserPromise;

  await chooser.setFiles({ name, mimeType, buffer });
  await expect(page.getByTestId('backup-file-name')).toHaveText(name);
}

async function expectOriginalDataStored(page) {
  const storedData = await page.evaluate(() => ({
    rooms: JSON.parse(localStorage.getItem('rooms') ?? '[]'),
    tenants: JSON.parse(localStorage.getItem('tenants') ?? '[]')
  }));

  expect(storedData.rooms.map((room) => room.id)).toEqual([
    'e2e-backup-room-501',
    'e2e-backup-room-502'
  ]);
  expect(storedData.tenants).toHaveLength(1);
  expect(storedData.tenants[0].id).toBe('e2e-backup-tenant-501');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.bootstrap) {
      window.bootstrap = {
        Modal: class {
          constructor(element) {
            this.element = element;
            element
              .querySelectorAll('[data-bs-dismiss="modal"]')
              .forEach((button) => {
                button.addEventListener('click', () => this.hide());
              });
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

  await page.goto('/#/settings');
  await page.evaluate((data) => {
    localStorage.clear();
    Object.entries(data).forEach(([key, items]) => {
      localStorage.setItem(key, JSON.stringify(items));
    });
  }, ORIGINAL_DATA);
  await page.reload();

  await expect(page.getByTestId('settings-page')).toBeVisible();
  await expect(page.getByTestId('stat-rooms-value')).toHaveText('2');
  await expect(page.getByTestId('stat-tenants-value')).toHaveText('1');
});

test('export, xóa dữ liệu và import lại file JSON đã tải xuống', async ({ page }) => {
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('backup-export').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(
    /^roommate-backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.json$/
  );

  const backupBuffer = await downloadToBuffer(download);
  const exportedBackup = JSON.parse(backupBuffer.toString('utf8'));

  expect(exportedBackup.metadata.application).toBe('RoomMate');
  expect(exportedBackup.data.rooms).toHaveLength(2);
  expect(exportedBackup.data.tenants).toHaveLength(1);

  await page.getByTestId('data-delete-all').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-ok').click();

  await expect(page.getByTestId('stat-rooms-value')).toHaveText('0');
  await expect(page.getByTestId('stat-tenants-value')).toHaveText('0');

  await chooseGeneratedFile(page, {
    name: download.suggestedFilename(),
    mimeType: 'application/json',
    buffer: backupBuffer
  });

  await expect(page.getByTestId('backup-import')).toBeEnabled();
  await page.getByTestId('backup-import').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();

  const safetyBackupPromise = page.waitForEvent('download');
  await page.getByTestId('confirm-ok').click();
  const safetyBackup = await safetyBackupPromise;

  expect(safetyBackup.suggestedFilename()).toMatch(/^roommate-backup-.+\.json$/);
  await expect(page.getByTestId('stat-rooms-value')).toHaveText('2');
  await expect(page.getByTestId('stat-tenants-value')).toHaveText('1');
  await expect(page.getByTestId('settings-message')).toContainText('Đã ghi đè');

  await page.reload();
  await expect(page.getByTestId('stat-rooms-value')).toHaveText('2');
  await expect(page.getByTestId('stat-tenants-value')).toHaveText('1');
  await expectOriginalDataStored(page);
});

test('báo lỗi file sai định dạng và hủy ghi đè không làm mất dữ liệu', async ({ page }) => {
  await chooseGeneratedFile(page, {
    name: 'roommate-backup-invalid.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('không phải file JSON', 'utf8')
  });

  await expect(page.getByTestId('backup-validation-errors')).toContainText(
    'định dạng JSON'
  );
  await expect(page.getByTestId('settings-message')).toContainText(
    'định dạng JSON'
  );
  await expect(page.getByTestId('backup-import')).toBeDisabled();
  await expectOriginalDataStored(page);

  const replacementBuffer = Buffer.from(
    JSON.stringify(createBackupPayload(REPLACEMENT_DATA)),
    'utf8'
  );

  await chooseGeneratedFile(page, {
    name: 'roommate-backup-replacement.json',
    mimeType: 'application/json',
    buffer: replacementBuffer
  });

  await expect(page.getByTestId('backup-import')).toBeEnabled();
  await page.getByTestId('backup-import').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-cancel').click();
  await expect(page.getByTestId('confirm-modal')).not.toBeVisible();

  await expect(page.getByTestId('stat-rooms-value')).toHaveText('2');
  await expect(page.getByTestId('stat-tenants-value')).toHaveText('1');
  await expectOriginalDataStored(page);

  await page.reload();
  await expect(page.getByTestId('settings-page')).toBeVisible();
  await expect(page.getByTestId('stat-rooms-value')).toHaveText('2');
  await expect(page.getByTestId('stat-tenants-value')).toHaveText('1');
  await expectOriginalDataStored(page);
});
