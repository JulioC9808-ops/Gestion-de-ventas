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

  if (!show) return null;

  const base = import.meta.env.BASE_URL;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${
        mobile ? 'bg-white' : 'bg-background'
      }`}
      onClick={() => setShow(false)}
    >

      {mobile ? (
        <div className="relative flex h-full w-full flex-col items-center justify-center px-8">
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
        <video
          src={`${base}intro.mp4`}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
          onEnded={() => setShow(false)}
          onError={() => setShow(false)}
        />
      )}
    </div>
  );
}
