import * as db from '../db.js';
import {
  escapeHtml, openModal, closeModal, showToast, emptyState, TEMPLATE_CATEGORIES,
} from '../utils.js';
import { icon } from '../icons.js';

let templates = [];
let filterCategory = '';

export async function render() {
  templates = await db.getTemplates();

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-new-template" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span class="btn-label">Nouveau template</span>
    </button>
  `;

  const filtered = filterCategory
    ? templates.filter(t => t.category === filterCategory)
    : templates;

  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];

  return `
    <div class="page-inner">
    ${categories.length > 0 ? `
      <div class="flex flex-wrap gap-2 mb-6">
        <button class="tag cursor-pointer filter-cat ${!filterCategory ? 'ring-1 ring-accent' : ''}" data-cat="">Tous</button>
        ${categories.map(c => `
          <button class="tag cursor-pointer filter-cat ${filterCategory === c ? 'ring-1 ring-accent' : ''}" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>
        `).join('')}
      </div>
    ` : ''}

    ${filtered.length === 0
      ? emptyState('template', 'Aucun template', 'Ajoutez vos templates réutilisables.')
      : `<div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          ${filtered.map(t => templateCard(t)).join('')}
        </div>`
    }
    </div>
  `;
}

function templateCard(t) {
  const images = (t.images || []).slice(0, 1);
  return `
    <div class="card hover:border-accent/30 transition-colors template-card" data-id="${t.id}">
      ${images.length > 0 ? `
        <div class="mb-3 rounded-lg overflow-hidden h-32 bg-surface">
          <img src="${escapeHtml(images[0])}" alt="${escapeHtml(t.name)}" class="w-full h-full object-cover" onerror="this.parentElement.style.display='none'">
        </div>
      ` : ''}
      <div class="flex items-start justify-between mb-2">
        <h3 class="font-semibold text-white">${escapeHtml(t.name)}</h3>
        ${t.category ? `<span class="tag">${escapeHtml(t.category)}</span>` : ''}
      </div>
      ${t.description ? `<p class="text-sm text-gray-400 mb-3 line-clamp-2">${escapeHtml(t.description)}</p>` : ''}
      ${t.github_url ? `<a href="${escapeHtml(t.github_url)}" target="_blank" rel="noopener" class="text-xs text-accent-hover hover:underline" onclick="event.stopPropagation()">GitHub ↗</a>` : ''}
    </div>
  `;
}

export function bindEvents() {
  document.getElementById('btn-new-template')?.addEventListener('click', () => showTemplateForm());

  document.querySelectorAll('.filter-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      filterCategory = btn.dataset.cat;
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'templates' }));
    });
  });

  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      const template = templates.find(t => t.id === card.dataset.id);
      if (template) showTemplateDetail(template);
    });
  });
}

function showTemplateForm(template = null) {
  const isEdit = !!template;
  const images = (template?.images || []).join('\n');

  openModal(
    isEdit ? 'Modifier le template' : 'Nouveau template',
    `
      <form id="template-form" class="space-y-4">
        <div>
          <label class="label-field">Nom *</label>
          <input class="input-field" name="name" value="${escapeHtml(template?.name || '')}" required>
        </div>
        <div>
          <label class="label-field">Catégorie</label>
          <select class="select-field" name="category">
            <option value="">— Choisir —</option>
            ${TEMPLATE_CATEGORIES.map(c => `<option value="${c}" ${template?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="label-field">Description</label>
          <textarea class="textarea-field" name="description">${escapeHtml(template?.description || '')}</textarea>
        </div>
        <div>
          <label class="label-field">Lien GitHub</label>
          <input class="input-field" name="github_url" type="url" value="${escapeHtml(template?.github_url || '')}" placeholder="https://github.com/...">
        </div>
        <div>
          <label class="label-field">URLs des images (une par ligne)</label>
          <textarea class="textarea-field" name="images" placeholder="https://...">${escapeHtml(images)}</textarea>
        </div>
        <div>
          <label class="label-field">Notes personnelles</label>
          <textarea class="textarea-field" name="notes">${escapeHtml(template?.notes || '')}</textarea>
        </div>
      </form>
    `,
    `
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-template">${isEdit ? 'Enregistrer' : 'Créer'}</button>
    `
  );

  document.getElementById('btn-save-template').addEventListener('click', async () => {
    const form = document.getElementById('template-form');
    const fd = new FormData(form);
    const data = {
      name: fd.get('name'),
      category: fd.get('category'),
      description: fd.get('description'),
      github_url: fd.get('github_url'),
      images: fd.get('images').split('\n').map(u => u.trim()).filter(Boolean),
      notes: fd.get('notes'),
    };

    try {
      if (isEdit) {
        await db.updateTemplate(template.id, data);
        showToast('Template mis à jour');
      } else {
        await db.createTemplate(data);
        showToast('Template créé');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'templates' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}

function showTemplateDetail(template) {
  const images = (template.images || []);

  openModal(
    escapeHtml(template.name),
    `
      <div class="space-y-4">
        ${template.category ? `<span class="tag">${escapeHtml(template.category)}</span>` : ''}
        ${template.description ? `<p class="text-sm text-gray-300">${escapeHtml(template.description)}</p>` : ''}
        ${template.github_url ? `<a href="${escapeHtml(template.github_url)}" target="_blank" rel="noopener" class="text-sm text-accent-hover hover:underline block">Voir sur GitHub ↗</a>` : ''}
        ${images.length > 0 ? `
          <div class="grid grid-cols-2 gap-2">
            ${images.map(img => `<img src="${escapeHtml(img)}" class="rounded-lg w-full h-24 object-cover" onerror="this.style.display='none'">`).join('')}
          </div>
        ` : ''}
        ${template.notes ? `<div><span class="text-xs text-gray-500">Notes</span><p class="text-sm text-gray-300 mt-1 whitespace-pre-wrap">${escapeHtml(template.notes)}</p></div>` : ''}
      </div>
    `,
    `
      <button class="btn-danger" id="btn-delete-template">Supprimer</button>
      <button class="btn-secondary" id="btn-duplicate-template">${icon('duplicate', 'w-4 h-4')} Dupliquer</button>
      <button class="btn-secondary" id="btn-edit-template">Modifier</button>
      <button class="btn-primary" id="btn-close-template">Fermer</button>
    `
  );

  document.getElementById('btn-close-template').addEventListener('click', closeModal);
  document.getElementById('btn-duplicate-template').addEventListener('click', async () => {
    try {
      await db.duplicateTemplate(template.id);
      closeModal();
      showToast('Template dupliqué');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'templates' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
  document.getElementById('btn-edit-template').addEventListener('click', () => {
    closeModal();
    showTemplateForm(template);
  });
  document.getElementById('btn-delete-template').addEventListener('click', async () => {
    if (!confirm('Supprimer ce template ?')) return;
    try {
      await db.deleteTemplate(template.id);
      closeModal();
      showToast('Template supprimé');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'templates' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}
