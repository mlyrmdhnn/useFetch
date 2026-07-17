export interface CacheEntry<T = any> {
  data: T;
  desc?: string;
  timestamp?: number;
  lastUpdated?: string;
}

export const getCache = <T = any>(key: string): T | null => {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    const entry: CacheEntry<T> = JSON.parse(stored);
    return entry.data;
  } catch (error) {
    console.warn(`[Cache] Failed to parse cache for key: ${key}`, error);
    sessionStorage.removeItem(key);
    return null;
  }
};

export const setCache = <T = any>(key: string, data: T, desc: string = "") => {
  try {
    if (data === undefined) {
      sessionStorage.removeItem(key);
      return;
    }

    const entry: CacheEntry<T> = {
      data,
      desc: desc || `Cache for ${key}`,
      timestamp: Date.now(),
      lastUpdated: new Date().toLocaleDateString(),
    };

    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.warn(`[Cache] Failed to set cache for key: ${key}`, error);
  }
};

export const isEqualCache = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;

  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (error) {
    console.warn("[Cache] isEqualCache failed", error);
    return false;
  }
};

export const removeCache = (key: string) => {
  sessionStorage.removeItem(key);
};

export const clearCacheByKey = (cacheKey: string) => {
  const keys: string[] = [];

  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);

    if (key?.includes(cacheKey)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => {
    sessionStorage.removeItem(key);
  });
};
