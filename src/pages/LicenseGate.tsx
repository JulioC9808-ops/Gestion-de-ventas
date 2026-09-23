import React, { useEffect, useState } from 'react';
import { Shield, Key, MessageCircle, Clock, Infinity as InfinityIcon, QrCode, ScanLine, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QrDisplay from '@/components/QrDisplay';
import QrScannerModal from '@/components/QrScannerModal';
import { getDeviceId, isDesktop, type HardwareComponents } from '@/lib/machine';
import { isMobileDevice } from '@/lib/platform';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  readLinkedLicense, saveLinkedLicense, isEmployeeLicenseActive,
  daysRemaining, hoursRemaining, clearEmployeeLicense, H24_MS,
} from '@/lib/employeeLicense';
import { receiveEmployeeShare } from '@/lib/syncTransport';
import {
  verifyCryptographicLicense,
  formatFriendlyDeviceId,
  isTerminalIdBlocked,
  generateSignedTerminalReport,
} from '@/lib/cryptoLicense';
import { getLicenseStatus, initLicenseStatusChecker, subscribeLicenseStatus } from '@/lib/licenseStatus';
import { queueRegistryReport } from '@/lib/remoteRegistry';
import { toast } from 'sonner';

const LIFETIME_LICENSE = '08022664107';
const TIMED_LICENSE = 'J260208c';
const TIMED_DURATION_MS = 37 * 24 * 60 * 60 * 1000;
const DEV_WHATSAPP = '+5351616816';
const DEV_PHONE_TEL = 'tel:+5351616816';

interface LicenseGateProps {
  children: React.ReactNode;
}

interface DeviceInfo {
  id: string | null;
  hw: HardwareComponents | null;
}

export type LicenseState =
  | { type: 'none' }
  | {
      type: 'lifetime';
      method?: 'GVLIC' | 'LEGACY' | 'QR_SYNC';
      plan?: string;
      issuedAt?: number;
      deviceId?: string | null;
      hw?: HardwareComponents;
      rebound?: number;
      lastSeenAt?: number;
    }
  | {
      type: 'timed';
      method?: 'GVLIC' | 'LEGACY' | 'QR_SYNC';
      plan?: string;
      issuedAt?: number;
      activatedAt: number;
      expiresAt: number;
      deviceId?: string | null;
      hw?: HardwareComponents;
      rebound?: number;
      lastSeenAt?: number;
    };

const LICENSE_KEY = 'license_state';

function normalize(state: unknown): LicenseState {
  if (!state || typeof state !== 'object') return { type: 'none' };
  const s = state as Record<string, unknown>;
  if (s.type === 'lifetime') {
    return {
      type: 'lifetime',
      method: (s.method as 'GVLIC' | 'LEGACY' | 'QR_SYNC') || 'LEGACY',
      plan: typeof s.plan === 'string' ? s.plan : 'PERM',
      issuedAt: typeof s.issuedAt === 'number' ? s.issuedAt : undefined,
      deviceId: (typeof s.deviceId === 'string' ? s.deviceId : (typeof s.machineId === 'string' ? s.machineId : null)),
      hw: (s.hw as HardwareComponents | undefined),
      rebound: typeof s.rebound === 'number' ? s.rebound : undefined,
      lastSeenAt: typeof s.lastSeenAt === 'number' ? s.lastSeenAt : undefined,
    };
  }
  if (s.type === 'timed' && typeof s.activatedAt === 'number') {
    return {
      type: 'timed',
      method: (s.method as 'GVLIC' | 'LEGACY' | 'QR_SYNC') || 'LEGACY',
      plan: typeof s.plan === 'string' ? s.plan : 'T37',
      issuedAt: typeof s.issuedAt === 'number' ? s.issuedAt : undefined,
      activatedAt: s.activatedAt,
      expiresAt: typeof s.expiresAt === 'number' ? s.expiresAt : s.activatedAt + TIMED_DURATION_MS,
      deviceId: (typeof s.deviceId === 'string' ? s.deviceId : (typeof s.machineId === 'string' ? s.machineId : null)),
      hw: (s.hw as HardwareComponents | undefined),
      rebound: typeof s.rebound === 'number' ? s.rebound : undefined,
      lastSeenAt: typeof s.lastSeenAt === 'number' ? s.lastSeenAt : undefined,
    };
  }
  return { type: 'none' };
}

export function readLicense(): LicenseState {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    if (localStorage.getItem('license_key') === LIFETIME_LICENSE) {
      const state: LicenseState = { type: 'lifetime', method: 'LEGACY', plan: 'PERM' };
      localStorage.setItem(LICENSE_KEY, JSON.stringify(state));
      return state;
    }
  } catch {
    // Estado corrupto: se ignora
  }
  return { type: 'none' };
}

export function persistLicense(state: LicenseState): LicenseState {
  const withSeen: LicenseState = { ...state, lastSeenAt: Date.now() };
  localStorage.setItem(LICENSE_KEY, JSON.stringify(withSeen));
  return withSeen;
}

/** Anti-reloj: la expiración se compara contra max(ahora, último arranque visto). */
function effectiveNow(state: LicenseState): number {
  const last = state.type !== 'none' && state.lastSeenAt ? state.lastSeenAt : 0;
  const now = Date.now();
  return now < last ? last : now;
}

function isTimedActive(state: Extract<LicenseState, { type: 'timed' }>): boolean {
  return effectiveNow(state) < state.expiresAt;
}

/**
 * Verificación de dispositivo con tolerancia de hardware
 */
function checkMachine(state: LicenseState, device: DeviceInfo): 'ok' | 'rebind' | 'fail' {
  if (state.type === 'none') return 'ok';
  if (!device.id) return 'ok';
  if (!state.deviceId) return 'rebind';
  if (state.deviceId === device.id) return 'ok';
  if (isDesktop() && state.hw && device.hw) {
    const pairs: Array<[string, string]> = [
      [state.hw.disk, device.hw.disk],
      [state.hw.bios, device.hw.bios],
      [state.hw.cpu, device.hw.cpu],
      [state.hw.ram, device.hw.ram],
    ];
    const valid = pairs.filter(([a, b]) => a && b);
    const matches = valid.filter(([a, b]) => a === b).length;
    if (valid.length >= 3 && matches >= 3) return 'rebind';
  }
  if (!state.rebound) return 'rebind';
  return 'fail';
}

function rebind(state: LicenseState, device: DeviceInfo): LicenseState {
  if (state.type === 'none') return state;
  const base: LicenseState = {
    ...state,
    rebound: 1,
    deviceId: device.id || state.deviceId || null,
    hw: device.hw || state.hw,
  };
  return base;
}

function daysLeftOf(state: LicenseState): number {
  if (state.type !== 'timed') return 0;
  const ms = state.expiresAt - effectiveNow(state);
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const { login, logout } = useAuth();
  const { users, addUser, updateUser, applyBackup, settings, updateSettings } = useData();

  const [license, setLicense] = useState<LicenseState>(() => readLicense());
  const [device, setDevice] = useState<DeviceInfo | 'pending'>('pending');
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [empLicense, setEmpLicense] = useState(() => readLinkedLicense());
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('welcome_seen'));
  const mobile = isMobileDevice();

  const closeWelcome = () => {
    localStorage.setItem('welcome_seen', '1');
    setShowWelcome(false);
  };

  // Cargar el ID de dispositivo
  useEffect(() => {
    let alive = true;
    getDeviceId().then(d => { if (alive) setDevice(d); });
    return () => { alive = false; };
  }, []);

  // Inicializar chequeo remoto de licencias (cada 2h y al inicio)
  useEffect(() => {
    initLicenseStatusChecker();
    const unsub = subscribeLicenseStatus(() => {
      setDevice(prev => (prev === 'pending' ? prev : { ...prev }));
    });
    return unsub;
  }, []);

  // Verificar si el terminal está bloqueado por el desarrollador (local y remoto)
  const terminalRawId = device !== 'pending' ? device.id : null;
  const remoteStatus = getLicenseStatus(terminalRawId);
  const isBlocked = remoteStatus.isBlocked || isTerminalIdBlocked(terminalRawId, settings?.blockedTerminalIds);
  const blockedReason = remoteStatus.blockedReason || 'Este terminal ha sido suspendido por el desarrollador.';
  const allowActivations = remoteStatus.allowNewActivations && settings?.allowNewRegistrations !== false;

  // Verificar máquina una vez que el ID está cargado.
  useEffect(() => {
    if (device === 'pending') return;
    if (license.type === 'none') return;
    if (isBlocked) {
      localStorage.removeItem(LICENSE_KEY);
      setLicense({ type: 'none' });
      return;
    }
    const verdict = checkMachine(license, device);
    if (verdict === 'ok') return;
    if (verdict === 'rebind') {
      const next = persistLicense(rebind(license, device));
      setLicense(next);
      return;
    }
    localStorage.removeItem(LICENSE_KEY);
    setLicense({ type: 'none' });
    toast.error('La licencia no corresponde a este equipo. Actívala de nuevo.');
  }, [device, license, isBlocked]);

  // Re-chequeo horario + ancla anti-reloj cada 5 minutos.
  useEffect(() => {
    const id = setInterval(() => setLicense(readLicense()), 60 * 60 * 1000);
    const touch = setInterval(() => {
      const s = readLicense();
      if (s.type !== 'none') setLicense(persistLicense(s));
    }, 5 * 60 * 1000);
    return () => { clearInterval(id); clearInterval(touch); };
  }, []);

  const employeeActive = isEmployeeLicenseActive(empLicense);

  // Al caducar la licencia de empleado: cerrar sesión
  useEffect(() => {
    if (!empLicense) return;
    const id = setInterval(() => {
      const current = readLinkedLicense();
      if (current && !isEmployeeLicenseActive(current)) {
        clearEmployeeLicense();
        logout();
        setEmpLicense(null);
        toast.error('Tu licencia de empleado caducó. Escanea de nuevo el QR del Admin.');
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [empLicense, logout]);

  const licensed = !isBlocked && (employeeActive || (
    license.type === 'lifetime' ||
    (license.type === 'timed' && isTimedActive(license))
  ));

  const [copiedId, setCopiedId] = useState(false);
  const friendlyTerminalId = formatFriendlyDeviceId(device !== 'pending' ? device.id : null);

  const copyTerminalId = () => {
    let success = false;
    try {
      const ta = document.createElement('textarea');
      ta.value = friendlyTerminalId;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, 99999);
      success = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      success = false;
    }

    if (!success && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(friendlyTerminalId).catch(() => {});
    }
    setCopiedId(true);
    toast.success('ID de Terminal copiado al portapapeles');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const registerTerminalRecord = (
    method: 'GVLIC' | 'LEGACY' | 'QR_SYNC',
    planType: 'lifetime' | 'timed_37' | 'timed_30' | 'timed_90' | 'promo_custom',
    planLabel: string,
    expiresAt?: number | null,
    issuedAt?: number
  ) => {
    const existing = settings?.registeredTerminals || [];
    const nowIso = new Date().toISOString();
    const bName = settings?.businessName || 'Mi Negocio';

    const updated = [
      ...existing.filter(t => t.id !== friendlyTerminalId),
      {
        id: friendlyTerminalId,
        businessName: bName,
        planType,
        planLabel,
        status: 'active' as const,
        activatedAt: nowIso,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        lastSeenOnline: nowIso,
      }
    ];
    updateSettings({ registeredTerminals: updated });

    // Reporte firmado para el phone-home
    const signedReport = generateSignedTerminalReport({
      friendlyDeviceId: friendlyTerminalId,
      businessName: bName,
      users: users.map(u => ({ username: u.username, name: u.name || u.username, role: u.role as 'admin' | 'employee' })),
      method,
      plan: planLabel,
      issuedAt,
      expiresAt,
    });

    // Encolar phone-home silencioso (Función A)
    queueRegistryReport({
      friendlyDeviceId: friendlyTerminalId,
      businessName: bName,
      method,
      plan: planLabel,
      issuedAt,
      expiresAt,
      timestamp: Date.now(),
      report: signedReport,
    });
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      setError(`🚫 Terminal Suspendido: ${blockedReason}. Comunícate con Julio_GE al WhatsApp +5351616816.`);
      return;
    }
    if (!allowActivations && license.type === 'none') {
      setError('Las nuevas activaciones de licencias están pausadas temporalmente por el desarrollador.');
      return;
    }

    const trimmed = key.trim();
    const currentDevId = (device !== 'pending' && device?.id) ? device.id : 'GV-DEV-LOCAL';

    if (trimmed === LIFETIME_LICENSE) {
      const state = persistLicense({ type: 'lifetime', method: 'LEGACY', plan: 'PERM' } as LicenseState);
      setLicense(state);
      registerTerminalRecord('LEGACY', 'lifetime', 'Permanente Directa (Default)');
      toast.success('¡Licencia Permanente activada con éxito!');
    } else if (trimmed === TIMED_LICENSE) {
      const expiresAt = Date.now() + TIMED_DURATION_MS;
      const state = persistLicense({
        type: 'timed',
        method: 'LEGACY',
        plan: 'T37',
        activatedAt: Date.now(),
        expiresAt,
      } as LicenseState);
      setLicense(state);
      registerTerminalRecord('LEGACY', 'timed_37', 'Periódica Mensual (37d Legacy)', expiresAt);
      toast.success('¡Licencia Periódica activada con éxito!');
    } else if (trimmed.toUpperCase().startsWith('GVLIC-')) {
      // Verificación Criptográfica Asimétrica Offline
      const res = verifyCryptographicLicense(trimmed, currentDevId);
      if (res.valid) {
        if (res.type === 'lifetime') {
          const state = persistLicense({
            type: 'lifetime',
            method: 'GVLIC',
            plan: 'PERM',
            issuedAt: res.issuedAt,
            deviceId: currentDevId,
          } as LicenseState);
          setLicense(state);
          registerTerminalRecord('GVLIC', 'lifetime', 'Permanente GVLIC', null, res.issuedAt);
          toast.success('¡Licencia Permanente Offline validada y activada!');
        } else {
          const state = persistLicense({
            type: 'timed',
            method: 'GVLIC',
            plan: res.plan,
            issuedAt: res.issuedAt,
            deviceId: currentDevId,
            activatedAt: Date.now(),
            expiresAt: res.expiresAt,
          } as LicenseState);
          setLicense(state);
          const label = res.days === 90 ? 'Promo Trimestral (90d)' : `Periódica (${res.days}d)`;
          registerTerminalRecord('GVLIC', res.days === 90 ? 'timed_90' : 'timed_37', label, res.expiresAt, res.issuedAt);
          toast.success(`¡Licencia autorizada por ${res.days} días activada con éxito!`);
        }
      } else {
        setError(res.reason || 'Clave de licencia criptográfica no válida');
      }
    } else {
      setError('Clave de producto inválida. Verifica que esté bien escrita o solicita tu clave para este terminal.');
    }
  };

  // Activación de EMPLEADO con UN solo QR
  const [receiving, setReceiving] = useState(false);

  const handleEmployeeScan = async (text: string) => {
    if (receiving) return;
    const raw = (text || '').trim();
    setReceiving(true);
    try {
      const packet = await receiveEmployeeShare(raw);
      if (!packet) {
        toast.error('Este no es el QR de activación que te dio el Admin.');
        return;
      }

      const anyPacket = packet as unknown as { role?: string };
      if (anyPacket.role === 'admin' || !('account' in packet)) {
        toast.error('Este QR es de sincronización entre administradores: solo funciona con sesión de Administrador abierta y la app licenciada.');
        return;
      }

      // 1) Aplicar datos del jefe
      applyBackup(packet.backup);

      // 2) Cuenta de empleado
      const { u, p, n, s: sal, h } = packet.account;
      const existing = users.find(x => x.username === u);
      if (existing) {
        updateUser({ ...existing, password: p, role: 'employee', name: n || existing.name });
      } else {
        addUser({
          username: u,
          password: p,
          name: n || u,
          role: 'employee',
          salaryPercent: typeof sal === 'number' ? sal : undefined,
          passwordHint: h ?? null,
        } as never);
      }

      // 3) Licencia
      const grant = packet.license;
      let expiresAt: number | null;
      if (!grant) {
        expiresAt = Date.now() + H24_MS;
      } else if (grant.mode === 'permanent') {
        expiresAt = null;
      } else if (grant.mode === 'admin') {
        expiresAt = grant.expiresAt ?? null;
      } else {
        if (grant.issuedAt && grant.issuedAt < Date.now() - 7 * 24 * 60 * 60 * 1000) {
          toast.error('Este QR es muy antiguo. Pide al Admin que genere otro.');
          return;
        }
        expiresAt = Date.now() + H24_MS;
      }

      const lic = saveLinkedLicense(u, expiresAt);
      setEmpLicense(lic);

      // Registrar phone-home silencioso para el empleado
      const bName = settings?.businessName || 'Mi Negocio';
      queueRegistryReport({
        friendlyDeviceId: friendlyTerminalId,
        businessName: bName,
        method: 'QR_SYNC',
        plan: 'Empleado (QR Sync)',
        expiresAt,
        timestamp: Date.now(),
      });

      setTimeout(() => {
        if (login(u, p)) {
          setScanOpen(false);
          const remaining = lic.expiresAt === null
            ? 'permanente'
            : daysRemaining(lic) >= 1
              ? `${daysRemaining(lic)} día(s)`
              : `${hoursRemaining(lic)} h`;
          toast.success(`Datos recibidos. Licencia de empleado activa: ${remaining}.`);
        } else {
          clearEmployeeLicense();
          setEmpLicense(null);
          toast.error('No se pudo activar con ese QR. Pide al admin que lo genere otra vez.');
        }
      }, 200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo recibir los datos del admin.');
    } finally {
      setReceiving(false);
    }
  };

  const WelcomeDialog = (
    <Dialog open={showWelcome} onOpenChange={(o) => { if (!o) closeWelcome(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-center">¡Te damos la bienvenida al Sistema!</DialogTitle>
        </DialogHeader>
        <div className="space-y-3.5 text-sm leading-relaxed text-muted-foreground pt-2">
          <p className="text-foreground font-medium">
            Una plataforma completa diseñada para optimizar la gestión comercial de tu negocio:
          </p>
          <ul className="space-y-2 list-disc list-inside text-xs sm:text-sm pl-1">
            <li>Control de existencias tanto en almacén como en punto de venta.</li>
            <li>Registro ágil de pedidos, cierres de turno y conciliación de caja.</li>
            <li>Historial de movimientos, reportes financieros y liquidación de salarios.</li>
          </ul>
          <p className="text-xs pt-1 border-t border-border/50">
            Para soporte técnico, consultas o asistencia con tu licencia, puedes comunicarte en cualquier momento a través de los canales de atención directa.
          </p>
        </div>
        <Button onClick={closeWelcome} className="w-full mt-2 font-semibold">Comenzar</Button>
      </DialogContent>
    </Dialog>
  );

  if (licensed) return <>{children}{WelcomeDialog}</>;

  const expired = license.type === 'timed' && !isTimedActive(license);
  const expiredDays = license.type === 'timed' ? daysLeftOf(license) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(0 0% 8%), hsl(0 0% 14%), hsl(0 0% 20%))' }}>
      <div className="w-full max-w-md mx-auto animate-fade-in-up">
        <div className="glass-card p-8 sm:p-10 border border-border/70 shadow-2xl">
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-md ring-2 ring-primary/20">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-gradient font-display text-center">Activación de Licencia</h1>
            <p className="text-muted-foreground text-sm mt-1.5 text-center leading-relaxed">
              {expired ? `Tu período de licencia ha concluido. Ingresa tu clave para renovar la suscripción (${expiredDays} días de tolerancia restantes).` : 'Ingresa tu clave de producto autorizada para habilitar el sistema.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
            <div className="glass-card p-3.5 flex items-start gap-2.5 border border-border/60">
              <InfinityIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-foreground">Permanente</div>
                <div className="text-muted-foreground">Acceso ilimitado</div>
              </div>
            </div>
            <div className="glass-card p-3.5 flex items-start gap-2.5 border border-border/60">
              <Clock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-foreground">Periódica</div>
                <div className="text-muted-foreground">Renovación asistida</div>
              </div>
            </div>
          </div>

          {isBlocked && (
            <div className="mb-5 p-4 rounded-xl bg-destructive/15 border border-destructive/40 text-destructive text-center space-y-2 animate-fade-in-up">
              <div className="font-bold text-sm flex items-center justify-center gap-1.5">
                <span>🚫</span> Terminal Suspendido
              </div>
              <p className="text-xs leading-relaxed font-medium bg-destructive/10 p-2 rounded-lg border border-destructive/20 text-foreground">
                <strong>Motivo:</strong> {blockedReason}
              </p>
              <p className="text-[11px] leading-relaxed opacity-90">
                Para reactivar este terminal o solicitar aclaraciones, comunícate con el desarrollador <strong>Julio_GE</strong> por WhatsApp al <strong className="font-mono">+5351616816</strong>.
              </p>
            </div>
          )}

          {!allowActivations && !isBlocked && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 text-center text-xs leading-relaxed">
              ⚠️ Las nuevas activaciones de licencias se encuentran en pausa temporal por el desarrollador.
            </div>
          )}

          {/* Tarjeta de Identificador de Terminal (Device ID) para Activación Offline */}
          <div className="mb-5 p-3 rounded-xl bg-background/60 border border-border/80 flex items-center justify-between gap-2 shadow-inner">
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">ID de este Terminal:</div>
              <div className="font-mono text-xs sm:text-sm font-bold text-primary tracking-wide truncate select-all">
                {friendlyTerminalId}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={copyTerminalId}
              className="h-8 px-2.5 text-xs shrink-0 flex items-center gap-1 border-border/80 hover:bg-primary/10 hover:text-primary"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId ? 'Copiado' : 'Copiar ID'}</span>
            </Button>
          </div>

          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Clave de Activación</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="text"
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(''); }}
                  placeholder="Ingresa tu clave de producto"
                  className={`pl-10 pr-10 h-11 ${
                    !showKey && key ? 'threads-obfuscated' : 'threads-revealed'
                  }`}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showKey ? 'Ocultar clave' : 'Ver clave'}
                  onClick={() => setShowKey(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center border border-destructive/30 animate-fade-in-up">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-11 font-semibold text-base shadow-sm hover:shadow transition-all">
              Validar y Activar
            </Button>
          </form>

          {mobile && (
            <div className="mt-5 rounded-xl border border-border/70 bg-secondary/40 p-3.5">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                ¿Inicias como personal de ventas? Pide al Administrador el <strong>código QR de sincronización</strong> (desde Ajustes → Usuarios) para recibir tu perfil y datos automáticamente.
              </p>
              <Button variant="secondary" className="w-full h-11 font-medium text-xs sm:text-sm" onClick={() => setScanOpen(true)}>
                <ScanLine className="w-4 h-4 mr-2 text-primary" />
                Escanear Código QR de Personal
              </Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5 mt-5">
            <Button
              variant="outline"
              className="text-xs sm:text-sm"
              onClick={() => window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-1.5 text-primary" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="text-xs sm:text-sm"
              onClick={() => setShowQr(true)}
            >
              <QrCode className="w-4 h-4 mr-1.5 text-primary" />
              QR de Soporte
            </Button>
          </div>

          <div className="mt-6 text-center space-y-1.5 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              © 2026 Gestión de Ventas. Todos los derechos reservados.
            </p>
            <div>
              <span className="gold-signature-shimmer text-xs tracking-wider">
                ( Desarrollado por Julio_GE )
              </span>
            </div>
          </div>
        </div>
      </div>

      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleEmployeeScan}
        keepOpen
        title="Activación de Dispositivo de Personal"
        hint={receiving ? 'Recibiendo información del Administrador…' : 'Apunta la cámara al código QR proporcionado por el Administrador.'}
      />

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Atención y Soporte Técnico</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-border/60">
              <QrDisplay data={DEV_PHONE_TEL} size={240} />
            </div>
            <p className="text-sm text-muted-foreground text-center leading-relaxed">
              Escanea este código con la cámara de tu teléfono para iniciar llamada directa con la línea de asistencia.
            </p>
            <p className="font-mono text-base font-semibold">{DEV_WHATSAPP}</p>
          </div>
        </DialogContent>
      </Dialog>

      {WelcomeDialog}
    </div>
  );
}

/** Info de licencia para otras pantallas (legado). */
export function getLicenseInfo() {
  const state = readLicense();
  if (state.type === 'lifetime') return { type: 'lifetime' as const, method: state.method || 'LEGACY' };
  if (state.type === 'timed') return { type: 'timed' as const, daysLeft: daysLeftOf(state), method: state.method || 'LEGACY', plan: state.plan || 'T37' };
  return { type: 'none' as const };
}

/** Activa de forma directa la Licencia Permanente desde el panel de desarrollador. */
export function activateLifetimeLicense(): boolean {
  try {
    const state: LicenseState = { type: 'lifetime', method: 'GVLIC', plan: 'PERM', lastSeenAt: Date.now() };
    localStorage.setItem(LICENSE_KEY, JSON.stringify(state));
    localStorage.setItem('license_key', LIFETIME_LICENSE);
    return true;
  } catch {
    return false;
  }
}

/** Activa o renueva licencia periódica por N días. */
export function activateTimedLicenseDays(days = 37): boolean {
  try {
    const now = Date.now();
    const state: LicenseState = {
      type: 'timed',
      method: 'GVLIC',
      plan: `T${days}`,
      activatedAt: now,
      expiresAt: now + days * 24 * 60 * 60 * 1000,
      lastSeenAt: now,
    };
    localStorage.setItem(LICENSE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** ¿Este dispositivo tiene licencia principal válida (permanente o periódica activa)? */
export function isDeviceLicensed(): boolean {
  const state = readLicense();
  if (state.type === 'lifetime') return true;
  if (state.type === 'timed') return isTimedActive(state);
  return false;
}

/** Expiración del admin para propagarla en el QR de empleados. null = permanente. */
export function getAdminLicenseGrant(): { expiresAt: number | null } | null {
  const state = readLicense();
  if (state.type === 'lifetime') return { expiresAt: null };
  if (state.type === 'timed' && isTimedActive(state)) return { expiresAt: state.expiresAt };
  return null;
}
