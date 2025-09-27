export type IDBValue<T = any> = T;

const DB_NAME = 'caplayground';
const STORE_NAME = 'kv';
const VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open DB'));
  });
}

export async function idbGetItem<T = any>(key: string): Promise<IDBValue<T> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => {
      const rec = req.result as { key: string; value: T } | undefined;
      resolve(rec ? (rec.value as T) : null);
    };
    req.onerror = () => reject(req.error || new Error('getItem failed'));
  });
}

export async function idbSetItem<T = any>(key: string, value: IDBValue<T>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ key, value });
    req.onsuccess = () => {
      try {
        window.dispatchEvent(new CustomEvent('caplayground-idb', { detail: { key, value } }));
      } catch {}
      resolve();
    };
    req.onerror = () => reject(req.error || new Error('setItem failed'));
  });
}

export async function idbRemoveItem(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => {
      try {
        window.dispatchEvent(new CustomEvent('caplayground-idb', { detail: { key, value: null } }));
      } catch {}
      resolve();
    };
    req.onerror = () => reject(req.error || new Error('removeItem failed'));
  });
}

export async function idbGetMany<T = any>(keys: string[]): Promise<(IDBValue<T> | null)[]> {
  return Promise.all(keys.map((k) => idbGetItem<T>(k)));
}
