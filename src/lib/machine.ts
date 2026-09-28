// Identidad de dispositivo para la licencia:
// - PC (Electron): huella de hardware (disco/BIOS/CPU/RAM) expuesta por preload.cjs.
// - Android (Capacitor): SHA-256 de Settings.Secure.ANDROID_ID vía LocalSyncPlugin.
interface DesktopBridge {
  isElectron: boolean;
  machineId: string;
  hardwareComponents?: { disk: string; bios: string; cpu: string; ram: string };
  platform: string;
  startSyncServer?: (payload: string) => Promise<string>;
  stopSyncServer?: () => Promise<void>;
  windowControls?: Record<string, unknown>;
}

declare global {
  interface Window {
    desktopBridge?: DesktopBridge;
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: {
        LocalSync?: {
          start: (options: { payload: string }) => Promise<{ url: string }>;
          stop: () => Promise<void>;
          getAndroidId?: () => Promise<{ idHash: string }>;
        };
        WiFiDirect?: Record<string, unknown>;
      };
    };
  }
}

export interface HardwareComponents {
  disk: string;
  bios: string;
  cpu: string;
  ram: string;
}

export function getMachineId(): string | null {
  if (typeof window === 'undefined') return null;
  const b = window.desktopBridge;
  if (b && b.isElectron && typeof b.machineId === 'string') return b.machineId;
  return null;
}

/** Hashes por componente (los vacíos/genéricos llegan como ''). Solo PC. */
export function getHardwareComponents(): HardwareComponents | null {
  if (typeof window === 'undefined') return null;
  const b = window.desktopBridge;
  if (b && b.isElectron && b.hardwareComponents) return b.hardwareComponents;
  return null;
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.desktopBridge?.isElectron;
}

/** ID de Android (hash de ANDROID_ID). null en PC/web. */
export async function getAndroidDeviceId(): Promise<string | null> {
  try {
    const plugin = window.Capacitor?.Plugins?.LocalSync;
    if (!plugin?.getAndroidId) return null;
    const { idHash } = await plugin.getAndroidId();
    return typeof idHash === 'string' && idHash ? idHash : null;
  } catch {
    return null;
  }
}

/** ID unificado: sincrónico en PC, asíncrono en Android, y persistente en Web/Navegador. */
export async function getDeviceId(): Promise<{ id: string; hw: HardwareComponents | null }> {
  if (isDesktop()) {
    const mId = getMachineId();
    return { id: mId || 'GV-DEV-PC-DESKTOP', hw: getHardwareComponents() };
  }
  const androidId = await getAndroidDeviceId();
  if (androidId) return { id: androidId, hw: null };

  // Fallback seguro y persistente para Web / PWA / Modo Navegador
  try {
    let webId = localStorage.getItem('gv_web_device_id');
    if (!webId || webId === 'web' || webId.length < 6) {
      const rnd = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      webId = 'WEB-' + rnd.replace(/-/g, '').substring(0, 16).toUpperCase();
      localStorage.setItem('gv_web_device_id', webId);
    }
    return { id: webId, hw: null };
  } catch {
    return { id: 'GV-DEV-LOCAL-TERMINAL', hw: null };
  }
}
