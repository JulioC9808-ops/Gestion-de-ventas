import React, { useEffect, useState } from 'react';
import { Shield, Key, MessageCircle, Clock, Infinity as InfinityIcon, QrCode, AlertTriangle, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QrDisplay from '@/components/QrDisplay';
import QrScannerModal from '@/components/QrScannerModal';
import { getMachineId, isDesktop } from '@/lib/machine';
import { isMobileDevice } from '@/lib/platform';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  readEmployeeLicense, saveEmployeeLicense, isEmployeeLicenseActive,
  employeeHoursRemaining, clearEmployeeLicense, EMPLOYEE_LICENSE_HOURS,
} from '@/lib/employeeLicense';
import { toast } from 'sonner';

const LIFETIME_LICENSE = '08022664107';
const TIMED_LICENSE = 'J260208c';
const TIMED_DURATION_DAYS = 37;
const DEV_WHATSAPP = '+5351616816';
const DEV_PHONE_TEL = 'tel:+5351616816';

interface LicenseGateProps {
  children: React.ReactNode;
}

type LicenseState =
  | { type: 'none' }
  | { type: 'lifetime'; machineId?: string | null }
  | { type: 'timed'; activatedAt: number; machineId?: string | null };

function readLicense(): LicenseState {
  try {
    const raw = localStorage.getItem('license_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.type === 'lifetime') return { type: 'lifetime', machineId: parsed.machineId ?? null };
      if (parsed?.type === 'timed' && typeof parsed.activatedAt === 'number') {
        return { type: 'timed', activatedAt: parsed.activatedAt, machineId: parsed.machineId ?? null };
      }
    }
    if (localStorage.getItem('license_key') === LIFETIME_LICENSE) {
      const state: LicenseState = { type: 'lifetime', machineId: getMachineId() };
      localStorage.setItem('license_state', JSON.stringify(state));
      return state;
    }
  } catch {}
  return { type: 'none' };
}

/**
 * Verifica que la licencia guardada corresponda a esta máquina.
 * Solo aplica en Electron (desktop). En web/dev retorna true siempre.
 * Si la carpeta AppData se copia a otra PC, el machineId no coincidirá
 * y la licencia se invalida automáticamente.
 */
function isSameMachine(state: LicenseState): boolean {
  if (!isDesktop()) return true;
  if (state.type === 'none') return true;
  const current = getMachineId();
  // Si la licencia guardada no tiene machineId (versión antigua) la "adoptamos"
  // vinculándola a esta máquina en la próxima escritura.
  if (!state.machineId) return true;
  return state.machineId === current;
}

function isTimedActive(activatedAt: number) {
  const ms = TIMED_DURATION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - activatedAt < ms;
}

function daysRemaining(activatedAt: number) {
  const ms = TIMED_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const remaining = ms - (Date.now() - activatedAt);
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const { login, logout } = useAuth();
  const { users, addUser, updateUser } = useData();
  const [license, setLicense] = useState<LicenseState>(() => readLicense());
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [empLicense, setEmpLicense] = useState(() => readEmployeeLicense());
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('welcome_seen'));
  const mobile = isMobileDevice();

  const closeWelcome = () => {
    localStorage.setItem('welcome_seen', '1');
    setShowWelcome(false);
  };

  // re-check daily
  useEffect(() => {
    const id = setInterval(() => setLicense(readLicense()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Verificar máquina en cada render/tick
  const sameMachine = isSameMachine(license);

  // Si la licencia fue copiada de otra PC (machineId no coincide), invalidamos.
  useEffect(() => {
    if (!sameMachine && license.type !== 'none') {
      localStorage.removeItem('license_state');
      setLicense({ type: 'none' });
    }
  }, [sameMachine, license.type]);

  // Adopción: si estamos en desktop y la licencia guardada NO tiene machineId
  // (versión antigua), le añadimos el actual sin pedir reactivación.
  useEffect(() => {
    if (!isDesktop()) return;
    if (license.type === 'none') return;
    if (license.machineId) return;
    const id = getMachineId();
    if (!id) return;
    const next: LicenseState = { ...license, machineId: id };
    localStorage.setItem('license_state', JSON.stringify(next));
    setLicense(next);
  }, [license]);

  const employeeActive = isEmployeeLicenseActive(empLicense);

  // Al caducar la licencia de empleado se cierra la sesión y se obliga a
  // volver a escanear el QR del jefe (así los datos se mantienen sincronizados).
  useEffect(() => {
    if (!empLicense) return;
    const id = setInterval(() => {
      const current = readEmployeeLicense();
      if (current && !isEmployeeLicenseActive(current)) {
        clearEmployeeLicense();
        logout();
        setEmpLicense(null);
        toast.error('Tu licencia de empleado (24 h) caducó. Escanea de nuevo el QR del jefe.');
      }
    }, 60 * 1000);
    return () => clearInterval(id);
  }, [empLicense, logout]);

  const licensed = employeeActive || (sameMachine && (
    license.type === 'lifetime' ||
    (license.type === 'timed' && isTimedActive(license.activatedAt))
  ));

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    const mid = getMachineId();
    if (trimmed === LIFETIME_LICENSE) {
      const state: LicenseState = { type: 'lifetime', machineId: mid };
      localStorage.setItem('license_state', JSON.stringify(state));
      setLicense(state);
    } else if (trimmed === TIMED_LICENSE) {
      const state: LicenseState = { type: 'timed', activatedAt: Date.now(), machineId: mid };
      localStorage.setItem('license_state', JSON.stringify(state));
      setLicense(state);
    } else {
      setError('Clave de producto inválida');
    }
  };

  // Activación de EMPLEADO: escanea el QR de credenciales que le muestra el jefe.
  const handleEmployeeScan = (text: string) => {
    setScanOpen(false);
    const raw = (text || '').trim();
    // Aceptamos ACT:, CRED: o el JSON tal cual (por si el lector recorta el prefijo).
    const jsonStart = raw.indexOf('{');
    if (jsonStart < 0) {
      toast.error('Este QR no es un código de activación de empleado.');
      return;
    }
    let data: { u?: string; p?: string; n?: string; r?: string; s?: number; h?: string | null };
    try {
      data = JSON.parse(raw.slice(jsonStart));
    } catch {
      toast.error('No se pudo leer el código de activación.');
      return;
    }
    const u = String(data.u ?? '').trim();
    const p = String(data.p ?? '');
    if (!u || !p) {
      toast.error('El código de activación está incompleto. Pide al jefe que lo genere de nuevo.');
      return;
    }
    if (data.r && data.r !== 'employee') {
      toast.error('Ese QR pertenece a una cuenta de administrador: solo se pueden activar empleados.');
      return;
    }

    // Aseguramos que la cuenta exista en ESTE dispositivo (el QR trae los datos).
    const existing = users.find(x => x.username === u);
    if (existing) {
      if (existing.password !== p || existing.role !== 'employee') {
        updateUser({ ...existing, password: p, role: 'employee', name: data.n || existing.name });
      }
    } else {
      addUser({
        username: u,
        password: p,
        name: data.n || u,
        role: 'employee',
        salaryPercent: typeof data.s === 'number' ? data.s : undefined,
        passwordHint: data.h ?? null,
      } as never);
    }

    const lic = saveEmployeeLicense(u);
    setEmpLicense(lic);
    // Esperamos a que la lista de usuarios quede guardada antes de iniciar sesión.
    setTimeout(() => {
      if (login(u, p)) {
        toast.success(`Activado por ${EMPLOYEE_LICENSE_HOURS} h. Licencia de SOLO EMPLEADO.`);
      } else {
        clearEmployeeLicense();
        setEmpLicense(null);
        toast.error('No se pudo activar con ese QR. Pide al jefe que lo genere otra vez.');
      }
    }, 150);
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
          <p className="text-muted-foreground">Listo, eso es todo.</p>
        </div>
        <Button onClick={closeWelcome} className="w-full">Continuar</Button>
      </DialogContent>
    </Dialog>
  );

  if (licensed) return <>{children}{WelcomeDialog}</>;

  const expired = license.type === 'timed' && !isTimedActive(license.activatedAt);

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
              {expired ? 'Tu licencia temporal ha expirado. Ingrésala de nuevo para renovar 37 días más.' : 'Ingresa tu clave de producto para continuar'}
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
                ¿Eres empleado? Pídele a tu jefe el <strong>QR de activación</strong> desde
                Ajustes → Usuarios. Te dará acceso por {EMPLOYEE_LICENSE_HOURS} horas con licencia de
                <strong> SOLO EMPLEADO</strong> (sin panel de administración).
              </p>
              <Button variant="secondary" className="w-full h-11" onClick={() => setScanOpen(true)}>
                <ScanLine className="w-4 h-4 mr-2" />
                Escanear QR del jefe (empleado)
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
        title="Activación de empleado"
        hint="Apunta al QR de activación que te muestra el jefe desde Ajustes → Usuarios."
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

export function getLicenseInfo() {
  const state = readLicense();
  if (state.type === 'lifetime') return { type: 'lifetime' as const };
  if (state.type === 'timed') return { type: 'timed' as const, daysLeft: daysRemaining(state.activatedAt) };
  return { type: 'none' as const };
}
