function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderStatCard({
  title,
  value,
  unit = '',
  description = '',
  icon = '•',
  tone = 'primary',
  testId
}) {
  const safeTestId = escapeHtml(testId);

  return `
    <article class="dashboard-stat-card dashboard-stat-card--${escapeHtml(tone)}"
      data-testid="${safeTestId}">
      <div class="dashboard-stat-card__icon" aria-hidden="true">
        ${escapeHtml(icon)}
      </div>
      <div class="dashboard-stat-card__content">
        <p class="dashboard-stat-card__title">${escapeHtml(title)}</p>
        <div class="dashboard-stat-card__metric">
          <strong data-testid="${safeTestId}-value">${escapeHtml(value)}</strong>
          ${unit ? `<span>${escapeHtml(unit)}</span>` : ''}
        </div>
        ${description
          ? `<p class="dashboard-stat-card__description">${escapeHtml(description)}</p>`
          : ''}
      </div>
    </article>
  `;
}
