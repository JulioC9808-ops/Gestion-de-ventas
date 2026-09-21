import { registerPlugin } from '@capacitor/core';

interface WiFiDirectPluginInterface {
  startShare(options: { token: string; payload: string }): Promise<{ port: number }>;
  stopShare(): Promise<void>;
  receiveShare(options: { token: string; port: number }): Promise<{ payload: string }>;
  cancelReceive(): Promise<void>;
}

export const WiFiDirect = registerPlugin<WiFiDirectPluginInterface>('WiFiDirect');

export const WD_QR_PREFIX = 'GVWD:';

export function buildWDQr(token: string, port: number): string {
  return `${WD_QR_PREFIX}${token}|${port}`;
}

export function parseWDQr(raw: string): { token: string; port: number } | null {
  if (!raw.startsWith(WD_QR_PREFIX)) return null;
  const body = raw.slice(WD_QR_PREFIX.length);
  const [token, portStr] = body.split('|');
  const port = Number(portStr);
  if (!token || !Number.isFinite(port) || port <= 0) return null;
  return { token, port };
}
