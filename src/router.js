// src/router.js

const routes = {
  '/dashboard': () => import('./pages/dashboard-page.js'),
  '/rooms': () => import('./pages/rooms-page.js'),
  '/tenants': () => import('./pages/tenants-page.js'),
  '/contracts': () => import('./pages/contracts-page.js'),
  '/meters': () => import('./pages/meter-readings-page.js'),
  '/services': () => import('./pages/services-page.js'),
  '/invoices': () => import('./pages/invoices-page.js'),
  '/payments': () => import('./pages/payments-page.js'),
  '/debts': () => import('./pages/debts-page.js'),
  '/reports': () => import('./pages/reports-page.js'),
  '/settings': () => import('./pages/settings-page.js')
};

const NOT_FOUND_ROUTE = '/404';

async function loadPage(path) {
  const content = document.getElementById('main-content');
  if (!content) return;

  try {
    const loader = routes[path];

    if (!loader) {
      renderNotFound();
      setActiveMenu('');
      return;
    }

    const module = await loader();

    content.innerHTML = '';
    module.render(content);

    setActiveMenu(path.replace('/', ''));
  } catch (error) {
    console.error('Router error:', error);
    renderError();
  }
}

function renderNotFound() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div data-testid="page-404">
      <h1>404 - Không tìm thấy trang</h1>
    </div>
  `;
}

function renderError() {
  const content = document.getElementById('main-content');
  content.innerHTML = `
    <div>
      <h1>Lỗi tải trang</h1>
    </div>
  `;
}

function setActiveMenu(pageKey) {
  document.querySelectorAll('[data-page]').forEach(el => {
    el.classList.remove('active');

    if (el.dataset.page === pageKey) {
      el.classList.add('active');
    }
  });
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

function handleRoute() {
  let hash = window.location.hash;

  if (!hash) {
    window.location.hash = '#/dashboard';
    return;
  }

  const path = hash.replace('#', '');
  loadPage(path);
}
