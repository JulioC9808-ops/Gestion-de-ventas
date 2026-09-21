import LZString from 'lz-string';
import type { BackupPayload } from '@/lib/backup';
import type { ShiftReport } from '@/types';
import { WiFiDirect, WD_QR_PREFIX } from './wifiDirect';
import { Capacitor } from '@capacitor/core';

export interface EmployeeSyncPackage {
  v: 2;
  account: {
    u: string;
    p: string;
    n: string;
    r: 'employee';
    s?: number;
    h?: string | null;
  };
  backup: BackupPayload;
}

const DIRECT_PREFIX = 'GVBACKUP:';
const WIFI_PREFIX = 'GVSYNC:';
const SHIFT_DIRECT_PREFIX = 'GVSHIFTBACKUP:';
const SHIFT_WIFI_PREFIX = 'GVSHIFTSYNC:';

export function encodeEmployeePackage(data: EmployeeSyncPackage): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeEmployeePackage(encoded: string): EmployeeSyncPackage | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as EmployeeSyncPackage;
    if (parsed?.v !== 2 || parsed.account?.r !== 'employee' || !parsed.backup || !Array.isArray(parsed.backup.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function startEmployeeShare(data: EmployeeSyncPackage): Promise<string> {
  const payload = encodeEmployeePackage(data);

  if (window.desktopBridge?.startSyncServer) {
    return `${WIFI_PREFIX}${await window.desktopBridge.startSyncServer(payload)}`;
  }

  const localSync = window.Capacitor?.Plugins?.LocalSync;
  if (localSync) {
    const result = await localSync.start({ payload });
    return `${WIFI_PREFIX}${result.url}`;
  }

  // Navegador de prueba: funciona en un único QR mientras el respaldo sea pequeño.
  if (payload.length > 2400) {
    throw new Error('Abre la aplicación instalada para compartir respaldos grandes por Wi‑Fi.');
  }
  return `${DIRECT_PREFIX}${payload}`;
}

export async function stopEmployeeShare(): Promise<void> {
  if (window.desktopBridge?.stopSyncServer) {
    await window.desktopBridge.stopSyncServer();
    return;
  }
  await window.Capacitor?.Plugins?.LocalSync?.stop();
}

export async function receiveEmployeeShare(raw: string): Promise<EmployeeSyncPackage | null> {
  if (raw.startsWith(DIRECT_PREFIX)) {
    return decodeEmployeePackage(raw.slice(DIRECT_PREFIX.length));
  }
  if (!raw.startsWith(WIFI_PREFIX)) return null;

  const url = raw.slice(WIFI_PREFIX.length);
  if (!/^http:\/\/[^/]+\/sync\/[a-zA-Z0-9-]+$/.test(url)) return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('El dispositivo del jefe no respondió.');
  return decodeEmployeePackage(await response.text());
}

// ===== Cierre de turno: mismo mecanismo (comprimido + Wi‑Fi si hace falta) =====

export function encodeShiftPackage(report: ShiftReport): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(report));
}

export function decodeShiftPackage(encoded: string): ShiftReport | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return JSON.parse(json) as ShiftReport;
  } catch {
    return null;
  }
}

export async function startShiftShare(report: ShiftReport): Promise<string> {
  const payload = encodeShiftPackage(report);

  if (window.desktopBridge?.startSyncServer) {
    return `${SHIFT_WIFI_PREFIX}${await window.desktopBridge.startSyncServer(payload)}`;
  }

  const localSync = window.Capacitor?.Plugins?.LocalSync;
  if (localSync) {
    const result = await localSync.start({ payload });
    return `${SHIFT_WIFI_PREFIX}${result.url}`;
  }

  if (payload.length > 2400) {
    throw new Error('Abre la aplicación instalada para sincronizar turnos grandes por Wi‑Fi.');
  }
  return `${SHIFT_DIRECT_PREFIX}${payload}`;
}

export async function stopShiftShare(): Promise<void> {
  if (window.desktopBridge?.stopSyncServer) {
    await window.desktopBridge.stopSyncServer();
    return;
  }
  await window.Capacitor?.Plugins?.LocalSync?.stop();
}

export async function receiveShiftShare(raw: string): Promise<ShiftReport | null> {
  if (raw.startsWith(SHIFT_DIRECT_PREFIX)) {
    return decodeShiftPackage(raw.slice(SHIFT_DIRECT_PREFIX.length));
  }
  if (!raw.startsWith(SHIFT_WIFI_PREFIX)) return null;

  const url = raw.slice(SHIFT_WIFI_PREFIX.length);
  if (!/^http:\/\/[^/]+\/sync\/[a-zA-Z0-9-]+$/.test(url)) return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('El dispositivo del empleado no respondió.');
  return decodeShiftPackage(await response.text());
}
