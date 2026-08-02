import * as InvoiceService from '../services/invoice-service.js';
import * as RoomServiceModule from '../services/room-service.js';
import * as ConfirmDialogModule from './confirm-dialog.js';

const RoomService =
  RoomServiceModule.RoomService ?? RoomServiceModule;

/**
 * Escape nội dung HTML.
 * @param {unknown} value
 * @returns {string}
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Định dạng tiền VND.
 * @param {unknown} value
 * @returns {string}
 */
function formatCurrency(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '0 ₫';
  }

  return `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`;
}

/**
 * Hộp thoại xác nhận.
 * @param {string} message
 * @returns {Promise<boolean>}
 */
async function requestConfirmation(message) {
  if (typeof ConfirmDialogModule.confirmDialog === 'function') {
    return Boolean(
      await ConfirmDialogModule.confirmDialog(message)
    );
  }

  return window.confirm(message);
}

/**
 * Lấy danh sách phòng.
 * @returns {Array}
 */
function getRooms() {
  if (typeof RoomService.getRooms !== 'function') {
    return [];
  }

  try {
    return RoomService.getRooms();
  } catch (error) {
    console.error('Không thể tải phòng:', error);
    return [];
  }
}

/**
 * Lấy nhãn phòng.
 * @param {Object} room
 * @returns {string}
 */
function getRoomLabel(room) {
  const code =
    room.roomCode ??
    room.code ??
    room.id;

  const name = room.name ?? '';

  return name && name !== code
    ? `${code} - ${name}`
    : code;
}

/**
 * Kiểm tra số không âm.
 * @param {unknown} value
 * @returns {boolean}
 */
function isNonNegativeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0;
}

/**
 * Tạo và mở form hóa đơn.
 * @param {Object} options
 * @param {string|null} options.invoiceId
 * @param {string} options.defaultMonth
 * @param {Function} options.onChanged
 * @param {Function} options.onCompleted
 */
export function openInvoiceForm({
  invoiceId = null,
  defaultMonth = '',
  onChanged = () => {},
  onCompleted = () => {}
} = {}) {
  let currentInvoice = invoiceId
    ? InvoiceService.getInvoiceById(invoiceId)
    : null;

  if (invoiceId && !currentInvoice) {
    throw new Error('Không tìm thấy hóa đơn');
  }

  if (
    currentInvoice &&
    currentInvoice.status !== 'draft'
  ) {
    throw new Error(
      'Chỉ được chỉnh sửa hóa đơn bản nháp'
    );
  }

  const overlay = document.createElement('div');
  overlay.className = 'invoice-modal-overlay';
  overlay.dataset.testid = 'invoice-form-modal';

  document.body.appendChild(overlay);

  /**
   * Đóng modal.
   */
  function closeModal() {
    overlay.remove();
  }

  /**
   * Lấy dữ liệu form hiện tại.
   * @returns {Object}
   */
  function readBaseForm() {
    const roomId =
      overlay.querySelector('[name="roomId"]')?.value ?? '';

    const month =
      overlay.querySelector('[name="month"]')?.value ?? '';

    const dueDate =
      overlay.querySelector('[name="dueDate"]')?.value ?? '';

    const discountRaw =
      overlay.querySelector('[name="discount"]')?.value ?? '0';

    const note =
      overlay.querySelector('[name="note"]')?.value.trim() ?? '';

    return {
      roomId,
      month,
      dueDate,
      discount: Number(discountRaw),
      note
    };
  }

  /**
   * Xóa lỗi form.
   */
  function clearErrors() {
    overlay
      .querySelectorAll('[data-error]')
      .forEach((element) => {
        element.textContent = '';
      });

    overlay
      .querySelectorAll('.is-invalid')
      .forEach((element) => {
        element.classList.remove('is-invalid');
      });

    const generalError = overlay.querySelector(
      '[data-testid="invoice-form-general-error"]'
    );

    if (generalError) {
      generalError.textContent = '';
      generalError.hidden = true;
    }
  }

  /**
   * Gán lỗi cho một trường.
   * @param {string} field
   * @param {string} message
   */
  function setFieldError(field, message) {
    const input = overlay.querySelector(
      `[name="${field}"]`
    );

    const errorElement = overlay.querySelector(
      `[data-error="${field}"]`
    );

    input?.classList.add('is-invalid');

    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  /**
   * Hiển thị lỗi chung.
   * @param {string} message
   */
  function setGeneralError(message) {
    const generalError = overlay.querySelector(
      '[data-testid="invoice-form-general-error"]'
    );

    if (!generalError) {
      return;
    }

    generalError.textContent = message;
    generalError.hidden = false;
  }

  /**
   * Validate các trường bắt buộc.
   * @param {Object} data
   * @returns {boolean}
   */
  function validateBaseForm(data) {
    clearErrors();

    let valid = true;

    if (!data.roomId) {
      setFieldError(
        'roomId',
        'Vui lòng chọn phòng.'
      );
      valid = false;
    }

    if (!data.month) {
      setFieldError(
        'month',
        'Vui lòng chọn tháng hóa đơn.'
      );
      valid = false;
    }

    if (!data.dueDate) {
      setFieldError(
        'dueDate',
        'Hạn thanh toán là bắt buộc.'
      );
      valid = false;
    }

    if (!isNonNegativeNumber(data.discount)) {
      setFieldError(
        'discount',
        'Giảm giá phải là số không âm.'
      );
      valid = false;
    }

    return valid;
  }

  /**
   * Tạo hoặc lưu bản nháp hiện tại.
   * @returns {Object|null}
   */
  function saveDraft() {
    const formData = readBaseForm();

    if (!validateBaseForm(formData)) {
      return null;
    }

    try {
      if (!currentInvoice) {
        currentInvoice =
          InvoiceService.generateInvoiceForRoom(
            formData.roomId,
            formData.month,
            formData.discount
          );
      }

      currentInvoice =
        InvoiceService.updateDraftInvoice(
          currentInvoice.id,
          {
            dueDate: formData.dueDate,
            discount: formData.discount,
            note: formData.note
          }
        );

      onChanged(currentInvoice);

      return currentInvoice;
    } catch (error) {
      setGeneralError(error.message);
      return null;
    }
  }

  /**
   * Thêm khoản phát sinh.
   */
  function addManualItem() {
    clearErrors();

    if (!currentInvoice) {
      setGeneralError(
        'Vui lòng lưu bản nháp trước khi thêm khoản phát sinh.'
      );
      return;
    }

    const nameInput = overlay.querySelector(
      '[name="manualName"]'
    );
    const quantityInput = overlay.querySelector(
      '[name="manualQuantity"]'
    );
    const unitPriceInput = overlay.querySelector(
      '[name="manualUnitPrice"]'
    );
    const noteInput = overlay.querySelector(
      '[name="manualNote"]'
    );

    const name = nameInput?.value.trim() ?? '';
    const quantity = Number(quantityInput?.value ?? 1);
    const unitPrice = Number(unitPriceInput?.value ?? 0);
    const note = noteInput?.value.trim() ?? '';

    let valid = true;

    if (!name) {
      setFieldError(
        'manualName',
        'Vui lòng nhập tên khoản phát sinh.'
      );
      valid = false;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setFieldError(
        'manualQuantity',
        'Số lượng phải lớn hơn 0.'
      );
      valid = false;
    }

    if (!isNonNegativeNumber(unitPrice)) {
      setFieldError(
        'manualUnitPrice',
        'Đơn giá phải là số không âm.'
      );
      valid = false;
    }

    if (!valid) {
      return;
    }

    try {
      InvoiceService.addManualItem(
        currentInvoice.id,
        {
          name,
          quantity,
          unitPrice,
          note
        }
      );

      currentInvoice =
        InvoiceService.getInvoiceById(
          currentInvoice.id
        );

      onChanged(currentInvoice);
      renderModal();
    } catch (error) {
      setGeneralError(error.message);
    }
  }

  /**
   * Xóa khoản phát sinh thủ công.
   * @param {string} itemId
   */
  async function removeManualItem(itemId) {
    if (!currentInvoice) {
      return;
    }

    const confirmed = await requestConfirmation(
      'Xóa khoản phát sinh này khỏi hóa đơn?'
    );

    if (!confirmed) {
      return;
    }

    try {
      currentInvoice =
        InvoiceService.removeManualItem(
          currentInvoice.id,
          itemId
        );

      onChanged(currentInvoice);
      renderModal();
    } catch (error) {
      setGeneralError(error.message);
    }
  }

  /**
   * Chốt hóa đơn.
   */
  async function finalizeInvoice() {
    const savedInvoice = saveDraft();

    if (!savedInvoice) {
      return;
    }

    const confirmed = await requestConfirmation(
      'Bạn có chắc muốn chốt hóa đơn này? Sau khi chốt sẽ không thể chỉnh sửa tùy ý.'
    );

    if (!confirmed) {
      return;
    }

    try {
      const finalizedInvoice =
        InvoiceService.finalizeInvoice(
          savedInvoice.id
        );

      onCompleted(finalizedInvoice);
      closeModal();
    } catch (error) {
      setGeneralError(error.message);
    }
  }

  /**
   * Render danh sách các khoản.
   * @returns {string}
   */
  function renderItems() {
    if (!currentInvoice) {
      return `
        <div class="invoice-form-empty-items">
          <strong>Chưa tạo bản nháp</strong>

          <p>
            Chọn phòng, tháng và hạn thanh toán, sau đó
            nhấn “Lưu bản nháp” để tải tiền phòng, điện nước
            và các dịch vụ đang áp dụng.
          </p>
        </div>
      `;
    }

    const items = Array.isArray(currentInvoice.items)
      ? currentInvoice.items
      : [];

    if (items.length === 0) {
      return `
        <div class="invoice-form-empty-items">
          Hóa đơn chưa có khoản thu nào.
        </div>
      `;
    }

    return `
      <div class="invoice-form-items-table">
        <div class="invoice-form-item-header">
          <span>#</span>
          <span>Nội dung</span>
          <span>Số lượng</span>
          <span>Đơn giá</span>
          <span>Thành tiền</span>
          <span>Thao tác</span>
        </div>

        ${items
          .map((item, index) => {
            const isManual = item.type === 'manual';

            return `
              <div
                class="invoice-form-item-row"
                data-testid="invoice-item-row"
              >
                <span>${index + 1}</span>

                <span>
                  <strong>
                    ${escapeHtml(item.name)}
                  </strong>

                  ${
                    item.note
                      ? `
                        <small>
                          ${escapeHtml(item.note)}
                        </small>
                      `
                      : ''
                  }
                </span>

                <span>
                  ${escapeHtml(item.quantity ?? 0)}
                </span>

                <span>
                  ${formatCurrency(item.unitPrice)}
                </span>

                <span>
                  <strong>
                    ${formatCurrency(item.amount)}
                  </strong>
                </span>

                <span>
                  ${
                    isManual
                      ? `
                        <button
                          type="button"
                          class="invoice-icon-button invoice-icon-danger"
                          data-action="remove-manual-item"
                          data-item-id="${escapeHtml(item.id)}"
                          data-testid="invoice-remove-manual-${escapeHtml(item.id)}"
                          aria-label="Xóa khoản phát sinh"
                        >
                          🗑
                        </button>
                      `
                      : `
                        <span
                          class="invoice-locked-item"
                          title="Khoản tự động"
                        >
                          🔒
                        </span>
                      `
                  }
                </span>
              </div>
            `;
          })
          .join('')}
      </div>
    `;
  }

  /**
   * Render modal.
   */
  function renderModal() {
    const rooms = getRooms();

    const selectedMonth =
      currentInvoice?.month ??
      defaultMonth ??
      '';

    const selectedRoomId =
      currentInvoice?.roomId ?? '';

    const dueDate =
      currentInvoice?.dueDate ?? '';

    const discount =
      currentInvoice?.discount ?? 0;

    const note =
      currentInvoice?.note ?? '';

    const isEditing = Boolean(currentInvoice);

    overlay.innerHTML = `
      <div
        class="invoice-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-form-title"
      >
        <header class="invoice-modal-header">
          <div>
            <h2 id="invoice-form-title">
              ${
                isEditing
                  ? 'Chỉnh sửa hóa đơn bản nháp'
                  : 'Lập hóa đơn'
              }
            </h2>

            <p>
              ${
                isEditing
                  ? escapeHtml(
                      currentInvoice.invoiceCode ??
                      currentInvoice.id
                    )
                  : 'Tạo hóa đơn cho phòng và tháng được chọn.'
              }
            </p>
          </div>

          <button
            type="button"
            class="invoice-modal-close"
            data-action="close"
            data-testid="invoice-form-close"
            aria-label="Đóng"
          >
            ×
          </button>
        </header>

        <div class="invoice-modal-body">
          <div
            class="invoice-form-general-error"
            data-testid="invoice-form-general-error"
            role="alert"
            hidden
          ></div>

          <section class="invoice-form-main-fields">
            <div class="invoice-field">
              <label for="invoice-form-room">
                Phòng <span class="required">*</span>
              </label>

              <select
                id="invoice-form-room"
                name="roomId"
                data-testid="invoice-form-room"
                ${isEditing ? 'disabled' : ''}
              >
                <option value="">Chọn phòng</option>

                ${rooms
                  .map((room) => {
                    const selected =
                      room.id === selectedRoomId
                        ? 'selected'
                        : '';

                    return `
                      <option
                        value="${escapeHtml(room.id)}"
                        ${selected}
                      >
                        ${escapeHtml(getRoomLabel(room))}
                      </option>
                    `;
                  })
                  .join('')}
              </select>

              <div
                class="invoice-field-error"
                data-error="roomId"
              ></div>
            </div>

            <div class="invoice-field">
              <label for="invoice-form-month">
                Tháng <span class="required">*</span>
              </label>

              <input
                id="invoice-form-month"
                type="month"
                name="month"
                value="${escapeHtml(selectedMonth)}"
                data-testid="invoice-form-month"
                ${isEditing ? 'disabled' : ''}
              />

              <div
                class="invoice-field-error"
                data-error="month"
              ></div>
            </div>

            <div class="invoice-field">
              <label for="invoice-form-due-date">
                Hạn thanh toán
                <span class="required">*</span>
              </label>

              <input
                id="invoice-form-due-date"
                type="date"
                name="dueDate"
                value="${escapeHtml(dueDate)}"
                required
                data-testid="invoice-form-due-date"
              />

              <div
                class="invoice-field-error"
                data-error="dueDate"
              ></div>
            </div>

            <div class="invoice-field">
              <label for="invoice-form-discount">
                Giảm giá
              </label>

              <div class="invoice-money-input">
                <input
                  id="invoice-form-discount"
                  type="number"
                  min="0"
                  step="1000"
                  name="discount"
                  value="${escapeHtml(discount)}"
                  data-testid="invoice-form-discount"
                />

                <span>₫</span>
              </div>

              <div
                class="invoice-field-error"
                data-error="discount"
              ></div>
            </div>
          </section>

          <section class="invoice-form-content-grid">
            <div class="invoice-form-items-section">
              <div class="invoice-section-heading">
                <div>
                  <h3>Chi tiết các khoản</h3>

                  <p>
                    Các khoản tự động được lấy từ hợp đồng,
                    chỉ số điện nước và cấu hình dịch vụ.
                  </p>
                </div>
              </div>

              ${renderItems()}

              ${
                currentInvoice
                  ? `
                    <section class="invoice-manual-item-card">
                      <h4>Thêm khoản phát sinh</h4>

                      <div class="invoice-manual-grid">
                        <div class="invoice-field invoice-manual-name">
                          <label for="invoice-manual-name">
                            Nội dung
                            <span class="required">*</span>
                          </label>

                          <input
                            id="invoice-manual-name"
                            type="text"
                            name="manualName"
                            placeholder="Ví dụ: Thay bóng đèn"
                            maxlength="150"
                            data-testid="invoice-manual-name"
                          />

                          <div
                            class="invoice-field-error"
                            data-error="manualName"
                          ></div>
                        </div>

                        <div class="invoice-field">
                          <label for="invoice-manual-quantity">
                            Số lượng
                          </label>

                          <input
                            id="invoice-manual-quantity"
                            type="number"
                            name="manualQuantity"
                            min="0.01"
                            step="0.01"
                            value="1"
                            data-testid="invoice-manual-quantity"
                          />

                          <div
                            class="invoice-field-error"
                            data-error="manualQuantity"
                          ></div>
                        </div>

                        <div class="invoice-field">
                          <label for="invoice-manual-unit-price">
                            Đơn giá
                          </label>

                          <div class="invoice-money-input">
                            <input
                              id="invoice-manual-unit-price"
                              type="number"
                              name="manualUnitPrice"
                              min="0"
                              step="1000"
                              value="0"
                              data-testid="invoice-manual-unit-price"
                            />

                            <span>₫</span>
                          </div>

                          <div
                            class="invoice-field-error"
                            data-error="manualUnitPrice"
                          ></div>
                        </div>

                        <div class="invoice-field invoice-manual-note">
                          <label for="invoice-manual-note">
                            Ghi chú
                          </label>

                          <input
                            id="invoice-manual-note"
                            type="text"
                            name="manualNote"
                            placeholder="Ghi chú khoản phát sinh"
                            maxlength="255"
                            data-testid="invoice-manual-note"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        class="btn btn-outline-primary"
                        data-action="add-manual-item"
                        data-testid="invoice-add-manual-item"
                      >
                        + Thêm khoản phát sinh
                      </button>
                    </section>
                  `
                  : ''
              }
            </div>

            <aside class="invoice-form-summary">
              <h3>Tổng kết hóa đơn</h3>

              <div class="invoice-summary-line">
                <span>Tổng hóa đơn</span>

                <strong>
                  ${formatCurrency(currentInvoice?.total)}
                </strong>
              </div>

              <div class="invoice-summary-line">
                <span>Giảm giá</span>

                <strong class="invoice-summary-discount">
                  -${formatCurrency(
                    currentInvoice?.discount ?? discount
                  )}
                </strong>
              </div>

              <div class="invoice-summary-line">
                <span>Đã thanh toán</span>

                <strong class="invoice-amount-paid">
                  ${formatCurrency(
                    currentInvoice?.paidAmount
                  )}
                </strong>
              </div>

              <div class="invoice-summary-total">
                <span>Còn nợ</span>

                <strong>
                  ${formatCurrency(
                    Math.max(
                      Number(currentInvoice?.total ?? 0) -
                        Number(
                          currentInvoice?.paidAmount ?? 0
                        ),
                      0
                    )
                  )}
                </strong>
              </div>

              <div class="invoice-field invoice-note-field">
                <label for="invoice-form-note">
                  Ghi chú
                </label>

                <textarea
                  id="invoice-form-note"
                  name="note"
                  maxlength="500"
                  placeholder="Nhập ghi chú (nếu có)"
                  data-testid="invoice-form-note"
                >${escapeHtml(note)}</textarea>
              </div>
            </aside>
          </section>
        </div>

        <footer class="invoice-modal-footer">
          <button
            type="button"
            class="btn btn-light"
            data-action="close"
            data-testid="invoice-form-cancel"
          >
            Hủy
          </button>

          <button
            type="button"
            class="btn btn-outline-primary"
            data-action="save-draft"
            data-testid="invoice-form-save-draft"
          >
            Lưu bản nháp
          </button>

          <button
            type="button"
            class="btn btn-primary"
            data-action="finalize"
            data-testid="invoice-form-finalize"
          >
            ✓ Chốt hóa đơn
          </button>
        </footer>
      </div>
    `;

    bindModalEvents();
  }

  /**
   * Gắn sự kiện modal sau mỗi lần render.
   */
  function bindModalEvents() {
    overlay
      .querySelectorAll('[data-action="close"]')
      .forEach((button) => {
        button.addEventListener(
          'click',
          closeModal
        );
      });

    overlay
      .querySelector('[data-action="save-draft"]')
      ?.addEventListener('click', () => {
        const savedInvoice = saveDraft();

        if (savedInvoice) {
          renderModal();
        }
      });

    overlay
      .querySelector('[data-action="finalize"]')
      ?.addEventListener(
        'click',
        finalizeInvoice
      );

    overlay
      .querySelector('[data-action="add-manual-item"]')
      ?.addEventListener(
        'click',
        addManualItem
      );

    overlay
      .querySelectorAll(
        '[data-action="remove-manual-item"]'
      )
      .forEach((button) => {
        button.addEventListener('click', () => {
          removeManualItem(
            button.dataset.itemId
          );
        });
      });
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeModal();
    }
  });

  renderModal();
}