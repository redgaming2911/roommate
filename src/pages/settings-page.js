import { BackupService } from '../services/backup-service.js';
import { seedIfEmpty } from '../services/seed-service.js';
import '../styles/settings.css';

const COLLECTION_LABELS = {
  rooms: 'Phòng',
  tenants: 'Người thuê',
  contracts: 'Hợp đồng',
  meterReadings: 'Chỉ số điện nước',
  serviceConfigs: 'Dịch vụ',
  invoices: 'Hóa đơn',
  payments: 'Thanh toán'
};

const state = {
  selectedFile: null,
  selectedData: null,
  validation: null,
  importMode: 'overwrite',
  message: '',
  messageType: 'success'
};

let pageContainer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatFileSize(bytes) {
  const size = Number(bytes) || 0;

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
}

function getCollectionStats() {
  const backup = BackupService.exportData();

  return Object.entries(COLLECTION_LABELS).map(([key, label]) => ({
    key,
    label,
    count: backup.data[key].length
  }));
}

function setMessage(message, type = 'success') {
  state.message = message;
  state.messageType = type;
}

function requestConfirmation(message, callback, options = {}) {
  window.showConfirm(message, callback, options);
}

function renderFileInformation() {
  if (!state.selectedFile) {
    return `
      <div class="settings-file-empty" data-testid="backup-file-empty">
        Chưa chọn file JSON.
      </div>
    `;
  }

  const statusClass = state.validation?.valid
    ? 'is-valid'
    : state.validation
      ? 'is-invalid'
      : '';

  return `
    <div class="settings-file-info ${statusClass}"
      data-testid="backup-file-info">
      <span class="settings-file-icon" aria-hidden="true">JSON</span>
      <div>
        <strong data-testid="backup-file-name">
          ${escapeHtml(state.selectedFile.name)}
        </strong>
        <p>
          ${formatFileSize(state.selectedFile.size)} ·
          ${formatDate(state.selectedFile.lastModified)}
        </p>
      </div>
      <span class="settings-file-status">
        ${state.validation?.valid
          ? 'Hợp lệ'
          : state.validation
            ? 'Không hợp lệ'
            : 'Chưa kiểm tra'}
      </span>
    </div>

    ${state.validation && !state.validation.valid ? `
      <ul class="settings-validation-errors"
        data-testid="backup-validation-errors">
        ${state.validation.errors.map((error) =>
          `<li>${escapeHtml(error)}</li>`
        ).join('')}
      </ul>
    ` : ''}
  `;
}

function renderStats(stats) {
  return stats.map((item) => `
    <article class="settings-stat" data-testid="stat-${item.key}">
      <span>${escapeHtml(item.label)}</span>
      <strong data-testid="stat-${item.key}-value">${item.count}</strong>
      <small>bản ghi</small>
    </article>
  `).join('');
}

async function handleFileSelection(file) {
  state.selectedFile = file ?? null;
  state.selectedData = null;
  state.validation = null;

  if (!file) {
    renderPage();
    return;
  }

  try {
    state.selectedData = await BackupService.readJsonFile(file);
    state.validation = BackupService.validateBackupData(state.selectedData);

    setMessage(
      state.validation.valid
        ? 'File backup hợp lệ và sẵn sàng để import.'
        : 'File backup không vượt qua bước kiểm tra.',
      state.validation.valid ? 'success' : 'error'
    );
  } catch (error) {
    state.validation = {
      valid: false,
      errors: [error.message]
    };
    setMessage(error.message, 'error');
  }

  renderPage();
}

function validateSelectedBackup() {
  if (!state.selectedData) {
    setMessage('Vui lòng chọn một file JSON trước.', 'error');
    renderPage();
    return;
  }

  state.validation = BackupService.validateBackupData(state.selectedData);

  setMessage(
    state.validation.valid
      ? 'Dữ liệu backup hợp lệ.'
      : 'Dữ liệu backup không hợp lệ.',
    state.validation.valid ? 'success' : 'error'
  );
  renderPage();
}

function executeImport() {
  try {
    const result = BackupService.importData(state.selectedData, {
      mode: state.importMode
    });
    state.selectedFile = null;
    state.selectedData = null;
    state.validation = null;
    setMessage(
      state.importMode === 'overwrite'
        ? `Đã ghi đè dữ liệu. Bản sao lưu trước import: ${result.backup.filename}.`
        : 'Đã gộp dữ liệu từ file backup.'
    );
    renderPage();
  } catch (error) {
    setMessage(error.message, 'error');
    renderPage();
  }
}

function handleImport() {
  if (!state.validation?.valid || !state.selectedData) {
    setMessage('File backup chưa hợp lệ để import.', 'error');
    renderPage();
    return;
  }

  if (state.importMode === 'overwrite') {
    requestConfirmation(
      'Ghi đè sẽ thay thế dữ liệu hiện tại. Một bản backup sẽ được tạo trước khi import. Bạn có muốn tiếp tục?',
      executeImport,
      { confirmLabel: 'Ghi đè dữ liệu' }
    );
    return;
  }

  executeImport();
}

function bindEvents() {
  const fileInput = pageContainer.querySelector(
    '[data-testid="backup-file-input"]'
  );

  fileInput.addEventListener('change', (event) => {
    handleFileSelection(event.target.files?.[0] ?? null);
  });

  pageContainer
    .querySelector('[data-testid="backup-export"]')
    .addEventListener('click', () => {
      const backup = BackupService.downloadBackup();
      setMessage(`Đã tạo file ${backup.filename}.`);
      renderPage();
    });

  pageContainer
    .querySelector('[data-testid="backup-validate"]')
    .addEventListener('click', validateSelectedBackup);

  pageContainer
    .querySelector('[data-testid="backup-import"]')
    .addEventListener('click', handleImport);

  pageContainer
    .querySelectorAll('[name="importMode"]')
    .forEach((input) => {
      input.addEventListener('change', (event) => {
        state.importMode = event.target.value;
      });
    });

  pageContainer
    .querySelector('[data-testid="seed-create"]')
    .addEventListener('click', () => {
      const result = seedIfEmpty();
      setMessage(
        result.count > 0
          ? `Đã tạo dữ liệu mẫu cho ${result.count} collection đang trống.`
          : 'Các collection đã có dữ liệu, không cần tạo thêm dữ liệu mẫu.'
      );
      renderPage();
    });

  pageContainer
    .querySelector('[data-testid="seed-restore"]')
    .addEventListener('click', () => {
      requestConfirmation(
        'Khôi phục dữ liệu mẫu sẽ thay thế dữ liệu hiện tại. Bạn có muốn tiếp tục?',
        () => {
          BackupService.restoreSeedData();
          setMessage('Đã khôi phục toàn bộ dữ liệu mẫu.');
          renderPage();
        },
        { confirmLabel: 'Khôi phục dữ liệu' }
      );
    });

  pageContainer
    .querySelector('[data-testid="data-delete-all"]')
    .addEventListener('click', () => {
      requestConfirmation(
        'Xóa toàn bộ dữ liệu là thao tác không thể hoàn tác. Bạn có chắc chắn?',
        () => {
          BackupService.resetAllData();
          setMessage('Đã xóa toàn bộ dữ liệu.', 'error');
          renderPage();
        },
        { confirmLabel: 'Xóa toàn bộ dữ liệu' }
      );
    });
}

function renderPage() {
  const stats = getCollectionStats();

  pageContainer.innerHTML = `
    <section class="settings-page" data-testid="settings-page">
      <header class="settings-header">
        <p>Trang chủ / Cài đặt / Sao lưu dữ liệu</p>
        <h1>Sao lưu và khôi phục dữ liệu</h1>
        <span>Quản lý dữ liệu RoomMate an toàn và chủ động.</span>
      </header>

      ${state.message ? `
        <div class="settings-message settings-message--${state.messageType}"
          data-testid="settings-message" role="status">
          ${escapeHtml(state.message)}
        </div>
      ` : ''}

      <div class="settings-action-grid">
        <article class="settings-card settings-card--export">
          <div class="settings-card__heading">
            <span class="settings-card__number">1</span>
            <div><h2>Xuất dữ liệu</h2><p>Tải toàn bộ dữ liệu thành file JSON.</p></div>
          </div>
          <div class="settings-card__body">
            <div class="settings-information-box">
              <strong>Backup bao gồm</strong>
              <span>7 collection nghiệp vụ và metadata thời gian.</span>
            </div>
          </div>
          <button class="settings-button settings-button--outline"
            type="button" data-testid="backup-export">
            Tải file sao lưu
          </button>
        </article>

        <article class="settings-card settings-card--import">
          <div class="settings-card__heading">
            <span class="settings-card__number">2</span>
            <div><h2>Nhập dữ liệu</h2><p>Chọn file JSON đã sao lưu từ RoomMate.</p></div>
          </div>

          <label class="settings-file-picker" for="backup-file-input">
            <strong>Chọn file JSON</strong>
            <span>File được kiểm tra trước khi import</span>
          </label>
          <input id="backup-file-input" class="settings-file-input"
            type="file" accept="application/json,.json"
            data-testid="backup-file-input">

          ${renderFileInformation()}

          <fieldset class="settings-import-mode" data-testid="import-mode">
            <legend>Cách nhập dữ liệu</legend>
            <label>
              <input type="radio" name="importMode" value="overwrite"
                ${state.importMode === 'overwrite' ? 'checked' : ''}>
              Ghi đè
            </label>
            <label>
              <input type="radio" name="importMode" value="merge"
                ${state.importMode === 'merge' ? 'checked' : ''}>
              Gộp dữ liệu
            </label>
          </fieldset>

          <div class="settings-inline-actions">
            <button class="settings-button settings-button--outline"
              type="button" data-testid="backup-validate">
              Kiểm tra dữ liệu
            </button>
            <button class="settings-button settings-button--success"
              type="button" data-testid="backup-import"
              ${state.validation?.valid ? '' : 'disabled'}>
              Import dữ liệu
            </button>
          </div>
        </article>

        <article class="settings-card settings-card--seed">
          <div class="settings-card__heading">
            <span class="settings-card__number">3</span>
            <div><h2>Dữ liệu mẫu</h2><p>Tạo nhanh dữ liệu để trải nghiệm hệ thống.</p></div>
          </div>
          <div class="settings-warning settings-warning--neutral">
            “Tạo dữ liệu mẫu” chỉ bổ sung collection đang trống. “Khôi phục” sẽ thay thế dữ liệu hiện tại.
          </div>
          <button class="settings-button settings-button--warning"
            type="button" data-testid="seed-create">
            Tạo dữ liệu mẫu
          </button>
          <button class="settings-button settings-button--soft-warning"
            type="button" data-testid="seed-restore">
            Khôi phục dữ liệu mẫu
          </button>
        </article>

        <article class="settings-card settings-card--danger">
          <div class="settings-card__heading">
            <span class="settings-card__number">4</span>
            <div><h2>Xóa dữ liệu</h2><p>Xóa toàn bộ dữ liệu trong hệ thống.</p></div>
          </div>
          <div class="settings-warning settings-warning--danger"
            data-testid="delete-warning">
            <strong>Cảnh báo</strong>
            <ul>
              <li>Dữ liệu sẽ bị xóa vĩnh viễn.</li>
              <li>Thao tác không thể hoàn tác.</li>
              <li>Hãy xuất backup trước khi xóa.</li>
            </ul>
          </div>
          <button class="settings-button settings-button--danger"
            type="button" data-testid="data-delete-all">
            Xóa toàn bộ dữ liệu
          </button>
        </article>
      </div>

      <section class="settings-stats-section" data-testid="collection-stats">
        <div class="settings-section-heading">
          <h2>Thống kê dữ liệu hiện tại</h2>
          <p>Số lượng bản ghi đang lưu theo từng collection.</p>
        </div>
        <div class="settings-stats-grid">
          ${renderStats(stats)}
        </div>
      </section>
    </section>
  `;

  bindEvents();
}

export function render(container) {
  pageContainer = container;
  state.selectedFile = null;
  state.selectedData = null;
  state.validation = null;
  state.importMode = 'overwrite';
  state.message = '';
  renderPage();
}
