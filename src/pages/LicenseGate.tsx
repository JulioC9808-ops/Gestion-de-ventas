import React, { useEffect, useState } from 'react';
import { Shield, Key, MessageCircle, Clock, Infinity as InfinityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const LIFETIME_LICENSE = '08022664107';
const TIMED_LICENSE = 'J260208c';
const TIMED_DURATION_DAYS = 37;
const DEV_WHATSAPP = '+5351616816';

interface LicenseGateProps {
  children: React.ReactNode;
}

type LicenseState =
  | { type: 'none' }
  | { type: 'lifetime' }
  | { type: 'timed'; activatedAt: number };

function readLicense(): LicenseState {
  try {
    const raw = localStorage.getItem('license_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.type === 'lifetime') return { type: 'lifetime' };
      if (parsed?.type === 'timed' && typeof parsed.activatedAt === 'number') {
        return { type: 'timed', activatedAt: parsed.activatedAt };
      }
    }
    // backward compat
    if (localStorage.getItem('license_key') === LIFETIME_LICENSE) {
      const state: LicenseState = { type: 'lifetime' };
      localStorage.setItem('license_state', JSON.stringify(state));
      return state;
    }
  } catch {}
  return { type: 'none' };
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
  const [license, setLicense] = useState<LicenseState>(() => readLicense());
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  // re-check daily
  useEffect(() => {
    const id = setInterval(() => setLicense(readLicense()), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const licensed =
    license.type === 'lifetime' ||
    (license.type === 'timed' && isTimedActive(license.activatedAt));

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (trimmed === LIFETIME_LICENSE) {
      const state: LicenseState = { type: 'lifetime' };
      localStorage.setItem('license_state', JSON.stringify(state));
      setLicense(state);
    } else if (trimmed === TIMED_LICENSE) {
      const state: LicenseState = { type: 'timed', activatedAt: Date.now() };
      localStorage.setItem('license_state', JSON.stringify(state));
      setLicense(state);
    } else {
      setError('Clave de producto inválida');
    }
  };

  if (licensed) return <>{children}</>;

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

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}`, '_blank')}
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contactar al Desarrollador
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Contacta al desarrollador para obtener tu clave de producto.
          </p>
        </div>
      </div>
    </div>
  );
}

export function getLicenseInfo() {
  const state = readLicense();
  if (state.type === 'lifetime') return { type: 'lifetime' as const };
  if (state.type === 'timed') return { type: 'timed' as const, daysLeft: daysRemaining(state.activatedAt) };
  return { type: 'none' as const };
}
