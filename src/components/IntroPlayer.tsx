import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import introAsset from '@/assets/intro.mp4.asset.json';

/**
 * Reproduce el video de intro (bundled) UNA vez por sesión al abrir la app.
 * Con botón para saltar.
 */
export default function IntroPlayer() {
  const [show, setShow] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem('intro_played');
    if (!seen) {
      setShow(true);
      sessionStorage.setItem('intro_played', '1');
    }
  }, []);

  const close = () => setShow(false);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center animate-fade-in">
      <video
        ref={videoRef}
        src={introAsset.url}
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
