import { getCachedJson, setCachedJson } from './db.ts';

export interface FetchCachedOptions {
  ttlSeconds?: number;
  forceRefresh?: boolean;
  isImmutable?: boolean;
}

export async function fetchEspnJson<T = any>(
  url: string,
  options: FetchCachedOptions = {}
): Promise<T> {
  const { ttlSeconds = 300, forceRefresh = false, isImmutable = false } = options;
  const cacheKey = `espn:${url}`;

  if (!forceRefresh) {
    const cached = getCachedJson<T>(cacheKey, false);
    if (cached !== null) {
      return cached;
    }
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`ESPN HTTP ${res.status} for ${url}`);
    }

    const data = (await res.json()) as T;
    setCachedJson(cacheKey, data, ttlSeconds, isImmutable);
    return data;
  } catch (err) {
    // Fallback to stale cache if available
    const stale = getCachedJson<T>(cacheKey, true);
    if (stale !== null) {
      return stale;
    }
    throw err;
  }
}
