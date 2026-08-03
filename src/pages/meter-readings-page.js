import { MeterReadingService } from '../services/meter-reading-service.js';
import * as RoomService from '../services/room-service.js';
import { createMeterRow } from '../components/meter-reading-form.js';
import { ROOM_STATUS } from '../constants/statuses.js';
import '../styles/meter-reading.css';

function renderMeterReadingsPage(container) {
  let selectedMonth = getCurrentMonth();

  function getCurrentMonth() {
    const d = new Date();
    return d.toISOString().slice(0, 7);
  }

  function render() {
    container.innerHTML = `
      <div class="meter-page">
        <div class="meter-header">
          <h2>Ghi chỉ số điện nước</h2>

          <div>
            <input type="month" data-testid="month-picker" value="${selectedMonth}" />
            <button data-testid="generate">Tạo nhanh</button>
          </div>
        </div>

        <div class="meter-table-wrap"><table class="meter-table" data-testid="meter-table">
          <thead>
            <tr>
              <th>Phòng</th>
              <th>Điện mới</th>
              <th>Nước mới</th>
              <th>Tiêu thụ điện</th>
              <th>Tiêu thụ nước</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table></div>
        <div class="meter-empty" data-testid="meter-empty" hidden>Không có phòng đang thuê để ghi chỉ số.</div>
      </div>
    `;

    bindEvents();
    loadData();
  }

  function bindEvents() {
    container.querySelector('[data-testid="month-picker"]')
      .addEventListener('change', (e) => {
        selectedMonth = e.target.value;
        loadData();
      });

    container.querySelector('[data-testid="generate"]')
      .addEventListener('click', generateAll);
  }

  function loadData() {
    const tbody = container.querySelector('tbody');
    tbody.innerHTML = '';

    const rooms = RoomService.getRooms()
      .filter(r => r.status === ROOM_STATUS.RENTED);

    container.querySelector('[data-testid="meter-empty"]').hidden = rooms.length > 0;
    container.querySelector('[data-testid="meter-table"]').hidden = rooms.length === 0;

    rooms.forEach(room => {
      const previous = MeterReadingService.getPreviousReading(room.id, selectedMonth);
      const current = MeterReadingService.getReadingByRoomAndMonth(room.id, selectedMonth);

      const row = createMeterRow({
        room,
        previousReading: previous,
        currentReading: current,
        onSave: (payload, elError, elWarning) => {
          try {
            const result = current
              ? MeterReadingService.updateReading(current.id, {
                  ...payload,
                  monthKey: selectedMonth
                })
              : MeterReadingService.createReading({
                  ...payload,
                  monthKey: selectedMonth
                });

            elWarning.textContent = result.warning || '';
            elError.textContent = '';
            loadData();
          } catch (err) {
            elError.textContent = err.message;
          }
        },
        onDelete: () => {
          if (current) {
            MeterReadingService.deleteReading(current.id);
            loadData();
          }
        }
      });

      tbody.appendChild(row);
    });
  }

  function generateAll() {
    const rooms = RoomService.getRooms()
      .filter(r => r.status === ROOM_STATUS.RENTED);

    rooms.forEach(room => {
      const exists = MeterReadingService.getReadingByRoomAndMonth(room.id, selectedMonth);

      if (!exists) {
        try {
          const prev = MeterReadingService.getPreviousReading(room.id, selectedMonth);

          MeterReadingService.createReading({
            roomId: room.id,
            monthKey: selectedMonth,
            electricIndex: prev?.electricIndex || 0,
            waterIndex: prev?.waterIndex || 0
          });
        } catch (e) {
          console.warn(e.message);
        }
      }
    });

    loadData();
  }

  render();
}

export const render = renderMeterReadingsPage;
