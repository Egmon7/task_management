import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './config.js';
import { reportConnectionError, reportConnectionSuccess } from './network.js';

let client = null;

export function getClient() {
  if (!isConfigured()) return null;
  if (!client) {
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}

export function isReady() {
  return isConfigured() && getClient() !== null;
}

async function query(promise) {
  try {
    const result = await promise;
    if (result.error) {
      reportConnectionError(result.error);
      throw result.error;
    }
    reportConnectionSuccess();
    return result.data;
  } catch (err) {
    reportConnectionError(err);
    throw err;
  }
}

function touchTimestamp() {
  return new Date().toISOString();
}

// ─── Projets ───────────────────────────────────────────────

export async function getProjects() {
  return query(
    getClient().from('projects').select('*').order('updated_at', { ascending: false })
  );
}

export async function getProject(id) {
  return query(getClient().from('projects').select('*').eq('id', id).single());
}

export async function createProject(project) {
  const data = { ...project, updated_at: touchTimestamp() };
  return query(getClient().from('projects').insert(data).select().single());
}

export async function updateProject(id, updates) {
  const data = { ...updates, updated_at: touchTimestamp() };
  return query(getClient().from('projects').update(data).eq('id', id).select().single());
}

export async function deleteProject(id) {
  return query(getClient().from('projects').delete().eq('id', id));
}

export async function setActiveProject(id) {
  await query(getClient().from('projects').update({ is_active: false, updated_at: touchTimestamp() }).eq('is_active', true));
  return updateProject(id, { is_active: true });
}

export async function duplicateProject(id) {
  const project = await getProject(id);
  const logs = await getProjectLogs(id);
  const { id: _id, created_at, updated_at, is_active, ...rest } = project;
  const copy = await createProject({
    ...rest,
    name: `${project.name} (copie)`,
    is_active: false,
    status: 'en_cours',
  });
  for (const log of [...logs].reverse()) {
    await createProjectLog({ project_id: copy.id, title: log.title }, false);
  }
  return copy;
}

async function touchProject(projectId) {
  await query(
    getClient().from('projects').update({ updated_at: touchTimestamp() }).eq('id', projectId)
  );
}

// ─── Journal des modifications ─────────────────────────────

export async function getProjectLogs(projectId) {
  return query(
    getClient().from('project_logs').select('*').eq('project_id', projectId).order('created_at', { ascending: false })
  );
}

export async function createProjectLog(log, touchProjectDate = true) {
  const data = await query(getClient().from('project_logs').insert(log).select().single());
  if (touchProjectDate) await touchProject(log.project_id);
  return data;
}

export async function deleteProjectLog(id, projectId) {
  await query(getClient().from('project_logs').delete().eq('id', id));
  await touchProject(projectId);
}

// ─── Tâches ────────────────────────────────────────────────

export async function getTasks() {
  return query(
    getClient().from('tasks').select('*, projects(name)').order('created_at', { ascending: false })
  );
}

export async function createTask(task) {
  return query(getClient().from('tasks').insert(task).select().single());
}

export async function updateTask(id, updates) {
  return query(getClient().from('tasks').update(updates).eq('id', id).select().single());
}

export async function deleteTask(id) {
  return query(getClient().from('tasks').delete().eq('id', id));
}

// ─── Templates ─────────────────────────────────────────────

export async function getTemplates() {
  return query(getClient().from('templates').select('*').order('created_at', { ascending: false }));
}

export async function createTemplate(template) {
  return query(getClient().from('templates').insert(template).select().single());
}

export async function updateTemplate(id, updates) {
  return query(getClient().from('templates').update(updates).eq('id', id).select().single());
}

export async function deleteTemplate(id) {
  return query(getClient().from('templates').delete().eq('id', id));
}

export async function duplicateTemplate(id) {
  const template = await query(getClient().from('templates').select('*').eq('id', id).single());
  const { id: _id, created_at, ...rest } = template;
  return createTemplate({ ...rest, name: `${template.name} (copie)` });
}

// ─── Ressources ────────────────────────────────────────────

export async function getResources() {
  const data = await query(getClient().from('resources').select('*').order('created_at', { ascending: false }));
  return sortPinnedFirst(data);
}

export async function createResource(resource) {
  return query(getClient().from('resources').insert(resource).select().single());
}

export async function updateResource(id, updates) {
  return query(getClient().from('resources').update(updates).eq('id', id).select().single());
}

export async function deleteResource(id) {
  return query(getClient().from('resources').delete().eq('id', id));
}

export async function toggleResourcePin(id, pinned) {
  return updateResource(id, { pinned });
}

// ─── Notes techniques ────────────────────────────────────────

export async function getTechnicalNotes() {
  const data = await query(getClient().from('technical_notes').select('*').order('created_at', { ascending: false }));
  return sortPinnedFirst(data);
}

export async function createTechnicalNote(note) {
  return query(getClient().from('technical_notes').insert(note).select().single());
}

export async function updateTechnicalNote(id, updates) {
  return query(getClient().from('technical_notes').update(updates).eq('id', id).select().single());
}

export async function deleteTechnicalNote(id) {
  return query(getClient().from('technical_notes').delete().eq('id', id));
}

export async function toggleNotePin(id, pinned) {
  return updateTechnicalNote(id, { pinned });
}

// ─── Idées ─────────────────────────────────────────────────

export async function getAppIdeas() {
  return query(getClient().from('app_ideas').select('*').order('created_at', { ascending: false }));
}

export async function createAppIdea(idea) {
  return query(getClient().from('app_ideas').insert(idea).select().single());
}

export async function updateAppIdea(id, updates) {
  return query(getClient().from('app_ideas').update(updates).eq('id', id).select().single());
}

export async function deleteAppIdea(id) {
  return query(getClient().from('app_ideas').delete().eq('id', id));
}

// ─── Profil personnel (À propos) ───────────────────────────

export async function getUserProfile() {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return null;

  const rows = await query(
    client.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle()
  );
  return rows;
}

export async function saveUserProfile(profile) {
  const client = getClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const data = { ...profile, user_id: user.id, updated_at: touchTimestamp() };
  const existing = await getUserProfile();

  if (existing?.id) {
    return query(
      client.from('user_profiles').update(data).eq('id', existing.id).select().single()
    );
  }
  return query(
    client.from('user_profiles').insert(data).select().single()
  );
}

function sortPinnedFirst(items) {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}
