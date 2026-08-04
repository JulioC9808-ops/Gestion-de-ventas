import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import introAsset from '@/assets/intro.mp4.asset.json';

/**
 * Reproduce el video de intro UNA vez por sesión al abrir la app.
 * En Electron (file://) el asset relativo no resuelve: si no arranca
 * en 2.5s o falla, se salta automáticamente para no dejar pantalla negra.
 */
export default function IntroPlayer() {
  const { settings } = useData();
  const [show, setShow] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const seen = sessionStorage.getItem('intro_played');
    if (!seen) {
      setShow(true);
      sessionStorage.setItem('intro_played', '1');
    }
  }, []);

  // Auto-skip si el video no comienza a los 2.5s (packaged .exe sin internet)
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      if (!loaded) setShow(false);
    }, 2500);
    return () => clearTimeout(t);
  }, [show, loaded]);

  const close = () => setShow(false);

  if (!show) return null;

  // Construir URL absoluta hacia el CDN cuando estamos en Electron/file://
  const src = (() => {
    const rel = settings.introVideoUrl || introAsset.url;
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      return `https://cdn.lovable.dev${rel}`;
    }
    return rel;
  })();

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        playsInline
        onPlaying={() => setLoaded(true)}
        onLoadedData={() => setLoaded(true)}
        onEnded={close}
        onError={close}
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
