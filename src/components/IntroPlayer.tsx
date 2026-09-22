import React, { useEffect, useState } from 'react';
import { isMobileDevice } from '@/lib/platform';
import splashCup from '@/assets/splash-cup.png';

/**
 * Pantalla de inicio (una vez por sesión).
 * - PC / Electron: reproduce el video de introducción.
 * - Android / móvil: muestra la taza en grande (alta resolución) con el GIF de carga.
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

  // Quita el splash estático del index.html (evita el parpadeo al arrancar)
  const hideBootSplash = () => {
    const el = document.getElementById('boot-splash');
    if (el) el.remove();
  };

  useEffect(() => {
    if (!show) {
      hideBootSplash();
      return;
    }
    if (mobile) hideBootSplash();
    // Cierre de seguridad: móvil 2.6s, PC máx 12s (por si el video no dispara "ended")
    const t = setTimeout(() => {
      hideBootSplash();
      setShow(false);
    }, mobile ? 2600 : 12000);
    return () => clearTimeout(t);
  }, [show, mobile]);

  // Permitir cerrar el video con la tecla Escape
  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        hideBootSplash();
        setShow(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  if (!show) return null;

  const base = import.meta.env.BASE_URL;

  return (
    <div
      id="app-intro-overlay"
      className="fixed inset-0 z-[9999] w-screen h-screen overflow-hidden bg-black flex items-center justify-center select-none cursor-pointer transition-opacity duration-300"
      onClick={() => {
        hideBootSplash();
        setShow(false);
      }}
      title="Haz clic o presiona Esc para continuar"
    >
      {mobile ? (
        <div className="relative flex h-full w-full flex-col items-center justify-center px-8 bg-white">
          {/* Resplandor suave detrás de la taza */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,hsl(var(--primary)/0.18),transparent_65%)]" />
          <img
            src={splashCup}
            alt="Sistema de Gestión"
            className="relative w-[78vw] max-w-[420px] object-contain drop-shadow-2xl"
          />
          <img
            src={`${base}loader.gif`}
            alt="Cargando"
            className="relative mt-10 h-16 w-16 object-contain opacity-90"
          />
        </div>
      ) : (
        <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
          <video
            src={`${base}intro.mp4`}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover select-none pointer-events-none"
            onCanPlay={hideBootSplash}
            onPlaying={hideBootSplash}
            onEnded={() => { hideBootSplash(); setShow(false); }}
            onError={() => { hideBootSplash(); setShow(false); }}
          />
          <div className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white/70 hover:text-white text-xs border border-white/10 transition-colors pointer-events-auto">
            Saltar presentación ✕
          </div>
        </div>
      )}
    </div>
  );
}
