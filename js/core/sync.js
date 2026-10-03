/**
 * Cloud sync — pushes the local state to Supabase and pulls it back on login.
 */
import { supabase, SUPABASE_CONFIGURED } from './supabase.js';
import { getState, replaceState } from './store.js';
import { exportPayload, validateBackup } from './store.js';

let _syncEnabled = false;
let _userId = null;
let _pushTimer = null;
let _status = 'idle';
const _listeners = new Set();

function setStatus(s) {
  _status = s;
  _listeners.forEach((fn) => fn(s));
}

export const getSyncStatus = () => _status;

export function onSyncStatus(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export async function pushNow() {
  if (!_syncEnabled || !supabase || !_userId) return;
  clearTimeout(_pushTimer);
  setStatus('syncing');
  try {
    const payload = exportPayload(getState());
    const { error } = await supabase
      .from('user_data')
      .upsert({ id: _userId, state: JSON.parse(payload), updated_at: new Date().toISOString() });
    if (error) throw error;
    setStatus('ok');
    console.info('[sync] pushed to cloud');
  } catch (error) {
    setStatus('error');
    console.warn('[sync] push failed', error);
  }
}

export function schedulePush(delayMs = 2000) {
  if (!_syncEnabled) return;
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(pushNow, delayMs);
}

export async function pullFromCloud() {
  if (!supabase || !_userId) return;
  setStatus('syncing');
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('state, updated_at')
      .eq('id', _userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.state) {
      await pushNow();
      return;
    }

    const cloudUpdated = new Date(data.updated_at).getTime();
    const localUpdated = new Date(getState().updatedAt || 0).getTime();

    if (cloudUpdated > localUpdated) {
      const payload = { ...data.state, _exportedAt: data.updated_at, _version: 4 };
      const check = validateBackup(payload);
      if (check.ok) {
        replaceState(payload);
        console.info('[sync] pulled newer state from cloud');
      } else {
        console.warn('[sync] cloud state failed validation, keeping local', check.reason);
      }
    } else {
      await pushNow();
    }
    setStatus('ok');
  } catch (error) {
    setStatus('error');
    console.warn('[sync] pull failed', error);
  }
}

export async function enableSync(userId) {
  _userId = userId;
  _syncEnabled = true;
  setStatus('syncing');
  await pullFromCloud();
}

export function disableSync() {
  _syncEnabled = false;
  _userId = null;
  clearTimeout(_pushTimer);
  setStatus('idle');
}

export { SUPABASE_CONFIGURED };

