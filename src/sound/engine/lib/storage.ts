/**
 * Wellness Waves — Safe Local Storage Manager
 * Resilient against private browsing blocks, quota limits, and version migrations.
 */

const STORAGE_PREFIX = 'wellness_waves_';
const SCHEMA_VERSION = 1;

export interface StorageContainer<T> {
  version: number;
  data: T;
  updatedAt: number;
}

type ChangeListener = (key: string) => void;
const listeners = new Set<ChangeListener>();

export const Storage = {
  /** Called after every successful set(); used by account sync. */
  onChange(l: ChangeListener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },

  /** When a key was last written in this browser (ms), or 0. */
  updatedAt(key: string): number {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? (JSON.parse(raw) as StorageContainer<unknown>).updatedAt ?? 0 : 0;
    } catch {
      return 0;
    }
  },

  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined' || !window.localStorage) {
      return defaultValue;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
      if (!raw) return defaultValue;
      const parsed: StorageContainer<T> = JSON.parse(raw);
      if (parsed.version !== SCHEMA_VERSION) {
        // Migration hook if needed in future versions
        return parsed.data ?? defaultValue;
      }
      return parsed.data;
    } catch (e) {
      console.warn(`[Storage] Failed to read key: ${key}`, e);
      return defaultValue;
    }
  },

  set<T>(key: string, data: T): boolean {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    try {
      const container: StorageContainer<T> = {
        version: SCHEMA_VERSION,
        data,
        updatedAt: Date.now(),
      };
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(container));
      listeners.forEach((l) => l(key));
      return true;
    } catch (e) {
      console.warn(`[Storage] Failed to save key: ${key}`, e);
      return false;
    }
  },

  remove(key: string): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.removeItem(STORAGE_PREFIX + key);
    } catch {
      // Ignored
    }
  },

  clearAll(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      Object.keys(window.localStorage).forEach((k) => {
        if (k.startsWith(STORAGE_PREFIX)) {
          window.localStorage.removeItem(k);
        }
      });
    } catch {
      // Ignored
    }
  },
};
