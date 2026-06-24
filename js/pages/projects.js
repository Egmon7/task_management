import * as db from '../db.js';
import {
  formatCurrency, formatDate, statusBadge, escapeHtml, deadlineBadge,
  openModal, closeModal, showToast, emptyState, STATUS_LABELS,
  searchBar, progressControl, bindProgressControl,
} from '../utils.js';
import { icon } from '../icons.js';

let projects = [];
let searchQuery = '';

const PROJECT_STATUSES = ['debut', 'en_cours', 'termine', 'en_pause', 'abandonne'];

export async function render() {
  projects = await db.getProjects();
  searchQuery = '';

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-new-project" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span class="btn-label">Nouveau projet</span>
    </button>
  `;

  if (projects.length === 0) {
    return `<div class="page-inner">${emptyState('folder', 'Aucun projet', 'Créez votre premier projet pour commencer.')}</div>`;
  }

  return `
    <div class="page-inner page-inner--scroll">
      ${searchBar('project-search', 'Rechercher un projet…')}
      <div class="projects-list" id="projects-list">
        ${projectGrid(projects)}
      </div>
    </div>
  `;
}

function filterProjects(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(p =>
    (p.name || '').toLowerCase().includes(q) ||
    (p.client_name || '').toLowerCase().includes(q) ||
    (p.category || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q) ||
    (p.estimation || '').toLowerCase().includes(q) ||
    (p.technologies || []).some(t => t.toLowerCase().includes(q))
  );
}

function projectGrid(list) {
  const filtered = filterProjects(list, searchQuery);
  if (filtered.length === 0) {
    return '<p class="text-gray-500 text-sm text-center py-8">Aucun projet ne correspond à votre recherche.</p>';
  }
  return `
    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      ${filtered.map(p => projectCard(p)).join('')}
    </div>
  `;
}

function projectCard(p) {
  const techs = (p.technologies || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  const prog = p.progress || 0;
  return `
    <div class="card hover:border-accent/30 transition-colors cursor-pointer project-card ${p.is_active ? 'ring-1 ring-accent/50' : ''}" data-id="${p.id}">
      <div class="flex items-start justify-between mb-3 gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="font-semibold text-white truncate">${escapeHtml(p.name)}</h3>
            ${p.is_active ? '<span class="badge badge-in_progress">Actif</span>' : ''}
          </div>
          <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(p.client_name) || 'Sans client'}</p>
        </div>
        ${statusBadge(p.status)}
      </div>
      ${p.description ? `<p class="text-sm text-gray-400 mb-3 line-clamp-2">${escapeHtml(p.description)}</p>` : ''}
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Avancement</span>
          <span class="text-accent-hover font-medium">${prog}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${prog}%"></div>
        </div>
      </div>
      <div class="flex flex-wrap gap-1 mb-3">${techs}</div>
      <div class="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-surface-border gap-2 flex-wrap">
        <span>Modifié · ${formatDate(p.updated_at || p.created_at)}</span>
        <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          ${p.deadline ? deadlineBadge(p.deadline) : ''}
          ${p.estimation ? `<span class="text-gray-400">Est. ${escapeHtml(p.estimation)}</span>` : ''}
          <span class="text-accent-hover font-medium">${formatCurrency(p.amount)}</span>
        </div>
      </div>
    </div>
  `;
}

function bindProjectCards() {
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', () => showProjectDetail(card.dataset.id));
  });
}

export function bindEvents() {
  document.getElementById('btn-new-project')?.addEventListener('click', () => showProjectForm());

  document.getElementById('project-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    const listEl = document.getElementById('projects-list');
    if (listEl) {
      listEl.innerHTML = projectGrid(projects);
      bindProjectCards();
    }
  });

  bindProjectCards();

  document.querySelectorAll('.open-active-project').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showProjectDetail(btn.dataset.id);
    });
  });
}

export function onOpenProject(id) {
  if (id) showProjectDetail(id);
}

function showProjectForm(project = null) {
  const isEdit = !!project;
  const techs = (project?.technologies || []).join(', ');
  const deadline = project?.deadline ? project.deadline.split('T')[0] : '';

  openModal(
    isEdit ? 'Modifier le projet' : 'Nouveau projet',
    `
      <form id="project-form" class="space-y-4">
        <div>
          <label class="label-field">Nom du projet *</label>
          <input class="input-field" name="name" value="${escapeHtml(project?.name || '')}" required>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label-field">Client</label>
            <input class="input-field" name="client_name" value="${escapeHtml(project?.client_name || '')}">
          </div>
          <div>
            <label class="label-field">Catégorie</label>
            <input class="input-field" name="category" value="${escapeHtml(project?.category || '')}">
          </div>
        </div>
        <div>
          <label class="label-field">Description</label>
          <textarea class="textarea-field" name="description">${escapeHtml(project?.description || '')}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label-field">État</label>
            <select class="select-field" name="status">
              ${PROJECT_STATUSES.map(k =>
                `<option value="${k}" ${(project?.status || 'debut') === k ? 'selected' : ''}>${STATUS_LABELS[k]}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="label-field">Estimation</label>
            <input class="input-field" name="estimation" value="${escapeHtml(project?.estimation || '')}" placeholder="Ex: 500 € ou pas défini">
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label-field">Prix final (€)</label>
            <input class="input-field input-field-compact" name="amount" type="number" step="0.01" value="${project?.amount || 0}">
          </div>
          <div>
            <label class="label-field">Échéance</label>
            <input class="input-field input-field-compact" name="deadline" type="date" value="${deadline}">
          </div>
        </div>
        <div>
          <label class="label-field">Lien du projet</label>
          <input class="input-field" name="live_url" type="url" value="${escapeHtml(project?.live_url || '')}" placeholder="https://monsite.com">
        </div>
        <div>
          <label class="label-field">Lien GitHub</label>
          <input class="input-field" name="github_url" type="url" value="${escapeHtml(project?.github_url || '')}" placeholder="https://github.com/...">
        </div>
        ${progressControl('progress', project?.progress || 0)}
        <div class="flex items-center gap-2">
          <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" name="is_active" class="rounded border-surface-border" ${project?.is_active ? 'checked' : ''}>
            Projet actif
          </label>
        </div>
        <div>
          <label class="label-field">Technologies (séparées par des virgules)</label>
          <input class="input-field" name="technologies" value="${escapeHtml(techs)}" placeholder="React, Tailwind, Node.js">
        </div>
      </form>
    `,
    `
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-project">${isEdit ? 'Enregistrer' : 'Créer'}</button>
    `
  );

  bindProgressControl(document.getElementById('modal-body'));

  document.getElementById('btn-save-project').addEventListener('click', async () => {
    const form = document.getElementById('project-form');
    const fd = new FormData(form);
    const data = {
      name: fd.get('name'),
      client_name: fd.get('client_name'),
      category: fd.get('category'),
      description: fd.get('description'),
      status: fd.get('status'),
      estimation: fd.get('estimation') || '',
      amount: parseFloat(fd.get('amount')) || 0,
      deadline: fd.get('deadline') || null,
      live_url: fd.get('live_url') || '',
      github_url: fd.get('github_url') || '',
      progress: parseInt(fd.get('progress'), 10) || 0,
      technologies: fd.get('technologies').split(',').map(t => t.trim()).filter(Boolean),
    };

    try {
      if (isEdit) {
        await db.updateProject(project.id, data);
        if (fd.get('is_active') === 'on') {
          await db.setActiveProject(project.id);
        } else if (project.is_active) {
          await db.updateProject(project.id, { is_active: false });
        }
        showToast('Projet mis à jour');
      } else {
        const created = await db.createProject(data);
        if (fd.get('is_active') === 'on') await db.setActiveProject(created.id);
        showToast('Projet créé');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'projects' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}

async function showProjectDetail(id) {
  const project = await db.getProject(id);
  const logs = await db.getProjectLogs(id);
  const prog = project.progress || 0;

  openModal(
    escapeHtml(project.name),
    `
      <div class="space-y-5">
        <div class="flex items-center gap-2 flex-wrap">
          ${statusBadge(project.status)}
          ${project.is_active ? '<span class="badge badge-in_progress">Projet actif</span>' : ''}
          ${project.category ? `<span class="tag">${escapeHtml(project.category)}</span>` : ''}
          ${project.deadline ? deadlineBadge(project.deadline) : ''}
        </div>

        <div>
          <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Avancement</span>
            <span class="text-accent-hover font-semibold" id="detail-progress-label">${prog}%</span>
          </div>
          <div class="progress-bar mb-2">
            <div class="progress-fill" id="detail-progress-bar" style="width: ${prog}%"></div>
          </div>
          <div id="detail-progress-control">
            ${progressControl('detail_progress', prog)}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div><span class="text-gray-500">Client</span><p class="text-gray-200">${escapeHtml(project.client_name) || '—'}</p></div>
          <div><span class="text-gray-500">Créé le</span><p class="text-gray-200">${formatDate(project.created_at)}</p></div>
          <div><span class="text-gray-500">Dernière activité</span><p class="text-gray-200">${formatDate(project.updated_at || project.created_at)}</p></div>
          <div><span class="text-gray-500">Échéance</span><p class="text-gray-200">${project.deadline ? formatDate(project.deadline) : '—'}</p></div>
          <div><span class="text-gray-500">Estimation</span><p class="text-gray-200">${escapeHtml(project.estimation) || '—'}</p></div>
          <div><span class="text-gray-500">Prix final</span><p class="text-accent-hover font-medium">${formatCurrency(project.amount)}</p></div>
          <div class="col-span-2"><span class="text-gray-500">Technologies</span><p class="text-gray-200">${(project.technologies || []).join(', ') || '—'}</p></div>
          ${project.live_url ? `<div class="col-span-2"><span class="text-gray-500">Lien du projet</span><p><a href="${escapeHtml(project.live_url)}" target="_blank" rel="noopener" class="text-accent-hover text-sm break-all">${escapeHtml(project.live_url)}</a></p></div>` : ''}
          ${project.github_url ? `<div class="col-span-2"><span class="text-gray-500">GitHub</span><p><a href="${escapeHtml(project.github_url)}" target="_blank" rel="noopener" class="text-accent-hover text-sm break-all">${escapeHtml(project.github_url)}</a></p></div>` : ''}
        </div>

        ${project.description ? `<div><span class="text-gray-500 text-sm">Description</span><p class="text-gray-300 text-sm mt-1">${escapeHtml(project.description)}</p></div>` : ''}

        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-white">Journal des modifications</h4>
            <button class="btn-ghost" id="btn-add-log">+ Ajouter</button>
          </div>
          <div id="logs-list" class="max-h-48 overflow-y-auto">
            ${logs.length === 0
              ? '<p class="text-gray-500 text-sm">Aucune modification enregistrée.</p>'
              : logs.map(log => `
                  <div class="log-item" data-log-id="${log.id}">
                    <div class="log-dot"></div>
                    <div class="flex-1">
                      <p class="text-sm text-gray-200">${escapeHtml(log.title)}</p>
                      <p class="text-xs text-gray-500">${formatDate(log.created_at)}</p>
                    </div>
                    <button class="btn-ghost text-red-400 delete-log" data-id="${log.id}" aria-label="Supprimer">${icon('x', 'w-4 h-4')}</button>
                  </div>
                `).join('')
            }
          </div>
        </div>
      </div>
    `,
    `
      <button class="btn-danger" id="btn-delete-project">Supprimer</button>
      <button class="btn-secondary" id="btn-set-active">${project.is_active ? 'Retirer actif' : 'Définir actif'}</button>
      <button class="btn-secondary" id="btn-duplicate-project">${icon('duplicate', 'w-4 h-4')} Dupliquer</button>
      <button class="btn-secondary" id="btn-edit-project">Modifier</button>
      <button class="btn-primary" id="btn-close-detail">Fermer</button>
    `
  );

  bindProgressControl(document.getElementById('detail-progress-control'));
  const detailSlider = document.querySelector('#detail-progress-control .progress-slider');
  let saveProgressTimer = null;
  detailSlider?.addEventListener('input', () => {
    const val = parseInt(detailSlider.value, 10) || 0;
    document.getElementById('detail-progress-label').textContent = `${val}%`;
    document.getElementById('detail-progress-bar').style.width = `${val}%`;
    clearTimeout(saveProgressTimer);
    saveProgressTimer = setTimeout(async () => {
      try {
        await db.updateProject(id, { progress: val });
      } catch (e) {
        showToast('Erreur avancement : ' + e.message, 'error');
      }
    }, 400);
  });

  document.getElementById('btn-close-detail').addEventListener('click', closeModal);
  document.getElementById('btn-edit-project').addEventListener('click', () => {
    closeModal();
    showProjectForm(project);
  });
  document.getElementById('btn-duplicate-project').addEventListener('click', async () => {
    try {
      await db.duplicateProject(id);
      closeModal();
      showToast('Projet dupliqué');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'projects' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
  document.getElementById('btn-set-active').addEventListener('click', async () => {
    try {
      if (project.is_active) {
        await db.updateProject(id, { is_active: false });
        showToast('Projet retiré des actifs');
      } else {
        await db.setActiveProject(id);
        showToast('Projet défini comme actif');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'projects' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
  document.getElementById('btn-delete-project').addEventListener('click', async () => {
    if (!confirm('Supprimer ce projet et toutes ses modifications ?')) return;
    try {
      await db.deleteProject(id);
      closeModal();
      showToast('Projet supprimé');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'projects' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });

  document.getElementById('btn-add-log').addEventListener('click', () => showAddLogForm(id));
  document.querySelectorAll('.delete-log').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await db.deleteProjectLog(btn.dataset.id, id);
        showToast('Modification supprimée');
        showProjectDetail(id);
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      }
    });
  });
}

function showAddLogForm(projectId) {
  const presets = ['Header terminé', 'Footer terminé', 'Ajout de la réservation', 'Déploiement effectué'];

  openModal(
    'Nouvelle modification',
    `
      <form id="log-form" class="space-y-4">
        <div>
          <label class="label-field">Description *</label>
          <input class="input-field" name="title" id="log-title" required placeholder="Ex: Header terminé">
        </div>
        <div class="flex flex-wrap gap-2">
          ${presets.map(p => `<button type="button" class="tag cursor-pointer preset-log" data-text="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
        </div>
      </form>
    `,
    `
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-log">Enregistrer</button>
    `
  );

  document.querySelectorAll('.preset-log').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('log-title').value = btn.dataset.text;
    });
  });

  document.getElementById('btn-save-log').addEventListener('click', async () => {
    const title = document.getElementById('log-title').value.trim();
    if (!title) return;
    try {
      await db.createProjectLog({ project_id: projectId, title });
      showToast('Modification enregistrée');
      showProjectDetail(projectId);
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}
