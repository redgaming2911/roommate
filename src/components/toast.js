export function showToast({ message = '', type = 'success' }) {
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${mapType(type)} border-0 show`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('data-testid', 'toast-item');

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);

  toast.querySelector('.btn-close').onclick = () => toast.remove();
}

function mapType(type) {
  switch (type) {
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    case 'success':
    default:
      return 'success';
  }
}