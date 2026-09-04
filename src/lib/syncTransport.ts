import LZString from 'lz-string';
import type { BackupPayload } from '@/lib/backup';

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

declare global {
  interface Window {
    desktopBridge?: {
      isElectron: boolean;
      startSyncServer?: (payload: string) => Promise<string>;
      stopSyncServer?: () => Promise<void>;
      windowControls: Record<string, unknown>;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        LocalSync?: {
          start: (options: { payload: string }) => Promise<{ url: string }>;
          stop: () => Promise<void>;
        };
      };
    };
  }
}

const DIRECT_PREFIX = 'GVBACKUP:';
const WIFI_PREFIX = 'GVSYNC:';

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