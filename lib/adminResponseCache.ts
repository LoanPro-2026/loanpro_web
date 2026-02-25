interface AdminCacheEntry<T = unknown> {
  data: T;
  expiresAt: number;
  tags: string[];
}

const adminCacheStore = new Map<string, AdminCacheEntry>();

export function getAdminCachedResponse<T>(key: string): T | null {
  const entry = adminCacheStore.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    adminCacheStore.delete(key);
    return null;
  }

  return entry.data as T;
}

export function setAdminCachedResponse<T>(
  key: string,
  data: T,
  ttlMs: number,
  tags: string[] = []
): void {
  adminCacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    tags,
  });
}

export function invalidateAdminCacheByTags(tags: string[]): void {
  if (!tags.length) return;
  const wanted = new Set(tags);

  for (const [key, entry] of adminCacheStore.entries()) {
    if (entry.tags.some((tag) => wanted.has(tag))) {
      adminCacheStore.delete(key);
    }
  }
}

export function cleanupAdminCache(): void {
  const now = Date.now();
  for (const [key, entry] of adminCacheStore.entries()) {
    if (entry.expiresAt <= now) {
      adminCacheStore.delete(key);
    }
  }
}

if (typeof global !== 'undefined') {
  setInterval(cleanupAdminCache, 5 * 60 * 1000);
}
