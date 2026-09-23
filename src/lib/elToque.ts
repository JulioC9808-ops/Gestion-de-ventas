/**
 * Módulo de Tasas de cambio elTOQUE para PC y Android.
 * - Endpoint: https://tasas.eltoque.com/v1/trmi
 * - Autenticación: Bearer token SOLO desde la variable de entorno VITE_ELTOQUE_API_KEY
 *   (inyectada al compilar desde el Secret de GitHub).
 * - SIN TASAS INVENTADAS: si no hay datos no se muestra ningún número.
 *   Primera apertura (sin caché) consulta la API inmediatamente.
 *   Con caché: la API solo se consulta en su turno (10 AM / 10 PM), máx. 2/día.
 * - Deltas ▲/▼: al guardar un snapshot OFICIAL se archiva el anterior oficial.
 */
import { Capacitor, CapacitorHttp } from '@capacitor/core';

// v2: ignora la caché vieja de versiones anteriores (fuerza primera consulta real)
export const ELTOQUE_CACHE_KEY = 'eltoque_rates_cache_v2';
export const ELTOQUE_PREVIOUS_KEY = 'eltoque_rates_previous_v2';
export const ELTOQUE_SCHEDULE_KEY = 'eltoque_rates_schedule';

const API_URL = 'https://tasas.eltoque.com/v1/trmi';
const FETCH_TIMEOUT_MS = 10000;

export interface CurrencyRate {
  code: string;
  name?: string;
  buy?: number;
  sell?: number;
  value: number;
}

export interface ElToqueSnapshot {
  data: CurrencyRate[];
  fetchedAt: string; // ISO string
  lastUpdateDate?: string;
  source?: string;
}

export interface ElToqueFetchResult {
  snapshot: ElToqueSnapshot | null;
  status: 'online' | 'cached' | 'no_key' | 'error';
  message?: string;
}

export interface RateDelta {
  diff: number;
  direction: 'up' | 'down';
}

export const CURRENCY_NAMES: Record<string, string> = {
  USD: 'Dólar estadounidense',
  EUR: 'Euro',
  MLC: 'Moneda Libremente Convertible',
  ZELLE: 'Dólar Zelle',
  USDT: 'Tether USD',
  MXN: 'Peso mexicano',
  CHF: 'Franco suizo',
  CAD: 'Dólar canadiense',
  GBP: 'Libra esterlina',
  BRL: 'Real brasileño',
  COP: 'Peso colombiano',
  CLP: 'Peso chileno',
  CUP: 'Peso cubano',
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  TRX: 'Tron',
};

/** Código de país ISO para las banderas SVG ('' = sin bandera de país). */
export const CURRENCY_COUNTRY_CODES: Record<string, string> = {
  USD: 'US', ZELLE: 'US', EUR: 'EU', MLC: 'CU', CUP: 'CU', MXN: 'MX',
  CAD: 'CA', CHF: 'CH', GBP: 'GB', BRL: 'BR', COP: 'CO', CLP: 'CL',
  ARS: 'AR', VES: 'VE', PEN: 'PE', DOP: 'DO', PAB: 'PA', CRC: 'CR',
  GTQ: 'GT', HNL: 'HN', NIO: 'NI', SVC: 'SV', PYG: 'PY', UYU: 'UY',
  BOB: 'BO', JPY: 'JP', CNY: 'CN', KRW: 'KR', RUB: 'RU', TRY: 'TR',
  INR: 'IN', ILS: 'IL', AED: 'AE', AUD: 'AU', NZD: 'NZ', SEK: 'SE',
  NOK: 'NO', DKK: 'DK', PLN: 'PL',
};

/** Emoji de respaldo para monedas sin bandera de país (cripto, etc.) */
export const CURRENCY_EMOJI_FALLBACK: Record<string, string> = {
  USDT: '💵', BTC: '₿', ETH: 'Ξ', TRX: '⚡',
};

/** Clave de API: SOLO la variable de entorno inyectada al compilar. */
export function getElToqueApiKey(): string {
  return (import.meta.env.VITE_ELTOQUE_API_KEY as string | undefined)?.trim() || '';
}

function readSnapshotFrom(key: string): ElToqueSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      Array.isArray((parsed as ElToqueSnapshot).data) &&
      'fetchedAt' in parsed &&
      typeof (parsed as ElToqueSnapshot).fetchedAt === 'string'
    ) {
      return parsed as ElToqueSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

export function loadCachedRates(): ElToqueSnapshot | null {
  return readSnapshotFrom(ELTOQUE_CACHE_KEY);
}

export function loadPreviousRates(): ElToqueSnapshot | null {
  return readSnapshotFrom(ELTOQUE_PREVIOUS_KEY);
}

/**
 * Guarda el snapshot en caché. Si el actual y el nuevo son OFICIALES (source elTOQUE)
 * y difieren, el actual se archiva como "previous" para los deltas ▲/▼.
 */
export function saveRatesToCache(snapshot: ElToqueSnapshot): void {
  try {
    if (!snapshot || !Array.isArray(snapshot.data) || typeof snapshot.fetchedAt !== 'string') return;
    const current = loadCachedRates();
    if (
      current &&
      current.source === 'elTOQUE' &&
      snapshot.source === 'elTOQUE' &&
      current.fetchedAt !== snapshot.fetchedAt
    ) {
      localStorage.setItem(ELTOQUE_PREVIOUS_KEY, JSON.stringify(current));
    }
    localStorage.setItem(ELTOQUE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Silencioso
  }
}

/** Delta de una moneda respecto al snapshot oficial anterior. */
export function getRateDelta(code: string, current: ElToqueSnapshot): RateDelta | null {
  if (current.source !== 'elTOQUE') return null;
  const prev = loadPreviousRates();
  if (!prev || prev.source !== 'elTOQUE') return null;
  const r = current.data.find(x => x.code === code);
  const p = prev.data.find(x => x.code === code);
  if (!r || !p) return null;
  const a = r.sell ?? r.value;
  const b = p.sell ?? p.value;
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  const diff = Math.round((a - b) * 100) / 100;
  if (!isFinite(diff) || diff === 0) return null;
  return { diff, direction: diff > 0 ? 'up' : 'down' };
}

function parseApiResponse(json: unknown): CurrencyRate[] {
  if (!json || typeof json !== 'object') {
    throw new Error('Formato de respuesta inválido');
  }
  const payload = json as Record<string, unknown>;
  const ratesObj = (
    payload.tasas ||
    payload.trmi ||
    payload.trm ||
    payload.rates ||
    payload.data ||
    payload
  ) as Record<string, unknown>;

  const list: CurrencyRate[] = [];
  for (const [key, val] of Object.entries(ratesObj)) {
    if (key === 'date' || key === 'fecha' || key === 'timestamp' || key === 'last_update') continue;
    const code = key.toUpperCase();
    if (typeof val === 'number') {
      if (isFinite(val) && val > 0) {
        list.push({ code, name: CURRENCY_NAMES[code] || code, value: val, sell: val });
      }
    } else if (val && typeof val === 'object') {
      const o = val as Record<string, unknown>;
      const buyRaw = o.buy ?? o.compra ?? o.buy_price ?? o.compra_price;
      const sellRaw = o.sell ?? o.venta ?? o.sell_price ?? o.venta_price ?? o.price ?? o.valor;
      const buy = typeof buyRaw === 'number' ? buyRaw : typeof buyRaw === 'string' ? parseFloat(buyRaw) : undefined;
      const sell = typeof sellRaw === 'number' ? sellRaw : typeof sellRaw === 'string' ? parseFloat(sellRaw) : undefined;
      const validBuy = buy !== undefined && isFinite(buy) && buy > 0 ? buy : undefined;
      const validSell = sell !== undefined && isFinite(sell) && sell > 0 ? sell : undefined;
      const value = validSell ?? validBuy;
      if (value !== undefined) {
        list.push({
          code,
          name: CURRENCY_NAMES[code] || (typeof o.name === 'string' ? o.name : code),
          buy: validBuy,
          sell: validSell,
          value,
        });
      }
    }
  }
  if (list.length === 0) {
    throw new Error('No se encontraron tasas de cambio en la respuesta');
  }
  const priority = ['USD', 'EUR', 'MLC', 'ZELLE', 'USDT', 'MXN', 'CAD', 'CHF', 'GBP'];
  list.sort((a, b) => {
    const idxA = priority.indexOf(a.code);
    const idxB = priority.indexOf(b.code);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.code.localeCompare(b.code);
  });
  return list;
}

let inFlightPromise: Promise<ElToqueSnapshot> | null = null;

/** Petición a la API de elTOQUE (CapacitorHttp en Android, Fetch en Web/Electron) */
export async function fetchTasas(): Promise<ElToqueSnapshot> {
  const apiKey = getElToqueApiKey();
  if (!apiKey) {
    throw new Error('API key de tasas no configurada en este build');
  }
  if (inFlightPromise) {
    return inFlightPromise;
  }
  inFlightPromise = (async () => {
    try {
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      };
      if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.get({
          url: `${API_URL}?t=${Date.now()}`,
          headers,
          connectTimeout: FETCH_TIMEOUT_MS,
          readTimeout: FETCH_TIMEOUT_MS,
        });
        if (res.status === 401 || res.status === 403) throw new Error('API key de elTOQUE no válida');
        if (res.status === 429) throw new Error('Límite de peticiones alcanzado');
        if (res.status !== 200) throw new Error(`Error de servidor (${res.status})`);
        const json = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
        const rates = parseApiResponse(json);
        const snapshot: ElToqueSnapshot = {
          data: rates,
          fetchedAt: new Date().toISOString(),
          lastUpdateDate: json?.date || json?.last_update || undefined,
          source: 'elTOQUE',
        };
        saveRatesToCache(snapshot);
        recordScheduledSync();
        return snapshot;
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const response = await fetch(`${API_URL}?t=${Date.now()}`, {
          method: 'GET',
          headers,
          signal: controller.signal,
          cache: 'no-store',
        });
        if (response.status === 401 || response.status === 403) throw new Error('API key de elTOQUE no válida');
        if (response.status === 429) throw new Error('Límite de peticiones alcanzado');
        if (!response.ok) throw new Error(`Error de conexión (${response.status})`);
        const json = await response.json();
        const rates = parseApiResponse(json);
        const snapshot: ElToqueSnapshot = {
          data: rates,
          fetchedAt: new Date().toISOString(),
          lastUpdateDate: json?.date || json?.last_update || undefined,
          source: 'elTOQUE',
        };
        saveRatesToCache(snapshot);
        recordScheduledSync();
        return snapshot;
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new Error('Tiempo de espera agotado al consultar tasas');
        }
        throw new Error('No se pudo conectar con el servidor de tasas');
      } finally {
        clearTimeout(timeoutId);
      }
    } finally {
      inFlightPromise = null;
    }
  })();
  return inFlightPromise;
}

function recordScheduledSync(): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const hour = new Date().getHours();
    const period = hour >= 10 && hour < 22 ? 'morning' : 'evening';
    localStorage.setItem(ELTOQUE_SCHEDULE_KEY, JSON.stringify({ date: today, period, time: Date.now() }));
  } catch {
    // Silencioso
  }
}

/** ¿Corresponde el turno? matutino: desde 10 AM; nocturno: desde 10 PM. */
export function isScheduledUpdateDue(): boolean {
  try {
    const hour = new Date().getHours();
    const today = new Date().toISOString().slice(0, 10);
    const raw = localStorage.getItem(ELTOQUE_SCHEDULE_KEY);
    const currentPeriod = hour >= 10 && hour < 22 ? 'morning' : 'evening';
    if (!raw) return true;
    const parsed = JSON.parse(raw) as { date: string; period: string; time: number };
    if (parsed.date !== today) return true;
    if (parsed.period !== currentPeriod) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Obtiene las tasas:
 * - SIN caché (primera vez): consulta la API inmediatamente. Si falla → error, sin números.
 * - CON caché: solo consulta en turno (10 AM / 10 PM); fuera de turno devuelve la caché.
 */
export async function getElToqueRates(): Promise<ElToqueFetchResult> {
  const cached = loadCachedRates();
  const apiKey = getElToqueApiKey();

  // ---- Primera vez (sin caché): la API se consulta SÍ o SÍ ----
  if (!cached) {
    if (!apiKey) {
      return {
        snapshot: null,
        status: 'no_key',
        message: 'Tasas no disponibles: este build no tiene la API key de elTOQUE configurada',
      };
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        snapshot: null,
        status: 'error',
        message: 'Sin conexión a internet — las tasas se cargarán al reconectarte',
      };
    }
    try {
      const fresh = await fetchTasas();
      return { snapshot: fresh, status: 'online' };
    } catch (err) {
      return {
        snapshot: null,
        status: 'error',
        message: err instanceof Error ? err.message : 'Error al consultar las tasas',
      };
    }
  }

  // ---- Con caché: regla de turnos ----
  if (!isScheduledUpdateDue()) {
    return {
      snapshot: cached,
      status: cached.source === 'elTOQUE' ? 'online' : 'cached',
      message: cached.source === 'elTOQUE' ? undefined : 'Tasas locales guardadas',
    };
  }
  if (!apiKey) {
    return { snapshot: cached, status: 'cached', message: 'Tasas locales guardadas (falta API key en el build)' };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      snapshot: cached,
      status: 'cached',
      message: `Sin conexión — datos del ${new Date(cached.fetchedAt).toLocaleDateString()}`,
    };
  }
  try {
    const fresh = await fetchTasas();
    return { snapshot: fresh, status: 'online' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error al consultar tasas';
    return { snapshot: cached, status: 'cached', message: `${errorMsg} — datos guardados` };
  }
}

/**
 * Watcher: reintenta si no hay caché (cada 15 min o al reconectar),
 * o cuando corresponde el turno 10 AM / 10 PM.
 */
export function initElToqueWatcher(onUpdate?: (result: ElToqueFetchResult) => void): () => void {
  const tryRefresh = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const cached = loadCachedRates();
    if (cached && !isScheduledUpdateDue()) return; // Fuera de turno y con datos: nada que hacer
    try {
      const result = await getElToqueRates();
      onUpdate?.(result);
    } catch {
      // Silencioso
    }
  };

  setTimeout(tryRefresh, 1500);
  const handleOnline = () => tryRefresh();
  window.addEventListener('online', handleOnline);
  const intervalId = setInterval(tryRefresh, 15 * 60 * 1000);
  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}

/** Sincronización QR: aplica un snapshot recibido si es más reciente que el local */
export function applyIncomingRatesSnapshot(incoming: ElToqueSnapshot | null | undefined): boolean {
  if (!incoming || !Array.isArray(incoming.data) || !incoming.fetchedAt) {
    return false;
  }
  const local = loadCachedRates();
  if (!local) {
    saveRatesToCache(incoming);
    return true;
  }
  const incomingTime = new Date(incoming.fetchedAt).getTime();
  const localTime = new Date(local.fetchedAt).getTime();
  if (incomingTime > localTime) {
    saveRatesToCache(incoming);
    return true;
  }
  return false;
}
