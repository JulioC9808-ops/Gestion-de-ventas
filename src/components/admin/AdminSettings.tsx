import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import QrDisplay from '@/components/QrDisplay';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Palette, Type, Layout, DollarSign, Users as UsersIcon, Info, Settings as SettingsIcon, ShieldCheck, DownloadCloud, Sparkles, MessageCircle, HelpCircle, HardDriveDownload, Lock, CheckCircle2, UserPlus, Volume2, VolumeX, MessageSquare, RefreshCw, Globe, FileText, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor, registerPlugin } from '@capacitor/core';
import UserManagement from '@/components/admin/UserManagement';
import CompactBackupControl from '@/components/admin/CompactBackupControl';
import PrivacyPolicyDialog from '@/components/PrivacyPolicyDialog';
import FontSizeSelector from '@/components/FontSizeSelector';
import { isMobileDevice, getAppVersion, getPlatformLabel } from '@/lib/platform';
import { checkPCUpdates } from '@/lib/updates';
import { GITHUB_UPDATES_URL } from '@/contexts/DataContext';
import { getShiftGreeting, fetchOnlineQuote, SUPPORTED_LANGUAGES, setQuoteLanguages } from '@/lib/greeting';
import { areSoundsEnabled, setSoundsEnabled } from '@/lib/soundUtils';

interface AppUpdatePluginInterface {
  checkForUpdate(): Promise<{ status: string }>;
}
const NativeAppUpdate = registerPlugin<AppUpdatePluginInterface>('AppUpdate');

const THEMES = [
  { value: 'white', label: 'Blanco Puro', preview: 'bg-white border border-gray-300' },
  { value: 'black', label: 'Negro Total', preview: 'bg-black' },
  { value: 'sunset', label: 'Atardecer', preview: 'bg-orange-600' },
  { value: 'forest', label: 'Bosque', preview: 'bg-green-700' },
  { value: 'ocean', label: 'Océano', preview: 'bg-blue-600' },
  { value: 'night', label: 'Noche Índigo', preview: 'bg-indigo-900' },
  { value: 'coffee', label: 'Café', preview: 'bg-amber-800' },
];

const FONTS = [
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
];

const FONT_COLORS = [
  { value: null, label: 'Auto (del tema)', preview: 'linear-gradient(135deg,#fff 50%,#000 50%)' },
  { value: '#000000', label: 'Negro', preview: '#000000' },
  { value: '#ffffff', label: 'Blanco', preview: '#ffffff' },
  { value: '#1f2937', label: 'Gris oscuro', preview: '#1f2937' },
  { value: '#dc2626', label: 'Rojo', preview: '#dc2626' },
  { value: '#2563eb', label: 'Azul', preview: '#2563eb' },
  { value: '#16a34a', label: 'Verde', preview: '#16a34a' },
  { value: '#d97706', label: 'Ámbar', preview: '#d97706' },
];

/**
 * Botón reutilizable de comprobación manual de actualizaciones.
 * - Android: consulta al sistema nativo (muestra "estás actualizado" o el diálogo de update).
 * - PC / Web: consulta GitHub; si no hay nada dice "Tu programa está actualizado",
 *   si hay versión nueva muestra "¿Deseas descargarla?" con Sí / No.
 */
function CheckUpdatesButton() {
  const { settings } = useData();
  const [checking, setChecking] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={checking}
      onClick={async () => {
        setChecking(true);
        try {
          if (Capacitor.isNativePlatform()) {
            await NativeAppUpdate.checkForUpdate();
          } else {
            await checkPCUpdates(settings.githubUpdatesUrl || GITHUB_UPDATES_URL, true);
          }
        } catch (err) {
          console.error('Error al comprobar actualizaciones:', err);
          toast.error('Error al comprobar actualizaciones.');
        } finally {
          setChecking(false);
        }
      }}
    >
      <DownloadCloud className={`w-4 h-4 mr-1.5 ${checking ? 'animate-bounce' : ''}`} />
      Buscar Actualizaciones
    </Button>
  );
}

function ImportantNotes() {
  const { settings } = useData();
  const telegramUrl = settings.telegramUrl || 'https://t.me/Gestion_Ventas';

  const handleInvite = async () => {
    const inviteUrl = telegramUrl;
    const shareData = {
      title: 'Sistema de Gestión de Ventas',
      text: '¡Hola! Te recomiendo este excelente sistema de gestión de ventas y control de negocios. Conoce todas las novedades y actualizaciones en el canal oficial:',
      url: inviteUrl,
    };

    try {
      if (navigator.share && isMobileDevice()) {
        await navigator.share(shareData);
        toast.success('Invitación compartida con éxito.');
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        window.open(inviteUrl, '_blank');
        toast.success('Enlace de invitación copiado y canal de Telegram abierto.');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        window.open(inviteUrl, '_blank');
      }
    }
  };

  const notes = [
    {
      num: '1',
      title: 'Control total contra fraudes',
      desc: 'Este programa existe para evitar fraudes con sus empleados ya que usted tiene el control de todo lo que entra y sale de su negocio, y puede ver el flujo de dinero en tiempo real.',
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      num: '2',
      title: 'Soporte y dudas',
      desc: 'Cualquier error o duda que encuentre CONTÁCTEME (Este servicio será totalmente gratuito si usted ha pagado por la licencia permanente).',
      icon: HelpCircle,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      num: '3',
      title: 'Uso exclusivo por negocio',
      desc: 'Si usted piensa usar su programa para otro negocio tiene que pagar nuevamente por su servicio y activación de licencia independiente.',
      icon: UsersIcon,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      num: '4',
      title: 'Personalizaciones a medida',
      desc: 'Si usted desea hacer algún cambio ¡CONTÁCTEME! Este servicio se le cotizará y cobrará dependiendo de la complejidad requerida.',
      icon: Sparkles,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
    {
      num: '5',
      title: 'Reinstalación segura y Backups',
      desc: 'No fuerces el programa. Se puede desinstalar y volver a instalar sin problemas ya que este hace un BACKUP automático en sus archivos internos y base de datos persistente.',
      icon: HardDriveDownload,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
    },
    {
      num: '6',
      title: 'Protección Anti-Hacking activa',
      desc: 'Este programa cuenta con un sistema Anti-Hacking que, si detecta manipulación no autorizada externa, protegerá la integridad de su información resguardando el sistema.',
      icon: Lock,
      color: 'text-red-500 bg-red-500/10 border-red-500/20',
    },
  ];

  return (
    <div className="glass-card p-6 max-w-3xl space-y-5">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-foreground">¡Hola, espero que tengas un excelente día!</h3>
          <p className="text-xs text-muted-foreground">Puntos clave e información fundamental sobre el funcionamiento del sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {notes.map(n => {
          const Icon = n.icon;
          return (
            <div
              key={n.num}
              className="p-3.5 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/30 transition-all flex items-start gap-3 shadow-xs"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${n.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="opacity-70 font-mono">#{n.num}</span> {n.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <p className="italic">
            Muchas gracias por su preferencia y confianza. Si le gustó la aplicación, le agradecería mucho su recomendación.
          </p>
        </div>
        <Button
          onClick={handleInvite}
          size="sm"
          className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Invitar a un usuario
        </Button>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const { settings, updateSettings } = useData();
  const mobile = isMobileDevice();
  const [navPosition, setNavPosition] = useState(settings.navPosition);
  const [defaultSalary, setDefaultSalary] = useState(String(settings.defaultSalaryPercent || 2));
  const [selectedTheme, setSelectedTheme] = useState(settings.theme);
  const [selectedFont, setSelectedFont] = useState(settings.font);
  const [fontColor, setFontColor] = useState<string | null>(settings.fontColor ?? null);
  const [salaryByPercentEnabled, setSalaryByPercentEnabled] = useState(!!settings.salaryByPercentEnabled);
  const [welcomeGreetingsEnabled, setWelcomeGreetingsEnabledState] = useState(settings.welcomeGreetingsEnabled !== false);
  const [soundEffectsEnabled, setSoundEffectsEnabledState] = useState(settings.soundEffectsEnabled !== false);
  const [quoteLanguages, setQuoteLanguagesState] = useState<string[]>(() =>
    settings.quoteLanguages && settings.quoteLanguages.length > 0 ? settings.quoteLanguages : ['es'],
  );
  const [currentGreeting, setCurrentGreeting] = useState(() =>
    getShiftGreeting(undefined, settings.quoteLanguages && settings.quoteLanguages.length > 0 ? settings.quoteLanguages : ['es']),
  );
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const telegramUrl = settings.telegramUrl || 'https://t.me/Gestion_Ventas';

  const toggleLanguage = (code: string) => {
    let updated: string[];
    if (quoteLanguages.includes(code)) {
      if (quoteLanguages.length === 1) {
        toast.info('Debes mantener al menos un idioma seleccionado.');
        return;
      }
      updated = quoteLanguages.filter(l => l !== code);
    } else {
      updated = [...quoteLanguages, code];
    }
    setQuoteLanguagesState(updated);
    setQuoteLanguages(updated);
    setCurrentGreeting(getShiftGreeting(undefined, updated));
  };

  const handleRefreshQuote = async () => {
    setFetchingQuote(true);
    try {
      const res = await fetchOnlineQuote(undefined, quoteLanguages);
      if (res) {
        toast.success('¡Nueva frase de internet obtenida con éxito!');
      } else {
        toast.info('Mostrando frase optimizada del repositorio diario.');
      }
      setCurrentGreeting(getShiftGreeting(undefined, quoteLanguages));
    } catch {
      toast.error('No se pudo conectar a internet para buscar frases.');
    } finally {
      setFetchingQuote(false);
    }
  };

  const handleSave = () => {
    setSoundsEnabled(soundEffectsEnabled);
    setQuoteLanguages(quoteLanguages);
    updateSettings({
      navPosition: mobile && navPosition === 'top' ? 'side' : navPosition,
      defaultSalaryPercent: Number(defaultSalary) || 2,
      theme: selectedTheme,
      font: selectedFont,
      fontColor,
      salaryByPercentEnabled,
      welcomeGreetingsEnabled,
      soundEffectsEnabled,
      quoteLanguages,
    });
    toast.success('Configuración guardada correctamente');
  };

  return (
    <div className="grid gap-6 w-full max-w-3xl">
      {/* Selector de tamaño de fuente con tarjeta deslizable */}
      <div className="glass-card p-4 sm:p-6">
        <FontSizeSelector />
      </div>

      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-base sm:text-lg">Tema de Colores</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {THEMES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSelectedTheme(t.value)}
              className={`flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all text-left ${
                selectedTheme === t.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full shrink-0 ${t.preview}`} />
              <span className="text-xs sm:text-sm font-medium truncate">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-base sm:text-lg">Tipo de Letra (Fuente)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {FONTS.map(f => (
            <button
              key={f.value}
              type="button"
              onClick={() => setSelectedFont(f.value)}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedFont === f.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
              }`}
              style={{ fontFamily: f.value }}
            >
              <span className="text-sm font-medium truncate block">{f.label}</span>
              <p className="text-xs text-muted-foreground mt-1 truncate" style={{ fontFamily: f.value }}>Aa Bb Cc 123</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-base sm:text-lg">Color de la fuente</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Si los textos no se ven bien en tu tema, elige un color o personalízalo.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {FONT_COLORS.map(c => {
            const active = (fontColor ?? null) === c.value;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setFontColor(c.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="w-5 h-5 rounded-full border border-border shrink-0" style={{ background: c.preview }} />
                <span className="text-xs font-medium truncate">{c.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <label className="text-sm font-medium">Personalizado:</label>
          <input
            type="color"
            value={fontColor || '#ffffff'}
            onChange={e => setFontColor(e.target.value)}
            className="w-12 h-10 rounded cursor-pointer border border-border bg-transparent"
          />
          {fontColor && (
            <button type="button" onClick={() => setFontColor(null)} className="text-xs underline text-muted-foreground">
              Restablecer
            </button>
          )}
          <span className="text-sm" style={{ color: fontColor || undefined }}>Vista previa</span>
        </div>
      </div>

      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-base sm:text-lg">Diseño y Salario</h3>
        </div>
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">Posición de Navegación</label>
            <p className="text-xs text-muted-foreground mt-1">
              {mobile
                ? 'En el celular puedes elegir barra lateral izquierda o derecha.'
                : 'En PC puedes elegir barra superior, lateral izquierda o derecha.'}
            </p>
            <div className={`grid ${mobile ? 'grid-cols-2' : 'grid-cols-3'} gap-2.5 mt-3`}>
              {!mobile && (
                <button
                  type="button"
                  onClick={() => setNavPosition('top')}
                  className={`p-3 rounded-lg border-2 text-center transition-all ${
                    navPosition === 'top' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="w-full h-2 bg-primary/30 rounded mb-2" />
                  <div className="w-full h-8 bg-muted rounded" />
                  <p className="text-xs mt-2 font-medium">Arriba</p>
                </button>
              )}
              <button
                type="button"
                onClick={() => setNavPosition('side')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  navPosition === 'side' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex gap-1">
                  <div className="w-4 h-10 bg-primary/30 rounded" />
                  <div className="flex-1 h-10 bg-muted rounded" />
                </div>
                <p className="text-xs mt-2 font-medium">Lateral Izquierdo</p>
              </button>
              <button
                type="button"
                onClick={() => setNavPosition('side-right')}
                className={`p-3 rounded-lg border-2 text-center transition-all ${
                  navPosition === 'side-right' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-border/50'
                }`}
              >
                <div className="flex gap-1">
                  <div className="flex-1 h-10 bg-muted rounded" />
                  <div className="w-4 h-10 bg-primary/30 rounded" />
                </div>
                <p className="text-xs mt-2 font-medium">Lateral Derecho</p>
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" /> Calcular salario por porcentaje
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Si está apagado (predeterminado), no se calcula ni se muestra porcentaje de salario en el cierre de turno.
                </p>
              </div>
              <input
                type="checkbox"
                checked={salaryByPercentEnabled}
                onChange={e => setSalaryByPercentEnabled(e.target.checked)}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
            </label>
          </div>

          {salaryByPercentEnabled && (
            <div className="space-y-3 bg-primary/5 border border-primary/20 rounded-xl p-4 animate-fade-in-up">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Porcentaje de Salario por Defecto (1% al 7%)
              </label>
              <p className="text-xs text-muted-foreground">
                Selecciona el porcentaje que se aplicará por defecto en las liquidaciones:
              </p>
              {/* Botones de selección rápida del 1% al 7% */}
              <div className="grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map(pct => {
                  const isSelected = Number(defaultSalary) === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDefaultSalary(String(pct))}
                      className={`h-10 rounded-lg font-bold text-sm transition-all border ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                          : 'bg-card text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Valor exacto:</span>
                <Input
                  type="number"
                  min="1"
                  max="7"
                  step="0.5"
                  value={defaultSalary}
                  onChange={e => setDefaultSalary(e.target.value)}
                  className="w-24 h-9 text-center font-bold"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sonidos y Mensajes de Bienvenida */}
      <div className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <Volume2 className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-display font-bold text-base sm:text-lg">Sonidos y Mensajes de Bienvenida</h3>
            <p className="text-xs text-muted-foreground">Configura los avisos, frases motivacionales del turno y efectos acústicos.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 hover:bg-card cursor-pointer transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mensajes y Frases de Bienvenida</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Muestra el saludo al iniciar sesión con el turno activo (Mañana/Tarde/Noche) y una frase motivacional que cambia todos los días.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={welcomeGreetingsEnabled}
              onChange={e => {
                setWelcomeGreetingsEnabledState(e.target.checked);
              }}
              className="w-5 h-5 accent-primary cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 hover:bg-card cursor-pointer transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                {soundEffectsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Efectos de Sonido del Sistema</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reproduce tonos armónicos al iniciar sesión, cerrar turno y sonido táctil al eliminar elementos.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundEffectsEnabled}
              onChange={e => {
                setSoundEffectsEnabledState(e.target.checked);
              }}
              className="w-5 h-5 accent-primary cursor-pointer shrink-0"
            />
          </label>

          {/* Selector de idioma de las frases */}
          <div className="p-3.5 rounded-xl border border-border bg-card/60 space-y-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Idiomas de las Frases Motivacionales</p>
                <p className="text-xs text-muted-foreground">
                  Elige uno o varios idiomas para que las frases y reflexiones se muestren en tus idiomas preferidos (en español por defecto):
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUPPORTED_LANGUAGES.map(lang => {
                const isSelected = quoteLanguages.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.code)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs scale-105'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    {isSelected && <span className="ml-1 text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tarjeta de muestra de la frase del día (SIN AUTOR) */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">{currentGreeting.icon}</span>
                <span className="text-xs font-bold text-foreground">
                  {currentGreeting.shiftName} ({currentGreeting.periodText})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono uppercase">
                  {currentGreeting.language}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={fetchingQuote}
                onClick={handleRefreshQuote}
                className="text-[11px] h-7 px-2.5"
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${fetchingQuote ? 'animate-spin' : ''}`} />
                {fetchingQuote ? 'Buscando...' : 'Buscar frase en internet'}
              </Button>
            </div>
            <p className="text-xs text-foreground italic leading-relaxed">
              "{currentGreeting.motivationalMessage}"
            </p>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full" size="lg">Guardar Configuración</Button>

      {/* Copia de Seguridad compacta y cifrada */}
      <CompactBackupControl />

      <div className="glass-card p-6 text-center space-y-4">
        <div>
          <h3 className="font-display font-bold text-lg mb-1">Actualizaciones y Soporte Oficial</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Escanea el código QR para unirte al canal oficial de Telegram donde se anuncian las novedades, mejoras y parches del sistema.
          </p>
        </div>

        <div className="flex justify-center bg-white p-4 rounded-xl mx-auto w-fit shadow-xs">
          <QrDisplay data={telegramUrl} size={200} />
        </div>

        <div>
          <a
            href={telegramUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline break-all"
          >
            <span>Canal Telegram:</span> {telegramUrl}
          </a>
        </div>

        <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-sm">Estado del Sistema</p>
              <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                v{getAppVersion()} ({getPlatformLabel()})
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comprueba si existe una nueva versión disponible para tu dispositivo.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PrivacyPolicyDialog
              trigger={
                <Button variant="outline" size="sm">
                  <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-500" />
                  Política de Privacidad
                </Button>
              }
            />
            <CheckUpdatesButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Ajustes</h1>
          <HelpTip>Gestiona usuarios, revisa las notas importantes y personaliza la apariencia del sistema.</HelpTip>
        </div>
      </div>
      <Tabs defaultValue="users" className="w-full">
        <div className="w-full overflow-x-auto pb-1 scrollbar-none mb-4">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 justify-start sm:justify-center">
            <TabsTrigger value="users"><UsersIcon className="w-4 h-4 mr-2" />Usuarios</TabsTrigger>
            <TabsTrigger value="notes"><Info className="w-4 h-4 mr-2" />Notas Importantes</TabsTrigger>
            <TabsTrigger value="general"><SettingsIcon className="w-4 h-4 mr-2" />Configuración</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="users"><UserManagement /></TabsContent>
        <TabsContent value="notes"><ImportantNotes /></TabsContent>
        <TabsContent value="general"><GeneralSettings /></TabsContent>
      </Tabs>
    </div>
  );
}
