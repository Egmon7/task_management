import * as db from '../db.js';
import { formatCurrency, formatDate, statusBadge, escapeHtml, deadlineBadge } from '../utils.js';
import { icon } from '../icons.js';

const STATUS_CHART = [
  { key: 'debut', label: 'Début', color: '#a78bfa' },
  { key: 'en_cours', label: 'En cours', color: '#60a5fa' },
  { key: 'termine', label: 'Terminés', color: '#4ade80' },
  { key: 'en_pause', label: 'En pause', color: '#facc15' },
  { key: 'abandonne', label: 'Abandonnés', color: '#f87171' },
];

export async function render() {
  const [projects, tasks] = await Promise.all([db.getProjects(), db.getTasks()]);

  const total = projects.length;
  const enCours = projects.filter(p => p.status === 'en_cours').length;
  const termines = projects.filter(p => p.status === 'termine').length;
  const enPause = projects.filter(p => p.status === 'en_pause').length;
  const revenus = projects.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const tasksAFaire = tasks.filter(t => t.status === 'a_faire').length;
  const tasksEnCours = tasks.filter(t => t.status === 'en_cours').length;
  const tasksTerminees = tasks.filter(t => t.status === 'termine').length;

  const activeProject = projects.find(p => p.is_active);
  const recentProjects = projects.slice(0, 5);
  const recentTasks = tasks.filter(t => t.status !== 'termine').slice(0, 5);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingDeadlines = projects
    .filter(p => p.deadline)
    .map(p => ({ ...p, days: Math.ceil((new Date(p.deadline) - today) / 86400000) }))
    .filter(p => p.days >= -7)
    .sort((a, b) => a.days - b.days)
    .slice(0, 5);

  return `
    <div class="page-inner space-y-6">
      ${activeProject ? activeProjectCard(activeProject) : ''}

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 dashboard-stats">
        ${statCard('Total projets', total, 'folder', 'text-white', 'text-gray-400')}
        ${statCard('En cours', enCours, 'refresh', 'text-blue-400', 'text-blue-400')}
        ${statCard('Terminés', termines, 'check-circle', 'text-green-400', 'text-green-400')}
        ${statCard('En pause', enPause, 'pause', 'text-yellow-400', 'text-yellow-400')}
        ${statCard('Revenus', formatCurrency(revenus), 'currency', 'text-accent-hover', 'text-accent-hover')}
      </div>

      <div class="card">
        <h3 class="text-sm font-semibold text-white mb-4">Résumé des tâches</h3>
        <div class="grid grid-cols-3 gap-3 sm:gap-4">
          ${taskStat('À faire', tasksAFaire, 'a_faire', 'text-gray-300', 'clipboard')}
          ${taskStat('En cours', tasksEnCours, 'en_cours', 'text-blue-400', 'refresh')}
          ${taskStat('Terminées', tasksTerminees, 'termine', 'text-green-400', 'check-circle')}
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="text-sm font-semibold text-white mb-4">Projets par statut</h3>
          ${statusChart(projects)}
        </div>

        <div class="card">
          <h3 class="text-sm font-semibold text-white mb-4">Prochaines échéances</h3>
          ${upcomingDeadlines.length === 0
            ? '<p class="text-gray-500 text-sm">Aucune échéance définie.</p>'
            : `<div class="space-y-3">${upcomingDeadlines.map(p => `
                <div class="flex items-center justify-between py-2 border-b border-surface-border last:border-0 deadline-row" data-id="${p.id}">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-200 truncate">${escapeHtml(p.name)}</p>
                    <p class="text-xs text-gray-500">${formatDate(p.deadline)}</p>
                  </div>
                  ${deadlineBadge(p.deadline)}
                </div>
              `).join('')}</div>`
          }
        </div>
      </div>

      <div class="grid lg:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="text-sm font-semibold text-white mb-4">Activité récente</h3>
          ${recentProjects.length === 0
            ? '<p class="text-gray-500 text-sm">Aucun projet pour le moment.</p>'
            : `<div class="space-y-3">${recentProjects.map(p => `
                <div class="flex items-center justify-between py-2 border-b border-surface-border last:border-0 project-row cursor-pointer" data-id="${p.id}">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-200 truncate">${escapeHtml(p.name)}</p>
                    <p class="text-xs text-gray-500">Modifié · ${formatDate(p.updated_at || p.created_at)}</p>
                  </div>
                  ${statusBadge(p.status)}
                </div>
              `).join('')}</div>`
          }
        </div>

        <div class="card">
          <h3 class="text-sm font-semibold text-white mb-4">Tâches en attente</h3>
          ${recentTasks.length === 0
            ? '<p class="text-gray-500 text-sm">Aucune tâche en attente.</p>'
            : `<div class="space-y-3">${recentTasks.map(t => `
                <div class="flex items-center justify-between py-2 border-b border-surface-border last:border-0">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-200 truncate">${escapeHtml(t.title)}</p>
                    ${t.projects?.name ? `<p class="text-xs text-gray-500">${escapeHtml(t.projects.name)}</p>` : ''}
                  </div>
                  ${statusBadge(t.status)}
                </div>
              `).join('')}</div>`
          }
        </div>
      </div>
    </div>
  `;
}

export function bindEvents() {
  document.querySelectorAll('.project-row, .deadline-row').forEach(row => {
    row.addEventListener('click', () => {
      window.location.hash = 'projects';
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-project', { detail: row.dataset.id }));
      }, 100);
    });
  });

  document.querySelectorAll('.open-active-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.location.hash = 'projects';
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-project', { detail: btn.dataset.id }));
      }, 100);
    });
  });
}

function activeProjectCard(p) {
  const prog = p.progress || 0;
  return `
    <div class="card active-project-card border-accent/40 bg-accent/5">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 mb-2">
            ${icon('star', 'w-4 h-4 text-yellow-400 shrink-0')}
            <span class="text-xs font-medium text-accent-hover uppercase tracking-wide">Projet actif</span>
          </div>
          <h3 class="text-lg font-semibold text-white truncate">${escapeHtml(p.name)}</h3>
          <p class="text-sm text-gray-400 mt-1">${escapeHtml(p.client_name) || 'Sans client'} · ${escapeHtml(p.category) || 'Sans catégorie'}</p>
          ${p.deadline ? `<p class="text-xs text-gray-500 mt-2">Échéance : ${formatDate(p.deadline)}</p>` : ''}
          <div class="mt-3">
            <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Avancement</span>
              <span>${prog}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${prog}%"></div>
            </div>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2 shrink-0">
          ${statusBadge(p.status)}
          <button class="btn-secondary text-xs open-active-project" data-id="${p.id}">Voir le projet</button>
        </div>
      </div>
    </div>
  `;
}

function statusChart(projects) {
  if (projects.length === 0) {
    return '<p class="text-gray-500 text-sm">Aucun projet à afficher.</p>';
  }
  const max = Math.max(...STATUS_CHART.map(s => projects.filter(p => p.status === s.key).length), 1);
  return `
    <div class="space-y-3">
      ${STATUS_CHART.map(s => {
        const count = projects.filter(p => p.status === s.key).length;
        const width = Math.round((count / max) * 100);
        return `
          <div>
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="text-gray-400">${s.label}</span>
              <span class="text-gray-300 font-medium">${count}</span>
            </div>
            <div class="chart-bar-track">
              <div class="chart-bar-fill" style="width: ${width}%; background-color: ${s.color}"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function statCard(label, value, iconName, colorClass, iconColorClass) {
  return `
    <div class="stat-card">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500 font-medium">${label}</span>
        ${icon(iconName, `w-5 h-5 shrink-0 ${iconColorClass}`)}
      </div>
      <p class="text-xl sm:text-2xl font-bold ${colorClass} stat-value">${value}</p>
    </div>
  `;
}

function taskStat(label, count, statusKey, colorClass, iconName) {
  return `
    <div class="stat-card text-center sm:text-left">
      <div class="flex items-center justify-center sm:justify-between mb-1">
        <span class="text-xs text-gray-500 font-medium">${label}</span>
        ${icon(iconName, `w-4 h-4 shrink-0 hidden sm:block ${colorClass}`)}
      </div>
      <p class="text-2xl font-bold ${colorClass}">${count}</p>
      ${statusBadge(statusKey)}
    </div>
  `;
}
