import { expect, test } from '@playwright/test';

const ROOM_CODE = 'E2E-ROOM-101';

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
  await expect(page.getByTestId('rooms-empty-state')).toBeVisible();
});

test('thêm, lưu bền vững, sửa, tìm kiếm, lọc và xóa phòng', async ({ page }) => {
  await page.getByTestId('btn-add-room').click();
  await expect(page.getByTestId('room-form')).toBeVisible();

  await page.getByTestId('input-code').fill(ROOM_CODE);
  await page.getByTestId('input-name').fill('Phòng Playwright 101');
  await page.getByTestId('input-type').fill('standard');
  await page.getByTestId('input-price').fill('2500000');
  await page.getByTestId('input-area').fill('24');
  await page.getByTestId('input-max-occupants').fill('2');
  await page.getByTestId('input-floor').fill('1');
  await page.getByTestId('input-area-name').fill('Khu E2E');
  await page.getByTestId('input-status').selectOption('empty');
  await page.getByTestId('btn-save').click();

  let roomRow = page.getByTestId('room-row').filter({ hasText: ROOM_CODE });
  await expect(roomRow).toBeVisible();
  await expect(roomRow.getByTestId('room-name')).toHaveText('Phòng Playwright 101');
  await expect(roomRow.getByTestId('room-price')).toContainText('2.500.000');

  await page.reload();
  await expect(page.getByTestId('rooms-page')).toBeVisible();
  roomRow = page.getByTestId('room-row').filter({ hasText: ROOM_CODE });
  await expect(roomRow).toBeVisible();

  await roomRow.getByTestId('btn-edit-room').click();
  await expect(page.getByTestId('room-form')).toBeVisible();
  await page.getByTestId('input-price').fill('3200000');
  await page.getByTestId('btn-save').click();

  roomRow = page.getByTestId('room-row').filter({ hasText: ROOM_CODE });
  await expect(roomRow.getByTestId('room-price')).toContainText('3.200.000');

  await page.getByTestId('room-search').fill(ROOM_CODE);
  await expect(roomRow).toBeVisible();
  await page.getByTestId('room-search').fill('KHONG-TON-TAI');
  await expect(page.getByTestId('rooms-empty-state')).toBeVisible();
  await page.getByTestId('room-search').fill('');

  await page.getByTestId('room-filter-status').selectOption('rented');
  await expect(page.getByTestId('rooms-empty-state')).toBeVisible();
  await page.getByTestId('room-filter-status').selectOption('empty');
  roomRow = page.getByTestId('room-row').filter({ hasText: ROOM_CODE });
  await expect(roomRow).toBeVisible();

  await roomRow.getByTestId('btn-delete-room').click();
  await expect(page.getByTestId('confirm-modal')).toBeVisible();
  await page.getByTestId('confirm-ok').click();

  await expect(roomRow).toHaveCount(0);
  await expect(page.getByTestId('rooms-empty-state')).toBeVisible();
});
