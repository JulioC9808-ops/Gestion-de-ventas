import LZString from 'lz-string';
import type { BackupPayload } from '@/lib/backup';
import type { ShiftReport } from '@/types';
import { WiFiDirect, buildWDQr, parseWDQr } from './wifiDirect';
import { Capacitor } from '@capacitor/core';

/**
 * Qué licencia recibe el empleado al escanear:
 * - h24: 24 horas desde que escanea.
 * - admin: la misma expiración que tiene el admin (37 días o permanente).
 * - permanent: permanente (el admin lo autorizó explícitamente).
 */
export interface EmployeeLicenseGrant {
  mode: 'h24' | 'admin' | 'permanent';
  /** Expiración del admin (epoch ms) o null si es permanente. Solo mode 'admin'. */
  expiresAt?: number | null;
  /** Cuándo se generó el QR (para rechazar QR viejos reciclados en modo h24). */
  issuedAt: number;
}

export interface EmployeeSyncPackage {
  v: 3;
  account: {
    u: string;
    p: string;
    n: string;
    r: 'employee';
    s?: number;
    h?: string | null;
  };
  /** Opcional por compatibilidad: QRs v2 no lo traen (se interpreta como 24 h). */
  license?: EmployeeLicenseGrant;
  backup: BackupPayload;
}

export interface AdminSyncPackage {
  v: 1;
  role: 'admin';
  timestamp: string;
  backup: BackupPayload;
}

const DIRECT_PREFIX = 'GVBACKUP:';
const WIFI_PREFIX = 'GVSYNC:';
const SHIFT_DIRECT_PREFIX = 'GVSHIFTBACKUP:';
const SHIFT_WIFI_PREFIX = 'GVSHIFTSYNC:';
const ADMIN_DIRECT_PREFIX = 'GVADMINBACKUP:';
const ADMIN_WIFI_PREFIX = 'GVADMINSYNC:';

function isAndroidNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function randomToken(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    // fallback
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function encodeEmployeePackage(data: EmployeeSyncPackage): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeEmployeePackage(encoded: string): EmployeeSyncPackage | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as EmployeeSyncPackage;
    const isV2orV3 = parsed?.v === 2 || parsed?.v === 3;
    if (!isV2orV3 || parsed.account?.r !== 'employee' || !parsed.backup || !Array.isArray(parsed.backup.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function startEmployeeShare(data: EmployeeSyncPackage): Promise<string> {
  const payload = encodeEmployeePackage(data);

  // Android: WiFi Direct primero (sin router ni red previa); si falla, Wi-Fi local.
  if (isAndroidNative()) {
    try {
      const token = randomToken();
      const { port } = await WiFiDirect.startShare({ token, payload });
      return buildWDQr(token, port);
    } catch {
      // WiFi Direct no disponible (permiso/fabricante) → seguimos con Wi-Fi local.
    }
    const localSync = window.Capacitor?.Plugins?.LocalSync;
    if (localSync) {
      const result = await localSync.start({ payload });
      return `${WIFI_PREFIX}${result.url}`;
    }
    if (payload.length > 2400) {
      throw new Error('Abre la aplicación instalada para compartir respaldos grandes.');
    }
    return `${DIRECT_PREFIX}${payload}`;
  }

  // PC (Electron): servidor local en la misma red.
  if (window.desktopBridge?.startSyncServer) {
    return `${WIFI_PREFIX}${await window.desktopBridge.startSyncServer(payload)}`;
  }
  const localSync = window.Capacitor?.Plugins?.LocalSync;
  if (localSync) {
    const result = await localSync.start({ payload });
    return `${WIFI_PREFIX}${result.url}`;
  }
  // Navegador de prueba: solo respaldos pequeños.
  if (payload.length > 2400) {
    throw new Error('Abre la aplicación instalada para compartir respaldos grandes por Wi-Fi.');
  }
  return `${DIRECT_PREFIX}${payload}`;
}

export async function stopEmployeeShare(): Promise<void> {
  try {
    await WiFiDirect.stopShare();
  } catch {
    // ignore
  }
  if (window.desktopBridge?.stopSyncServer) {
    await window.desktopBridge.stopSyncServer();
    return;
  }
  try {
    await window.Capacitor?.Plugins?.LocalSync?.stop();
  } catch {
    // ignore
  }
}

export async function receiveEmployeeShare(raw: string): Promise<EmployeeSyncPackage | null> {
  if (raw.startsWith(DIRECT_PREFIX)) {
    return decodeEmployeePackage(raw.slice(DIRECT_PREFIX.length));
  }
  // WiFi Direct: el QR trae token|puerto del grupo del admin.
  const wd = parseWDQr(raw);
  if (wd) {
    const { payload } = await WiFiDirect.receiveShare({ token: wd.token, port: wd.port });
    return decodeEmployeePackage(payload);
  }
  if (!raw.startsWith(WIFI_PREFIX)) return null;
  const url = raw.slice(WIFI_PREFIX.length);
  if (!/^http:\/\/[^/]+\/sync\/[a-zA-Z0-9-]+$/.test(url)) return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('El dispositivo del jefe no respondió.');
  return decodeEmployeePackage(await response.text());
}

// ===== Cierre de turno: mismo mecanismo (comprimido + Wi-Fi si hace falta) =====
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
    throw new Error('Abre la aplicación instalada para sincronizar turnos grandes por Wi-Fi.');
  }
  return `${SHIFT_DIRECT_PREFIX}${payload}`;
}

export async function stopShiftShare(): Promise<void> {
  if (window.desktopBridge?.stopSyncServer) {
    await window.desktopBridge.stopSyncServer();
    return;
  }
  try {
    await window.Capacitor?.Plugins?.LocalSync?.stop();
  } catch {
    // ignore
  }
}

export async function receiveShiftShare(raw: string): Promise<ShiftReport | null> {
  if (raw.startsWith(SHIFT_DIRECT_PREFIX)) {
    return decodeShiftPackage(raw.slice(SHIFT_DIRECT_PREFIX.length));
  }
  if (!raw.startsWith(SHIFT_WIFI_PREFIX)) return null;
  const url = raw.slice(SHIFT_WIFI_PREFIX.length);
  if (!/^http:\/\/[^/]+\/sync\/[a-zA-Z0-9-]+$/.test(url)) return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('El dispositivo del jefe no respondió.');
  return decodeShiftPackage(await response.text());
}

// ===== Sincronización entre Administradores (Admin ↔ Admin) =====
export function encodeAdminPackage(data: AdminSyncPackage): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodeAdminPackage(encoded: string): AdminSyncPackage | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as AdminSyncPackage;
    if (parsed?.role !== 'admin' || !parsed.backup || !Array.isArray(parsed.backup.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function startAdminShare(data: AdminSyncPackage): Promise<string> {
  const payload = encodeAdminPackage(data);

  if (isAndroidNative()) {
    try {
      const token = randomToken();
      const { port } = await WiFiDirect.startShare({ token, payload });
      return buildWDQr(token, port);
    } catch {
      // Fallback
    }
    const localSync = window.Capacitor?.Plugins?.LocalSync;
    if (localSync) {
      const result = await localSync.start({ payload });
      return `${ADMIN_WIFI_PREFIX}${result.url}`;
    }
    return `${ADMIN_DIRECT_PREFIX}${payload}`;
  }

  if (window.desktopBridge?.startSyncServer) {
    return `${ADMIN_WIFI_PREFIX}${await window.desktopBridge.startSyncServer(payload)}`;
  }
  const localSync = window.Capacitor?.Plugins?.LocalSync;
  if (localSync) {
    const result = await localSync.start({ payload });
    return `${ADMIN_WIFI_PREFIX}${result.url}`;
  }
  return `${ADMIN_DIRECT_PREFIX}${payload}`;
}

export async function stopAdminShare(): Promise<void> {
  try {
    await WiFiDirect.stopShare();
  } catch {
    // ignore
  }
  if (window.desktopBridge?.stopSyncServer) {
    await window.desktopBridge.stopSyncServer();
    return;
  }
  try {
    await window.Capacitor?.Plugins?.LocalSync?.stop();
  } catch {
    // ignore
  }
}

export async function receiveAdminShare(raw: string): Promise<AdminSyncPackage | null> {
  if (raw.startsWith(ADMIN_DIRECT_PREFIX)) {
    return decodeAdminPackage(raw.slice(ADMIN_DIRECT_PREFIX.length));
  }
  const wd = parseWDQr(raw);
  if (wd) {
    const { payload } = await WiFiDirect.receiveShare({ token: wd.token, port: wd.port });
    return decodeAdminPackage(payload);
  }
  if (!raw.startsWith(ADMIN_WIFI_PREFIX)) return null;
  const url = raw.slice(ADMIN_WIFI_PREFIX.length);
  if (!/^http:\/\/[^/]+\/sync\/[a-zA-Z0-9-]+$/.test(url)) return null;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error('El dispositivo del otro Administrador no respondió.');
  return decodeAdminPackage(await response.text());
}
