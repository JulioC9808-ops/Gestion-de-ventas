// Tasas de cambio (elTOQUE) — funciona en PC (Electron) y Android (Capacitor).
// Caché en localStorage + refresco al recuperar conexión y al abrir la app.
// Regla QR: solo se acepta un snapshot con timestamp más nuevo que el actual.

import { Capacitor, CapacitorHttp } from '@capacitor/core';

const API_URL = 'https://tasas.eltoque.com/v1/current';

// 👉 Pega aquí tu API key de elTOQUE (única parte editable)
const API_KEY = 'PEGA_TU_API_KEY_AQUI';

const CACHE_KEY = 'gv_rates_cache_v1';
const MIN_FETCH_INTERVAL_MS = 10 * 60 * 1000; // máx 1 petición cada 10 min (protege el límite)
const STALE_AFTER_MS = 30 * 60 * 1000;        // a los 30 min se intenta refrescar

export interface CurrencyRate {
  code: string;
  value: number;
  buy?: number;
  sell?: number;
}

export interface RatesSnapshot {
  fetchedAt: string;       // ISO: cuándo se descargó
  sourceTimestamp: number; // epoch (ms) del servidor — para la regla del QR
  rates: CurrencyRate[];
}

let lastFetchAttempt = 0;
let inFlight: Promise<RatesSnapshot | null> | null = null;

export function loadCachedSnapshot(): RatesSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.sourceTimestamp === 'number' &&
      Array.isArray(parsed.rates) &&
      parsed.rates.every((r: any) => typeof r.code === 'string' && typeof r.value === 'number')
    ) {
      return parsed as RatesSnapshot;
    }
    return null;
  } catch {
    return null;
  }
}

function saveSnapshot(s: RatesSnapshot) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s));
  } catch {}
}

// La API puede devolver { trm: { USD: 330 } } (tasa única) o
// { trm: { USD: { buy: x, sell: y } } } (compra/venta). Normalizamos ambas formas.
function parseResponse(json: any): RatesSnapshot {
  const trm = json?.trm || json?.rates || {};
  let serverTs = Number(json?.timestamp);
  if (!isFinite(serverTs) || serverTs <= 0) serverTs = Date.now();
  else if (String(json.timestamp).length <= 10) serverTs = serverTs * 1000; // epoch en segundos
  if (serverTs > Date.now() + 24 * 3600 * 1000) serverTs = Date.now(); // rechaza futuros

  const rates: CurrencyRate[] = [];
  for (const [code, val] of Object.entries(trm)) {
    if (typeof val === 'number') {
      rates.push({ code, value: val });
    } else if (val && typeof val === 'object') {
      const o = val as any;
      const buy = Number(o.buy ?? o.compra);
      const sell = Number(o.sell ?? o.venta);
      const value = !isNaN(sell) ? sell : !isNaN(buy) ? buy : NaN;
      rates.push({
        code,
        value,
        buy: isFinite(buy) ? buy : undefined,
        sell: isFinite(sell) ? sell : undefined,
      });
    }
  }
  const clean = rates.filter(r => isFinite(r.value));
  if (!clean.length) throw new Error('La respuesta no contiene tasas válidas');
  return { fetchedAt: new Date().toISOString(), sourceTimestamp: serverTs, rates: clean };
}

export async function fetchRates(): Promise<RatesSnapshot> {
  const headers = { Authorization: `Bearer ${API_KEY}`, Accept: 'application/json' };

  if (Capacitor.isNativePlatform()) {
    // Android: el WebView puede bloquear por CORS — se usa el cliente HTTP nativo
    const res = await CapacitorHttp.get({
      url: `${API_URL}?t=${Date.now()}`,
      headers,
      connectTimeout: 15000,
      readTimeout: 15000,
    });
    if (res.status === 401 || res.status === 403) throw new Error('API key inválida');
    if (res.status === 429) throw new Error('Límite de peticiones alcanzado');
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const json = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    return parseResponse(json);
  }

  // PC / navegador
  const res = await fetch(`${API_URL}?t=${Date.now()}`, { headers, cache: 'no-store' });
  if (res.status === 401 || res.status === 403) throw new Error('API key inválida');
  if (res.status === 429) throw new Error('Límite de peticiones alcanzado');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseResponse(await res.json());
}

// Devuelve el mejor snapshot disponible (red o caché). NUNCA lanza.
export async function getBestRates(): Promise<{ snapshot: RatesSnapshot | null; error?: string }> {
  const now = Date.now();
  const cached = loadCachedSnapshot();
  const isFresh = cached && now - new Date(cached.fetchedAt).getTime() < STALE_AFTER_MS;

  if (!isFresh && !inFlight && now - lastFetchAttempt > MIN_FETCH_INTERVAL_MS) {
    lastFetchAttempt = now;
    inFlight = fetchRates()
      .then(s => { inFlight = null; return s; })
      .catch(() => { inFlight = null; return null; });
  }

  const fresh = inFlight ? await inFlight : null;
  if (fresh) return { snapshot: fresh };
  if (cached) {
    return {
      snapshot: cached,
      error: navigator.onLine
        ? 'No se pudo actualizar — tasas guardadas'
        : 'Sin conexión — tasas guardadas',
    };
  }
  return { snapshot: null, error: navigator.onLine ? 'No se pudieron cargar las tasas' : 'Sin conexión' };
}

// Se llama una vez al montar el widget: refresca al abrir, al recuperar
// conexión y cada 30 min. Devuelve la función de limpieza.
export function initRatesSync(onUpdate?: () => void): () => void {
  const tryRefresh = () => {
    if (navigator.onLine) getBestRates().then(() => onUpdate?.());
  };
  tryRefresh();
  window.addEventListener('online', tryRefresh);
  const interval = setInterval(tryRefresh, STALE_AFTER_MS);
  return () => {
    window.removeEventListener('online', tryRefresh);
    clearInterval(interval);
  };
}
