import * as db from '../db.js';
import {
  escapeHtml, showToast, formatDate, imagePreviewField, readImageFile, refreshPage,
} from '../utils.js';

let profile = null;
let pendingImages = {};

const GENDERS = [
  { value: '', label: '— Non renseigné —' },
  { value: 'homme', label: 'Homme' },
  { value: 'femme', label: 'Femme' },
  { value: 'autre', label: 'Autre' },
];

export async function render() {
  try {
    profile = await db.getUserProfile();
  } catch {
    profile = null;
  }

  const p = profile || {};
  const birthDate = p.birth_date ? p.birth_date.split('T')[0] : '';

  document.getElementById('header-actions').innerHTML = `
    <button id="btn-save-profile" class="btn-primary">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      <span class="btn-label">Enregistrer</span>
    </button>
  `;

  return `
    <div class="page-inner">
      <p class="text-sm text-gray-400 mb-6">
        Votre espace personnel — identité, parcours et objectifs pour vous présenter et vous construire.
      </p>

      <form id="profile-form" class="space-y-8 max-w-3xl">
        <section class="about-section card">
          <h3 class="about-section-title">Identité</h3>
          <div class="grid sm:grid-cols-2 gap-4">
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
        </section>

        <section class="about-section card">
          <h3 class="about-section-title">Coordonnées</h3>
          <div class="grid sm:grid-cols-2 gap-4">
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
        </section>

        <section class="about-section card">
          <h3 class="about-section-title">Documents & photos</h3>
          <p class="text-xs text-gray-500 mb-4">Les images sont compressées et stockées de façon privée dans votre compte.</p>
          <div class="space-y-4">
            ${imagePreviewField('voter_card_image', 'Photo carte d\'électeur', p.voter_card_image || '')}
            ${imagePreviewField('diploma_image', 'Photo du diplôme', p.diploma_image || '')}
            ${imagePreviewField('transcript_image', 'Photo des relevés de notes', p.transcript_image || '')}
          </div>
        </section>

        <section class="about-section card">
          <h3 class="about-section-title">Parcours & objectifs</h3>
          <div class="space-y-4">
            <div>
              <label class="label-field">Niveau d'étude</label>
              <input class="input-field" name="education_level" value="${escapeHtml(p.education_level || '')}" placeholder="Ex: Licence en informatique">
            </div>
            <div>
              <label class="label-field">Objectifs</label>
              <textarea class="textarea-field" name="objectives" rows="4" placeholder="Vos ambitions professionnelles et personnelles…">${escapeHtml(p.objectives || '')}</textarea>
            </div>
            <div>
              <label class="label-field">Portfolio</label>
              <input class="input-field" name="portfolio_url" type="url" value="${escapeHtml(p.portfolio_url || '')}" placeholder="https://mon-portfolio.com">
            </div>
          </div>
        </section>

        ${p.updated_at ? `<p class="text-xs text-gray-600">Dernière mise à jour : ${formatDate(p.updated_at)}</p>` : ''}
      </form>
    </div>
  `;
}

export function bindEvents() {
  pendingImages = {};

  document.querySelectorAll('.photo-input').forEach(input => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      const target = input.dataset.target;
      if (!file || !target) return;
      try {
        const dataUrl = await readImageFile(file);
        pendingImages[target] = dataUrl;
        const preview = document.getElementById(`${target}-preview`);
        if (preview) {
          preview.classList.remove('hidden');
          preview.innerHTML = `
            <img src="${dataUrl}" alt="Aperçu">
            <button type="button" class="btn-ghost text-xs text-red-400 mt-1 remove-photo" data-target="${target}">Supprimer la photo</button>
          `;
          bindRemovePhoto(preview.querySelector('.remove-photo'));
        }
        showToast('Photo chargée — pensez à enregistrer');
      } catch (e) {
        showToast(e.message, 'error');
        input.value = '';
      }
    });
  });

  document.querySelectorAll('.remove-photo').forEach(btn => bindRemovePhoto(btn));

  document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);
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

  for (const key of ['voter_card_image', 'diploma_image', 'transcript_image']) {
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
    showToast('Profil enregistré');
    pendingImages = {};
    refreshPage('about');
  } catch (e) {
    showToast('Erreur : ' + e.message, 'error');
  }
}
