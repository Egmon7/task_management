const STATUS_LABELS = {
  debut: 'Début',
  en_cours: 'En cours',
  termine: 'Terminé',
  en_pause: 'En pause',
  abandonne: 'Abandonné',
  a_faire: 'À faire',
  idea: 'Idée',
  in_progress: 'En développement',
  done: 'Réalisé',
  abandoned: 'Abandonné',
};

const PRIORITY_LABELS = {
  low: 'Basse',
  medium: 'Moyenne',
  high: 'Haute',
};

const RESOURCE_TYPES = {
  inspiration: 'Inspiration',
  site: 'Site favori',
  article: 'Article',
  youtube: 'YouTube',
  github: 'GitHub',
  figma: 'Figma',
};

const NOTE_TYPES = {
  snippet: 'Snippet',
  command: 'Commande',
  checklist: 'Checklist',
  deployment: 'Déploiement',
  tip: 'Astuce',
};

const TEMPLATE_CATEGORIES = [
  'Restaurants',
  'Portfolios',
  'Dashboards',
  'Landing pages',
  'Composants réutilisables',
];

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDeadline(dateStr) {
  if (!dateStr) return null;
  return formatDate(dateStr);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function deadlineBadge(dateStr) {
  const days = daysUntil(dateStr);
  if (days === null) return '';
  if (days < 0) return '<span class="badge badge-abandonne">En retard</span>';
  if (days === 0) return '<span class="badge badge-high">Aujourd\'hui</span>';
  if (days <= 7) return `<span class="badge badge-medium">J-${days}</span>`;
  return `<span class="badge badge-a_faire">${formatDate(dateStr)}</span>`;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount || 0);
}

export function statusBadge(status) {
  const label = STATUS_LABELS[status] || status;
  return `<span class="badge badge-${status}">${label}</span>`;
}

export function priorityBadge(priority) {
  const label = PRIORITY_LABELS[priority] || priority;
  return `<span class="badge badge-${priority}">${label}</span>`;
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

export function openModal(title, bodyHtml, footerHtml = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

export function closeModal() {
  document.getElementById('modal')?.classList.remove('modal-panel--wide');
  document.getElementById('modal-overlay').classList.add('hidden');
}

/** Recharge la page courante sans changer l’URL (après création / modification). */
export function refreshPage(page) {
  const target = page || window.location.hash.slice(1) || 'dashboard';
  window.dispatchEvent(new CustomEvent('navigate', { detail: target }));
}

export function readImageFile(file, maxWidth = 900) {
  return new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) {
      reject(new Error('Fichier image requis'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxWidth) {
          h = Math.round((maxWidth / w) * h);
          w = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = () => reject(new Error('Image illisible'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

export function readDocumentFile(file, maxMb = 2) {
  if (!file) return Promise.reject(new Error('Aucun fichier'));
  if (file.size > maxMb * 1024 * 1024) {
    return Promise.reject(new Error(`Fichier trop volumineux (max ${maxMb} Mo)`));
  }
  if (file.type.startsWith('image/')) return readImageFile(file);
  if (file.type === 'application/pdf') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Lecture du PDF impossible'));
      reader.readAsDataURL(file);
    });
  }
  return Promise.reject(new Error('Image ou PDF uniquement'));
}

export function imagePreviewField(id, label, currentUrl = '', accept = 'image/*') {
  const hasFile = !!currentUrl;
  const isPdf = currentUrl.startsWith('data:application/pdf');
  return `
    <div class="photo-field" data-photo-field="${id}">
      <label class="label-field">${label}</label>
      <input type="file" accept="${accept}" class="input-field photo-input" id="${id}-file" data-target="${id}" data-doc="${accept.includes('pdf') ? '1' : ''}">
      ${hasFile ? `
        <div class="photo-preview mt-2" id="${id}-preview">
          ${isPdf
            ? `<a href="${currentUrl}" download="document.pdf" class="btn-secondary text-xs inline-flex">Télécharger le fichier</a>`
            : `<img src="${currentUrl}" alt="${escapeHtml(label)}">`
          }
          <button type="button" class="btn-ghost text-xs text-red-400 mt-1 block remove-photo" data-target="${id}">Supprimer</button>
        </div>
      ` : `<div class="photo-preview mt-2 hidden" id="${id}-preview"></div>`}
    </div>
  `;
}

import { icon } from './icons.js';

export function searchBar(id, placeholder = 'Rechercher…', value = '') {
  return `
    <div class="search-bar-wrap">
      <svg class="search-bar-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <input type="search" id="${id}" class="input-field search-bar" placeholder="${placeholder}" value="${escapeHtml(value)}" autocomplete="off">
    </div>
  `;
}

export function progressControl(name, value = 0) {
  const v = Math.min(100, Math.max(0, parseInt(value, 10) || 0));
  const steps = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  return `
    <div class="progress-control" data-progress-control>
      <div class="flex items-center justify-between mb-2">
        <label class="label-field mb-0">Avancement du projet</label>
        <span class="progress-value text-sm font-semibold text-accent-hover">${v}%</span>
      </div>
      <input type="range" class="progress-slider" name="${name}" min="0" max="100" step="10" value="${v}">
      <div class="progress-presets">
        ${steps.map(s => `
          <button type="button" class="progress-preset ${s === v ? 'active' : ''}" data-value="${s}">${s}%</button>
        `).join('')}
      </div>
    </div>
  `;
}

export function bindProgressControl(root = document) {
  root.querySelectorAll('[data-progress-control]').forEach(ctrl => {
    const slider = ctrl.querySelector('.progress-slider');
    const valueEl = ctrl.querySelector('.progress-value');
    const presets = ctrl.querySelectorAll('.progress-preset');

    const sync = (val) => {
      const n = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
      slider.value = n;
      if (valueEl) valueEl.textContent = `${n}%`;
      presets.forEach(btn => btn.classList.toggle('active', parseInt(btn.dataset.value, 10) === n));
    };

    slider?.addEventListener('input', () => sync(slider.value));
    presets.forEach(btn => {
      btn.addEventListener('click', () => sync(btn.dataset.value));
    });
  });
}

export function emptyState(iconName, title, subtitle = '') {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">${icon(iconName, 'w-12 h-12 text-gray-600')}</div>
      <h3 class="text-gray-300 font-medium mb-1">${title}</h3>
      ${subtitle ? `<p class="text-gray-500 text-sm">${subtitle}</p>` : ''}
    </div>
  `;
}

export {
  STATUS_LABELS,
  PRIORITY_LABELS,
  RESOURCE_TYPES,
  NOTE_TYPES,
  TEMPLATE_CATEGORIES,
};
