// Verificación de la licencia PRINCIPAL del dispositivo (la del dueño del negocio,
// no la de empleado). Lee 'license_state' con la misma lógica que LicenseGate:
// lifetime o timed con expiración explícita y ancla anti-reloj-retrocedido.
// La usa la sincronización entre administradores para exigir app licenciada.

const TIMED_DURATION_MS = 37 * 24 * 60 * 60 * 1000;
// Clave permanente (misma que LicenseGate; necesaria para migrar estados muy viejos)
const LIFETIME_LICENSE = '08022664107';

interface SimpleLicenseState {
  type: 'none' | 'lifetime' | 'timed';
  activatedAt?: number;
  expiresAt?: number;
  lastSeenAt?: number;
}

function readState(): SimpleLicenseState {
  try {
    const raw = localStorage.getItem('license_state');
    if (raw) {
      const s = JSON.parse(raw) as Record<string, unknown>;
      if (s.type === 'lifetime') {
        return {
          type: 'lifetime',
          lastSeenAt: typeof s.lastSeenAt === 'number' ? s.lastSeenAt : undefined,
        };
      }
      if (s.type === 'timed' && typeof s.activatedAt === 'number') {
        return {
          type: 'timed',
          activatedAt: s.activatedAt,
          expiresAt: typeof s.expiresAt === 'number' ? s.expiresAt : s.activatedAt + TIMED_DURATION_MS,
          lastSeenAt: typeof s.lastSeenAt === 'number' ? s.lastSeenAt : undefined,
        };
      }
      return { type: 'none' };
    }
    // Estados muy viejos: clave directa = permanente
    if (localStorage.getItem('license_key') === LIFETIME_LICENSE) {
      return { type: 'lifetime' };
    }
  } catch {
    // Silencioso
  }
  return { type: 'none' };
}

/** Anti-reloj: compara contra max(ahora, último arranque visto). */
function effectiveNow(state: SimpleLicenseState): number {
  const last = state.lastSeenAt || 0;
  const now = Date.now();
  return now < last ? last : now;
}

/** ¿Este dispositivo tiene licencia principal válida (permanente o vigente)? */
export function isDeviceLicensed(): boolean {
  const s = readState();
  if (s.type === 'lifetime') return true;
  if (s.type === 'timed' && typeof s.expiresAt === 'number') {
    return effectiveNow(s) < s.expiresAt;
  }
  return false;
}
