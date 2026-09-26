import React, { useState } from 'react';
import FontSizeSelector from '@/components/FontSizeSelector';
import HelpTip from '@/components/HelpTip';
import { Sliders, ShieldCheck, Volume2, VolumeX, MessageSquare, RefreshCw, Globe, Smartphone, Vibrate } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import PrivacyPolicyDialog from '@/components/PrivacyPolicyDialog';
import { Button } from '@/components/ui/button';
import { getShiftGreeting, fetchOnlineQuote, SUPPORTED_LANGUAGES, getQuoteLanguages, setQuoteLanguages } from '@/lib/greeting';
import { areSoundsEnabled, setSoundsEnabled } from '@/lib/soundUtils';
import { isHapticsEnabled, setHapticsEnabled, triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';

export default function EmployeeSettings() {
  const { currentUser } = useAuth();
  const [soundsOn, setSoundsOn] = useState(() => areSoundsEnabled());
  const [hapticsOn, setHapticsOn] = useState(() => isHapticsEnabled());
  const [welcomeOn, setWelcomeOn] = useState(() => {
    try {
      return localStorage.getItem('pos_welcome_greetings_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [quoteLangs, setQuoteLangs] = useState<string[]>(() => getQuoteLanguages());
  const [currentGreeting, setCurrentGreeting] = useState(() => getShiftGreeting(currentUser?.name, getQuoteLanguages()));
  const [fetchingQuote, setFetchingQuote] = useState(false);

  const handleToggleSounds = (enabled: boolean) => {
    setSoundsOn(enabled);
    setSoundsEnabled(enabled);
    toast.success(enabled ? 'Efectos de sonido activados' : 'Efectos de sonido desactivados');
  };

  const handleToggleHaptics = (enabled: boolean) => {
    setHapticsOn(enabled);
    setHapticsEnabled(enabled);
    if (enabled) triggerHaptic('selection');
    toast.success(enabled ? 'Vibración táctil activada' : 'Vibración táctil desactivada');
  };

  const handleToggleWelcome = (enabled: boolean) => {
    setWelcomeOn(enabled);
    try {
      localStorage.setItem('pos_welcome_greetings_enabled', enabled ? 'true' : 'false');
    } catch {
      // Ignorar error de almacenamiento
    }
    toast.success(enabled ? 'Mensajes de bienvenida activados' : 'Mensajes de bienvenida desactivados');
  };

  const handleToggleLanguage = (code: string) => {
    let updated: string[];
    if (quoteLangs.includes(code)) {
      if (quoteLangs.length === 1) {
        toast.info('Debes mantener al menos un idioma seleccionado.');
        return;
      }
      updated = quoteLangs.filter(l => l !== code);
    } else {
      updated = [...quoteLangs, code];
    }
    setQuoteLangs(updated);
    setQuoteLanguages(updated);
    setCurrentGreeting(getShiftGreeting(currentUser?.name, updated));
    toast.success('Idioma(s) de frases actualizado');
  };

  const handleRefreshQuote = async () => {
    setFetchingQuote(true);
    try {
      const res = await fetchOnlineQuote(undefined, quoteLangs);
      if (res) {
        toast.success('¡Nueva frase de internet obtenida!');
      } else {
        toast.info('Mostrando frase del catálogo diario.');
      }
      setCurrentGreeting(getShiftGreeting(currentUser?.name, quoteLangs));
    } catch {
      toast.error('No se pudo conectar a internet.');
    } finally {
      setFetchingQuote(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Ajustes y Preferencias</h1>
          <HelpTip>
            Configura el tamaño del texto, los sonidos y los mensajes de bienvenida para mayor comodidad en tu dispositivo.
          </HelpTip>
        </div>
      </div>

      <div className="glass-card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Sliders className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display font-bold text-base md:text-lg">Preferencia Visual</h2>
            <p className="text-xs text-muted-foreground">Personaliza el tamaño de la letra en tu teléfono.</p>
          </div>
        </div>

        <FontSizeSelector />
      </div>

      <div className="glass-card p-5 md:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Volume2 className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-display font-bold text-base md:text-lg">Sonidos y Saludos de Turno</h2>
            <p className="text-xs text-muted-foreground">Ajusta los mensajes motivacionales y efectos auditivos en tu teléfono.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 hover:bg-card cursor-pointer transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Mensajes y Frases de Bienvenida</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Muestra el saludo al iniciar tu turno junto con la frase motivacional del día.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={welcomeOn}
              onChange={e => handleToggleWelcome(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 hover:bg-card cursor-pointer transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                {soundsOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Efectos de Sonido</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Reproduce tonos suaves al iniciar sesión, cerrar turno, escanear QR y eliminar elementos.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundsOn}
              onChange={e => handleToggleSounds(e.target.checked)}
              className="w-5 h-5 accent-primary cursor-pointer shrink-0"
            />
          </label>

          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 hover:bg-card cursor-pointer transition-all">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                <Vibrate className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Vibración Táctil (Respuesta Háptica)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vibración sutil al escribir en campos de texto, pulsar botones y confirmar acciones.
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hapticsOn}
              onChange={e => handleToggleHaptics(e.target.checked)}
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
                  Elige los idiomas en los que deseas recibir las frases del turno (Español por defecto):
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {SUPPORTED_LANGUAGES.map(lang => {
                const isSelected = quoteLangs.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleToggleLanguage(lang.code)}
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

          {/* Tarjeta de muestra de la frase (SIN AUTOR) */}
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

      <div className="glass-card p-5 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-sm">Privacidad y Términos</h3>
              <p className="text-xs text-muted-foreground">Términos de uso y protección de datos del sistema.</p>
            </div>
          </div>
          <PrivacyPolicyDialog
            trigger={
              <Button variant="outline" size="sm">
                Ver Política
              </Button>
            }
          />
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center py-2">
        Sesión iniciada como <strong className="text-foreground">{currentUser?.name}</strong> (@{currentUser?.username})
      </div>
    </div>
  );
}
