import React, { useEffect, useState } from 'react';
import { isMobileDevice } from '@/lib/platform';

/**
 * Pantalla de inicio (una vez por sesión).
 * - PC / Electron: reproduce el video de introducción.
 * - Android / móvil: muestra el icono con el GIF de carga (el video fallaba en el celular).
 */
export default function IntroPlayer() {
  const [show, setShow] = useState(false);
  const [mobile] = useState(() => isMobileDevice());

  useEffect(() => {
    const seen = sessionStorage.getItem('intro_played');
    if (!seen) {
      setShow(true);
      sessionStorage.setItem('intro_played', '1');
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    // Cierre de seguridad: móvil 2.6s, PC máx 12s (por si el video no dispara "ended")
    const t = setTimeout(() => setShow(false), mobile ? 2600 : 12000);
    return () => clearTimeout(t);
  }, [show, mobile]);

  if (!show) return null;

  const base = import.meta.env.BASE_URL;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background animate-fade-in-up"
      onClick={() => setShow(false)}
    >
      {mobile ? (
        <>
          <img
            src={`${base}favicon.png`}
            alt="Sistema de Gestión"
            className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-xl"
          />
          <img src={`${base}loader.gif`} alt="Cargando" className="w-24 h-24 object-contain" />
        </>
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
