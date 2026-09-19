import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Coffee, Lock, User, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import HelpTip from '@/components/HelpTip';
import QrDisplay from '@/components/QrDisplay';

const DEV_WHATSAPP = '+5351616816';
const DEV_PHONE_TEL = 'tel:+5351616816';

export default function Login() {
  const { loginDetailed } = useAuth();
  const { settings, users } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Recuperación de contraseña por pista personal
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUser, setForgotUser] = useState('');
  const [forgotResult, setForgotResult] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      const result = loginDetailed(username, password);
      if (!result.ok) {
        setError(
          result.reason === 'employee-only'
            ? 'Este dispositivo usa una licencia de SOLO EMPLEADO.'
            : 'Usuario o contraseña incorrectos (revisa las mayúsculas)',
        );
      }
      setLoading(false);
    }, 400);
  };

  const handleForgot = () => {
    const target = users.find(u => u.username === forgotUser.trim());
    if (!target) {
      setForgotResult('No existe ningún usuario con ese nombre exacto (revisa las mayúsculas).');
      return;
    }
    if (target.role !== 'admin') {
      setForgotResult('Solo los administradores pueden recuperar su contraseña. Pídele al Admin que te de una nueva contraseña.');
      return;
    }
    setForgotResult(
      target.passwordHint
        ? `Administrador «${target.name}». Tu nota para recordar la contraseña es: “${target.passwordHint}”`
        : `Administrador «${target.name}». No guardaste ninguna nota. Si no recuerdas la contraseña puedes contactar al desarrollador y pedirle restablecer su contraseña por la Predeterminada.`,
    );
  };

  const bgStyle = settings.backgroundUrl
    ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div className="login-container relative overflow-hidden" style={bgStyle}>
      {!settings.backgroundUrl && (
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
      )}
      {settings.backgroundUrl && <div className="absolute inset-0 bg-black/20" />}

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        <div className="glass-card-translucent p-8 sm:p-10 shadow-2xl">
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
                <HelpTip>Escribe el nombre de usuario tal como te lo dio el administrador: las mayúsculas y minúsculas importan.</HelpTip>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Ingresa tu usuario"
                  className="pl-10 h-11"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Contraseña
                <HelpTip>Tu contraseña es secreta y distingue mayúsculas de minúsculas. Si la olvidaste, pídele al administrador que te dé una nueva.</HelpTip>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="pl-10 h-11"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="current-password"
                  spellCheck={false}
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

          <Button
            type="button"
            variant="ghost"
            className="w-full mt-2 text-sm"
            onClick={() => { setForgotResult(null); setForgotUser(username); setForgotOpen(true); }}
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Olvidé mi contraseña
          </Button>

          <div className="mt-4 flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowQr(true)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contactar al Desarrollador
            </Button>
            <HelpTip>Si tienes problemas para entrar o algún error del sistema, contacta al desarrollador.</HelpTip>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            © {new Date().getFullYear()} {settings.businessName}. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Llamar al Desarrollador</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {settings.qrUrl ? (
              <img src={settings.qrUrl} alt="QR de contacto" className="w-64 h-64 rounded-lg object-contain border border-border p-2" />
            ) : (
              <div className="bg-white p-3 rounded-lg">
                <QrDisplay data={DEV_PHONE_TEL} size={240} />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Escanea el QR con tu celular y se abrirá el teclado del teléfono con el número del desarrollador listo para llamar.
            </p>
            <p className="font-mono text-base font-semibold">{DEV_WHATSAPP}</p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Abrir WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Recuperar contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Escribe tu nombre de usuario. Si eres administrador y guardaste una nota para recordar
              tu contraseña, te la mostraremos aquí.
            </p>
            <Input
              value={forgotUser}
              onChange={e => { setForgotUser(e.target.value); setForgotResult(null); }}
              placeholder="Nombre de usuario"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button className="w-full" onClick={handleForgot}>Buscar mi nota</Button>
            {forgotResult && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3 text-sm">
                {forgotResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
