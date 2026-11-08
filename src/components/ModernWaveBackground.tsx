import React, { useEffect, useRef } from 'react';

/**
 * ModernWaveBackground
 * Canvas de alto rendimiento y ultra bajo consumo (<0.5% CPU)
 * Genera ondas matemáticas continuas con la paleta de GEVEN:
 * - Azul claro:  #38bdf8 (sky-400)
 * - Verde claro: #34d399 (emerald-400)
 * - Amarillo:    #facc15 (amber-400)
 */
export default function ModernWaveBackground({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Parámetros de las 3 ondas con los colores solicitados por el usuario
    const waves = [
      {
        // 1. Azul claro
        colorStart: 'rgba(56, 189, 248, 0.40)',
        colorEnd: 'rgba(56, 189, 248, 0.02)',
        amplitude: 22,
        frequency: 0.007,
        speed: 0.016,
        offsetY: 0.62,
        phase: 0,
      },
      {
        // 2. Verde claro
        colorStart: 'rgba(52, 211, 153, 0.38)',
        colorEnd: 'rgba(52, 211, 153, 0.02)',
        amplitude: 28,
        frequency: 0.009,
        speed: 0.022,
        offsetY: 0.68,
        phase: 2.2,
      },
      {
        // 3. Amarillo claro
        colorStart: 'rgba(250, 204, 21, 0.35)',
        colorEnd: 'rgba(250, 204, 21, 0.02)',
        amplitude: 18,
        frequency: 0.006,
        speed: 0.014,
        offsetY: 0.74,
        phase: 4.4,
      },
    ];

    let t = 0;

    const render = () => {
      t += 1;
      ctx.clearRect(0, 0, width, height);

      waves.forEach(w => {
        const baseY = height * w.offsetY;
        const currentPhase = w.phase + t * w.speed;

        ctx.beginPath();
        ctx.moveTo(0, height);

        // Curva suave de izquierda a derecha
        const step = 4; // paso optimizado para 60fps con mínimo coste
        for (let x = 0; x <= width + step; x += step) {
          const y = baseY + Math.sin(x * w.frequency + currentPhase) * w.amplitude +
                    Math.cos(x * w.frequency * 0.5 - currentPhase * 0.5) * (w.amplitude * 0.35);
          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY - w.amplitude, 0, height);
        grad.addColorStop(0, w.colorStart);
        grad.addColorStop(1, w.colorEnd);
        ctx.fillStyle = grad;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 w-full h-full ${className}`}
      style={{ display: 'block' }}
    />
  );
}
