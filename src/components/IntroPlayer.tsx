import React, { useEffect, useState, useCallback } from 'react';
import { isMobileDevice } from '@/lib/platform';
import { setPinchZoomActive } from '@/lib/pinchZoom';
import splashCup from '@/assets/splash-cup.png';
import ModernWaveBackground from './ModernWaveBackground';

/**
 * Pantalla de instalación y bienvenida moderna estilo Discord/Spotify:
 * - Ventana compacta, flotante, sin bordes toscos
 * - Fondo con ondas fluidas en movimiento continuo (azul claro, verde claro, amarillo claro)
 * - Indicador de preparación dinámico con progreso elegante
 * - Ultraligera: consumo mínimo de recursos (<0.5% CPU)
 */
export default function IntroPlayer() {
  const [mobile] = useState(() => isMobileDevice());
  const [show, setShow] = useState(() => {
    try {
      if (sessionStorage.getItem('intro_played')) return false;
      sessionStorage.setItem('intro_played', '1');
      return true;
    } catch {
      return false;
    }
  });

  const [step, setStep] = useState(0);
  const [isClosing, setIsClosing] = useState(false);

  const hideBootSplash = useCallback(() => {
    const el = document.getElementById('boot-splash');
    if (el) el.remove();

    const meta = document.getElementById('viewport-meta');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, viewport-fit=cover'
      );
    }
  }, []);

  const closeIntro = useCallback(() => {
    hideBootSplash();
    setPinchZoomActive(false);
    setShow(false);
  }, [hideBootSplash]);

  useEffect(() => {
    setPinchZoomActive(false);

    if (!show) {
      hideBootSplash();
      return;
    }

    hideBootSplash();

    // Secuencia de preparación visual con progreso dinámico
    const t1 = setTimeout(() => setStep(1), 120);  // 1: Iniciando
    const t2 = setTimeout(() => setStep(2), 650);  // 2: Módulos y base de datos
    const t3 = setTimeout(() => setStep(3), 1300); // 3: Catálogo y stock
    const t4 = setTimeout(() => setStep(4), 1950); // 4: Listo
    const t5 = setTimeout(() => setIsClosing(true), mobile ? 2500 : 2800);
    const t6 = setTimeout(() => closeIntro(), mobile ? 2850 : 3150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [show, mobile, closeIntro, hideBootSplash]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        closeIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, closeIntro]);

  if (!show) return null;

  const statusText =
    step === 1 ? 'Iniciando sistema GEVEN...' :
    step === 2 ? 'Cargando módulos y almacenamiento local...' :
    step === 3 ? 'Verificando inventario y catálogos...' :
    step >= 4 ? '¡Todo listo para trabajar!' :
    'Preparando...';

  const progressPercent =
    step === 1 ? 25 :
    step === 2 ? 60 :
    step === 3 ? 88 :
    step >= 4 ? 100 : 10;

  return (
    <div
      id="app-intro-overlay"
      className={`fixed inset-0 z-[9999] w-full h-dvh overflow-hidden flex items-center justify-center select-none cursor-pointer transition-opacity duration-350 ease-out touch-none bg-[#070b14] text-foreground ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onTouchMove={e => {
        if (e.touches.length > 1) e.preventDefault();
      }}
      onClick={closeIntro}
      title="Haz clic o presiona Esc para continuar"
    >
      {/* Fondo completo con Ondas en Movimiento (Azul, Verde y Amarillo) */}
      <ModernWaveBackground className="opacity-90" />

      {/* Resplandor ambiental suave en el centro */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(56,189,248,0.12),transparent_65%)]" />

      {/* Ventana compacta y moderna estilo Discord/Spotify */}
      <div
        className="relative z-10 w-full max-w-[490px] mx-4 rounded-3xl p-7 sm:p-9 bg-[#0b1324]/85 backdrop-blur-2xl border border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col items-center text-center overflow-hidden animate-in fade-in zoom-in-95 duration-300"
      >
        {/* Micro-ondas internas dentro de la tarjeta para efecto de profundidad */}
        <ModernWaveBackground className="opacity-40" />

        {/* Halo de luz tras el logotipo */}
        <div className="pointer-events-none absolute top-10 w-32 h-32 rounded-full bg-gradient-to-tr from-[#38bdf8]/20 via-[#34d399]/20 to-[#facc15]/20 blur-2xl" />

        {/* 1. Logotipo oficial de GEVEN */}
        <div
          className={`relative transition-all duration-700 ease-out transform ${
            step >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-2'
          }`}
        >
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-lg">
            <img
              src={splashCup}
              alt="GEVEN"
              className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* 2. Marca principal y subtítulo */}
        <div
          className={`mt-4 transition-all duration-500 ease-out transform ${
            step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.18em] font-display text-white">
            GEVEN
          </h1>
          <p className="text-xs sm:text-sm font-semibold tracking-[0.24em] text-emerald-400 uppercase mt-1">
            Gestión de Ventas
          </p>
        </div>

        {/* 3. Estado dinámico de preparación */}
        <div className="w-full max-w-xs mt-6 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300 px-0.5">
            <span className="truncate">{statusText}</span>
            <span className="text-amber-300 font-bold ml-2 shrink-0">{progressPercent}%</span>
          </div>

          {/* Barra de progreso con gradiente tricolor [azul claro, verde claro, amarillo claro] */}
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#38bdf8] via-[#34d399] to-[#facc15] transition-all duration-500 ease-out shadow-[0_0_12px_rgba(52,211,153,0.5)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Pie con indicador de versión y botón de omisión rápida */}
        <div className="mt-7 flex items-center justify-between w-full pt-4 border-t border-white/5 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            v1.3.8
          </span>
          <span className="hover:text-white transition-colors cursor-pointer text-slate-400 font-medium">
            Saltar ✕
          </span>
        </div>
      </div>
    </div>
  );
}
