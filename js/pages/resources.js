import * as db from '../db.js';
import {
  escapeHtml, openModal, closeModal, showToast, emptyState, RESOURCE_TYPES,
} from '../utils.js';
import { icon, RESOURCE_ICON_MAP } from '../icons.js';

let resources = [];
let filterType = '';

function resourceIcon(type, className = 'w-4 h-4 inline-block align-middle') {
  const name = RESOURCE_ICON_MAP[type] || 'link';
  return icon(name, className);
}

export async function render() {
  resources = await db.getResources();

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-new-resource" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span class="btn-label">Nouvelle ressource</span>
    </button>
  `;

  const filtered = filterType
    ? resources.filter(r => r.type === filterType)
    : resources;

  return `
    <div class="page-inner">
    <div class="flex flex-wrap gap-2 mb-6">
      <button class="tag cursor-pointer filter-type ${!filterType ? 'ring-1 ring-accent' : ''}" data-type="">Tous</button>
      ${Object.entries(RESOURCE_TYPES).map(([k, v]) => `
        <button class="tag cursor-pointer filter-type ${filterType === k ? 'ring-1 ring-accent' : ''}" data-type="${k}">${resourceIcon(k)} ${v}</button>
      `).join('')}
    </div>

    ${filtered.length === 0
      ? emptyState('link', 'Aucune ressource', 'Ajoutez vos liens et ressources importantes.')
      : `<div class="grid md:grid-cols-2 gap-3">
          ${filtered.map(r => resourceCard(r)).join('')}
        </div>`
    }
    </div>
  `;
}

function resourceCard(r) {
  const tags = (r.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join(' ');
  return `
    <div class="card hover:border-accent/30 transition-colors resource-card ${r.pinned ? 'pinned-card' : ''}" data-id="${r.id}">
      <div class="flex items-start gap-3">
        <span class="resource-type-icon shrink-0">${resourceIcon(r.type, 'w-6 h-6 text-accent-hover')}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            ${r.pinned ? `<span class="shrink-0 text-yellow-400" title="Épinglé">${icon('pin', 'w-4 h-4')}</span>` : ''}
            <h3 class="font-medium text-white truncate">${escapeHtml(r.title)}</h3>
            <span class="tag shrink-0">${RESOURCE_TYPES[r.type] || r.type}</span>
          </div>
          ${r.description ? `<p class="text-sm text-gray-400 line-clamp-2">${escapeHtml(r.description)}</p>` : ''}
          ${r.url ? `<a href="${escapeHtml(r.url)}" target="_blank" rel="noopener" class="text-xs text-accent-hover hover:underline mt-1 block truncate" onclick="event.stopPropagation()">${escapeHtml(r.url)}</a>` : ''}
          ${tags ? `<div class="flex flex-wrap gap-1 mt-2">${tags}</div>` : ''}
        </div>
        <button class="btn-ghost pin-resource shrink-0 ${r.pinned ? 'text-yellow-400' : ''}" data-id="${r.id}" data-pinned="${r.pinned ? '1' : '0'}" aria-label="Épingler" onclick="event.stopPropagation()">${icon('pin', 'w-4 h-4')}</button>
      </div>
    </div>
  `;
}

export function bindEvents() {
  document.getElementById('btn-new-resource')?.addEventListener('click', () => showResourceForm());

  document.querySelectorAll('.filter-type').forEach(btn => {
    btn.addEventListener('click', () => {
      filterType = btn.dataset.type;
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'resources' }));
    });
  });

  document.querySelectorAll('.resource-card').forEach(card => {
    card.addEventListener('click', () => {
      const resource = resources.find(r => r.id === card.dataset.id);
      if (resource) showResourceForm(resource);
    });
  });

  document.querySelectorAll('.pin-resource').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pinned = btn.dataset.pinned !== '1';
      try {
        await db.toggleResourcePin(btn.dataset.id, pinned);
        showToast(pinned ? 'Ressource épinglée' : 'Épinglage retiré');
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'resources' }));
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      }
    });
  });
}

function showResourceForm(resource = null) {
  const isEdit = !!resource;
  const tags = (resource?.tags || []).join(', ');

  openModal(
    isEdit ? 'Modifier la ressource' : 'Nouvelle ressource',
    `
      <form id="resource-form" class="space-y-4">
        <div>
          <label class="label-field">Titre *</label>
          <input class="input-field" name="title" value="${escapeHtml(resource?.title || '')}" required>
        </div>
        <div>
          <label class="label-field">Type</label>
          <select class="select-field" name="type">
            ${Object.entries(RESOURCE_TYPES).map(([k, v]) =>
              `<option value="${k}" ${resource?.type === k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="label-field">URL</label>
          <input class="input-field" name="url" type="url" value="${escapeHtml(resource?.url || '')}" placeholder="https://...">
        </div>
        <div>
          <label class="label-field">Description</label>
          <textarea class="textarea-field" name="description">${escapeHtml(resource?.description || '')}</textarea>
        </div>
        <div>
          <label class="label-field">Tags (séparés par des virgules)</label>
          <input class="input-field" name="tags" value="${escapeHtml(tags)}" placeholder="css, design, react">
        </div>
        ${isEdit ? `
          <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" name="pinned" ${resource?.pinned ? 'checked' : ''}>
            Épingler en haut de la liste
          </label>
        ` : ''}
      </form>
    `,
    `
      ${isEdit ? '<button class="btn-danger" id="btn-delete-resource">Supprimer</button>' : ''}
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-resource">${isEdit ? 'Enregistrer' : 'Créer'}</button>
    `
  );

  document.getElementById('btn-save-resource').addEventListener('click', async () => {
    const form = document.getElementById('resource-form');
    const fd = new FormData(form);
    const data = {
      title: fd.get('title'),
      type: fd.get('type'),
      url: fd.get('url'),
      description: fd.get('description'),
      tags: fd.get('tags').split(',').map(t => t.trim()).filter(Boolean),
      pinned: fd.get('pinned') === 'on',
    };

    try {
      if (isEdit) {
        await db.updateResource(resource.id, data);
        showToast('Ressource mise à jour');
      } else {
        await db.createResource(data);
        showToast('Ressource créée');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'resources' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });

  document.getElementById('btn-delete-resource')?.addEventListener('click', async () => {
    if (!confirm('Supprimer cette ressource ?')) return;
    try {
      await db.deleteResource(resource.id);
      closeModal();
      showToast('Ressource supprimée');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'resources' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}
