import { isConfigured } from './config.js';
import { isReady } from './db.js';
import * as auth from './auth.js';
import { initNetworkMonitor } from './network.js';
import { closeModal, showToast } from './utils.js';
import { appLogo, icon } from './icons.js';
import * as dashboard from './pages/dashboard.js';
import * as projects from './pages/projects.js';
import * as tasks from './pages/tasks.js';
import * as templates from './pages/templates.js';
import * as resources from './pages/resources.js';
import * as notes from './pages/notes.js';
import * as ideas from './pages/ideas.js';

const PAGES = {
  dashboard: { module: dashboard, title: 'Dashboard' },
  projects: { module: projects, title: 'Projets' },
  tasks: { module: tasks, title: 'Tâches' },
  templates: { module: templates, title: 'Templates' },
  resources: { module: resources, title: 'Ressources' },
  notes: { module: notes, title: 'Notes techniques' },
  ideas: { module: ideas, title: 'Idées d\'applications' },
};

let appInitialized = false;

function showLogin() {
  document.getElementById('auth-loading')?.classList.add('hidden');
  document.getElementById('login-screen')?.classList.remove('hidden');
  document.getElementById('app-shell')?.classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-loading')?.classList.add('hidden');
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
  if (!appInitialized) {
    initRouter();
    appInitialized = true;
  }
}

function updateUserInfo(session) {
  const emailEl = document.getElementById('user-email');
  const avatarEl = document.getElementById('user-avatar');
  if (session?.user?.email) {
    const email = session.user.email;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();
  }
}

function handleAuthChange(session) {
  if (session) {
    showApp();
    updateUserInfo(session);
    const hash = window.location.hash.slice(1);
    if (!hash || hash === 'login') {
      window.location.hash = 'dashboard';
    } else {
      navigate(hash);
    }
  } else {
    showLogin();
    window.location.hash = 'login';
  }
}

function renderLoginForm() {
  const notConfigured = !isConfigured();

  return `
    <div class="login-card">
      <div class="login-header">
        ${appLogo('login-logo-img')}
        <h1 class="login-title">Egmon</h1>
        <p class="login-subtitle">Connexion à votre espace personnel</p>
      </div>

      ${notConfigured ? `
        <div class="login-notice">
          <p>Supabase n'est pas encore configuré dans <code>js/config.js</code>.</p>
        </div>
      ` : ''}

      <form id="login-form" class="login-form" ${notConfigured ? 'style="opacity:0.5;pointer-events:none"' : ''}>
        <div>
          <label class="label-field" for="login-email">Email</label>
          <input class="input-field" type="email" id="login-email" name="email" placeholder="vous@exemple.com" required autocomplete="email">
        </div>
        <div>
          <label class="label-field" for="login-password">Mot de passe</label>
          <input class="input-field" type="password" id="login-password" name="password" placeholder="••••••••" required minlength="6" autocomplete="current-password">
        </div>
        <div class="text-right">
          <button type="button" id="btn-forgot-password" class="login-link">Mot de passe oublié ?</button>
        </div>
        <button type="submit" class="btn-primary btn-full" id="btn-auth-submit" ${notConfigured ? 'disabled' : ''}>
          Se connecter
        </button>
      </form>

      <div id="login-error" class="login-error hidden"></div>
      <p class="login-footer">Egmon — projets & ressources</p>
    </div>
  `;
}

function bindLoginEvents() {
  document.getElementById('btn-forgot-password')?.addEventListener('click', async () => {
    const email = document.getElementById('login-email')?.value.trim();
    if (!email) {
      showLoginError('Entrez votre email pour réinitialiser le mot de passe.');
      return;
    }
    try {
      await auth.resetPassword(email);
      showToast('Email de réinitialisation envoyé');
    } catch (e) {
      showLoginError(e.message);
    }
  });

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-auth-submit');
    const errorEl = document.getElementById('login-error');

    btn.disabled = true;
    btn.textContent = 'Chargement...';
    errorEl?.classList.add('hidden');

    try {
      await auth.signIn(email, password);
    } catch (err) {
      showLoginError(err.message);
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });
}

function showLoginError(message) {
  const errorEl = document.getElementById('login-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }
}

function initLogin() {
  const container = document.getElementById('login-screen');
  if (!container) return;
  container.innerHTML = `<div class="login-wrapper">${renderLoginForm()}</div>`;
  bindLoginEvents();
}

async function navigate(page) {
  if (page === 'login') return;

  if (!PAGES[page]) page = 'dashboard';

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  document.getElementById('page-title').textContent = PAGES[page].title;
  document.getElementById('header-actions').innerHTML = '';

  const content = document.getElementById('page-content');

  if (!isReady()) {
    content.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto px-4">
        <div class="empty-state-icon mx-auto mb-4">${icon('cog', 'w-12 h-12 text-gray-600')}</div>
        <h3 class="text-xl font-semibold text-white mb-2">Configuration requise</h3>
        <p class="text-gray-400 text-sm mb-6">
          Configurez vos identifiants Supabase dans <code class="bg-surface-lighter px-2 py-0.5 rounded text-accent-hover">js/config.js</code>.
        </p>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="flex items-center justify-center py-20">
      <div class="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
    </div>
  `;

  try {
    const html = await PAGES[page].module.render();
    content.innerHTML = html;
    PAGES[page].module.bindEvents?.();
  } catch (err) {
    content.innerHTML = `
      <div class="text-center py-20 px-4">
        <p class="text-red-400 mb-2">Erreur de chargement</p>
        <p class="text-gray-500 text-sm">${err.message}</p>
      </div>
    `;
    console.error(err);
  }

  closeSidebar();
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop')?.classList.add('hidden');
}

function openSidebar() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('sidebar-backdrop')?.classList.remove('hidden');
}

function initRouter() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  if (hash !== 'login') navigate(hash);

  window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'dashboard';
    if (page === 'login') {
      showLogin();
    } else {
      navigate(page);
    }
  });

  window.addEventListener('navigate', (e) => {
    window.location.hash = e.detail;
  });

  window.addEventListener('open-project', (e) => {
    if (window.location.hash.slice(1) !== 'projects') {
      window.location.hash = 'projects';
    }
    setTimeout(() => projects.onOpenProject?.(e.detail), 150);
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
}

function initUI() {
  initNetworkMonitor();

  if (!isConfigured()) {
    document.getElementById('config-banner')?.classList.remove('hidden');
    document.body.classList.add('has-config-banner');
  } else {
    auth.disableDevMode();
  }

  document.getElementById('modal-close')?.addEventListener('click', closeModal);
  document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar?.classList.contains('mobile-open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    try {
      await auth.signOut();
      showLogin();
      initLogin();
      window.location.hash = 'login';
    } catch (e) {
      showToast('Erreur de déconnexion', 'error');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSidebar();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  initLogin();

  if (isConfigured()) {
    auth.disableDevMode();
    const session = await auth.getSession().catch(() => null);
    if (session) {
      handleAuthChange(session);
    } else {
      showLogin();
      window.location.hash = 'login';
    }
    auth.onAuthStateChange(handleAuthChange);
  } else {
    showLogin();
    window.location.hash = 'login';
  }
});
