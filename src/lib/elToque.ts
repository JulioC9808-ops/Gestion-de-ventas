/**
 * Módulo de Tasas de cambio elTOQUE para PC y Android.
 * - Endpoint: https://tasas.eltoque.com/v1/trmi
 * - Autenticación: Bearer token desde localStorage ('eltoque_custom_api_key') o import.meta.env.VITE_ELTOQUE_API_KEY
 * - Actualización programada: 2 veces al día (después de las 10:00 AM y después de las 10:00 PM / 22:00),
 *   más refrescos automáticos al iniciar la app o recuperar conexión si la caché expiró (mínimo 1 hora).
 * - Compatible con CapacitorHttp (Android nativo sin CORS) y Fetch Web / Electron.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

export const ELTOQUE_CACHE_KEY = 'eltoque_rates_cache';
export const ELTOQUE_SCHEDULE_KEY = 'eltoque_rates_schedule';
export const ELTOQUE_API_KEY_STORAGE = 'eltoque_custom_api_key';
const API_URL = 'https://tasas.eltoque.com/v1/trmi';
const ONE_HOUR_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10000;

export interface CurrencyRate {
  code: string;
  name?: string;
  buy?: number;
  sell?: number;
  value: number; // Valor representativo
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

export const CURRENCY_FLAGS: Record<string, string> = {
  USD: '🇺🇸',
  EUR: '🇪🇺',
  MLC: '🇨🇺',
  ZELLE: '🇺🇸',
  USDT: '💵',
  MXN: '🇲🇽',
  CHF: '🇨🇭',
  CAD: '🇨🇦',
  GBP: '🇬🇧',
  BRL: '🇧🇷',
  COP: '🇨🇴',
  CLP: '🇨🇱',
  CUP: '🇨🇺',
  BTC: '🪙',
  ETH: '⟠',
  TRX: '⚡',
};

export function getCurrencyFlag(code: string): string {
  return CURRENCY_FLAGS[code.toUpperCase()] || '🌐';
}

// Tasas representativas actualizadas del mercado informal en Cuba (+700 CUP)
export const INITIAL_FALLBACK_RATES: CurrencyRate[] = [
  { code: 'USD', name: 'Dólar estadounidense', buy: 710, sell: 720, value: 720 },
  { code: 'EUR', name: 'Euro', buy: 740, sell: 750, value: 750 },
  { code: 'MLC', name: 'Moneda Libremente Convertible', buy: 580, sell: 590, value: 590 },
  { code: 'ZELLE', name: 'Dólar Zelle', buy: 710, sell: 720, value: 720 },
  { code: 'USDT', name: 'Tether USD', buy: 720, sell: 730, value: 730 },
  { code: 'MXN', name: 'Peso mexicano', buy: 38, sell: 40, value: 40 },
  { code: 'CAD', name: 'Dólar canadiense', buy: 515, sell: 535, value: 535 },
  { code: 'CHF', name: 'Franco suizo', buy: 785, sell: 815, value: 815 },
  { code: 'GBP', name: 'Libra esterlina', buy: 885, sell: 915, value: 915 },
];

/**
 * Obtiene la clave de API configurada (desde localStorage o variables de entorno)
 */
export function getElToqueApiKey(): string {
  try {
    const custom = localStorage.getItem(ELTOQUE_API_KEY_STORAGE)?.trim();
    if (custom) return custom;
  } catch {
    // Silencioso
  }
  return (import.meta.env.VITE_ELTOQUE_API_KEY as string | undefined)?.trim() || '';
}

/**
 * Guarda o actualiza la clave de API personalizada en el dispositivo
 */
export function saveElToqueApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(ELTOQUE_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(ELTOQUE_API_KEY_STORAGE);
    }
  } catch {
    // Silencioso
  }
}

/**
 * Carga el snapshot de tasas guardado en localStorage
 */
export function loadCachedRates(): ElToqueSnapshot | null {
  try {
    const raw = localStorage.getItem(ELTOQUE_CACHE_KEY);
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

/**
 * Guarda el snapshot en localStorage
 */
export function saveRatesToCache(snapshot: ElToqueSnapshot): void {
  try {
    localStorage.setItem(ELTOQUE_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Silencioso
  }
}

/**
 * Actualiza las tasas de cambio de forma manual por el Administrador
 */
export function updateManualRates(updatedRates: CurrencyRate[]): ElToqueSnapshot {
  const snapshot: ElToqueSnapshot = {
    data: updatedRates,
    fetchedAt: new Date().toISOString(),
    source: 'Personalizado',
  };
  saveRatesToCache(snapshot);
  return snapshot;
}

/**
 * Normaliza y procesa la respuesta JSON de la API elTOQUE
 */
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
        list.push({
          code,
          name: CURRENCY_NAMES[code] || code,
          value: val,
          sell: val,
        });
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

/**
 * Realiza la petición a la API de elTOQUE (soporta CapacitorHttp para Android y Fetch para Web/Electron)
 */
export async function fetchTasas(): Promise<ElToqueSnapshot> {
  const apiKey = getElToqueApiKey();

  if (!apiKey) {
    throw new Error('API key de tasas no configurada');
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

      // En Android Nativo (Capacitor), usar CapacitorHttp para evitar bloqueos de CORS
      if (Capacitor.isNativePlatform()) {
        const res = await CapacitorHttp.get({
          url: `${API_URL}?t=${Date.now()}`,
          headers,
          connectTimeout: FETCH_TIMEOUT_MS,
          readTimeout: FETCH_TIMEOUT_MS,
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error('API key de elTOQUE no válida');
        }
        if (res.status === 429) {
          throw new Error('Límite de peticiones alcanzado');
        }
        if (res.status !== 200) {
          throw new Error(`Error de servidor (${res.status})`);
        }

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

      // En Navegador Web / Electron
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const response = await fetch(`${API_URL}?t=${Date.now()}`, {
          method: 'GET',
          headers,
          signal: controller.signal,
          cache: 'no-store',
        });

        if (response.status === 401 || response.status === 403) {
          throw new Error('API key de elTOQUE no válida');
        }
        if (response.status === 429) {
          throw new Error('Límite de peticiones alcanzado');
        }
        if (!response.ok) {
          throw new Error(`Error de conexión (${response.status})`);
        }

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

/**
 * Registra la marca horaria de la última sincronización programada
 */
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

/**
 * Comprueba si corresponde la actualización programada (después de las 10:00 AM o después de las 10:00 PM)
 */
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
 * Obtiene las tasas garantizando protección del límite horario y actualización programada (10 AM y 10 PM)
 */
export async function getElToqueRates(options?: { force?: boolean }): Promise<ElToqueFetchResult> {
  const apiKey = getElToqueApiKey();
  const cached = loadCachedRates();
  const now = Date.now();

  const isCacheFresh = cached && now - new Date(cached.fetchedAt).getTime() < ONE_HOUR_MS;
  const isDue = isScheduledUpdateDue();

  // Si la caché es fresca, no corresponde turno programado y no se forzó, retornar de inmediato
  if (isCacheFresh && !isDue && !options?.force) {
    return {
      snapshot: cached,
      status: 'online',
    };
  }

  // Si no hay API key configurada
  if (!apiKey) {
    if (cached) {
      return {
        snapshot: cached,
        status: 'cached',
        message: 'Tasas locales guardadas',
      };
    }
    // Si la app está recién abierta sin caché y sin API key, retornar fallback de referencia actualizado (+700 CUP)
    const initialSnapshot: ElToqueSnapshot = {
      data: INITIAL_FALLBACK_RATES,
      fetchedAt: new Date().toISOString(),
      source: 'Mercado Actual',
    };
    saveRatesToCache(initialSnapshot);
    return {
      snapshot: initialSnapshot,
      status: 'no_key',
      message: 'Tasas representativas de mercado (+700 CUP)',
    };
  }

  // Si no hay conexión a internet
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    if (cached) {
      return {
        snapshot: cached,
        status: 'cached',
        message: `Sin conexión — datos del ${new Date(cached.fetchedAt).toLocaleDateString()}`,
      };
    }
    const initialSnapshot: ElToqueSnapshot = {
      data: INITIAL_FALLBACK_RATES,
      fetchedAt: new Date().toISOString(),
      source: 'Mercado Actual',
    };
    saveRatesToCache(initialSnapshot);
    return {
      snapshot: initialSnapshot,
      status: 'cached',
      message: 'Sin conexión a internet (tasas de mercado)',
    };
  }

  // Intentar consultar la API
  try {
    const freshSnapshot = await fetchTasas();
    return {
      snapshot: freshSnapshot,
      status: 'online',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Error al consultar tasas';
    if (cached) {
      return {
        snapshot: cached,
        status: 'cached',
        message: `${errorMsg} — datos guardados`,
      };
    }
    const initialSnapshot: ElToqueSnapshot = {
      data: INITIAL_FALLBACK_RATES,
      fetchedAt: new Date().toISOString(),
      source: 'Mercado Actual',
    };
    saveRatesToCache(initialSnapshot);
    return {
      snapshot: initialSnapshot,
      status: 'cached',
      message: `${errorMsg} (tasas de mercado)`,
    };
  }
}

/**
 * Watcher programado:
 * - Refresco matutino (después de las 10:00 AM)
 * - Refresco nocturno (después de las 10:00 PM / 22:00)
 * - Refresco al recuperar conexión
 */
export function initElToqueWatcher(onUpdate?: (result: ElToqueFetchResult) => void): () => void {
  const tryRefresh = async () => {
    const cached = loadCachedRates();
    const now = Date.now();
    const isStale = !cached || now - new Date(cached.fetchedAt).getTime() >= ONE_HOUR_MS;
    const isDue = isScheduledUpdateDue();

    if ((isStale || isDue) && navigator.onLine) {
      try {
        const result = await getElToqueRates();
        onUpdate?.(result);
      } catch {
        // Silencioso
      }
    }
  };

  setTimeout(tryRefresh, 1500);

  const handleOnline = () => {
    tryRefresh();
  };

  window.addEventListener('online', handleOnline);
  const intervalId = setInterval(tryRefresh, 15 * 60 * 1000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(intervalId);
  };
}

/**
 * Sincronización QR: aplica un snapshot recibido si es más reciente que el local
 */
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
