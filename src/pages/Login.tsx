import React, { useState, useEffect } from 'react';
import type { User as UserType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  Coffee, Lock, User, MessageCircle, HelpCircle, Eye, EyeOff, KeyRound, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import HelpTip from '@/components/HelpTip';
import QrDisplay from '@/components/QrDisplay';
import PrivacyPolicyDialog from '@/components/PrivacyPolicyDialog';
import { getShiftGreeting, fetchOnlineQuote } from '@/lib/greeting';
import { playLoginSound } from '@/lib/soundUtils';
import { generateDevChallenge } from '@/lib/cryptoLicense';
import { triggerHaptic } from '@/lib/haptics';
import AnimatedMascot from '@/components/login/AnimatedMascot';
import { setPinchZoomActive } from '@/lib/pinchZoom';
import { toast } from 'sonner';

const DEV_WHATSAPP = '+5351616816';
const DEV_PHONE_TEL = 'tel:+5351616816';

function getSystemLoginTheme(): 'morning' | 'afternoon' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 19) return 'afternoon';
  return 'night';
}

export default function Login() {
  const { loginDetailed, loginWithDevOtp } = useAuth();
  const { settings, users } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showUsername, setShowUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Estados interactivos para las animaciones
  const [isUserFocused, setIsUserFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // La pantalla de Login en Android tiene escala fija al 80% (0.80) sin poder alterarse por pellizco
    const defaultScale = isMobileDevice() ? 0.80 : 1.0;
    setPinchZoomActive(false, defaultScale);
  }, []);

  // Tema automático estricto según la hora del día (sin selectores manuales en el Login)
  const [activeTheme, setActiveTheme] = useState<'morning' | 'afternoon' | 'night'>(() => getSystemLoginTheme());

  useEffect(() => {
    const updateTheme = () => setActiveTheme(getSystemLoginTheme());
    updateTheme();
    const interval = setInterval(updateTheme, 60 * 1000); // comprobar cada minuto
    return () => clearInterval(interval);
  }, []);

  // Acceso Técnico / Dev Challenge-Response 2FA (100% Offline)
  const [devOtpOpen, setDevOtpOpen] = useState(false);
  const [challengeCode, setChallengeCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [devOtpError, setDevOtpError] = useState('');
  const [challengeCopied, setChallengeCopied] = useState(false);
  const [pendingDevUser, setPendingDevUser] = useState<UserType | null>(null);

  const handleCopyChallenge = () => {
    navigator.clipboard.writeText(challengeCode).then(() => {
      setChallengeCopied(true);
      toast.success('Código de desafío copiado');
      setTimeout(() => setChallengeCopied(false), 2000);
    });
  };

  const handleDevOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDevOtpError('');
    const ok = loginWithDevOtp(challengeCode, enteredOtp, pendingDevUser || undefined);
    if (ok) {
      toast.success('Acceso de Desarrollador Autorizado Offline concedido');
      setDevOtpOpen(false);
    } else {
      setDevOtpError('Código OTP inválido o no correspondiente al desafío generado.');
    }
  };

  // Intentar descargar frase fresca de internet en segundo plano si hay conexión
  React.useEffect(() => {
    void fetchOnlineQuote(undefined, settings.quoteLanguages);
  }, [settings.quoteLanguages]);

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

      if (result.reason === 'requires-dev-otp') {
        setPendingDevUser(result.devUser || null);
        const freshChallenge = generateDevChallenge();
        setChallengeCode(freshChallenge);
        setEnteredOtp('');
        setDevOtpError('');
        setDevOtpOpen(true);
        toast.info('Verificación requerida: Generando desafío de segundo paso');
        setLoading(false);
        return;
      }

      if (!result.ok) {
        setIsSuccess(false);
        triggerHaptic('error');
        setError(
          result.reason === 'employee-only'
            ? 'Este dispositivo está configurado exclusivamente para uso de personal autorizado.'
            : 'Credenciales no válidas. Verifica tu usuario y contraseña.',
        );
      } else {
        setIsSuccess(true);
        triggerHaptic('success');
        const foundUser = users.find(u => u.username === username.trim());
        const greetingData = getShiftGreeting(foundUser?.name || username.trim(), settings.quoteLanguages);
        const h = new Date().getHours();
        const period = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 19 ? 'afternoon' : 'night';

        if (settings.soundEffectsEnabled !== false) {
          playLoginSound(period);
        }

        if (settings.welcomeGreetingsEnabled !== false) {
          toast.success(`${greetingData.icon} ${greetingData.greeting}`, {
            description: `${greetingData.shiftName} activo • ${greetingData.motivationalMessage}`,
            duration: 4500,
          });
        }
      }
      setLoading(false);
    }, 350);
  };

  const handleForgot = () => {
    const target = users.find(u => u.username.toLowerCase() === forgotUser.trim().toLowerCase());
    if (!target) {
      setForgotResult('No se encontró ninguna cuenta registrada con ese nombre de usuario.');
      return;
    }
    if (target.role !== 'admin') {
      setForgotResult('Por políticas de seguridad, solicita a un Administrador que restablezca tu contraseña de acceso.');
      return;
    }
    setForgotResult(
      target.passwordHint
        ? `Hola ${target.name}. Tu recordatorio de contraseña guardado es: “${target.passwordHint}”`
        : `Hola ${target.name}. No tienes un recordatorio configurado. Comunícate con soporte técnico para restablecer el acceso a tu cuenta.`,
    );
  };

  const isAnimated = settings.animatedLoginEnabled === true;

  const bgStyle = settings.backgroundUrl
    ? { backgroundImage: `url(${settings.backgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <div
      className={`login-container relative overflow-hidden transition-colors duration-700 ${
        isAnimated && activeTheme === 'night' ? 'bg-gradient-to-br from-zinc-950 via-neutral-900 to-amber-950/40 text-foreground' : ''
      }`}
      style={bgStyle}
    >
      {/* Partículas / halos de luz solo cuando el login animado está activo */}
      {isAnimated && !settings.backgroundUrl && activeTheme === 'night' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        </div>
      )}

      {isAnimated && !settings.backgroundUrl && activeTheme !== 'night' && (
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-accent blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-primary-foreground blur-3xl" />
        </div>
      )}
      {settings.backgroundUrl && <div className="absolute inset-0 bg-black/25 pointer-events-none" />}

      {/* Contenedor principal del Login */}
      <div className="relative z-10 w-full max-w-md mx-4 py-4 flex flex-col items-center">
        {/* Mascota Barista Interactiva FUERA del recuadro (si está habilitada en Ajustes) */}
        {isAnimated && (
          <div className="w-full flex justify-center -mb-2 z-20">
            <AnimatedMascot
              variant={activeTheme}
              isUserFocused={isUserFocused}
              isPasswordFocused={isPasswordFocused || (Boolean(password) && !showPassword)}
              isSuccess={isSuccess}
              hasError={Boolean(error)}
              characterLength={username.length}
            />
          </div>
        )}

        <div
          className={`w-full ${
            isAnimated && activeTheme === 'night'
              ? 'liquid-gradient-border p-[2px] rounded-3xl shadow-2xl neon-card-glow'
              : ''
          }`}
        >
          <div
            className={`glass-card-translucent p-8 sm:p-10 shadow-2xl border border-border/70 ${
              isAnimated && activeTheme === 'night' ? 'bg-zinc-950/85 backdrop-blur-xl rounded-[22px]' : ''
            }`}
          >
            {/* Encabezado: SIEMPRE muestra el Logo y Nombre del local actual */}
            <div className="flex flex-col items-center mb-6">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Logo"
                  className={`w-14 h-14 rounded-2xl object-cover mb-2 ring-2 shadow-md ${
                    isAnimated && activeTheme === 'night' ? 'ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.35)]' : 'ring-primary/20'
                  }`}
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-md">
                  <Coffee className="w-7 h-7" />
                </div>
              )}
              <h1 className="text-2xl font-bold font-display text-center text-foreground">
                {settings.businessName || 'GEVEN'}
              </h1>
              <p className="text-xs text-muted-foreground font-semibold tracking-wider text-center uppercase -mt-0.5 mb-1">
                Gestión de Ventas
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                {isAnimated && activeTheme === 'morning' && <span>🌅 Buenos días •</span>}
                {isAnimated && activeTheme === 'afternoon' && <span>☀️ Buenas tardes •</span>}
                {isAnimated && activeTheme === 'night' && <span>🌙 Buenas noches •</span>}
                <span>Acceso al Sistema</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    Usuario
                    <HelpTip>Ingresa el nombre de usuario asignado.</HelpTip>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      name="sys_user_field"
                      id="sys_user_field"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      onFocus={() => setIsUserFocused(true)}
                      onBlur={() => setIsUserFocused(false)}
                      placeholder="Ingresa tu usuario"
                      className={`pl-10 ${username.toUpperCase().startsWith('DEV') ? 'pr-10' : ''} h-11 transition-all ${
                        isAnimated && activeTheme === 'night' ? 'bg-zinc-900/60 border-amber-500/30 focus:border-amber-500' : ''
                      } ${!showUsername && username && username.toUpperCase().startsWith('DEV') ? 'threads-obfuscated' : 'threads-revealed'}`}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      required
                    />
                    {username.toUpperCase().startsWith('DEV') && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={showUsername ? 'Ocultar usuario DEV' : 'Ver usuario DEV'}
                        onClick={() => setShowUsername(prev => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                      >
                        {showUsername ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    Contraseña / PIN
                    <HelpTip>Tu clave de acceso.</HelpTip>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      type="text"
                      name="sys_code_field"
                      id="sys_code_field"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      placeholder="Ingresa tu contraseña"
                      className={`pl-10 pr-10 h-11 transition-all ${
                        isAnimated && activeTheme === 'night' ? 'bg-zinc-900/60 border-amber-500/30 focus:border-amber-500' : ''
                      } ${!showPassword && password ? 'threads-obfuscated' : 'threads-revealed'}`}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      required
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg text-center border border-destructive/30 animate-wiggle">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className={`w-full h-11 font-semibold text-base shadow-sm transition-all ${
                    isAnimated && activeTheme === 'night'
                      ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:brightness-110'
                      : ''
                  }`}
                  disabled={loading}
                >
                  {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => { setForgotResult(null); setForgotUser(username); setForgotOpen(true); }}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                ¿Olvidaste tu contraseña?
              </Button>

              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs sm:text-sm"
                  onClick={() => setShowQr(true)}
                >
                  <MessageCircle className="w-4 h-4 mr-2 text-primary" />
                  Soporte y Asistencia
                </Button>
                <HelpTip>Canal directo de asistencia técnica y resolución de dudas.</HelpTip>
              </div>

              <div className="mt-4 flex justify-center">
                <PrivacyPolicyDialog />
              </div>

              <div className="mt-5 text-center space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  © 2026 GEVEN – Gestión de Ventas. Todos los derechos reservados.
                </p>
                <div>
                  <span className="gold-signature-shimmer text-xs tracking-wider">
                    ( Desarrollado por Julio_GE )
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal Acceso Desarrollador 2FA (Challenge-Response OTP 100% Offline) */}
      <Dialog open={devOtpOpen} onOpenChange={setDevOtpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-base flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              Verificación de Segundo Paso (Dev)
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-xs text-muted-foreground pt-1">
                Autenticación criptográfica de dos factores requerida para el perfil de Desarrollador.
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-muted/60 border border-border text-center space-y-1.5">
              <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                Código de Desafío de Sesión:
              </div>
              <div className="font-mono text-2xl font-bold tracking-widest text-primary flex items-center justify-center gap-2">
                <span>{challengeCode}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleCopyChallenge}
                  title="Copiar código de desafío"
                >
                  {challengeCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">
                Introduce este número en tu generador móvil offline para obtener el OTP de 6 dígitos.
              </p>
            </div>

            <form onSubmit={handleDevOtpSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Código OTP de Autorización:
                </label>
                <Input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={e => {
                    setEnteredOtp(e.target.value.replace(/\D/g, ''));
                    setDevOtpError('');
                  }}
                  placeholder="000000"
                  className="text-center font-mono text-lg font-bold tracking-widest h-10"
                  autoFocus
                  required
                />
              </div>

              {devOtpError && (
                <div className="text-destructive text-xs p-2 rounded bg-destructive/10 border border-destructive/20 text-center">
                  {devOtpError}
                </div>
              )}

              <Button type="submit" className="w-full h-10 font-semibold text-xs sm:text-sm">
                Confirmar y Desbloquear Sesión Dev
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Atención y Soporte Técnico</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {settings.qrUrl ? (
              <img src={settings.qrUrl} alt="QR de contacto" className="w-64 h-64 rounded-lg object-contain border border-border p-2 bg-white" />
            ) : (
              <div className="bg-white p-3 rounded-lg shadow-sm border border-border/50">
                <QrDisplay data={DEV_PHONE_TEL} size={240} />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Escanea el código QR desde tu teléfono para comunicarte directamente con la línea de soporte autorizada.
            </p>
            <p className="font-mono text-base font-semibold">{DEV_WHATSAPP}</p>
            <Button
              variant="default"
              className="w-full"
              onClick={() => window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}`, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Contactar por WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Recuperación de Contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ingresa tu nombre de usuario para consultar tu recordatorio de seguridad.
            </p>
            <Input
              value={forgotUser}
              onChange={e => { setForgotUser(e.target.value); setForgotResult(null); }}
              placeholder="Nombre de usuario"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button className="w-full" onClick={handleForgot}>Consultar Recordatorio</Button>
            {forgotResult && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3.5 text-sm leading-relaxed">
                {forgotResult}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
