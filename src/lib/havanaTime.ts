/**
 * ============================================================================
 * UTILIDADES DE TIEMPO Y DETECCIÓN DE TURNOS (ZONA HORARIA LA HABANA / RED)
 * ============================================================================
 * - Garantiza que los cierres de turno, ventas y reportes se registren con
 *   la hora y fecha oficial de Cuba (America/Havana).
 * - Sincroniza automáticamente la hora con la red para corregir dispositivos
 *   con reloj desfasado o fecha incorrecta.
 * - Clasifica con precisión los 3 turnos oficiales:
 *     - Turno Mañana:   06:00 a 13:59 (06:00 AM - 02:00 PM)
 *     - Turno Tarde:    14:00 a 22:59 (02:00 PM - 11:00 PM)
 *     - Turno Nocturno: 23:00 a 05:59 (11:00 PM - 06:00 AM)
 * - Detección inteligente para TODOS los turnos según la hora de inicio de sesión:
 *     - Si inicia sesión en la mañana (6 AM - 2 PM) -> Turno Mañana (incluso si cierra en la tarde).
 *     - Si inicia sesión en la tarde (2 PM - 11 PM) -> Turno Tarde (incluso si cierra de madrugada a la 1 AM o 2 AM).
 *     - Si inicia sesión en la noche (11 PM - 6 AM) -> Turno Nocturno (incluso si cierra en la mañana a las 7 AM u 8 AM).
 * - Control de turnos únicos por jornada: En un mismo día NO puede haber turnos duplicados
 *   (ni 2 de Mañana, ni 2 de Tarde, ni 2 de Noche). El sistema avanza automáticamente
 *   al siguiente turno disponible de la jornada.
 */

const STORAGE_OFFSET_KEY = 'gv_havana_clock_offset_ms';
const STORAGE_LOGIN_TIME_KEY = 'gv_session_login_time';
export const HAVANA_TIMEZONE = 'America/Havana';

let clockSkewMs = 0;
try {
  const saved = localStorage.getItem(STORAGE_OFFSET_KEY);
  if (saved) {
    const num = Number(saved);
    if (!isNaN(num) && Math.abs(num) < 30 * 24 * 60 * 60 * 1000) {
      clockSkewMs = num;
    }
  }
} catch {
  // Silencioso
}

/**
 * Obtiene la fecha y hora actual corregida por sincronización de red
 */
export function getHavanaNow(): Date {
  return new Date(Date.now() + clockSkewMs);
}

/**
 * Registra la hora exacta en la que el usuario inició sesión
 */
export function recordSessionLoginTime(date?: Date | string | number): void {
  try {
    const d = date ? (date instanceof Date ? date : new Date(date)) : getHavanaNow();
    localStorage.setItem(STORAGE_LOGIN_TIME_KEY, d.toISOString());
  } catch {
    // Silencioso
  }
}

/**
 * Obtiene la hora en que se inició sesión en la sesión actual
 */
export function getSessionLoginTime(): Date | null {
  try {
    const saved = localStorage.getItem(STORAGE_LOGIN_TIME_KEY);
    if (!saved) return null;
    const d = new Date(saved);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Limpia la marca de hora de inicio de sesión
 */
export function clearSessionLoginTime(): void {
  try {
    localStorage.removeItem(STORAGE_LOGIN_TIME_KEY);
  } catch {
    // Silencioso
  }
}

/**
 * Obtiene la hora actual (0-23) en la zona horaria de La Habana
 */
export function getHavanaHour(d?: Date | string | number): number {
  const target = d ? (d instanceof Date ? d : new Date(d)) : getHavanaNow();
  if (isNaN(target.getTime())) return 12;
  try {
    const str = target.toLocaleTimeString('en-US', {
      timeZone: HAVANA_TIMEZONE,
      hour12: false,
      hour: '2-digit',
    });
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? target.getHours() : parsed % 24;
  } catch {
    return target.getHours();
  }
}

export type ShiftType = 'morning' | 'afternoon' | 'night';

/**
 * Determina el turno según la hora de La Habana:
 * - Turno Mañana:   06:00 a 13:59 (06:00 AM a 01:59 PM)
 * - Turno Tarde:    14:00 a 22:59 (02:00 PM a 10:59 PM)
 * - Turno Nocturno: 23:00 a 05:59 (11:00 PM a 05:59 AM)
 */
export function detectShiftType(date?: Date | string | number): ShiftType {
  const hour = getHavanaHour(date);
  if (hour >= 6 && hour < 14) {
    return 'morning';
  }
  if (hour >= 14 && hour < 23) {
    return 'afternoon';
  }
  return 'night';
}

export interface ClosedShiftsToday {
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  totalClosed: number;
}

/**
 * Obtiene el mapa de turnos ya cerrados hoy según la fecha oficial de La Habana
 */
export function getClosedShiftsForDate(
  reports?: Array<{ date: string; closedAt?: string; shift?: string }>,
  targetDate?: Date | string | number
): ClosedShiftsToday {
  const target = targetDate ? (targetDate instanceof Date ? targetDate : new Date(targetDate)) : getHavanaNow();
  const dateStr = formatHavanaDate(target, true);

  const closed = {
    morning: false,
    afternoon: false,
    night: false,
    totalClosed: 0,
  };

  if (!reports || !Array.isArray(reports)) return closed;

  reports.forEach(r => {
    const reportDateStr = formatHavanaDate(r.closedAt || r.date, true);
    if (reportDateStr === dateStr) {
      const s = (r.shift || '').toLowerCase();
      if (s === 'morning' || s.includes('mañana')) {
        closed.morning = true;
      } else if (s === 'afternoon' || s.includes('tarde')) {
        closed.afternoon = true;
      } else if (s === 'night' || s.includes('noche') || s.includes('nocturno')) {
        closed.night = true;
      }
    }
  });

  closed.totalClosed = (closed.morning ? 1 : 0) + (closed.afternoon ? 1 : 0) + (closed.night ? 1 : 0);
  return closed;
}

/**
 * Comprueba si un turno específico ya fue cerrado hoy
 */
export function isShiftAlreadyClosedToday(
  shift: ShiftType,
  reports?: Array<{ date: string; closedAt?: string; shift?: string }>,
  targetDate?: Date | string | number
): boolean {
  const closed = getClosedShiftsForDate(reports, targetDate);
  return closed[shift];
}

/**
 * Detección inteligente de turno:
 * 1. Toma en cuenta la hora de inicio de sesión para TODOS los turnos:
 *    - Inició sesión 6 AM a 2 PM -> Turno Mañana (incluso si cierra en la tarde)
 *    - Inició sesión 2 PM a 11 PM -> Turno Tarde (incluso si cierra de madrugada a la 1 AM o 2 AM)
 *    - Inició sesión 11 PM a 6 AM -> Turno Nocturno (incluso si cierra a las 7 AM u 8 AM)
 * 2. Control de duplicados para TODOS los turnos:
 *    Si el turno base ya fue cerrado en el día, avanza automáticamente al siguiente turno
 *    disponible de la jornada (Mañana -> Tarde -> Nocturno), garantizando turnos únicos y ordenados.
 */
export function detectSmartShift(options?: {
  loginTime?: Date | string | null;
  existingDayReports?: Array<{ date: string; closedAt?: string; shift?: string }>;
  currentDate?: Date | string | number;
}): ShiftType {
  const now = options?.currentDate ? (options.currentDate instanceof Date ? options.currentDate : new Date(options.currentDate)) : getHavanaNow();
  const closed = getClosedShiftsForDate(options?.existingDayReports, now);

  // 1. Determinar turno base según hora de inicio de sesión (o hora actual si no hay registro)
  let baseShift: ShiftType | null = null;
  const login = options?.loginTime ? (options.loginTime instanceof Date ? options.loginTime : new Date(options.loginTime)) : getSessionLoginTime();

  if (login && !isNaN(login.getTime())) {
    const loginHour = getHavanaHour(login);
    if (loginHour >= 6 && loginHour < 14) {
      baseShift = 'morning';
    } else if (loginHour >= 14 && loginHour < 23) {
      baseShift = 'afternoon';
    } else {
      baseShift = 'night';
    }
  }

  if (!baseShift) {
    baseShift = detectShiftType(now);
  }

  // 2. Control riguroso de duplicidad: si el turno base ya está cerrado hoy, buscar el siguiente turno libre
  if (baseShift === 'morning' && closed.morning) {
    if (!closed.afternoon) {
      baseShift = 'afternoon';
    } else if (!closed.night) {
      baseShift = 'night';
    }
  } else if (baseShift === 'afternoon' && closed.afternoon) {
    if (!closed.night) {
      baseShift = 'night';
    } else if (!closed.morning) {
      baseShift = 'morning';
    }
  } else if (baseShift === 'night' && closed.night) {
    if (!closed.morning) {
      baseShift = 'morning';
    } else if (!closed.afternoon) {
      baseShift = 'afternoon';
    }
  }

  return baseShift;
}

/**
 * Devuelve etiqueta y badge descriptivo del turno
 */
export function getShiftInfo(shift: string | undefined): {
  key: ShiftType;
  label: string;
  icon: string;
  badgeClass: string;
  description: string;
} {
  const norm = (shift || '').toLowerCase();
  if (norm === 'morning' || norm.includes('mañana')) {
    return {
      key: 'morning',
      label: 'Turno Mañana',
      icon: '🌅',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      description: '06:00 AM – 02:00 PM',
    };
  }
  if (norm === 'afternoon' || norm.includes('tarde')) {
    return {
      key: 'afternoon',
      label: 'Turno Tarde',
      icon: '☀️',
      badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      description: '02:00 PM – 11:00 PM',
    };
  }
  return {
    key: 'night',
    label: 'Turno Nocturno',
    icon: '🌙',
    badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
    description: '11:00 PM – 06:00 AM',
  };
}

/**
 * Formatea solo la hora en formato 12 horas AM/PM (ej: "12:43 AM", "02:37 PM")
 */
export function formatHavanaTime(date?: Date | string | number): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleTimeString('es-CU', {
      timeZone: HAVANA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
  } catch {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  }
}

/**
 * Formatea la fecha localizada (ej: "27 sept 2026" o "27/09/2026")
 */
export function formatHavanaDate(date?: Date | string | number, short = false): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  try {
    if (short) {
      return d.toLocaleDateString('es-CU', {
        timeZone: HAVANA_TIMEZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    }
    return d.toLocaleDateString('es-CU', {
      timeZone: HAVANA_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d.toLocaleDateString();
  }
}

/**
 * Formatea fecha y hora combinadas (ej: "27/09/2026, 12:43 AM")
 */
export function formatHavanaDateTime(date?: Date | string | number): string {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '—';
  return `${formatHavanaDate(d, true)}, ${formatHavanaTime(d)}`;
}

/**
 * Genera la frase amigable de cierre:
 * Ej: "¨Mengano¨ finalizó el turno a las 12:43 AM" o "¨Fulano¨ a las 2:37 PM"
 */
export function formatClosureSummary(employeeName?: string, date?: Date | string | number): string {
  const name = (employeeName || 'Empleado').trim();
  const time = formatHavanaTime(date);
  return `“${name}” finalizó el turno a las ${time}`;
}

/**
 * Sincroniza la hora con la red al detectar conexión
 */
export async function syncHavanaNetworkTime(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // Intentar primero con la cabecera Date de GitHub o de Google
    const res = await fetch('https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/announcement.json?t=' + Date.now(), {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeout);

    if (res && res.headers && res.headers.get('date')) {
      const serverDateStr = res.headers.get('date');
      if (serverDateStr) {
        const serverMs = new Date(serverDateStr).getTime();
        if (!isNaN(serverMs) && serverMs > 1700000000000) {
          clockSkewMs = serverMs - Date.now();
          localStorage.setItem(STORAGE_OFFSET_KEY, String(clockSkewMs));
          return;
        }
      }
    }
  } catch {
    // Silencioso
  }
}

// Iniciar chequeo de sincronización de hora
if (typeof window !== 'undefined') {
  setTimeout(syncHavanaNetworkTime, 1000);
  window.addEventListener('online', () => {
    syncHavanaNetworkTime().catch(() => {});
  });
}
