import Chart from 'chart.js/auto';
import { ReportService } from '../services/report-service.js';
import {
  bindReportFilters,
  renderReportFilters
} from '../components/report-filters.js';
import '../styles/reports.css';

const chartInstances = new Map();

const state = {
  fromMonth: '',
  toMonth: ''
};

function destroyCharts() {
  chartInstances.forEach((chart) => chart.destroy());
  chartInstances.clear();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function formatPercentage(value) {
  return `${formatNumber(value)}%`;
}

function formatMonth(month) {
  if (!month) return '—';
  const [year, monthNumber] = month.split('-');
  return `${monthNumber}/${year}`;
}

function getInitialFilters(report) {
  const months = report.financialByMonth;

  return {
    fromMonth: months.length > 0
      ? months[Math.max(months.length - 6, 0)].month
      : '',
    toMonth: months.length > 0
      ? months[months.length - 1].month
      : ''
  };
}

function getRoomRows(report) {
  return report.roomBreakdown;
}

function hasReportData(report, roomRows) {
  return report.financialByMonth.length > 0 ||
    roomRows.length > 0 ||
    report.invoiceStatusDistribution.length > 0 ||
    report.paymentsByMethod.length > 0;
}

function renderEmpty(message, testId) {
  return `
    <div class="report-empty" data-testid="${testId}">
      ${message}
    </div>
  `;
}

function renderMonthlyTable(rows) {
  if (rows.length === 0) {
    return renderEmpty(
      'Chưa có dữ liệu tài chính trong khoảng thời gian này.',
      'report-monthly-table-empty'
    );
  }

  return `
    <div class="report-table-wrap">
      <table class="report-table" data-testid="report-monthly-table">
        <thead>
          <tr>
            <th>Tháng</th>
            <th>Tổng giá trị hóa đơn</th>
            <th>Thực thu</th>
            <th>Công nợ</th>
            <th>Số hóa đơn</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${formatMonth(row.month)}</td>
              <td>${formatCurrency(row.invoiceTotal)}</td>
              <td class="report-value-success">${formatCurrency(row.collectedAmount)}</td>
              <td class="report-value-danger">${formatCurrency(row.debtAmount)}</td>
              <td>${formatNumber(row.invoiceCount)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderRoomTable(rows) {
  if (rows.length === 0) {
    return renderEmpty(
      'Chưa có dữ liệu điện nước theo phòng.',
      'report-room-table-empty'
    );
  }

  return `
    <div class="report-table-wrap">
      <table class="report-table" data-testid="report-room-table">
        <thead>
          <tr>
            <th>Phòng</th>
            <th>Công nợ</th>
            <th>Điện tiêu thụ</th>
            <th>Nước tiêu thụ</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>
                <strong>${escapeHtml(row.roomCode)}</strong>
                ${row.roomName
                  ? `<span class="report-room-name">${escapeHtml(row.roomName)}</span>`
                  : ''}
              </td>
              <td class="report-value-danger">${formatCurrency(row.debtAmount)}</td>
              <td>${formatNumber(row.electricUsage)} kWh</td>
              <td>${formatNumber(row.waterUsage)} m³</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function createFinancialChart(report) {
  const canvas = document.querySelector(
    '[data-testid="report-financial-chart"]'
  );

  if (!canvas || report.financialByMonth.length === 0) return;

  chartInstances.set('financial', new Chart(canvas, {
    type: 'line',
    data: {
      labels: report.financialByMonth.map((item) => formatMonth(item.month)),
      datasets: [
        {
          label: 'Tổng giá trị hóa đơn',
          data: report.financialByMonth.map((item) => item.invoiceTotal),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4
        },
        {
          label: 'Thực thu',
          data: report.financialByMonth.map((item) => item.collectedAmount),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.35,
          borderWidth: 3,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) =>
              `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `${formatNumber(value / 1000000)} tr`
          }
        }
      }
    }
  }));
}

function createRoomChart(roomRows) {
  const canvas = document.querySelector(
    '[data-testid="report-room-usage-chart"]'
  );

  if (!canvas || roomRows.length === 0) return;

  chartInstances.set('roomUsage', new Chart(canvas, {
    type: 'bar',
    data: {
      labels: roomRows.map((item) => item.roomCode),
      datasets: [
        {
          label: 'Điện (kWh)',
          data: roomRows.map((item) => item.electricUsage),
          backgroundColor: '#3b82f6',
          borderRadius: 6
        },
        {
          label: 'Nước (m³)',
          data: roomRows.map((item) => item.waterUsage),
          backgroundColor: '#14b8a6',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true }
      }
    }
  }));
}

function createInvoiceStatusChart(distribution) {
  const canvas = document.querySelector(
    '[data-testid="report-invoice-status-chart"]'
  );

  if (!canvas || distribution.length === 0) return;

  chartInstances.set('invoiceStatus', new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: distribution.map((item) => item.status),
      datasets: [{
        data: distribution.map((item) => item.count),
        backgroundColor: [
          '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#94a3b8'
        ],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8 }
        }
      }
    }
  }));
}

function createPaymentMethodChart(methods) {
  const canvas = document.querySelector(
    '[data-testid="report-payment-method-chart"]'
  );

  if (!canvas || methods.length === 0) return;

  chartInstances.set('paymentMethod', new Chart(canvas, {
    type: 'bar',
    data: {
      labels: methods.map((item) => item.method),
      datasets: [{
        label: 'Số tiền thực thu',
        data: methods.map((item) => item.amount),
        backgroundColor: ['#2563eb', '#8b5cf6', '#ec4899', '#14b8a6'],
        borderRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => formatCurrency(context.parsed.y)
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value) => `${formatNumber(value / 1000000)} tr`
          }
        }
      }
    }
  }));
}

function createCharts(report, roomRows) {
  createFinancialChart(report);
  createRoomChart(roomRows);
  createInvoiceStatusChart(report.invoiceStatusDistribution);
  createPaymentMethodChart(report.paymentsByMethod);
}

function renderChartPanel({ title, testId, hasData }) {
  return `
    <article class="report-panel">
      <div class="report-panel__header">
        <h2>${title}</h2>
      </div>
      <div class="report-chart-wrap">
        ${hasData
          ? `<canvas data-testid="${testId}"></canvas>`
          : renderEmpty('Chưa có dữ liệu để vẽ biểu đồ.', `${testId}-empty`)}
      </div>
    </article>
  `;
}

function renderPage(container) {
  destroyCharts();

  const report = ReportService.getReport(state);
  const roomRows = getRoomRows(report);
  const hasData = hasReportData(report, roomRows);

  container.innerHTML = `
    <section class="reports-page" data-testid="reports-page">
      <header class="reports-header">
        <div>
          <p>Trang chủ / Báo cáo</p>
          <h1>Báo cáo và thống kê</h1>
        </div>
      </header>

      ${renderReportFilters(state)}

      ${hasData ? '' : `
        <div class="reports-empty-state" data-testid="reports-empty-state">
          <strong>Chưa có dữ liệu báo cáo</strong>
          <span>Hãy chọn khoảng thời gian khác hoặc bổ sung dữ liệu vận hành.</span>
        </div>
      `}

      <div class="report-summary" data-testid="report-summary">
        <article>
          <span>Tổng giá trị hóa đơn</span>
          <strong data-testid="report-total-invoice-value">
            ${formatCurrency(report.totalInvoiceValue)}
          </strong>
        </article>
        <article>
          <span>Tổng thực thu</span>
          <strong class="report-value-success"
            data-testid="report-total-collected">
            ${formatCurrency(report.totalCollectedAmount)}
          </strong>
        </article>
        <article>
          <span>Tổng công nợ</span>
          <strong class="report-value-danger"
            data-testid="report-total-debt">
            ${formatCurrency(report.totalDebt)}
          </strong>
        </article>
      </div>

      <div class="report-chart-grid">
        ${renderChartPanel({
          title: 'Doanh thu và thực thu theo tháng',
          testId: 'report-financial-chart',
          hasData: report.financialByMonth.length > 0
        })}
        ${renderChartPanel({
          title: 'Điện và nước tiêu thụ theo phòng',
          testId: 'report-room-usage-chart',
          hasData: roomRows.length > 0
        })}
        ${renderChartPanel({
          title: 'Trạng thái hóa đơn',
          testId: 'report-invoice-status-chart',
          hasData: report.invoiceStatusDistribution.length > 0
        })}
        ${renderChartPanel({
          title: 'Thanh toán theo phương thức',
          testId: 'report-payment-method-chart',
          hasData: report.paymentsByMethod.length > 0
        })}
      </div>

      <article class="report-panel report-data-panel">
        <div class="report-panel__header">
          <h2>Chi tiết tài chính theo tháng</h2>
        </div>
        ${renderMonthlyTable(report.financialByMonth)}
      </article>

      <article class="report-panel report-data-panel">
        <div class="report-panel__header">
          <h2>Công nợ và điện nước theo phòng</h2>
        </div>
        ${renderRoomTable(roomRows)}
      </article>

      <div class="report-breakdown-grid">
        <article class="report-panel report-data-panel">
          <div class="report-panel__header"><h2>Tỷ lệ trạng thái hóa đơn</h2></div>
          ${report.invoiceStatusDistribution.length === 0
            ? renderEmpty('Chưa có hóa đơn.', 'report-status-table-empty')
            : `
              <div class="report-table-wrap">
                <table class="report-table" data-testid="report-status-table">
                  <thead><tr><th>Trạng thái</th><th>Số lượng</th><th>Tỷ lệ</th></tr></thead>
                  <tbody>
                    ${report.invoiceStatusDistribution.map((item) => `
                      <tr><td>${escapeHtml(item.status)}</td><td>${item.count}</td><td>${formatPercentage(item.percentage)}</td></tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
        </article>

        <article class="report-panel report-data-panel">
          <div class="report-panel__header"><h2>Thanh toán theo phương thức</h2></div>
          ${report.paymentsByMethod.length === 0
            ? renderEmpty('Chưa có thanh toán.', 'report-method-table-empty')
            : `
              <div class="report-table-wrap">
                <table class="report-table" data-testid="report-method-table">
                  <thead><tr><th>Phương thức</th><th>Số tiền</th><th>Tỷ lệ</th></tr></thead>
                  <tbody>
                    ${report.paymentsByMethod.map((item) => `
                      <tr><td>${escapeHtml(item.method)}</td><td>${formatCurrency(item.amount)}</td><td>${formatPercentage(item.percentage)}</td></tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
        </article>
      </div>
    </section>
  `;

  bindReportFilters(container, {
    onApply(filters) {
      state.fromMonth = filters.fromMonth;
      state.toMonth = filters.toMonth;
      renderPage(container);
    },
    onReset() {
      const filters = getInitialFilters(ReportService.getReport());
      state.fromMonth = filters.fromMonth;
      state.toMonth = filters.toMonth;
      renderPage(container);
    }
  });

  createCharts(report, roomRows);
}

export function render(container) {
  const initialReport = ReportService.getReport();
  const initialFilters = getInitialFilters(initialReport);

  state.fromMonth = initialFilters.fromMonth;
  state.toMonth = initialFilters.toMonth;
  renderPage(container);
}
