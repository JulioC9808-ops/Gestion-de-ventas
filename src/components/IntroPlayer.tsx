import React, { useEffect, useState } from 'react';

/**
 * Pantalla de carga inicial (una vez por sesión).
 * Muestra el icono de la aplicación con un GIF de carga debajo.
 * Todos los recursos son locales, funciona sin conexión en Electron/Android.
 */
export default function IntroPlayer() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('intro_played');
    if (!seen) {
      setShow(true);
      sessionStorage.setItem('intro_played', '1');
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;

  const base = import.meta.env.BASE_URL;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background animate-fade-in-up"
      onClick={() => setShow(false)}
    >
      <img
        src={`${base}favicon.png`}
        alt="Sistema de Gestión"
        className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-xl"
      />
      <img
        src={`${base}loader.gif`}
        alt="Cargando"
        className="w-24 h-24 object-contain"
      />
    </div>
  );
}
