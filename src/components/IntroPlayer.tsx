import React, { useEffect, useState, useCallback } from 'react';
import { isMobileDevice } from '@/lib/platform';
import { setPinchZoomActive } from '@/lib/pinchZoom';
import splashCup from '@/assets/splash-cup.png';

/**
 * Pantalla de inicio / Splash con la identidad oficial:
 * 1. Logotipo / icono de la aplicación
 * 2. GEVEN (marca principal)
 * 3. Gestión de Ventas (subtítulo)
 * 4. Transición limpia y fluida hacia la app
 */
export default function IntroPlayer() {
  const [mobile] = useState(() => isMobileDevice());
  // Se calcula en el primer render (sincrónico) para que no haya destello de la app.
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

  // Quita el splash estático del index.html y habilita el zoom a partir del login
  const hideBootSplash = useCallback(() => {
    const el = document.getElementById('boot-splash');
    if (el) el.remove();

    // Habilitar pellizcar / zoom una vez que termina la pantalla de carga (en login y app)
    const meta = document.getElementById('viewport-meta');
    if (meta) {
      meta.setAttribute(
        'content',
        'width=device-width, initial-scale=1.0, maximum-scale=3.0, minimum-scale=1.0, user-scalable=yes, viewport-fit=cover'
      );
    }
  }, []);

  const closeIntro = useCallback(() => {
    hideBootSplash();
    setPinchZoomActive(false);
    setShow(false);
  }, [hideBootSplash]);

  useEffect(() => {
    // Mantener zoom desactivado en intro y pantalla de login
    setPinchZoomActive(false);

    if (!show) {
      hideBootSplash();
      return;
    }

    hideBootSplash();

    // Secuencia de animación fluida, profesional y sin retrasos innecesarios:
    // 1. Aparece el logotipo/icono de la aplicación
    const t1 = setTimeout(() => setStep(1), 80);
    // 2. Aparece "GEVEN"
    const t2 = setTimeout(() => setStep(2), 400);
    // 3. Debajo aparece "Gestión de Ventas"
    const t3 = setTimeout(() => setStep(3), 780);
    // 4. Indicador sutil de carga operativa
    const t4 = setTimeout(() => setStep(4), 1100);
    // 5. Inicio suave de transición de desvanecimiento hacia la aplicación
    const t5 = setTimeout(() => setIsClosing(true), mobile ? 2100 : 2400);
    // 6. Cierre completo
    const t6 = setTimeout(() => closeIntro(), mobile ? 2450 : 2750);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [show, mobile]);

  // Permitir cerrar/saltar de inmediato con click o teclas
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        closeIntro();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  if (!show) return null;

  return (
    <div
      id="app-intro-overlay"
      className={`fixed inset-0 z-[9999] w-screen h-screen overflow-hidden flex items-center justify-center select-none cursor-pointer transition-opacity duration-350 ease-out touch-none bg-background text-foreground ${
        isClosing ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      onTouchMove={e => {
        if (e.touches.length > 1) e.preventDefault();
      }}
      onClick={closeIntro}
      title="Haz clic o presiona Esc para continuar"
    >
      {/* Resplandor suave y discreto en el centro */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,hsl(var(--primary)/0.12),transparent_65%)]" />

      <div className="relative flex flex-col items-center justify-center px-6 max-w-sm w-full text-center">
        {/* Paso 1: Logotipo / icono de la aplicación */}
        <div
          className={`relative transition-all duration-700 ease-out transform ${
            step >= 1
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-2'
          }`}
        >
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center p-2">
            <img
              src={splashCup}
              alt="GEVEN"
              className="w-full h-full object-contain drop-shadow-md"
            />
          </div>
        </div>

        {/* Paso 2: GEVEN (Nombre Principal) */}
        <div
          className={`mt-4 transition-all duration-500 ease-out transform ${
            step >= 2
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.16em] font-display text-foreground">
            GEVEN
          </h1>
        </div>

        {/* Paso 3: Gestión de Ventas (Subtítulo / Descripción) */}
        <div
          className={`mt-1.5 transition-all duration-500 ease-out transform ${
            step >= 3
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-2'
          }`}
        >
          <p className="text-xs sm:text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
            Gestión de Ventas
          </p>
        </div>

        {/* Paso 4: Línea de carga sutil, discreta y profesional */}
        <div
          className={`mt-8 w-36 h-1 bg-border/60 rounded-full overflow-hidden transition-opacity duration-500 ${
            step >= 4 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className={`h-full bg-primary rounded-full transition-all duration-1200 ease-out ${
              step >= 4 ? 'w-full' : 'w-0'
            }`}
          />
        </div>
      </div>

      {/* Acceso rápido para omitir */}
      <div className="absolute bottom-5 right-5 z-10 px-3 py-1.5 rounded-full bg-muted/70 backdrop-blur-sm text-muted-foreground hover:text-foreground text-xs border border-border/40 transition-colors pointer-events-auto">
        Saltar ✕
      </div>
    </div>
  );
}
