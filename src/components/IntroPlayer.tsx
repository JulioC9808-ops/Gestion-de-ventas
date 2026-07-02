import React, { useEffect, useRef, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';

/**
 * Reproduce el video de intro (settings.introVideoUrl) UNA vez por sesión al abrir la app.
 * Con botón para saltar. Si no hay video configurado, no muestra nada.
 */
export default function IntroPlayer() {
  const { settings } = useData();
  const [show, setShow] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem('intro_played');
    if (settings.introEnabled !== false && settings.introVideoUrl && !seen) {
      setShow(true);
      sessionStorage.setItem('intro_played', '1');
    }
  }, [settings.introVideoUrl, settings.introEnabled]);

  const close = () => setShow(false);

  if (!show || !settings.introVideoUrl) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-fade-in">
      <video
        ref={videoRef}
        src={settings.introVideoUrl}
        autoPlay
        muted
        playsInline
        onEnded={close}
        className="max-w-full max-h-full"
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
