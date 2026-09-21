// Licencia de dispositivos vinculados por QR del admin (solo modo EMPLEADO).
// v3: duración configurable (24 h por defecto, o la licencia del admin, o permanente),
// expiresAt explícito, anti-reloj-retrocedido y re-escaneo que nunca acorta.

const KEY = 'employee_license';
const CLOCK_KEY = 'employee_license_last_seen';

export const H24_MS = 24 * 60 * 60 * 1000;
/** Compat con importaciones viejas */
export const EMPLOYEE_LICENSE_HOURS = 24;

export interface LinkedLicense {
  username: string;
  role: 'employee';
  activatedAt: number;
  /** Expiración (epoch ms). null = permanente. */
  expiresAt: number | null;
}

/** Anti-trampa: si el reloj retrocedió respecto a la última apertura, usamos la última fecha vista. */
function nowClamped(): number {
  try {
    const last = Number(localStorage.getItem(CLOCK_KEY) || 0);
    const now = Date.now();
    const safe = last > 0 && now < last ? last : now;
    localStorage.setItem(CLOCK_KEY, String(safe));
    return safe;
  } catch {
    return Date.now();
  }
}

export function readLinkedLicense(): LinkedLicense | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.activatedAt !== 'number' || typeof parsed?.username !== 'string') return null;
    // Migración v2 (solo 24 h, sin expiresAt): lo calculamos.
    const expiresAt = parsed.expiresAt === null || parsed.expiresAt === undefined
      ? parsed.activatedAt + H24_MS
      : Number(parsed.expiresAt) || null;
    return { username: parsed.username, role: 'employee', activatedAt: parsed.activatedAt, expiresAt };
  } catch {
    return null;
  }
}

/** Guarda/actualiza. Re-escanear NUNCA acorta: conserva la expiración más lejana. */
export function saveLinkedLicense(username: string, expiresAt: number | null): LinkedLicense {
  const prev = readLinkedLicense();
  const now = nowClamped();
  let finalExpiry = expiresAt;
  if (prev && prev.username === username && prev.expiresAt !== null) {
    finalExpiry = finalExpiry === null ? null : Math.max(finalExpiry, prev.expiresAt);
  }
  const lic: LinkedLicense = {
    username,
    role: 'employee',
    activatedAt: prev && prev.username === username ? prev.activatedAt : now,
    expiresAt: finalExpiry,
  };
  localStorage.setItem(KEY, JSON.stringify(lic));
  return lic;
}

// --- Alias de compatibilidad con código viejo ---
export function readEmployeeLicense(): LinkedLicense | null {
  return readLinkedLicense();
}
export function saveEmployeeLicense(username: string): LinkedLicense {
  return saveLinkedLicense(username, nowClamped() + H24_MS);
}
export function employeeHoursRemaining(lic: LinkedLicense | null = readLinkedLicense()): number {
  return hoursRemaining(lic);
}

export function clearEmployeeLicense() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(CLOCK_KEY);
}

export function isEmployeeLicenseActive(lic: LinkedLicense | null = readLinkedLicense()): boolean {
  if (!lic) return false;
  if (lic.expiresAt === null) return true;
  return nowClamped() < lic.expiresAt;
}

export function hoursRemaining(lic: LinkedLicense | null = readLinkedLicense()): number {
  if (!lic) return 0;
  if (lic.expiresAt === null) return Infinity;
  return Math.max(0, Math.ceil((lic.expiresAt - nowClamped()) / (60 * 60 * 1000)));
}

export function daysRemaining(lic: LinkedLicense | null = readLinkedLicense()): number {
  if (!lic) return 0;
  if (lic.expiresAt === null) return Infinity;
  return Math.max(0, Math.ceil((lic.expiresAt - nowClamped()) / (24 * 60 * 60 * 1000)));
}
