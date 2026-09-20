import { registerPlugin } from '@capacitor/core';

export interface AppUpdatePluginInterface {
  checkForUpdate(): Promise<{ status: string }>;
}

const AppUpdate = registerPlugin<AppUpdatePluginInterface>('AppUpdate');

export async function checkNativeAppUpdate(): Promise<boolean> {
  try {
    if (window.Capacitor?.isNativePlatform?.()) {
      await AppUpdate.checkForUpdate();
      return true;
    }
  } catch (err) {
    console.warn('Native update check not supported or failed:', err);
  }
  return false;
}
