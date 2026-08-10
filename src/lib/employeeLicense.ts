// Licencia "SOLO EMPLEADO": se activa escaneando el QR que le muestra el jefe
// y dura 24 horas. Al vencer, el empleado debe volver a escanear el QR del jefe,
// lo que obliga a mantener los datos sincronizados.

const KEY = 'employee_license';
export const EMPLOYEE_LICENSE_HOURS = 24;

export interface EmployeeLicense {
  username: string;
  activatedAt: number;
}

export function readEmployeeLicense(): EmployeeLicense | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.activatedAt !== 'number' || typeof parsed?.username !== 'string') return null;
    return parsed as EmployeeLicense;
  } catch {
    return null;
  }
}

export function saveEmployeeLicense(username: string) {
  const lic: EmployeeLicense = { username, activatedAt: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(lic));
  return lic;
}

export function clearEmployeeLicense() {
  localStorage.removeItem(KEY);
}

export function isEmployeeLicenseActive(lic: EmployeeLicense | null = readEmployeeLicense()): boolean {
  if (!lic) return false;
  return Date.now() - lic.activatedAt < EMPLOYEE_LICENSE_HOURS * 60 * 60 * 1000;
}

export function employeeHoursRemaining(lic: EmployeeLicense | null = readEmployeeLicense()): number {
  if (!lic) return 0;
  const ms = EMPLOYEE_LICENSE_HOURS * 60 * 60 * 1000 - (Date.now() - lic.activatedAt);
  return Math.max(0, Math.ceil(ms / (60 * 60 * 1000)));
}
