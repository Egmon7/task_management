import * as db from '../db.js';
import {
  escapeHtml, showToast, formatDate, imagePreviewField, readDocumentFile,
  openModal, closeModal, refreshPage,
} from '../utils.js';
import { icon } from '../icons.js';

let profile = null;
let pendingImages = {};

const GENDERS = [
  { value: '', label: '— Non renseigné —' },
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
];

const IMAGE_KEYS = ['cv_image', 'voter_card_image', 'diploma_image', 'transcript_image'];

export async function render() {
  try {
    profile = await db.getUserProfile();
  } catch {
    profile = null;
  }

  const p = profile || {};

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-edit-profile" class="btn-primary">
      ${icon('pencil', 'w-4 h-4')}
      <span class="btn-label">Modifier les informations</span>
    </button>
  `;

  return `
    <div class="page-inner max-w-3xl">
      <p class="text-sm text-gray-400 mb-6">
        Votre espace personnel — identité, parcours et objectifs.
      </p>

      ${!hasAnyData(p) ? `
        <div class="card text-center py-10 mb-6">
          <p class="text-gray-400 text-sm mb-4">Aucune information renseignée pour le moment.</p>
          <button type="button" id="btn-edit-profile-empty" class="btn-primary mx-auto">
            ${icon('pencil', 'w-4 h-4')}
            Modifier les informations
          </button>
        </div>
      ` : ''}

      <div class="space-y-6">
        <section class="about-section card">
          <h3 class="about-section-title">Identité</h3>
          <div class="profile-display-grid">
            ${displayField('Nom', p.last_name)}
            ${displayField('Post-nom', p.post_name)}
            ${displayField('Prénom', p.first_name)}
            ${displayField('Sexe', genderLabel(p.gender))}
            ${displayField('Date de naissance', p.birth_date ? formatDate(p.birth_date) : '')}
          </div>
        </section>

        <section class="about-section card">
          <h3 class="about-section-title">Coordonnées</h3>
          <div class="profile-display-grid">
            ${displayField('Adresse', p.address, true)}
            ${displayField('Pays', p.country)}
            ${displayField('Téléphone', p.phone)}
          </div>
        </section>

        <section class="about-section card">
          <h3 class="about-section-title">Parcours & objectifs</h3>
          <div class="space-y-4">
            ${displayField('Niveau d\'étude', p.education_level, true)}
            ${displayField('Objectifs', p.objectives, true)}
            ${displayLink('Portfolio', p.portfolio_url)}
          </div>
        </section>

        <section class="about-section card">
          <h3 class="about-section-title">Documents</h3>
          <div class="profile-doc-grid">
            ${displayDocument('CV', p.cv_image)}
            ${displayDocument('Carte d\'électeur', p.voter_card_image)}
            ${displayDocument('Diplôme', p.diploma_image)}
            ${displayDocument('Relevés de notes', p.transcript_image)}
          </div>
        </section>

        ${p.updated_at ? `<p class="text-xs text-gray-600">Dernière mise à jour : ${formatDate(p.updated_at)}</p>` : ''}
      </div>
    </div>
  `;
}

function hasAnyData(p) {
  return IMAGE_KEYS.some(k => p[k]) ||
    p.last_name || p.post_name || p.first_name || p.gender || p.birth_date ||
    p.address || p.country || p.phone || p.education_level || p.objectives || p.portfolio_url;
}

function genderLabel(value) {
  return GENDERS.find(g => g.value === value)?.label?.replace('— Non renseigné —', '') || '';
}

function displayField(label, value, fullWidth = false) {
  const empty = !value;
  return `
    <div class="${fullWidth ? 'sm:col-span-2' : ''}">
      <span class="profile-field-label">${label}</span>
      <p class="profile-field-value ${empty ? 'profile-field-value--empty' : ''}">${empty ? 'Non renseigné' : escapeHtml(value)}</p>
    </div>
  `;
}

function displayLink(label, url) {
  if (!url) {
    return displayField(label, '');
  }
  return `
    <div>
      <span class="profile-field-label">${label}</span>
      <p><a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="text-accent-hover text-sm break-all">${escapeHtml(url)}</a></p>
    </div>
  `;
}

function displayDocument(label, url) {
  const isPdf = url?.startsWith('data:application/pdf');
  return `
    <div class="profile-doc-card">
      <span class="profile-field-label">${label}</span>
      ${!url
        ? '<p class="profile-field-value--empty text-xs">Non renseigné</p>'
        : isPdf
          ? `<a href="${url}" download="cv.pdf" class="btn-secondary text-xs">Télécharger</a>`
          : `<img src="${url}" alt="${escapeHtml(label)}">`
      }
    </div>
  `;
}

export function bindEvents() {
  document.getElementById('btn-edit-profile')?.addEventListener('click', openEditModal);
  document.getElementById('btn-edit-profile-empty')?.addEventListener('click', openEditModal);
}

function openEditModal() {
  pendingImages = {};
  const p = profile || {};
  const birthDate = p.birth_date ? p.birth_date.split('T')[0] : '';

  openModal(
    'Modifier les informations',
    `
      <form id="profile-form" class="space-y-6">
        <div>
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Identité</h4>
          <div class="grid sm:grid-cols-2 gap-3">
            <div>
              <label class="label-field">Nom</label>
              <input class="input-field" name="last_name" value="${escapeHtml(p.last_name || '')}">
            </div>
            <div>
              <label class="label-field">Post-nom</label>
              <input class="input-field" name="post_name" value="${escapeHtml(p.post_name || '')}">
            </div>
            <div>
              <label class="label-field">Prénom</label>
              <input class="input-field" name="first_name" value="${escapeHtml(p.first_name || '')}">
            </div>
            <div>
              <label class="label-field">Sexe</label>
              <select class="select-field" name="gender">
                ${GENDERS.map(g => `<option value="${g.value}" ${p.gender === g.value ? 'selected' : ''}>${g.label}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="label-field">Date de naissance</label>
              <input class="input-field input-field-compact" name="birth_date" type="date" value="${birthDate}">
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Coordonnées</h4>
          <div class="grid sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="label-field">Adresse</label>
              <input class="input-field" name="address" value="${escapeHtml(p.address || '')}">
            </div>
            <div>
              <label class="label-field">Pays</label>
              <input class="input-field" name="country" value="${escapeHtml(p.country || '')}">
            </div>
            <div>
              <label class="label-field">Numéro de téléphone</label>
              <input class="input-field" name="phone" type="tel" value="${escapeHtml(p.phone || '')}" placeholder="+243 …">
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Parcours & objectifs</h4>
          <div class="space-y-3">
            <div>
              <label class="label-field">Niveau d'étude</label>
              <input class="input-field" name="education_level" value="${escapeHtml(p.education_level || '')}" placeholder="Ex: Licence en informatique">
            </div>
            <div>
              <label class="label-field">Objectifs</label>
              <textarea class="textarea-field" name="objectives" rows="3" placeholder="Vos ambitions…">${escapeHtml(p.objectives || '')}</textarea>
            </div>
            <div>
              <label class="label-field">Portfolio</label>
              <input class="input-field" name="portfolio_url" type="url" value="${escapeHtml(p.portfolio_url || '')}" placeholder="https://mon-portfolio.com">
            </div>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documents</h4>
          <p class="text-xs text-gray-500 mb-3">Images compressées ou PDF (max 2 Mo). Stockage privé.</p>
          <div class="space-y-4">
            ${imagePreviewField('cv_image', 'CV (image ou PDF)', p.cv_image || '', 'image/*,.pdf')}
            ${imagePreviewField('voter_card_image', 'Photo carte d\'électeur', p.voter_card_image || '')}
            ${imagePreviewField('diploma_image', 'Photo du diplôme', p.diploma_image || '')}
            ${imagePreviewField('transcript_image', 'Photo des relevés de notes', p.transcript_image || '')}
          </div>
        </div>
      </form>
    `,
    `
      <button class="btn-secondary" id="btn-cancel-profile">Annuler</button>
      <button class="btn-primary" id="btn-save-profile">Enregistrer</button>
    `
  );

  document.getElementById('modal')?.classList.add('modal-panel--wide');
  bindModalPhotoEvents();
  document.getElementById('btn-cancel-profile')?.addEventListener('click', closeModal);
  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);
}

function bindModalPhotoEvents() {
  document.querySelectorAll('.photo-input').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      const target = input.dataset.target;
      if (!file || !target) return;
      try {
        const dataUrl = await readDocumentFile(file);
        pendingImages[target] = dataUrl;
        const preview = document.getElementById(`${target}-preview`);
        const isPdf = dataUrl.startsWith('data:application/pdf');
        if (preview) {
          preview.classList.remove('hidden');
          preview.innerHTML = `
            ${isPdf
              ? `<a href="${dataUrl}" download="document.pdf" class="btn-secondary text-xs inline-flex">Aperçu PDF</a>`
              : `<img src="${dataUrl}" alt="Aperçu">`
            }
            <button type="button" class="btn-ghost text-xs text-red-400 mt-1 block remove-photo" data-target="${target}">Supprimer</button>
          `;
          bindRemovePhoto(preview.querySelector('.remove-photo'));
        }
      } catch (e) {
        showToast(e.message, 'error');
        input.value = '';
      }
    });
  });

  document.querySelectorAll('.remove-photo').forEach(btn => bindRemovePhoto(btn));
}

function bindRemovePhoto(btn) {
  if (!btn) return;
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    pendingImages[target] = '';
    const preview = document.getElementById(`${target}-preview`);
    const fileInput = document.getElementById(`${target}-file`);
    if (preview) {
      preview.classList.add('hidden');
      preview.innerHTML = '';
    }
    if (fileInput) fileInput.value = '';
  });
}

async function saveProfile() {
  const form = document.getElementById('profile-form');
  const fd = new FormData(form);

  const data = {
    last_name: fd.get('last_name') || '',
    post_name: fd.get('post_name') || '',
    first_name: fd.get('first_name') || '',
    gender: fd.get('gender') || '',
    birth_date: fd.get('birth_date') || null,
    address: fd.get('address') || '',
    country: fd.get('country') || '',
    phone: fd.get('phone') || '',
    education_level: fd.get('education_level') || '',
    objectives: fd.get('objectives') || '',
    portfolio_url: fd.get('portfolio_url') || '',
  };

  for (const key of IMAGE_KEYS) {
    if (key in pendingImages) {
      data[key] = pendingImages[key];
    } else if (profile?.[key]) {
      data[key] = profile[key];
    } else {
      data[key] = '';
    }
  }

  try {
    await db.saveUserProfile(data);
    closeModal();
    showToast('Profil enregistré');
    pendingImages = {};
    refreshPage('about');
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error');
  }
}
