import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
 "appId": "com.gestion.ventas",
  appName: 'Gestion De Ventas',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
  },
};

export default config;
