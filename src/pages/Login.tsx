import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Coffee, Lock, User, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HelpTip from '@/components/HelpTip';

const DEV_WHATSAPP = '+5351616816';

export default function Login() {
  const { login } = useAuth();
  const { settings } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const success = login(username, password);
      if (!success) {
        setError('Usuario o contraseña incorrectos');
      }
      setLoading(false);
    }, 500);
  };

  const bgStyle = settings.backgroundUrl
    ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const handleContact = () => {
    if (settings.qrUrl) {
      setShowQr(true);
    } else {
      window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}`, '_blank');
    }
  };

  return (
    <div className="login-container relative overflow-hidden" style={bgStyle}>
      {!settings.backgroundUrl && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
      )}
      {settings.backgroundUrl && <div className="absolute inset-0 bg-black/40" />}

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-card p-8 sm:p-10 shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl object-cover mb-4 ring-2 ring-primary/30" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mb-4 shadow-lg">
                <Coffee className="w-8 h-8 text-primary-foreground" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gradient font-display">
              {settings.businessName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Sistema de Ventas</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Usuario
                <HelpTip>Escribe el nombre de usuario que te dio el administrador.</HelpTip>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Contraseña
                <HelpTip>Tu contraseña es secreta. Si la olvidaste, pídele al administrador que te dé una nueva.</HelpTip>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
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

            <Button
              type="submit"
              className="w-full h-11 font-semibold text-base"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleContact}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contactar al Desarrollador
            </Button>
            <HelpTip>Si tienes problemas para entrar o algún error del sistema, contacta al desarrollador por WhatsApp.</HelpTip>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} {settings.businessName}. Todos los derechos reservados.
          </p>
        </div>
      </div>

      {settings.qrUrl && (
        <Dialog open={showQr} onOpenChange={setShowQr}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-center">Contactar al Desarrollador</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              <img src={settings.qrUrl} alt="QR de contacto" className="w-64 h-64 rounded-lg object-contain border border-border p-2" />
              <p className="text-sm text-muted-foreground text-center">Escanea el código QR para contactar al desarrollador del sistema.</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
