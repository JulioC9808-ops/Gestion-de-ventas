// Copia de seguridad completa (productos, stock, movimientos, usuarios y ajustes)
// que se transfiere entre dispositivos por códigos QR, sin internet.

import LZString from 'lz-string';
import type { Product, StockItem, StockMovement, User, AppSettings, ShiftReport } from '@/types';

export interface BackupPayload {
  v: 1;
  createdAt: string;
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  users: User[];
  reports?: ShiftReport[];
  settings: Partial<AppSettings>;
}

// Los ajustes con imágenes (dataURL) son enormes: no viajan por QR.
function slimSettings(settings: AppSettings): Partial<AppSettings> {
  const { logoUrl: _l, backgroundUrl: _b, qrUrl: _q, introVideoUrl: _i, ...rest } = settings;
  return rest;
}

export function buildBackup(data: {
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  users: User[];
  settings: AppSettings;
}): BackupPayload {
  return {
    v: 1,
    createdAt: new Date().toISOString(),
    products: data.products,
    stock: data.stock,
    movements: data.movements,
    users: data.users,
    settings: slimSettings(data.settings),
  };
}

export function encodeBackup(payload: BackupPayload): string {
  return LZString.compressToBase64(JSON.stringify(payload));
}

export function decodeBackup(encoded: string): BackupPayload | null {
  try {
    const json = LZString.decompressFromBase64(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json) as BackupPayload;
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ---- Fragmentación en varios QR ----
// Cada fragmento: SYNC:<id>:<index>/<total>:<datos>
const CHUNK_SIZE = 600;
const PREFIX = 'SYNC';

export function chunkPayload(encoded: string, id = shortId()): string[] {
  const total = Math.max(1, Math.ceil(encoded.length / CHUNK_SIZE));
  const out: string[] = [];
  for (let i = 0; i < total; i++) {
    out.push(`${PREFIX}:${id}:${i + 1}/${total}:${encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`);
  }
  return out;
}

export interface ParsedChunk {
  id: string;
  index: number;
  total: number;
  data: string;
}

export function parseChunk(text: string): ParsedChunk | null {
  if (!text.startsWith(`${PREFIX}:`)) return null;
  const parts = text.split(':');
  if (parts.length < 4) return null;
  const [, id, position] = parts;
  const data = parts.slice(3).join(':');
  const [idxRaw, totalRaw] = position.split('/');
  const index = Number(idxRaw);
  const total = Number(totalRaw);
  if (!id || !index || !total) return null;
  return { id, index, total, data };
}

export function joinChunks(chunks: Map<number, string>, total: number): string | null {
  if (chunks.size !== total) return null;
  let out = '';
  for (let i = 1; i <= total; i++) {
    const part = chunks.get(i);
    if (part === undefined) return null;
    out += part;
  }
  return out;
}

function shortId() {
  return Math.random().toString(36).slice(2, 8);
}
