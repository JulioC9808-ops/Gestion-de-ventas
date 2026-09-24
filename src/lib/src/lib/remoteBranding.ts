// ============================================================================
// BRANDING Y PRECIOS REMOTOS ("como juego online")
// Descarga remote-config.json desde Sistema-Updates con el MISMO patrón de
// announcements.ts: al arrancar + cada 2h + al recuperar conexión, con caché
// local para funcionar 100% offline.
//  - branding[friendlyDeviceId] → aplica nombre, logo y fondo de login
//  - pricing → actualiza bankPaymentConfig (precios, QR de pago, descuentos)
// Validación estricta: total ≤ 1MB, cada imagen ≤ ~300KB base64. Si algo
// falla, la app sigue normal con su configuración local.
// ============================================================================
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { formatFriendlyDeviceId } from './cryptoLicense';
import { getDeviceId } from './machine';

export const REMOTE_CONFIG_URL =
  'https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/remote-config.json';

const CACHE_KEY = 'gv_remote_branding_cache_v1';
const FETCH_TIMEOUT_MS = 15000;
const MAX_TOTAL_BYTES = 1_000_000;   // 1MB el JSON entero
const MAX_IMAGE_CHARS = 400_000;     // ~300KB de imagen en base64
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // cada 2h

interface RemoteOfferDisc { active?: boolean; percent?: number; label?: string; }
interface RemoteConfig {
  version?: number;
  updated?: string;
  pricing?: {
    monthlyPrice?: number; quarterlyPrice?: number; annualPrice?: number; lifetimePrice?: number;
    currency?: string; cardNumber?: string; confirmPhone?: string; beneficiaryName?: string;
    offers?: { monthly?: RemoteOfferDisc; quarterly?: RemoteOfferDisc; annual?: RemoteOfferDisc; lifetime?: RemoteOfferDisc };
  };
  branding?: Record<string, {
    businessName?: string; logoData?: string; backgroundData?: string; updatedAt?: number;
  }>;
  _brandingTerminals?: number;
}

interface AppliedCache {
  brandingUpdatedAt: number;
  pricingUpdatedAt: number;
}

function readCache(): AppliedCache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AppliedCache>;
      return { brandingUpdatedAt: Number(p.brandingUpdatedAt) || 0, pricingUpdatedAt: Number(p.pricingUpdatedAt) || 0 };
    }
  } catch { /* silencioso */ }
  return { brandingUpdatedAt: 0, pricingUpdatedAt: 0 };
}

function writeCache(c: AppliedCache): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* silencioso */ }
}

function validImage(data: unknown): string | null {
  if (typeof data !== 'string' || !data) return null;
  if (!data.startsWith('data:image/')) return null;
  if (data.length > MAX_IMAGE_CHARS) return null;
  return data;
}

/**
 * Aplica un parche a settings (localStorage 'settings') y avisa a la app.
 * DataContext ya escucha el evento 'storage' y recarga settings → la UI
 * se actualiza en vivo sin reiniciar.
 */
function applySettingsPatch(patch: Record<string, unknown>): boolean {
  try {
    const raw = localStorage.getItem('settings');
    const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const next = { ...current, ...patch };
    localStorage.setItem('settings', JSON.stringify(next));
    // Evento sintético: DataContext lo recibe igual que un cambio multi-ventana
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: 'settings' }));
    } catch {
      window.dispatchEvent(new Event('gv-settings-changed'));
    }
    return true;
  } catch {
    return false;
  }
}

function validateConfig(json: unknown): RemoteConfig | null {
  try {
    if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
    const cfg = json as RemoteConfig;
    if (cfg.pricing !== undefined && typeof cfg.pricing !== 'object') return null;
    if (cfg.branding !== undefined && (typeof cfg.branding !== 'object' || Array.isArray(cfg.branding))) return null;
    if (cfg.branding) {
      for (const key of Object.keys(cfg.branding)) {
        if (!/^[A-Z0-9-]{4,32}$/.test(key)) return null;
        const entry = cfg.branding[key];
        if (!entry || typeof entry !== 'object') return null;
        if (entry.logoData && !validImage(entry.logoData)) return null;
        if (entry.backgroundData && !validImage(entry.backgroundData)) return null;
      }
    }
    return cfg;
  } catch {
    return null;
  }
}

async function fetchRemoteConfigText(): Promise<string | null> {
  const url = `${REMOTE_CONFIG_URL}?t=${Date.now()}`;
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await CapacitorHttp.get({
        url,
        headers: { Accept: 'application/json' },
        connectTimeout: FETCH_TIMEOUT_MS,
        readTimeout: FETCH_TIMEOUT_MS,
      });
      if (res.status !== 200 || typeof res.data !== 'string') return null;
      return res.data;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!res.ok) return null;
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

async function syncOnce(): Promise<'applied' | 'unchanged' | 'error'> {
  const text = await fetchRemoteConfigText();
  if (!text) return 'error';
  if (text.length > MAX_TOTAL_BYTES) return 'error';
  let json: unknown;
  try { json = JSON.parse(text); } catch { return 'error'; }
  const cfg = validateConfig(json);
  if (!cfg) return 'error';

  const cache = readCache();
  let changed = false;

  // ---- 1. Branding de ESTE terminal ----
  if (cfg.branding && Object.keys(cfg.branding).length > 0) {
    let myId = '';
    try { myId = formatFriendlyDeviceId(await getDeviceId()); } catch { myId = ''; }
    const entry = myId ? cfg.branding[myId] : undefined;
    if (entry) {
      const updatedAt = Number(entry.updatedAt) || 0;
      if (updatedAt > cache.brandingUpdatedAt) {
        const patch: Record<string, unknown> = {};
        if (typeof entry.businessName === 'string' && entry.businessName.trim()) {
          patch.businessName = entry.businessName.trim();
        }
        const logo = validImage(entry.logoData);
        if (logo) patch.logoUrl = logo;
        const bg = validImage(entry.backgroundData);
        if (bg) patch.backgroundUrl = bg;
        if (Object.keys(patch).length > 0 && applySettingsPatch(patch)) {
          cache.brandingUpdatedAt = updatedAt;
          changed = true;
        }
      }
    }
  }

  // ---- 2. Precios, banco y descuentos ----
  if (cfg.pricing) {
    const updatedMs = cfg.updated ? new Date(cfg.updated).getTime() || 0 : 0;
    if (updatedMs > cache.pricingUpdatedAt) {
      const p = cfg.pricing;
      const bank: Record<string, unknown> = {};
      if (typeof p.monthlyPrice === 'number' && p.monthlyPrice > 0) bank.monthlyPrice = p.monthlyPrice;
      if (typeof p.quarterlyPrice === 'number' && p.quarterlyPrice > 0) bank.quarterlyPrice = p.quarterlyPrice;
      if (typeof p.annualPrice === 'number' && p.annualPrice > 0) bank.annualPrice = p.annualPrice;
      if (typeof p.lifetimePrice === 'number' && p.lifetimePrice > 0) bank.lifetimePrice = p.lifetimePrice;
      if (typeof p.currency === 'string' && p.currency.trim()) bank.currency = p.currency.trim();
      if (typeof p.cardNumber === 'string' && p.cardNumber.trim()) bank.cardNumber = p.cardNumber.trim();
      if (typeof p.confirmPhone === 'string' && p.confirmPhone.trim()) bank.confirmPhone = p.confirmPhone.trim();
      if (typeof p.beneficiaryName === 'string' && p.beneficiaryName.trim()) bank.beneficiaryName = p.beneficiaryName.trim();
      if (p.offers && typeof p.offers === 'object') bank.remoteOffers = p.offers;
      if (Object.keys(bank).length > 0) {
        // Fusiona sobre el bankPaymentConfig actual (o el default)
        try {
          const raw = localStorage.getItem('settings');
          const current = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
          const prevBank = (current.bankPaymentConfig as Record<string, unknown>) || {};
          bank.__merged = undefined; // nunca viaja
          delete bank.__merged;
          const merged = { ...prevBank, ...bank };
          if (applySettingsPatch({ bankPaymentConfig: merged })) {
            cache.pricingUpdatedAt = updatedMs || Date.now();
            changed = true;
          }
        } catch { /* silencioso */ }
      }
    }
  }

  if (changed) writeCache(cache);
  return changed ? 'applied' : 'unchanged';
}

let initialized = false;

/**
 * Inicia el descargador remoto: arranque + cada 2h + al recuperar conexión.
 * Nunca lanza errores hacia la app: todo es best-effort con caché.
 */
export function initRemoteBranding(): void {
  if (initialized) return;
  initialized = true;
  const run = () => { syncOnce().catch(() => { /* silencioso */ }); };
  setTimeout(run, 4000);
  window.addEventListener('online', run);
  setInterval(run, CHECK_INTERVAL_MS);
}
