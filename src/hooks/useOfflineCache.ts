/**
 * Cache de dados da API no localStorage para uso offline.
 * Salva respostas com timestamp e TTL configurável.
 */

const CACHE_PREFIX = 'jumas_offline_cache_';
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

/**
 * Salva dados no cache local.
 */
export function saveToCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };
    localStorage.setItem(getCacheKey(key), JSON.stringify(entry));
  } catch (err) {
    console.warn('[OfflineCache] Falha ao salvar cache:', key, err);
  }
}

/**
 * Recupera dados do cache local, respeitando o TTL.
 * Retorna null se não houver cache ou se estiver expirado.
 */
export function loadFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(getCacheKey(key));
    if (!raw) return null;

    const entry: CacheEntry<T> = JSON.parse(raw);
    const isExpired = Date.now() - entry.timestamp > entry.ttl;

    if (isExpired) {
      localStorage.removeItem(getCacheKey(key));
      return null;
    }

    return entry.data;
  } catch (err) {
    console.warn('[OfflineCache] Falha ao ler cache:', key, err);
    return null;
  }
}

/**
 * Remove um item do cache.
 */
export function clearCache(key: string): void {
  localStorage.removeItem(getCacheKey(key));
}

/**
 * Wrapper para fetch que salva automaticamente a resposta no cache.
 * Se offline ou se o fetch falhar, retorna dados do cache.
 *
 * @param key - Chave única para identificar este dado no cache
 * @param fetchFn - Função que retorna a Promise<T> do fetch
 * @param ttlMs - Tempo de vida do cache (padrão: 7 dias)
 */
export async function fetchWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<{ data: T | null; fromCache: boolean; error?: string }> {
  if (!navigator.onLine) {
    const cached = loadFromCache<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    return { data: null, fromCache: false, error: 'Sem conexão e sem dados em cache' };
  }

  try {
    const data = await fetchFn();
    saveToCache(key, data, ttlMs);
    return { data, fromCache: false };
  } catch (err) {
    // Rede falhou mesmo com navigator.onLine = true (pode acontecer)
    const cached = loadFromCache<T>(key);
    if (cached !== null) {
      console.warn('[OfflineCache] Rede falhou, usando cache para:', key);
      return { data: cached, fromCache: true };
    }
    return { data: null, fromCache: false, error: 'Erro de rede sem cache disponível' };
  }
}
