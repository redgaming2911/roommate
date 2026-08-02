import { renderLayout } from './components/layout.js';
import { initRouter } from './router.js';
import { initConfirmDialog } from './components/confirm-dialog.js';

function initApp() {
  const app = document.getElementById('app');

  renderLayout(app);
  initConfirmDialog();
  bindMenuNavigation();

  initRouter();
}

function bindMenuNavigation() {
  document.addEventListener('click', (e) => {
    const menuItem = e.target.closest('[data-page]');
    if (!menuItem) return;

    const page = menuItem.dataset.page;

    window.location.hash = `/${page}`;
  });
}

initApp();