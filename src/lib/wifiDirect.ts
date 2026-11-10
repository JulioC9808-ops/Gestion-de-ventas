import { registerPlugin } from '@capacitor/core';

interface WiFiDirectPluginInterface {
  startShare(options: { token: string; payload: string }): Promise<{ port: number; ssid?: string; pass?: string }>;
  stopShare(): Promise<void>;
  receiveShare(options: { token: string; port: number; ssid?: string; pass?: string }): Promise<{ payload: string }>;
  cancelReceive(): Promise<void>;
}

export const WiFiDirect = registerPlugin<WiFiDirectPluginInterface>('WiFiDirect');

export const WD_QR_PREFIX = 'GVWD:';

export interface WDQr {
  token: string;
  port: number;
  ssid?: string;
  pass?: string;
}

/** QR estilo Zapya: token|puerto|nombreRed|clave (los dos últimos son opcionales). */
export function buildWDQr(token: string, port: number, ssid = '', pass = ''): string {
  const parts = [token, String(port)];
  if (ssid && pass) parts.push(encodeURIComponent(ssid), encodeURIComponent(pass));
  return `${WD_QR_PREFIX}${parts.join('|')}`;
}

export function parseWDQr(raw: string): WDQr | null {
  if (!raw.startsWith(WD_QR_PREFIX)) return null;
  const [token, portStr, ssid, pass] = raw.slice(WD_QR_PREFIX.length).split('|');
  const port = Number(portStr);
  if (!token || !Number.isFinite(port) || port <= 0) return null;
  const out: WDQr = { token, port };
  try {
    if (ssid && pass) {
      out.ssid = decodeURIComponent(ssid);
      out.pass = decodeURIComponent(pass);
    }
  } catch {
    // QR sin datos de red: se usará búsqueda de dispositivos
  }
  return out;
}

/** Mensaje claro si el Wi-Fi estaba apagado. */
export function isWifiOffError(e: unknown): boolean {
  return e instanceof Error && e.message.includes('WIFI_OFF');
}
