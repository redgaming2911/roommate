import Chart from 'chart.js/auto';
import { ReportService } from '../services/report-service.js';
import { renderStatCard } from '../components/stat-card.js';
import { renderAlertList } from '../components/alert-list.js';
import '../styles/dashboard.css';

let revenueChart = null;
let roomStatusChart = null;

function destroyCharts() {
  if (revenueChart) {
    revenueChart.destroy();
    revenueChart = null;
  }

  if (roomStatusChart) {
    roomStatusChart.destroy();
    roomStatusChart = null;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatPercentage(value) {
  return `${new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2
  }).format(Number(value) || 0)}%`;
}

function formatMonth(month) {
  if (!month) return 'Chưa có dữ liệu';
  const [year, monthNumber] = month.split('-');
  return `Tháng ${monthNumber}/${year}`;
}

function getLatestItem(series) {
  return series.length > 0 ? series[series.length - 1] : null;
}

function getLatestSixMonths(series) {
  return series.slice(-6);
}

function hasDashboardData(report) {
  return report.roomStatistics.totalRooms > 0 ||
    report.revenueByMonth.length > 0 ||
    report.utilityByMonth.length > 0;
}

function renderRevenueChart(series) {
  const canvas = document.querySelector(
    '[data-testid="dashboard-revenue-chart"]'
  );

  if (!canvas || series.length === 0) return;

  revenueChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: series.map((item) => item.month),
      datasets: [{
        label: 'Tổng giá trị hóa đơn',
        data: series.map((item) => item.invoiceTotal),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.12)',
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#2563eb',
        pointBorderWidth: 2,
        pointRadius: 4,
        borderWidth: 3,
        tension: 0.35,
        fill: true
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
  });
}

function renderRoomStatusChart(roomStatistics) {
  const canvas = document.querySelector(
    '[data-testid="dashboard-room-status-chart"]'
  );

  if (!canvas || roomStatistics.totalRooms === 0) return;

  roomStatusChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Đang thuê', 'Phòng trống', 'Đang sửa chữa'],
      datasets: [{
        data: [
          roomStatistics.rentedRooms,
          roomStatistics.emptyRooms,
          roomStatistics.repairingRooms
        ],
        backgroundColor: ['#2563eb', '#94a3b8', '#f59e0b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 18
          }
        }
      }
    }
  });
}

function renderChartContent({ revenueByMonth, roomStatistics }) {
  const recentRevenue = getLatestSixMonths(revenueByMonth);

  if (recentRevenue.length === 0) {
    document.querySelector(
      '[data-testid="dashboard-revenue-chart-empty"]'
    ).hidden = false;
  } else {
    renderRevenueChart(recentRevenue);
  }

  if (roomStatistics.totalRooms === 0) {
    document.querySelector(
      '[data-testid="dashboard-room-status-chart-empty"]'
    ).hidden = false;
  } else {
    renderRoomStatusChart(roomStatistics);
  }
}

export function render(container) {
  destroyCharts();

  const report = ReportService.getReport();
  const latestRevenue = getLatestItem(report.revenueByMonth);
  const latestUtility = getLatestItem(report.utilityByMonth);
  const roomStatistics = report.roomStatistics;
  const hasData = hasDashboardData(report);

  const statCards = [
    {
      title: 'Tổng số phòng',
      value: formatNumber(roomStatistics.totalRooms),
      unit: 'phòng',
      description: 'Tất cả phòng trọ',
      icon: '▦',
      tone: 'primary',
      testId: 'stat-total-rooms'
    },
    {
      title: 'Phòng trống',
      value: formatNumber(roomStatistics.emptyRooms),
      unit: 'phòng',
      description: 'Sẵn sàng cho thuê',
      icon: '□',
      tone: 'neutral',
      testId: 'stat-empty-rooms'
    },
    {
      title: 'Phòng đang thuê',
      value: formatNumber(roomStatistics.rentedRooms),
      unit: 'phòng',
      description: 'Đang có người thuê',
      icon: '♟',
      tone: 'success',
      testId: 'stat-rented-rooms'
    },
    {
      title: 'Phòng sửa chữa',
      value: formatNumber(roomStatistics.repairingRooms),
      unit: 'phòng',
      description: 'Đang bảo trì hoặc sửa chữa',
      icon: '⚒',
      tone: 'warning',
      testId: 'stat-repairing-rooms'
    },
    {
      title: 'Tỷ lệ lấp đầy',
      value: formatPercentage(roomStatistics.occupancyRate),
      description: 'Trên tổng số phòng',
      icon: '◔',
      tone: 'primary',
      testId: 'stat-occupancy-rate'
    },
    {
      title: 'Người thuê hiện tại',
      value: formatNumber(report.currentTenantCount),
      unit: 'người',
      description: 'Trong hợp đồng hiệu lực',
      icon: '●',
      tone: 'purple',
      testId: 'stat-current-tenants'
    },
    {
      title: 'Doanh thu tháng',
      value: formatCurrency(latestRevenue?.invoiceTotal),
      description: formatMonth(latestRevenue?.month),
      icon: '₫',
      tone: 'success',
      testId: 'stat-monthly-revenue'
    },
    {
      title: 'Tổng công nợ',
      value: formatCurrency(report.totalDebt),
      description: 'Số tiền còn phải thu',
      icon: '▣',
      tone: 'danger',
      testId: 'stat-total-debt'
    },
    {
      title: 'Hóa đơn quá hạn',
      value: formatNumber(report.overdueInvoiceCount),
      unit: 'hóa đơn',
      description: 'Cần theo dõi',
      icon: '!',
      tone: 'danger',
      testId: 'stat-overdue-invoices'
    },
    {
      title: 'Hóa đơn chưa thanh toán',
      value: formatNumber(report.unpaidInvoiceCount),
      unit: 'hóa đơn',
      description: 'Còn số tiền phải thu',
      icon: '▤',
      tone: 'warning',
      testId: 'stat-unpaid-invoices'
    },
    {
      title: 'Điện tiêu thụ trong tháng',
      value: formatNumber(latestUtility?.electricUsage),
      unit: 'kWh',
      description: formatMonth(latestUtility?.month),
      icon: 'ϟ',
      tone: 'primary',
      testId: 'stat-monthly-electricity'
    },
    {
      title: 'Nước tiêu thụ trong tháng',
      value: formatNumber(latestUtility?.waterUsage),
      unit: 'm³',
      description: formatMonth(latestUtility?.month),
      icon: '●',
      tone: 'teal',
      testId: 'stat-monthly-water'
    }
  ];

  container.innerHTML = `
    <section class="dashboard-page" data-testid="dashboard-page">
      <header class="dashboard-header">
        <div>
          <p class="dashboard-eyebrow">Trang chủ / Tổng quan</p>
          <h1>Tổng quan nhà trọ</h1>
        </div>
        <button class="dashboard-refresh" type="button"
          data-testid="dashboard-refresh">
          ↻ Làm mới dữ liệu
        </button>
      </header>

      ${hasData ? '' : `
        <div class="dashboard-empty-state" data-testid="dashboard-empty-state">
          <strong>Chưa có dữ liệu tổng quan</strong>
          <span>Hãy thêm phòng, hợp đồng hoặc hóa đơn để bắt đầu theo dõi.</span>
        </div>
      `}

      <div class="dashboard-stats" data-testid="dashboard-stats">
        ${statCards.map(renderStatCard).join('')}
      </div>

      <div class="dashboard-main-grid">
        <article class="dashboard-panel dashboard-panel--revenue">
          <div class="dashboard-panel__header">
            <div>
              <p class="dashboard-panel__eyebrow">Hiệu quả vận hành</p>
              <h2>Doanh thu 6 tháng gần nhất</h2>
            </div>
          </div>
          <div class="dashboard-chart-wrap">
            <canvas data-testid="dashboard-revenue-chart"></canvas>
            <div class="dashboard-chart-empty"
              data-testid="dashboard-revenue-chart-empty" hidden>
              Chưa có dữ liệu doanh thu để hiển thị.
            </div>
          </div>
        </article>

        <article class="dashboard-panel dashboard-panel--rooms">
          <div class="dashboard-panel__header">
            <div>
              <p class="dashboard-panel__eyebrow">Công suất</p>
              <h2>Trạng thái phòng</h2>
            </div>
          </div>
          <div class="dashboard-chart-wrap">
            <canvas data-testid="dashboard-room-status-chart"></canvas>
            <div class="dashboard-chart-empty"
              data-testid="dashboard-room-status-chart-empty" hidden>
              Chưa có dữ liệu phòng để hiển thị.
            </div>
          </div>
        </article>

        <aside class="dashboard-panel dashboard-panel--alerts"
          data-testid="dashboard-alerts">
          <div class="dashboard-panel__header">
            <div>
              <p class="dashboard-panel__eyebrow">Cần chú ý</p>
              <h2>Danh sách cảnh báo</h2>
            </div>
          </div>
          ${renderAlertList({
            overdueInvoiceCount: report.overdueInvoiceCount,
            expiringContracts: report.expiringContracts,
            invoicesDueSoon: report.invoicesDueSoon,
            roomsWithoutReading: report.roomsWithoutReading,
            rentedRoomsWithoutContract: report.rentedRoomsWithoutContract,
            abnormalUtilityUsage: report.abnormalUtilityUsage
          })}
        </aside>
      </div>
    </section>
  `;

  renderChartContent(report);

  container
    .querySelector('[data-testid="dashboard-refresh"]')
    .addEventListener('click', () => render(container));
}
