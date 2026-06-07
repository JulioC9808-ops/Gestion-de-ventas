// Manejo del turno pendiente de sincronizar (lado empleado)
const KEY = 'pendingShiftSync';

export interface PendingShift {
  reportId: string;
  employeeId: string;
}

export function getPendingShift(): PendingShift | null {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setPendingShift(p: PendingShift) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

export function clearPendingShift() {
  localStorage.removeItem(KEY);
}
