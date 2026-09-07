import { migrateState, type PersistedState } from '../app-state/app-state';

const DATABASE_NAME = 'nota-local';
const DATABASE_VERSION = 1;
const STORE_NAME = 'app-state';
const STATE_KEY = 'current';

type StoredEnvelope = {
  schemaVersion: 1;
  savedAt: number;
  state: PersistedState;
};

type LoadedValue = { state: PersistedState; savedAt: number } | null;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to open local storage'));
  });
}

function unwrap(value: unknown): LoadedValue {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<StoredEnvelope> & Partial<PersistedState>;
  if (candidate.state && typeof candidate.savedAt === 'number') {
    return { state: migrateState(candidate.state), savedAt: candidate.savedAt };
  }
  // Accept the pre-envelope schema so normal upgrades never lose progress.
  return { state: migrateState(value), savedAt: 0 };
}

function readLocalStorage(): LoadedValue {
  try {
    const value = localStorage.getItem('nota-state');
    return value ? unwrap(JSON.parse(value)) : null;
  } catch {
    return null;
  }
}

export async function loadPersistedState(): Promise<PersistedState | null> {
  let indexed: LoadedValue = null;
  try {
    const database = await openDatabase();
    const value = await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readonly')
        .objectStore(STORE_NAME)
        .get(STATE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB request failed'));
    });
    database.close();
    indexed = unwrap(value);
  } catch {
    // The localStorage copy below is the fallback if IDB is blocked or unavailable.
  }
  const local = readLocalStorage();
  if (!indexed && !local) return null;
  const selected =
    indexed && local && local.savedAt > indexed.savedAt
      ? local
      : (indexed ?? local);
  return selected?.state ?? null;
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  const envelope: StoredEnvelope = {
    schemaVersion: 1,
    savedAt: Date.now(),
    state,
  };
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME)
        .put(envelope, STATE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(request.error ?? new Error('IndexedDB request failed'));
    });
    database.close();
  } catch {
    // IDB can be disabled in private browsing; the local copy remains usable.
  }
  try {
    localStorage.setItem('nota-state', JSON.stringify(envelope));
  } catch {
    // Private browsing can disable both storage APIs. The current session remains usable.
  }
}
