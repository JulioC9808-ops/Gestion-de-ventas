import React, { useState, useEffect } from 'react';
import type { User as UserType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import {
  Coffee, Lock, User, MessageCircle, HelpCircle, Sparkles, Eye, EyeOff,
  Sun, Moon, Sunrise, RotateCw, Delete, Check, KeyRound, Copy
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
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Tema automático estricto según la hora del día (sin selectores manuales en el Login)
  const [activeTheme, setActiveTheme] = useState<'morning' | 'afternoon' | 'night'>(() => getSystemLoginTheme());

  useEffect(() => {
    const updateTheme = () => setActiveTheme(getSystemLoginTheme());
    updateTheme();
    const interval = setInterval(updateTheme, 60 * 1000); // comprobar cada minuto
    return () => clearInterval(interval);
  }, []);

  // Teclado táctil en Modo Tarde
  const handleKeypadPress = (val: string) => {
    triggerHaptic('light');
    setError('');
    if (val === 'backspace') {
      setPassword(prev => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPassword('');
    } else {
      if (password.length < 20) {
        setPassword(prev => prev + val);
      }
    }
  };

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

  const isAnimated = settings.animatedLoginEnabled !== false;

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

      {/* Contenedor principal del Login con soporte para 3D Flip */}
      <div className="relative z-10 w-full max-w-md mx-4 perspective-1000 py-6">
        <div
          className={`w-full transition-transform duration-700 transform-style-3d ${
            isAnimated && activeTheme === 'afternoon' && isCardFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ================= CARA FRONTAL (Formulario Standard / Mascota / Neón) ================= */}
          <div
            className={`w-full ${isAnimated && activeTheme === 'afternoon' ? 'backface-hidden' : ''} ${
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
              {/* Mascota Barista Interactiva adaptada a la hora del día (si está habilitada en Ajustes) */}
              {isAnimated && (
                <div className="w-full flex justify-center -mt-2 mb-2">
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

              {/* Encabezado Logo y Nombre de Cafetería */}
              <div className="flex flex-col items-center mb-6">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className={`w-14 h-14 rounded-2xl object-cover mb-2 ring-2 shadow-md ${
                      isAnimated && activeTheme === 'night' ? 'ring-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.35)]' : 'ring-primary/20'
                    }`}
                  />
                ) : !isAnimated ? (
                  <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-md">
                    <Coffee className="w-7 h-7" />
                  </div>
                ) : null}
                <h1 className="text-2xl font-bold font-display text-center text-foreground">
                  {settings.businessName}
                </h1>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                  {isAnimated && activeTheme === 'morning' && <span>🌅 Buenos días •</span>}
                  {isAnimated && activeTheme === 'afternoon' && <span>☀️ Buenas tardes •</span>}
                  {isAnimated && activeTheme === 'night' && <span>🌙 Buenas noches •</span>}
                  <span>Acceso al Sistema</span>
                </div>
              </div>

              {/* Botón rápido en Modo Tarde para girar la tarjeta al teclado 3D (solo en modo animado) */}
              {isAnimated && activeTheme === 'afternoon' && (
                <div className="mb-4 flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    Modo Tarde Táctil
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setIsCardFlipped(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px] shadow-xs hover:bg-amber-600 transition-all"
                  >
                    <RotateCw className="w-3 h-3 mr-0.5" />
                    Girar a Teclado 3D
                  </button>
                </div>
              )}

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

          {/* ================= CARA POSTERIOR (3D FLIP: TECLADO TÁCTIL MODO TARDE) ================= */}
          {isAnimated && activeTheme === 'afternoon' && (
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
              <div className="glass-card-translucent p-6 sm:p-8 shadow-2xl border border-border/80 flex flex-col justify-between h-full rounded-2xl bg-card">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-base font-bold font-display text-foreground">Teclado Táctil 3D</h2>
                      <p className="text-xs text-muted-foreground">Escribe tu PIN de forma rápida</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setIsCardFlipped(false);
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-background hover:bg-muted font-semibold transition-colors flex items-center gap-1"
                    >
                      <RotateCw className="w-3 h-3" />
                      Volver
                    </button>
                  </div>

                  {/* Selector rápido de usuario */}
                  <div className="mb-4">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-1.5">
                      Seleccionar Usuario:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                      {users.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            setUsername(u.username);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            username.toLowerCase() === u.username.toLowerCase()
                              ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                              : 'border-border bg-background/80 text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {u.name || u.username}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Indicador de PIN con puntos iluminados */}
                  <div className="py-2.5 px-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-muted-foreground">
                      PIN ({username || 'Sin usuario'}):
                    </span>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: Math.max(password.length, 4) }).map((_, i) => (
                        <span
                          key={i}
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${
                            i < password.length
                              ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] scale-110'
                              : 'bg-border'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Teclado numérico táctil */}
                <div className="grid grid-cols-3 gap-2 my-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map(key => {
                    const isAction = key === 'clear' || key === 'backspace';
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleKeypadPress(key)}
                        className={`h-12 rounded-xl text-base font-bold font-mono flex items-center justify-center transition-all active:scale-95 ${
                          isAction
                            ? 'bg-muted/70 text-foreground border border-border text-xs font-sans'
                            : 'bg-card border border-border/80 text-foreground hover:border-amber-500/50 shadow-xs hover:bg-amber-500/5'
                        }`}
                      >
                        {key === 'backspace' ? <Delete className="w-4 h-4" /> : key === 'clear' ? 'Borrar' : key}
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-lg text-center border border-destructive/30 my-1 animate-wiggle">
                    {error}
                  </div>
                )}

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !username || !password}
                  className="w-full h-10 mt-2 font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md text-xs"
                >
                  <Check className="w-4 h-4 mr-1.5" />
                  {loading ? 'Entrando...' : 'Entrar con PIN'}
                </Button>
              </div>
            </div>
          )}
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
