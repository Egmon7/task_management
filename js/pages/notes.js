import * as db from '../db.js';
import {
  escapeHtml, openModal, closeModal, showToast, emptyState, NOTE_TYPES,
} from '../utils.js';
import { icon, NOTE_ICON_MAP } from '../icons.js';

let notes = [];
let filterType = '';

function noteIcon(type, className = 'w-4 h-4 inline-block align-middle') {
  const name = NOTE_ICON_MAP[type] || 'document';
  return icon(name, className);
}

export async function render() {
  notes = await db.getTechnicalNotes();

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-new-note" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      <span class="btn-label">Nouvelle note</span>
    </button>
  `;

  const filtered = filterType
    ? notes.filter(n => n.type === filterType)
    : notes;

  return `
    <div class="flex flex-wrap gap-2 mb-6">
      <button class="tag cursor-pointer filter-note-type ${!filterType ? 'ring-1 ring-accent' : ''}" data-type="">Tous</button>
      ${Object.entries(NOTE_TYPES).map(([k, v]) => `
        <button class="tag cursor-pointer filter-note-type ${filterType === k ? 'ring-1 ring-accent' : ''}" data-type="${k}">${noteIcon(k)} ${v}</button>
      `).join('')}
    </div>

    ${filtered.length === 0
      ? emptyState('document', 'Aucune note', 'Sauvegardez vos snippets, commandes et astuces.')
      : `<div class="grid md:grid-cols-2 gap-4">
          ${filtered.map(n => noteCard(n)).join('')}
        </div>`
    }
  `;
}

function noteCard(n) {
  return `
    <div class="card hover:border-accent/30 transition-colors cursor-pointer note-card ${n.pinned ? 'pinned-card' : ''}" data-id="${n.id}">
      <div class="flex items-center gap-2 mb-2">
        <span class="shrink-0">${noteIcon(n.type, 'w-5 h-5 text-accent-hover')}</span>
        ${n.pinned ? `<span class="shrink-0 text-yellow-400">${icon('pin', 'w-4 h-4')}</span>` : ''}
        <h3 class="font-medium text-white flex-1 min-w-0 truncate">${escapeHtml(n.title)}</h3>
        <span class="tag shrink-0">${NOTE_TYPES[n.type] || n.type}</span>
        <button class="btn-ghost pin-note shrink-0 ${n.pinned ? 'text-yellow-400' : ''}" data-id="${n.id}" data-pinned="${n.pinned ? '1' : '0'}" aria-label="Épingler" onclick="event.stopPropagation()">${icon('pin', 'w-4 h-4')}</button>
      </div>
      <pre class="text-sm text-gray-400 whitespace-pre-wrap line-clamp-4 font-mono bg-surface rounded-lg p-3 overflow-hidden">${escapeHtml(n.content)}</pre>
    </div>
  `;
}

export function bindEvents() {
  document.getElementById('btn-new-note')?.addEventListener('click', () => showNoteForm());

  document.querySelectorAll('.filter-note-type').forEach(btn => {
    btn.addEventListener('click', () => {
      filterType = btn.dataset.type;
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }));
    });
  });

  document.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const note = notes.find(n => n.id === card.dataset.id);
      if (note) showNoteForm(note);
    });
  });

  document.querySelectorAll('.pin-note').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const pinned = btn.dataset.pinned !== '1';
      try {
        await db.toggleNotePin(btn.dataset.id, pinned);
        showToast(pinned ? 'Note épinglée' : 'Épinglage retiré');
        window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }));
      } catch (err) {
        showToast('Erreur : ' + err.message, 'error');
      }
    });
  });
}

function showNoteForm(note = null) {
  const isEdit = !!note;

  openModal(
    isEdit ? 'Modifier la note' : 'Nouvelle note technique',
    `
      <form id="note-form" class="space-y-4">
        <div>
          <label class="label-field">Titre *</label>
          <input class="input-field" name="title" value="${escapeHtml(note?.title || '')}" required>
        </div>
        <div>
          <label class="label-field">Type</label>
          <select class="select-field" name="type">
            ${Object.entries(NOTE_TYPES).map(([k, v]) =>
              `<option value="${k}" ${note?.type === k ? 'selected' : ''}>${v}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <label class="label-field">Contenu</label>
          <textarea class="textarea-field font-mono" name="content" rows="8">${escapeHtml(note?.content || '')}</textarea>
        </div>
        ${isEdit ? `
          <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" name="pinned" ${note?.pinned ? 'checked' : ''}>
            Épingler en haut de la liste
          </label>
        ` : ''}
      </form>
    `,
    `
      ${isEdit ? '<button class="btn-danger" id="btn-delete-note">Supprimer</button>' : ''}
      <button class="btn-secondary" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Annuler</button>
      <button class="btn-primary" id="btn-save-note">${isEdit ? 'Enregistrer' : 'Créer'}</button>
    `
  );

  document.getElementById('btn-save-note').addEventListener('click', async () => {
    const form = document.getElementById('note-form');
    const fd = new FormData(form);
    const data = {
      title: fd.get('title'),
      type: fd.get('type'),
      content: fd.get('content'),
      pinned: fd.get('pinned') === 'on',
    };

    try {
      if (isEdit) {
        await db.updateTechnicalNote(note.id, data);
        showToast('Note mise à jour');
      } else {
        await db.createTechnicalNote(data);
        showToast('Note créée');
      }
      closeModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });

  document.getElementById('btn-delete-note')?.addEventListener('click', async () => {
    if (!confirm('Supprimer cette note ?')) return;
    try {
      await db.deleteTechnicalNote(note.id);
      closeModal();
      showToast('Note supprimée');
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'notes' }));
    } catch (e) {
      showToast('Erreur : ' + e.message, 'error');
    }
  });
}
