import type { Product, StockItem, StockMovement, User, ShiftReport, AppSettings } from '@/types';
import { isMobileDevice } from '@/lib/platform';
import { LocalNotifications } from '@capacitor/local-notifications';
import { loadCachedRates, applyIncomingRatesSnapshot, type ElToqueSnapshot } from '@/lib/elToque';

export interface FullBackupData {
  version: string;
  exportedAt: string;
  app: string;
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  users: User[];
  reports: ShiftReport[];
  settings: AppSettings;
  ratesSnapshot?: ElToqueSnapshot | null;
}

const BACKUP_MAGIC_HEADER = 'GV_SECURE_BACKUP_V2';
const OBFUSCATION_KEY = 'GV#Enterprise#Secure#Data#V2!2026';

export const STORAGE_AUTO_BACKUP_LATEST = 'gv_auto_backup_latest';
export const STORAGE_AUTO_BACKUP_OLD = 'gv_auto_backup_old';
export const STORAGE_AUTO_BACKUP_LAST_DATE = 'gv_auto_backup_last_date';
export const STORAGE_AUTO_BACKUP_LAST_DAY = 'gv_auto_backup_last_day';

/**
 * Filtra y sanitiza las configuraciones para incluir ÚNICAMENTE datos operativos críticos.
 * EXCLUYE temas visuales, fuentes, colores y fondos para evitar conflictos o bucles por errores de interfaz.
 */
export function sanitizeSettingsForBackup(settings: AppSettings): AppSettings {
  return {
    businessName: settings.businessName || 'Mi Negocio',
    defaultSalaryPercent: Number(settings.defaultSalaryPercent ?? 2),
    salaryByPercentEnabled: Boolean(settings.salaryByPercentEnabled),
    salesChartResetAt: settings.salesChartResetAt || null,
    welcomeGreetingsEnabled: settings.welcomeGreetingsEnabled ?? true,
    soundEffectsEnabled: settings.soundEffectsEnabled ?? true,
    quoteLanguages: settings.quoteLanguages || ['es'],
    // Configuración base limpia sin estilos visuales conflictivos
    theme: 'white',
    font: 'inter',
    fontColor: null,
    backgroundUrl: null,
    logoUrl: settings.logoUrl || null,
    qrUrl: null,
    navPosition: 'side',
    eulaText: settings.eulaText || null,
    telegramUrl: settings.telegramUrl || null,
    githubUpdatesUrl: settings.githubUpdatesUrl || null,
    announcementUrl: settings.announcementUrl || null,
    introVideoUrl: null,
    introEnabled: false,
  };
}

/**
 * Calcula un checksum estricto de integridad para detectar cualquier manipulación externa.
 */
function calculateChecksum(str: string): string {
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ (char * (i + 1));
  }
  const part1 = (hash1 >>> 0).toString(16).padStart(8, '0');
  const part2 = (hash2 >>> 0).toString(16).padStart(8, '0');
  return `${part1}${part2}`;
}

/**
 * Ofusca los datos para que no se puedan leer ni modificar en editores de texto.
 */
function obfuscateData(plainJson: string): string {
  const keyLen = OBFUSCATION_KEY.length;
  const encoded = encodeURIComponent(plainJson);
  const chars: string[] = [];
  
  for (let i = 0; i < encoded.length; i++) {
    const code = encoded.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % keyLen);
    chars.push(String.fromCharCode(code));
  }
  
  const rawObfuscated = chars.join('');
  return btoa(unescape(encodeURIComponent(rawObfuscated)));
}

/**
 * Desofusca y verifica la integridad del archivo.
 */
function deobfuscateData(encodedPayload: string): string {
  const keyLen = OBFUSCATION_KEY.length;
  const rawObfuscated = decodeURIComponent(escape(atob(encodedPayload)));
  const chars: string[] = [];

  for (let i = 0; i < rawObfuscated.length; i++) {
    const code = rawObfuscated.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % keyLen);
    chars.push(String.fromCharCode(code));
  }

  const restored = decodeURIComponent(chars.join(''));
  return restored;
}

/**
 * Envía una notificación a la barra de estado de Android y al sistema
 */
export async function sendSystemNotification(title: string, body: string): Promise<void> {
  // 1. Notificación Nativa en Android / Móvil con Capacitor
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      await LocalNotifications.requestPermissions();
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Date.now() % 100000),
          title,
          body,
          schedule: { at: new Date(Date.now() + 200) },
          sound: undefined,
          smallIcon: 'ic_launcher',
        },
      ],
    });
    return;
  } catch {
    // Continuar con fallback
  }

  // 2. Notificación en navegador / Electron (Notification API)
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
        return;
      } else if (Notification.permission !== 'denied') {
        const req = await Notification.requestPermission();
        if (req === 'granted') {
          new Notification(title, { body, icon: '/favicon.ico' });
          return;
        }
      }
    }
  } catch {
    // Ignorar si no está soportado
  }
}

/**
 * Crea el paquete de datos limpio (sin temas ni estilos)
 */
export function buildCleanBackupPayload(data: {
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  users: User[];
  reports: ShiftReport[];
  settings: AppSettings;
}): FullBackupData {
  return {
    version: '1.3.8',
    exportedAt: new Date().toISOString(),
    app: 'GestionVentas',
    products: data.products || [],
    stock: data.stock || [],
    movements: data.movements || [],
    users: data.users || [],
    reports: data.reports || [],
    settings: sanitizeSettingsForBackup(data.settings),
    ratesSnapshot: loadCachedRates(),
  };
}

/**
 * Descarga o comparte el archivo de respaldo seguro.
 * NO incluye licencias ni identificadores de máquina ni temas visuales conflictivos.
 */
export async function exportBackupFile(data: {
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  users: User[];
  reports: ShiftReport[];
  settings: AppSettings;
}): Promise<boolean> {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;
  const filename = `backup_gestion_ventas_${dateStr}.gvbak`;

  const backupPayload = buildCleanBackupPayload(data);
  const plainJson = JSON.stringify(backupPayload);
  const checksum = calculateChecksum(plainJson);
  const obfuscated = obfuscateData(plainJson);
  const finalFileContent = `${BACKUP_MAGIC_HEADER}::${checksum}::${obfuscated}`;

  const blob = new Blob([finalFileContent], { type: 'application/octet-stream' });

  // Soporte Web Share en móviles Android/iOS
  if (isMobileDevice() && navigator.share && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'application/octet-stream' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Copia de Seguridad',
          text: `Copia de seguridad del sistema de ventas (${dateStr})`,
        });
        return true;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        return false;
      }
    }
  }

  // Descarga directa
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Parsea, desofusca y valida el contenido de un archivo de respaldo.
 * Si fue editado o alterado manualmente, rechaza la restauración.
 */
export async function parseBackupFile(file: File): Promise<FullBackupData> {
  const text = (await file.text()).trim();
  return parseBackupString(text);
}

export function parseBackupString(text: string): FullBackupData {
  let plainJson = '';

  if (text.startsWith(BACKUP_MAGIC_HEADER)) {
    const parts = text.split('::');
    if (parts.length !== 3) {
      throw new Error('El archivo de respaldo está corrupto o tiene una estructura inválida.');
    }

    const expectedChecksum = parts[1];
    const encodedPayload = parts[2];

    try {
      plainJson = deobfuscateData(encodedPayload);
    } catch {
      throw new Error('No se pudo descifrar el archivo. Ha sido modificado o está dañado.');
    }

    const actualChecksum = calculateChecksum(plainJson);
    if (actualChecksum !== expectedChecksum) {
      throw new Error('Integridad violada: El archivo de copia de seguridad fue editado manualmente o está dañado.');
    }
  } else {
    // Archivo JSON estándar
    try {
      plainJson = text;
    } catch {
      throw new Error('Formato de archivo desconocido o incompatible.');
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(plainJson);
  } catch {
    throw new Error('El contenido del respaldo no es legible.');
  }

  const p = parsed as Partial<FullBackupData>;

  if (!p || typeof p !== 'object') {
    throw new Error('El archivo no contiene un formato de respaldo válido.');
  }

  if (!Array.isArray(p.products) && !Array.isArray(p.users) && !Array.isArray(p.reports)) {
    throw new Error('El archivo no contiene datos reconocibles del sistema.');
  }

  if (p.ratesSnapshot) {
    applyIncomingRatesSnapshot(p.ratesSnapshot);
  }

  return {
    version: p.version || '1.0.0',
    exportedAt: p.exportedAt || new Date().toISOString(),
    app: p.app || 'GestionVentas',
    products: Array.isArray(p.products) ? p.products : [],
    stock: Array.isArray(p.stock) ? p.stock : [],
    movements: Array.isArray(p.movements) ? p.movements : [],
    users: Array.isArray(p.users) ? p.users : [],
    reports: Array.isArray(p.reports) ? p.reports : [],
    settings: p.settings && typeof p.settings === 'object' ? sanitizeSettingsForBackup(p.settings as AppSettings) : ({} as AppSettings),
    ratesSnapshot: p.ratesSnapshot,
  };
}

/**
 * Ejecuta el respaldo silencioso automático:
 * - Rota el backup anterior a `Backup.old` (penúltima copia)
 * - Guarda la nueva copia en `latest`
 * - Emite la notificación nativa en la barra de notificaciones: "Copia De Seguridad actualizada con exito"
 */
export async function executeSilentAutoBackup(data: {
  products: Product[];
  stock: StockItem[];
  movements: StockMovement[];
  users: User[];
  reports: ShiftReport[];
  settings: AppSettings;
}): Promise<boolean> {
  try {
    // Si no hay datos mínimos para respaldar (ej. app vacía), no hacer nada
    if ((!data.products || data.products.length === 0) && (!data.users || data.users.length === 0)) {
      return false;
    }

    const backupPayload = buildCleanBackupPayload(data);
    const plainJson = JSON.stringify(backupPayload);
    const checksum = calculateChecksum(plainJson);
    const obfuscated = obfuscateData(plainJson);
    const finalFileContent = `${BACKUP_MAGIC_HEADER}::${checksum}::${obfuscated}`;

    // 1. Rotación: El actual pasa a ser el penúltimo (Backup.old)
    const currentLatest = localStorage.getItem(STORAGE_AUTO_BACKUP_LATEST);
    if (currentLatest) {
      localStorage.setItem(STORAGE_AUTO_BACKUP_OLD, currentLatest);
    }

    // 2. Guardar el nuevo como más reciente
    localStorage.setItem(STORAGE_AUTO_BACKUP_LATEST, finalFileContent);
    const nowIso = new Date().toISOString();
    const todayKey = nowIso.slice(0, 10);
    localStorage.setItem(STORAGE_AUTO_BACKUP_LAST_DATE, nowIso);
    localStorage.setItem(STORAGE_AUTO_BACKUP_LAST_DAY, todayKey);

    // 3. Notificación del sistema en la barra de notificaciones
    await sendSystemNotification(
      'Gestión de Ventas',
      'Copia De Seguridad actualizada con éxito'
    );

    return true;
  } catch (err) {
    console.error('Error al realizar auto-backup silencioso:', err);
    return false;
  }
}

/**
 * Información de estado de las copias automáticas guardadas
 */
export function getAutoBackupInfo(): {
  hasLatest: boolean;
  hasOld: boolean;
  lastDate: string | null;
  lastDay: string | null;
  latestData: FullBackupData | null;
  oldData: FullBackupData | null;
} {
  const lastDate = localStorage.getItem(STORAGE_AUTO_BACKUP_LAST_DATE);
  const lastDay = localStorage.getItem(STORAGE_AUTO_BACKUP_LAST_DAY);
  const latestRaw = localStorage.getItem(STORAGE_AUTO_BACKUP_LATEST);
  const oldRaw = localStorage.getItem(STORAGE_AUTO_BACKUP_OLD);

  let latestData: FullBackupData | null = null;
  let oldData: FullBackupData | null = null;

  if (latestRaw) {
    try {
      latestData = parseBackupString(latestRaw);
    } catch {
      latestData = null;
    }
  }

  if (oldRaw) {
    try {
      oldData = parseBackupString(oldRaw);
    } catch {
      oldData = null;
    }
  }

  return {
    hasLatest: Boolean(latestData),
    hasOld: Boolean(oldData),
    lastDate,
    lastDay,
    latestData,
    oldData,
  };
}

/**
 * Borra absolutamente toda la memoria y datos locales de la aplicación
 * (Cierres de turno, productos, usuarios, temas, fuentes, imágenes y configuraciones)
 * y reinicia el sistema limpio en valores de fábrica.
 */
export function resetAllToFactoryDefaults(): void {
  try {
    localStorage.clear();
  } catch {
    // Ignorar
  }

  try {
    sessionStorage.clear();
  } catch {
    // Ignorar
  }

  // Eliminar bases de datos IndexedDB si existen
  if (typeof window !== 'undefined' && window.indexedDB) {
    try {
      if (window.indexedDB.databases) {
        window.indexedDB.databases().then(databases => {
          for (const db of databases) {
            if (db.name) {
              window.indexedDB.deleteDatabase(db.name);
            }
          }
        }).catch(() => {});
      }
    } catch {
      // Ignorar
    }
  }

  // Recarga forzada para arrancar en estado inicial de fábrica
  setTimeout(() => {
    window.location.href = window.location.origin + window.location.pathname;
  }, 100);
}
