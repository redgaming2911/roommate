import {
  calculateElectricUsage,
  calculateWaterUsage
} from '../business/meter-calculator.js';

export function createMeterRow({
  room,
  previousReading,
  currentReading,
  onSave,
  onDelete
}) {
  const tr = document.createElement('tr');

  const oldElectric = previousReading?.electricIndex || 0;
  const oldWater = previousReading?.waterIndex || 0;

  tr.innerHTML = `
    <td>${room.code}</td>

    <td>
      <input data-testid="electric-new-${room.id}" class="meter-input" type="number" value="${currentReading?.electricIndex || ''}" />
    </td>

    <td>
      <input data-testid="water-new-${room.id}" class="meter-input" type="number" value="${currentReading?.waterIndex || ''}" />
    </td>

    <td data-testid="usage-electric-${room.id}">-</td>
    <td data-testid="usage-water-${room.id}">-</td>

    <td>
      <button data-testid="save-${room.id}">💾</button>
      <button data-testid="delete-${room.id}">🗑</button>
      <div class="meter-error" data-testid="error-${room.id}"></div>
      <div class="meter-warning" data-testid="warning-${room.id}"></div>
    </td>
  `;

  const elElectric = tr.querySelector(`[data-testid="electric-new-${room.id}"]`);
  const elWater = tr.querySelector(`[data-testid="water-new-${room.id}"]`);
  const elUsageElec = tr.querySelector(`[data-testid="usage-electric-${room.id}"]`);
  const elUsageWater = tr.querySelector(`[data-testid="usage-water-${room.id}"]`);
  const elError = tr.querySelector(`[data-testid="error-${room.id}"]`);
  const elWarning = tr.querySelector(`[data-testid="warning-${room.id}"]`);

  function recalc() {
    try {
      const e = Number(elElectric.value);
      const w = Number(elWater.value);

      const ue = calculateElectricUsage(oldElectric, e);
      const uw = calculateWaterUsage(oldWater, w);

      elUsageElec.textContent = ue;
      elUsageWater.textContent = uw;
      elError.textContent = '';
    } catch (err) {
      elError.textContent = err.message;
    }
  }

  elElectric.addEventListener('input', recalc);
  elWater.addEventListener('input', recalc);

  tr.querySelector(`[data-testid="save-${room.id}"]`)
    .addEventListener('click', () => {
      try {
        const payload = {
          roomId: room.id,
          electricIndex: Number(elElectric.value),
          waterIndex: Number(elWater.value)
        };

        onSave(payload, elError, elWarning);
      } catch (err) {
        elError.textContent = err.message;
      }
    });

  tr.querySelector(`[data-testid="delete-${room.id}"]`)
    .addEventListener('click', () => {
      onDelete();
    });

  return tr;
}