/**
 * Authentication module
 */
import { supabase, SUPABASE_CONFIGURED } from './supabase.js';

export async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

export async function getUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export async function signInWithEmail(email, password, isSignUp = false) {
  if (!supabase) return { user: null, error: new Error('Supabase not configured') };
  const fn = isSignUp
    ? supabase.auth.signUp.bind(supabase.auth)
    : supabase.auth.signInWithPassword.bind(supabase.auth);
  const { data, error } = await fn({ email, password });
  return { user: data?.user ?? null, error };
}

export async function resetPassword(email) {
  if (!supabase) return { error: new Error('Supabase not configured') };
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + window.location.pathname,
  });
}

export async function signInWithGitHub() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.href },
  });
}

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.href },
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback({ event, session, user: session?.user ?? null });
  });
  return () => data.subscription.unsubscribe();
}

export { SUPABASE_CONFIGURED };

