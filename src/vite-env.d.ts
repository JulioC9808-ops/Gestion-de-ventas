/// <reference types="vite/client" />

declare const __BUILD_DATE__: string;
declare const __APP_VERSION__: string;

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
    };
    [key: string]: unknown;
  };
  Capacitor?: {
    isNativePlatform?: () => boolean;
    [key: string]: unknown;
  };
}

