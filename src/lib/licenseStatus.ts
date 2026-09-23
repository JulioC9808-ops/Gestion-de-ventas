import { formatFriendlyDeviceId } from '@/lib/cryptoLicense';

export interface BlockedTerminalEntry {
  deviceId?: string;
  friendlyId?: string;
  id?: string;
  reason?: string;
  blockedAt?: string;
  since?: string;
}

export interface LicenseStatusPayload {
  updated?: string;
  masterSwitch?: boolean;
  allowNewActivations?: boolean;
  blocked?: BlockedTerminalEntry[];
  legacyTerminals?: Array<{ deviceId?: string; friendlyId?: string; reportedAt?: string }>;
}

export const DEFAULT_LICENSE_STATUS_URL =
  'https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/license-status.json';

const STORAGE_KEY_STATUS_CACHE = 'gv_remote_license_status_cache_v1';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // cada 2 horas

type StatusListener = (payload: LicenseStatusPayload | null) => void;
const listeners = new Set<StatusListener>();

export function getCachedLicenseStatus(): LicenseStatusPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATUS_CACHE);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function saveCachedLicenseStatus(payload: LicenseStatusPayload) {
  try {
    localStorage.setItem(STORAGE_KEY_STATUS_CACHE, JSON.stringify(payload));
  } catch {
    // Ignorar errores de almacenamiento
  }
}

/**
 * Descarga el archivo license-status.json remoto desde GitHub.
 * Si falla la red, no arroja error fatal y devuelve la caché existente o null.
 */
export async function fetchLicenseStatus(url = DEFAULT_LICENSE_STATUS_URL): Promise<LicenseStatusPayload | null> {
  try {
    const finalUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const res = await fetch(finalUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as LicenseStatusPayload;
    if (data && typeof data === 'object') {
      saveCachedLicenseStatus(data);
      listeners.forEach(fn => {
        try {
          fn(data);
        } catch {
          // Ignorar
        }
      });
      return data;
    }
    return getCachedLicenseStatus();
  } catch (error) {
    console.debug('No se pudo comprobar el estado de licencias remoto (usando caché):', error instanceof Error ? error.message : error);
    return getCachedLicenseStatus();
  }
}

/**
 * Evalúa si un terminal específico está bloqueado y si se permiten nuevas activaciones.
 * Si no hay internet o el archivo falla, NO bloquea el dispositivo por error de red.
 * Cada terminal solo ve su propia entrada de bloqueo.
 */
export function getLicenseStatus(deviceId: string | null | undefined): {
  isBlocked: boolean;
  blockedReason: string | null;
  allowNewActivations: boolean;
  masterSwitch: boolean;
} {
  const cached = getCachedLicenseStatus();
  const masterSwitch = cached?.masterSwitch !== false;
  const allowNewActivations = masterSwitch && cached?.allowNewActivations !== false;

  if (!deviceId || !cached?.blocked || !Array.isArray(cached.blocked)) {
    return {
      isBlocked: false,
      blockedReason: null,
      allowNewActivations,
      masterSwitch,
    };
  }

  const friendly = formatFriendlyDeviceId(deviceId).toUpperCase();
  const clean = deviceId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  const found = cached.blocked.find(b => {
    if (!b) return false;
    const targetId = b.friendlyId || b.id || b.deviceId || '';
    if (!targetId) return false;
    const bFriendly = formatFriendlyDeviceId(targetId).toUpperCase();
    const bClean = targetId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return bFriendly === friendly || bClean === clean;
  });

  if (found) {
    return {
      isBlocked: true,
      blockedReason: found.reason?.trim() || 'Terminal suspendido por el desarrollador',
      allowNewActivations,
      masterSwitch,
    };
  }

  return {
    isBlocked: false,
    blockedReason: null,
    allowNewActivations,
    masterSwitch,
  };
}

/**
 * Inicia la verificación periódica cada 2 horas y al arrancar.
 */
let initialized = false;
export function initLicenseStatusChecker(url = DEFAULT_LICENSE_STATUS_URL) {
  if (initialized) return;
  initialized = true;

  if (navigator.onLine) {
    fetchLicenseStatus(url).catch(() => {});
  }

  window.addEventListener('online', () => {
    fetchLicenseStatus(url).catch(() => {});
  });

  setInterval(() => {
    if (navigator.onLine) {
      fetchLicenseStatus(url).catch(() => {});
    }
  }, CHECK_INTERVAL_MS);
}

export function subscribeLicenseStatus(fn: StatusListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
