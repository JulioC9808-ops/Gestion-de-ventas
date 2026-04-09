import React, { useState } from 'react';
import { Shield, Key, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const VALID_LICENSE = '08022664107';
const DEV_WHATSAPP = '+5351616816';

interface LicenseGateProps {
  children: React.ReactNode;
}

export default function LicenseGate({ children }: LicenseGateProps) {
  const [licensed, setLicensed] = useState(() => {
    return localStorage.getItem('license_key') === VALID_LICENSE;
  });
  const [key, setKey] = useState('');
  const [error, setError] = useState('');

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim() === VALID_LICENSE) {
      localStorage.setItem('license_key', key.trim());
      setLicensed(true);
    } else {
      setError('Clave de producto inválida');
    }
  };

  if (licensed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(0 0% 6%), hsl(0 0% 14%), hsl(0 0% 22%))' }}>
      <div className="w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-card p-8 sm:p-10" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground font-display">Activación de Licencia</h1>
            <p className="text-muted-foreground text-sm mt-1">Ingresa tu clave de producto para continuar</p>
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
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center">
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
