// ============================================================================
// MÓDULO DE REGISTRO AUTOMÁTICO DE ACTIVACIONES (PHONE-HOME BEST-EFFORT)
// Sistema de Gestión de Ventas – Desarrollado por Julio_GE
// 100% OFFLINE-FIRST: El fallo de red jamás bloquea ni anula la activación.
// ============================================================================

import type { TerminalReportPayload } from './cryptoLicense';

export const REMOTE_REGISTRY_URL =
  'https://script.google.com/macros/s/AKfycbwMVB6YPa3hCIG3fk6awwkuMz9sGMOoffWpBl5OJj7noYAkbSfs0ArsgGGvukwi4jBB9Q/exec';

export interface RegistryPayload {
  friendlyDeviceId: string;
  businessName: string;
  method: 'GVLIC' | 'LEGACY' | 'QR_SYNC';
  plan: string;
  issuedAt?: number;
  expiresAt?: number | null;
  timestamp: number;
  report?: TerminalReportPayload | null;
}

const STORAGE_KEY_PENDING = 'pending_registry_reports';
const STORAGE_KEY_SENT_CACHE = 'sent_registry_reports_cache';
const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000; // cada 2 horas

function getDedupeKey(payload: RegistryPayload): string {
  const exp = payload.expiresAt === null || payload.expiresAt === undefined ? 'perm' : String(payload.expiresAt);
  return `${payload.friendlyDeviceId}::${payload.method}::${payload.plan}::${exp}`;
}

function getSentCache(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENT_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function markAsSent(payload: RegistryPayload) {
  try {
    const key = getDedupeKey(payload);
    const existing = getSentCache();
    if (!existing.includes(key)) {
      existing.push(key);
      localStorage.setItem(STORAGE_KEY_SENT_CACHE, JSON.stringify(existing.slice(-100)));
    }
  } catch {
    // Silencioso
  }
}

function isAlreadySent(payload: RegistryPayload): boolean {
  const key = getDedupeKey(payload);
  const cache = getSentCache();
  return cache.includes(key);
}

export function getPendingQueue(): RegistryPayload[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PENDING);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingQueue(queue: RegistryPayload[]) {
  try {
    localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(queue.slice(-50)));
  } catch {
    // Silencioso
  }
}

/**
 * Realiza el envío HTTP POST al endpoint de Google Apps Script con timeout y manejo de redirección.
 */
async function sendHttpRequest(payload: RegistryPayload): Promise<boolean> {
  const bodyString = JSON.stringify(payload);

  // 1. Android con CapacitorHttp si está disponible nativamente
  try {
    const capacitorObj = (window as unknown as { Capacitor?: { Plugins?: { CapacitorHttp?: { post: (opts: { url: string; data: unknown; headers?: Record<string, string> }) => Promise<{ status: number }> } } } }).Capacitor;
    const nativeHttp = capacitorObj?.Plugins?.CapacitorHttp;
    if (nativeHttp && typeof nativeHttp.post === 'function') {
      const resp = await nativeHttp.post({
        url: REMOTE_REGISTRY_URL,
        data: payload,
        headers: { 'Content-Type': 'application/json' },
      });
      if (resp && (resp.status === 200 || resp.status === 302 || resp.status === 201)) {
        return true;
      }
    }
  } catch {
    // Fallback al fetch universal
  }

  // 2. Electron IPC si está disponible
  try {
    const bridge = (window as unknown as { desktopBridge?: { postRemoteRegistry?: (url: string, data: unknown) => Promise<{ ok: boolean }> } }).desktopBridge;
    if (bridge && typeof bridge.postRemoteRegistry === 'function') {
      const res = await bridge.postRemoteRegistry(REMOTE_REGISTRY_URL, payload);
      if (res && res.ok) {
        return true;
      }
    }
  } catch {
    // Fallback al fetch universal
  }

  // 3. Fetch Web universal con AbortController (timeout 10s)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Google Apps Script doPost acepta Content-Type: text/plain o application/json sin preflight
    await fetch(REMOTE_REGISTRY_URL, {
      method: 'POST',
      mode: 'no-cors', // Apps Script doPost permite no-cors para registrar filas silenciosamente
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: bodyString,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return true;
  } catch (err) {
    console.debug('[RemoteRegistry] Envío diferido:', err);
    return false;
  }
}

/**
 * Encola un registro para envío silencioso en segundo plano.
 * Si no hay internet o falla, queda en la cola de reintento.
 */
export function queueRegistryReport(payload: RegistryPayload) {
  if (!payload || !payload.friendlyDeviceId) return;

  // Deduplicar: si ya se envió exactamente este estado antes, no saturar
  if (isAlreadySent(payload)) {
    return;
  }

  // Intentar envío inmediato si hay conexión
  if (navigator.onLine) {
    sendHttpRequest(payload)
      .then(ok => {
        if (ok) {
          markAsSent(payload);
        } else {
          enqueue(payload);
        }
      })
      .catch(() => {
        enqueue(payload);
      });
  } else {
    enqueue(payload);
  }
}

function enqueue(payload: RegistryPayload) {
  const queue = getPendingQueue();
  const key = getDedupeKey(payload);
  const filtered = queue.filter(item => getDedupeKey(item) !== key);
  filtered.push(payload);
  savePendingQueue(filtered);
}

/**
 * Procesa los elementos pendientes en la cola.
 */
export async function processPendingRegistryQueue() {
  if (!navigator.onLine) return;

  const queue = getPendingQueue();
  if (queue.length === 0) return;

  const remaining: RegistryPayload[] = [];
  for (const item of queue) {
    try {
      const ok = await sendHttpRequest(item);
      if (ok) {
        markAsSent(item);
      } else {
        remaining.push(item);
      }
    } catch {
      remaining.push(item);
    }
  }
  savePendingQueue(remaining);
}

/**
 * Inicia el despachador periódico en segundo plano.
 */
let queueInitialized = false;
export function initRemoteRegistryQueue() {
  if (queueInitialized) return;
  queueInitialized = true;

  // Procesar cola al arrancar
  setTimeout(() => {
    processPendingRegistryQueue().catch(() => {});
  }, 3000);

  // Reintentar cuando vuelva la conexión
  window.addEventListener('online', () => {
    processPendingRegistryQueue().catch(() => {});
  });

  // Reintentar cada 2 horas
  setInterval(() => {
    processPendingRegistryQueue().catch(() => {});
  }, CHECK_INTERVAL_MS);
}
