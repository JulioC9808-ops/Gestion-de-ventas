// Ayudante para leer la huella de hardware expuesta por electron/preload.cjs.
// Fuera de Electron (navegador/web) devuelve null.

interface DesktopBridge {
  isElectron: boolean;
  machineId: string;
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
        };
      };
    };
  }
}

export function getMachineId(): string | null {
  if (typeof window === 'undefined') return null;
  const b = window.desktopBridge;
  if (b && b.isElectron && typeof b.machineId === 'string') return b.machineId;
  return null;
}

export function isDesktop(): boolean {
  return typeof window !== 'undefined' && !!window.desktopBridge?.isElectron;
}
