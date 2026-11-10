/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;
declare const __APP_VERSION__: string;
declare const __ANDROID_APP_VERSION__: string;

interface Window {
  desktopBridge?: {
    isElectron?: boolean;
    windowControls?: {
      isMaximized: () => Promise<boolean>;
      onMaximizeChange: (cb: (isMax: boolean) => void) => () => void;
      minimize: () => void;
      toggleMaximize: () => void;
      close: () => void;
    };
    updates?: {
      onProgress: (cb: (percent: number) => void) => void;
      check: () => void;
      applyChanges?: () => Promise<unknown>;
      [key: string]: unknown;
    };
    machineId?: string;
    hardwareComponents?: { disk: string; bios: string; cpu: string; ram: string };
    platform?: string;
    startSyncServer?: (payload: string) => Promise<string>;
    stopSyncServer?: () => Promise<void>;
    [key: string]: unknown;
  };
  Capacitor?: {
    isNativePlatform?: () => boolean;
    Plugins?: {
      LocalSync?: {
        start: (options: { payload: string }) => Promise<{ url: string }>;
        stop: () => Promise<void>;
        getAndroidId?: () => Promise<{ idHash: string }>;
      };
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

