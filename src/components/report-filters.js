function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderReportFilters({
  fromMonth = '',
  toMonth = ''
} = {}) {
  return `
    <form class="report-filters" data-testid="report-filters">
      <label class="report-filter-field">
        <span>Từ tháng</span>
        <input type="month" name="fromMonth"
          value="${escapeHtml(fromMonth)}"
          data-testid="report-filter-from-month">
      </label>

      <label class="report-filter-field">
        <span>Đến tháng</span>
        <input type="month" name="toMonth"
          value="${escapeHtml(toMonth)}"
          data-testid="report-filter-to-month">
      </label>

      <div class="report-filter-actions">
        <button type="submit" class="report-filter-apply"
          data-testid="report-filter-apply">
          Áp dụng
        </button>
        <button type="button" class="report-filter-reset"
          data-testid="report-filter-reset">
          Đặt lại
        </button>
      </div>

      <p class="report-filter-error" data-testid="report-filter-error"
        role="alert" hidden></p>
    </form>
  `;
}

export function bindReportFilters(
  container,
  { onApply, onReset }
) {
  const form = container.querySelector('[data-testid="report-filters"]');
  if (!form) return;

  const errorElement = form.querySelector(
    '[data-testid="report-filter-error"]'
  );

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const filters = {
      fromMonth: formData.get('fromMonth') || '',
      toMonth: formData.get('toMonth') || ''
    };

    if (
      filters.fromMonth &&
      filters.toMonth &&
      filters.fromMonth > filters.toMonth
    ) {
      errorElement.textContent = 'Tháng bắt đầu không được sau tháng kết thúc.';
      errorElement.hidden = false;
      return;
    }

    errorElement.textContent = '';
    errorElement.hidden = true;
    onApply(filters);
  });

  form
    .querySelector('[data-testid="report-filter-reset"]')
    .addEventListener('click', () => onReset());
}
