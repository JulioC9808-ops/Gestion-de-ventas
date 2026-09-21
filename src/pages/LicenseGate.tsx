import React, { useEffect, useState } from 'react';
import { Shield, Key, MessageCircle, Clock, Infinity as InfinityIcon, QrCode, ScanLine } from 'lucide-react';
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

type LicenseState =
  | { type: 'none' }
  | {
      type: 'lifetime';
      deviceId?: string | null;
      hw?: HardwareComponents;
      rebound?: number;
      lastSeenAt?: number;
    }
  | {
      type: 'timed';
      activatedAt: number;
      /** Expiración explícita (epoch ms). En estados viejos se calcula de activatedAt. */
      expiresAt: number;
      deviceId?: string | null;
      hw?: HardwareComponents;
      rebound?: number;
      lastSeenAt?: number;
    };

const LICENSE_KEY = 'license_state';

function normalize(state: any): LicenseState {
  if (!state || typeof state !== 'object') return { type: 'none' };
  if (state.type === 'lifetime') {
    return {
      type: 'lifetime',
      deviceId: state.deviceId ?? state.machineId ?? null,
      hw: state.hw,
      rebound: state.rebound,
      lastSeenAt: state.lastSeenAt,
    };
  }
  if (state.type === 'timed' && typeof state.activatedAt === 'number') {
    return {
      type: 'timed',
      activatedAt: state.activatedAt,
      expiresAt: typeof state.expiresAt === 'number' ? state.expiresAt : state.activatedAt + TIMED_DURATION_MS,
      deviceId: state.deviceId ?? state.machineId ?? null,
      hw: state.hw,
      rebound: state.rebound,
      lastSeenAt: state.lastSeenAt,
    };
  }
  return { type: 'none' };
}

function readLicense(): LicenseState {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    // Clave guardada de versiones muy viejas (activación directa).
    if (localStorage.getItem('license_key') === LIFETIME_LICENSE) {
      const state: LicenseState = { type: 'lifetime' };
      localStorage.setItem(LICENSE_KEY, JSON.stringify(state));
      return state;
    }
  } catch {
    // Estado corrupto: se ignora.
  }
  return { type: 'none' };
}

function persistLicense(state: LicenseState) {
  const withSeen: any = { ...state, lastSeenAt: Date.now() };
  localStorage.setItem(LICENSE_KEY, JSON.stringify(withSeen));
  return withSeen as LicenseState;
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
 * Verificación de dispositivo con TOLERANCIA:
 * - PC: coincide el ID combinado, O al menos 3 de 4 componentes de hardware válidos.
 * - Android: coincide el hash de ANDROID_ID.
 * - Estados viejos sin ID se adoptan (migración, no consume el rebound).
 * Devuelve 'ok' | 'rebind' (re-vinculación única) | 'fail'.
 */
function checkMachine(state: LicenseState, device: DeviceInfo): 'ok' | 'rebind' | 'fail' {
  if (state.type === 'none') return 'ok';
  if (!state.deviceId) return 'rebind'; // licencia vieja sin vínculo: adoptar
  if (!device.id) return 'ok'; // sin ID disponible (web/dev): no invalidar
  if (state.deviceId === device.id) return 'ok';
  // Tolerancia por hardware en PC: 3 de 4 componentes válidos coinciden.
  if (isDesktop() && state.hw && device.hw) {
    const pairs: Array<[string, string]> = [
      [state.hw.disk, device.hw.disk],
      [state.hw.bios, device.hw.bios],
      [state.hw.cpu, device.hw.cpu],
      [state.hw.ram, device.hw.ram],
    ];
    const valid = pairs.filter(([a, b]) => a && b);
    const matches = valid.filter(([a, b]) => a === b).length;
    if (valid.length >= 3 && matches >= 3) return 'rebind'; // refresca el vínculo al hardware actual
  }
  // Mismatch real: una sola oportunidad de re-vinculación (migración de clientes actuales).
  if (!state.rebound) return 'rebind';
  return 'fail';
}

function rebind(state: LicenseState, device: DeviceInfo): LicenseState {
  const base: any = { ...state, rebound: 1 };
  if (device.id) {
    base.deviceId = device.id;
    if (device.hw) base.hw = device.hw;
  }
  delete base.machineId;
  return base as LicenseState;
}

function daysLeftOf(state: LicenseState): number {
  if (state.type !== 'timed') return 0;
  const ms = state.expiresAt - effectiveNow(state);
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const { login, logout } = useAuth();
  const { users, addUser, updateUser, applyBackup } = useData();
  const [license, setLicense] = useState<LicenseState>(() => readLicense());
  const [device, setDevice] = useState<DeviceInfo | 'pending'>('pending');
  const [key, setKey] = useState('');
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

  // Cargar el ID de dispositivo (PC: sincrónico; Android: asíncrono).
  useEffect(() => {
    let alive = true;
    getDeviceId().then(d => { if (alive) setDevice(d); });
    return () => { alive = false; };
  }, []);

  // Verificar máquina una vez que el ID está cargado.
  useEffect(() => {
    if (device === 'pending') return;
    if (license.type === 'none') return;
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
  }, [device, license]);

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

  // Al caducar la licencia de empleado: cerrar sesión y pedir nuevo escaneo.
  useEffect(() => {
    if (!empLicense) return;
    const id = setInterval(() => {
      const current = readLinkedLicense();
      if (current && !isEmployeeLicenseActive(current)) {
        clearEmployeeLicense();
        logout();
        setEmpLicense(null);
        toast.error('Tu licencia de <strong>empleado</strong> caducó. Escanea de nuevo el QR del Admin.');
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [empLicense, logout]);

  const licensed = employeeActive || (
    license.type === 'lifetime' ||
    (license.type === 'timed' && isTimedActive(license))
  );

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (trimmed === LIFETIME_LICENSE) {
      const state = persistLicense({ type: 'lifetime' } as LicenseState);
      setLicense(state);
    } else if (trimmed === TIMED_LICENSE) {
      const state = persistLicense({
        type: 'timed',
        activatedAt: Date.now(),
        expiresAt: Date.now() + TIMED_DURATION_MS,
      } as LicenseState);
      setLicense(state);
    } else {
      setError('Clave de producto inválida');
    }
  };

  // ---- Activación de EMPLEADO con UN solo QR (respeta lo que el admin eligió) ----
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
      // 1) Todos los datos del jefe (el backup ya solo trae la cuenta del empleado).
      applyBackup(packet.backup);
      // 2) La cuenta del empleado en este dispositivo (rol SIEMPRE empleado).
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
      // 3) Licencia según lo que el admin eligió al generar el QR.
      const grant = packet.license;
      let expiresAt: number | null;
      if (!grant) {
        expiresAt = Date.now() + H24_MS; // QR v2 viejo: 24 h
      } else if (grant.mode === 'permanent') {
        expiresAt = null;
      } else if (grant.mode === 'admin') {
        expiresAt = grant.expiresAt ?? null;
      } else {
        // h24: rechazar QR reciclado de hace más de 7 días.
        if (grant.issuedAt && grant.issuedAt < Date.now() - 7 * 24 * 60 * 60 * 1000) {
          toast.error('Este QR es muy antiguo. Pide al Admin que genere otro.');
          return;
        }
        expiresAt = Date.now() + H24_MS;
      }
      const lic = saveLinkedLicense(u, expiresAt);
      setEmpLicense(lic);
      setTimeout(() => {
        if (login(u, p)) {
          setScanOpen(false);
          const remaining = lic.expiresAt === null
            ? 'permanente'
            : daysRemaining(lic) >= 1
              ? `${daysRemaining(lic)} día(s)`
              : `${hoursRemaining(lic)} h`;
          toast.success(`Datos recibidos. Licencia de <strong>empleado</strong> activa: <strong>${remaining}</strong>.`);
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
          <DialogTitle className="font-display">¡Hola!</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>Este programa es justo lo que necesitas. Aquí podrás gestionar desde tus productos en almacén hasta los precios y ventas de cada uno, y mantenerte al tanto del flujo de dichos productos.</p>
          <p>Para usar esta aplicación me puedes contactar mediante el código QR que te dejé preparado.</p>
          <p className="text-muted-foreground">Y esto es Todo.</p>
        </div>
        <Button onClick={closeWelcome} className="w-full">Continuar</Button>
      </DialogContent>
    </Dialog>
  );

  if (licensed) return <>{children}{WelcomeDialog}</>;

  const expired = license.type === 'timed' && !isTimedActive(license);
  const expiredDays = license.type === 'timed' ? daysLeftOf(license) : 0;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(0 0% 6%), hsl(0 0% 14%), hsl(0 0% 22%))' }}>
      <div className="w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-card p-8 sm:p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-gradient font-display">Activación de Licencia</h1>
            <p className="text-muted-foreground text-sm mt-1 text-center">
              {expired ? `Tu licencia temporal expiró. Ingresa tu clave para renovar 37 días más (${expiredDays} días de margen).` : 'Ingresa tu clave de producto para continuar'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
            <div className="glass-card p-3 flex items-start gap-2">
              <InfinityIcon className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <div className="font-semibold">Permanente</div>
                <div className="text-muted-foreground">Sin vencimiento</div>
              </div>
            </div>
            <div className="glass-card p-3 flex items-start gap-2">
              <Clock className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <div className="font-semibold">Temporal</div>
                <div className="text-muted-foreground">37 días renovable</div>
              </div>
            </div>
          </div>
          <form onSubmit={handleActivate} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Clave de Producto</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={key}
                  onChange={e => { setKey(e.target.value); setError(''); }}
                  placeholder="Ingresa tu clave de producto"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center border border-destructive/30">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11 font-semibold text-base">
              Activar Licencia
            </Button>
          </form>
          {mobile && (
            <div className="mt-5 rounded-lg border border-border/60 bg-secondary/40 p-3">
              <p className="text-xs text-muted-foreground mb-2">
                ¿Eres empleado? Pídele a un Admin el <strong>QR de activación</strong> desde
                Ajustes → Usuarios. Recibirás tu cuenta, todos los datos y la licencia
                que el Admin te asigne. No necesitan internet: conecta por Wi-Fi o WiFi Direct.
              </p>
              <Button variant="secondary" className="w-full h-11" onClick={() => setScanOpen(true)}>
                <ScanLine className="w-4 h-4 mr-2" />
                Escanear QR del admin <strong>Modo Empleado</strong>
              </Button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowQr(true)}
            >
              <QrCode className="w-4 h-4 mr-2" />
              QR Teléfono
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Contacta al desarrollador para obtener tu clave de producto.
          </p>
        </div>
      </div>
      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleEmployeeScan}
        keepOpen
        title="Activación de empleado"
        hint={receiving ? 'Recibiendo datos del jefe…' : 'Apunta al QR que te muestra el Admin (Ajustes → Usuarios).'}
      />
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Llamar al Desarrollador</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-3 rounded-lg">
              <QrDisplay data={DEV_PHONE_TEL} size={240} />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Escanea este QR con tu celular y se abrirá el teclado del teléfono con el número listo para llamar.
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
  if (state.type === 'lifetime') return { type: 'lifetime' as const };
  if (state.type === 'timed') return { type: 'timed' as const, daysLeft: daysLeftOf(state) };
  return { type: 'none' as const };
}

/** Expiración del admin para propagarla en el QR de empleados. null = permanente. */
export function getAdminLicenseGrant(): { expiresAt: number | null } | null {
  const state = readLicense();
  if (state.type === 'lifetime') return { expiresAt: null };
  if (state.type === 'timed' && isTimedActive(state)) return { expiresAt: state.expiresAt };
  return null;
}
