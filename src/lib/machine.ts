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

/** ID unificado: sincrónico en PC, asíncrono en Android. */
export async function getDeviceId(): Promise<{ id: string | null; hw: HardwareComponents | null }> {
  if (isDesktop()) return { id: getMachineId(), hw: getHardwareComponents() };
  return { id: await getAndroidDeviceId(), hw: null };
}
