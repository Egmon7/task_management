import { getClient, isReady } from './db.js';
import { isConfigured } from './config.js';

export function isDevMode() {
  if (isConfigured()) return false;
  return localStorage.getItem('egmon_dev_mode') === 'true';
}

export function enableDevMode() {
  if (isConfigured()) return;
  localStorage.setItem('egmon_dev_mode', 'true');
}

export function disableDevMode() {
  localStorage.removeItem('egmon_dev_mode');
}

export function isAuthenticated() {
  return isReady();
}

export async function getSession() {
  const client = getClient();
  if (!client) return null;
  const { data: { session } } = await client.auth.getSession();
  return session;
}

export async function signIn(email, password) {
  const client = getClient();
  if (!client) throw new Error('Supabase non configuré');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function resetPassword(email) {
  const client = getClient();
  if (!client) throw new Error('Supabase non configuré');
  const { error } = await client.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
  if (error) throw error;
}

export async function signOut() {
  disableDevMode();
  const client = getClient();
  if (client) {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  }
}

export function onAuthStateChange(callback) {
  const client = getClient();
  if (!client) return () => {};
  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
