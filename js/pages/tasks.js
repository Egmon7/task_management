import * as db from '../db.js';
import {
  escapeHtml, openModal, closeModal, showToast, emptyState, searchBar,
} from '../utils.js';
import { icon } from '../icons.js';

let tasks = [];
let projects = [];
let searchQuery = '';

const COLUMNS = [
  { key: 'a_faire', label: 'À faire', color: 'border-gray-500' },
  { key: 'en_cours', label: 'En cours', color: 'border-blue-500' },
  { key: 'termine', label: 'Terminées', color: 'border-green-500' },
];

export async function render() {
  [tasks, projects] = await Promise.all([db.getTasks(), db.getProjects()]);
  searchQuery = '';

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-new-task" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span class="btn-label">Nouvelle tâche</span>
    </button>
  `;

  if (tasks.length === 0) {
    return `<div class="page-inner">${emptyState('clipboard-check', 'Aucune tâche', 'Créez votre première tâche pour organiser votre travail.')}</div>`;
  }

  return `
    <div class="page-inner">
      ${searchBar('task-search', 'Rechercher une tâche…')}
      <div id="kanban-board" class="kanban-board">
        ${kanbanHtml(tasks)}
      </div>
    </div>
  `;
}

function filterTasks(list, query) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  return list.filter(t =>
    (t.title || '').toLowerCase().includes(q) ||
    (t.projects?.name || '').toLowerCase().includes(q)
  );
}

function kanbanHtml(list) {
  const filtered = filterTasks(list, searchQuery);
  return COLUMNS.map(col => `
    <div class="kanban-column" data-status="${col.key}">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full ${col.color.replace('border-', 'bg-')}"></span>
          ${col.label}
        </h3>
        <span class="text-xs text-gray-500 bg-surface px-2 py-0.5 rounded-full">
          ${filtered.filter(t => t.status === col.key).length}
        </span>
      </div>
      <div class="space-y-2 task-drop-zone" data-status="${col.key}">
        ${filtered.filter(t => t.status === col.key).map(t => taskCard(t)).join('')}
      </div>
    </div>
  `).join('');
}

function taskCard(t) {
  return `
    <div class="kanban-card" draggable="true" data-id="${t.id}" data-status="${t.status}">
      <p class="text-sm text-gray-200 font-medium">${escapeHtml(t.title)}</p>
      ${t.projects?.name ? `<p class="text-xs text-gray-500 mt-1">${escapeHtml(t.projects.name)}</p>` : ''}
      <div class="flex justify-end mt-2 gap-1">
        <button class="btn-ghost edit-task" data-id="${t.id}" aria-label="Modifier">${icon('pencil', 'w-4 h-4')}</button>
        <button class="btn-ghost text-red-400 delete-task" data-id="${t.id}" aria-label="Supprimer">${icon('trash', 'w-4 h-4')}</button>
      </div>
    </div>
  `;
}

function refreshKanban() {
  const board = document.getElementById('kanban-board');
  if (board) {
    board.innerHTML = kanbanHtml(tasks);
    bindTaskActions();
    setupDragAndDrop();
  }
}

function bindTaskActions() {
  document.querySelectorAll('.edit-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const task = tasks.find(t => t.id === btn.dataset.id);
      if (task) showTaskForm(task);
    });
  });

  document.querySelectorAll('.delete-task').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Supprimer cette tâche ?')) return;
      try {
        await db.deleteTask(btn.dataset.id);
        showToast('Tâche supprimée');
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'tasks' }));
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      }
    });
  });
}

export function bindEvents() {
  document.getElementById('btn-new-task')?.addEventListener('click', () => showTaskForm());

  document.getElementById('task-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    refreshKanban();
  });

  bindTaskActions();
  setupDragAndDrop();
}

function setupDragAndDrop() {
  let draggedId = null;

  document.querySelectorAll('.kanban-card').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedId = card.dataset.id;
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      draggedId = null;
    });
  });

  document.querySelectorAll('.task-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.style.backgroundColor = 'rgba(99,102,241,0.05)';
    });
    zone.addEventListener('dragleave', () => {
      zone.style.backgroundColor = '';
    });
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.style.backgroundColor = '';
      const newStatus = zone.dataset.status;
      if (!draggedId || !newStatus) return;
      const task = tasks.find(t => t.id === draggedId);
      if (!task || task.status === newStatus) return;
      try {
        await db.updateTask(draggedId, { status: newStatus });
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'tasks' }));
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      }
    });
  });
}

function showTaskForm(task = null) {
  const isEdit = !!task;
  const projectOptions = projects.map(p =>
    `<option value="${p.id}" ${task?.project_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');

  openModal(
    isEdit ? 'Modifier la tâche' : 'Nouvelle tâche',
    `
      <form id="task-form" class="space-y-4">
        <div>
          <label class="label-field">Titre *</label>
          <input class="input-field" name="title" value="${escapeHtml(task?.title || '')}" required>
        </div>
        <div>
          <label class="label-field">Projet associé</label>
          <select class="select-field" name="project_id">
            <option value="">— Aucun —</option>
            ${projectOptions}
          </select>
        </div>
        <div>
          <label class="label-field">Statut</label>
          <select class="select-field" name="status">
            ${COLUMNS.map(c => `<option value="${c.key}" ${task?.status === c.key ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
      </form>
    `,
    `
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-task">${isEdit ? 'Enregistrer' : 'Créer'}</button>
    `
  );

  document.getElementById('btn-save-task').addEventListener('click', async () => {
    const form = document.getElementById('task-form');
    const fd = new FormData(form);
    const data = {
      title: fd.get('title'),
      project_id: fd.get('project_id') || null,
      status: fd.get('status'),
    };

    try {
      if (isEdit) {
        await db.updateTask(task.id, data);
        showToast('Tâche mise à jour');
      } else {
        await db.createTask(data);
        showToast('Tâche créée');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'tasks' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}
