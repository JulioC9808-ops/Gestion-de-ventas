import { formatFriendlyDeviceId } from '@/lib/cryptoLicense';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface BlockedTerminalEntry {
  deviceId?: string;
  friendlyId?: string;
  terminalId?: string;
  id?: string;
  reason?: string;
  blockedAt?: string;
  since?: string;
}

export interface LicenseStatusPayload {
  updated?: string;
  masterSwitch?: boolean;
  allowNewActivations?: boolean;
  blocked?: Array<BlockedTerminalEntry | string> | Record<string, BlockedTerminalEntry | string | boolean>;
  legacyTerminals?: Array<{ deviceId?: string; friendlyId?: string; reportedAt?: string }>;
}

export const DEFAULT_LICENSE_STATUS_URL =
  'https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/license-status.json';

const STORAGE_KEY_STATUS_CACHE = 'gv_remote_license_status_cache_v1';
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // cada 30 minutos

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
    let data: LicenseStatusPayload | null = null;

    if (Capacitor.isNativePlatform()) {
      const resp = await CapacitorHttp.get({
        url: finalUrl,
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        connectTimeout: 10000,
        readTimeout: 10000,
      });
      if (resp.status >= 200 && resp.status < 300) {
        data = typeof resp.data === 'string' ? JSON.parse(resp.data) : resp.data;
      }
    } else {
      const res = await fetch(finalUrl, { cache: 'no-store' });
      if (res.ok) {
        data = (await res.json()) as LicenseStatusPayload;
      }
    }

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

  const rawBlocked =
    cached?.blocked ||
    (cached ? ((cached as unknown as Record<string, unknown>).blockedDevices as LicenseStatusPayload['blocked']) : undefined);

  if (!deviceId || !rawBlocked) {
    return {
      isBlocked: false,
      blockedReason: null,
      allowNewActivations,
      masterSwitch,
    };
  }

  const friendly = formatFriendlyDeviceId(deviceId).toUpperCase();
  const clean = deviceId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Convertir cached.blocked a lista uniforme
  let blockedList: Array<{ id: string; reason?: string }> = [];
  if (Array.isArray(rawBlocked)) {
    blockedList = rawBlocked.map(b => {
      if (typeof b === 'string') return { id: b, reason: 'Terminal suspendido' };
      if (b && typeof b === 'object') {
        const id = b.friendlyId || b.deviceId || b.terminalId || b.id || '';
        return { id, reason: b.reason };
      }
      return { id: '' };
    });
  } else if (typeof rawBlocked === 'object') {
    blockedList = Object.entries(rawBlocked).map(([key, val]) => {
      if (typeof val === 'string') return { id: key, reason: val };
      if (val && typeof val === 'object') return { id: key, reason: (val as BlockedTerminalEntry).reason };
      return { id: key, reason: 'Terminal suspendido' };
    });
  }

  const found = blockedList.find(b => {
    if (!b || !b.id) return false;
    const target = b.id.trim();
    const bFriendly = formatFriendlyDeviceId(target).toUpperCase();
    const bClean = target.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return (
      bFriendly === friendly ||
      bClean === clean ||
      target.toUpperCase() === friendly ||
      target.toUpperCase() === clean
    );
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
