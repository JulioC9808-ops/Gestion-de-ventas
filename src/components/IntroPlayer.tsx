import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Reproduce el video local de intro una vez por sesión.
 * El MP4 se empaqueta con la aplicación y funciona sin conexión.
 */
export default function IntroPlayer() {
  const [show, setShow] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem('intro_played');
    if (!seen) {
      setShow(true);
      sessionStorage.setItem('intro_played', '1');
    }
  }, []);

  // Si el equipo no puede iniciar el video, no bloqueamos la aplicación.
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      if (!playing) setShow(false);
    }, 1800);
    return () => clearTimeout(t);
  }, [show, playing]);

  const close = () => setShow(false);

  if (!show) return null;

  const src = `${import.meta.env.BASE_URL}intro.mp4`;

  return (
    <div className={`fixed inset-0 z-[9999] bg-background flex items-center justify-center transition-opacity duration-200 ${playing ? 'opacity-100' : 'opacity-0'}`}>
      <video
        src={src}
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onEnded={close}
        onError={close}
        className="w-full h-full object-contain bg-background"
      />
      <Button
        variant="secondary"
        size="sm"
        onClick={close}
        className="absolute bottom-6 right-6 opacity-80 hover:opacity-100"
      >
        Saltar intro →
      </Button>
    </div>
  );
}
