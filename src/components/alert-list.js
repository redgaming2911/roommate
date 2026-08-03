function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getContractLabel(contract) {
  return contract.code ?? contract.id ?? 'Hợp đồng';
}

function createAlerts({ overdueInvoiceCount, expiringContracts }) {
  const alerts = [];

  if (overdueInvoiceCount > 0) {
    alerts.push({
      tone: 'danger',
      icon: '!',
      title: `${overdueInvoiceCount} hóa đơn quá hạn`,
      description: 'Cần kiểm tra và theo dõi công nợ.'
    });
  }

  expiringContracts.forEach((contract) => {
    alerts.push({
      tone: 'warning',
      icon: '⌛',
      title: `${getContractLabel(contract)} sắp hết hạn`,
      description: `Còn ${contract.daysRemaining} ngày · Hết hạn ${contract.endDate}`
    });
  });

  return alerts;
}

export function renderAlertList({
  overdueInvoiceCount = 0,
  expiringContracts = []
} = {}) {
  const alerts = createAlerts({
    overdueInvoiceCount,
    expiringContracts
  });

  if (alerts.length === 0) {
    return `
      <div class="dashboard-alerts__empty" data-testid="dashboard-alerts-empty">
        <span aria-hidden="true">✓</span>
        <div>
          <strong>Không có cảnh báo</strong>
          <p>Mọi chỉ số hiện đang ổn định.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="dashboard-alert-list" data-testid="dashboard-alert-list">
      ${alerts.map((alert) => `
        <article class="dashboard-alert dashboard-alert--${alert.tone}">
          <span class="dashboard-alert__icon" aria-hidden="true">
            ${escapeHtml(alert.icon)}
          </span>
          <div>
            <strong>${escapeHtml(alert.title)}</strong>
            <p>${escapeHtml(alert.description)}</p>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}
