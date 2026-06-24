import * as db from '../db.js';
import {
  escapeHtml, openModal, closeModal, showToast, emptyState,
  statusBadge, priorityBadge, STATUS_LABELS, PRIORITY_LABELS,
} from '../utils.js';

let ideas = [];

export async function render() {
  ideas = await db.getAppIdeas();

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-new-idea" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span class="btn-label">Nouvelle idée</span>
    </button>
  `;

  if (ideas.length === 0) {
    return `<div class="page-inner">${emptyState('light-bulb', 'Aucune idée', 'Capturez rapidement vos idées d\'applications.')}</div>`;
  }

  const sorted = [...ideas].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
  });

  return `
    <div class="page-inner">
    <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
      ${sorted.map(i => ideaCard(i)).join('')}
    </div>
    </div>
  `;
}

function ideaCard(i) {
  return `
    <div class="card hover:border-accent/30 transition-colors cursor-pointer idea-card" data-id="${i.id}">
      <div class="flex items-start justify-between mb-2">
        <h3 class="font-semibold text-white">${escapeHtml(i.name)}</h3>
        <div class="flex gap-1 shrink-0">
          ${priorityBadge(i.priority)}
          ${statusBadge(i.status)}
        </div>
      </div>
      ${i.description ? `<p class="text-sm text-gray-400 line-clamp-3">${escapeHtml(i.description)}</p>` : ''}
    </div>
  `;
}

export function bindEvents() {
  document.getElementById('btn-new-idea')?.addEventListener('click', () => showIdeaForm());

  document.querySelectorAll('.idea-card').forEach(card => {
    card.addEventListener('click', () => {
      const idea = ideas.find(i => i.id === card.dataset.id);
      if (idea) showIdeaForm(idea);
    });
  });
}

function showIdeaForm(idea = null) {
  const isEdit = !!idea;

  openModal(
    isEdit ? 'Modifier l\'idée' : 'Nouvelle idée',
    `
      <form id="idea-form" class="space-y-4">
        <div>
          <label class="label-field">Nom *</label>
          <input class="input-field" name="name" value="${escapeHtml(idea?.name || '')}" required placeholder="Mon application">
        </div>
        <div>
          <label class="label-field">Description</label>
          <textarea class="textarea-field" name="description" placeholder="Décrivez brièvement l'idée...">${escapeHtml(idea?.description || '')}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label-field">Priorité</label>
            <select class="select-field" name="priority">
              ${Object.entries(PRIORITY_LABELS).map(([k, v]) =>
                `<option value="${k}" ${idea?.priority === k ? 'selected' : ''}>${v}</option>`
              ).join('')}
            </select>
          </div>
          <div>
            <label class="label-field">État</label>
            <select class="select-field" name="status">
              ${Object.entries(STATUS_LABELS).filter(([k]) => ['idea','in_progress','done','abandoned'].includes(k)).map(([k, v]) =>
                `<option value="${k}" ${idea?.status === k ? 'selected' : ''}>${v}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </form>
    `,
    `
      ${isEdit ? '<button class="btn-danger" id="btn-delete-idea">Supprimer</button>' : ''}
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-idea">${isEdit ? 'Enregistrer' : 'Créer'}</button>
    `
  );

  document.getElementById('btn-save-idea').addEventListener('click', async () => {
    const form = document.getElementById('idea-form');
    const fd = new FormData(form);
    const data = {
      name: fd.get('name'),
      description: fd.get('description'),
      priority: fd.get('priority'),
      status: fd.get('status'),
    };

    try {
      if (isEdit) {
        await db.updateAppIdea(idea.id, data);
        showToast('Idée mise à jour');
      } else {
        await db.createAppIdea(data);
        showToast('Idée enregistrée');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'ideas' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });

  document.getElementById('btn-delete-idea')?.addEventListener('click', async () => {
    if (!confirm('Supprimer cette idée ?')) return;
    try {
      await db.deleteAppIdea(idea.id);
      closeModal();
      showToast('Idée supprimée');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'ideas' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}
