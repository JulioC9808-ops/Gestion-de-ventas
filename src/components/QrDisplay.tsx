import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  data: string;
  size?: number;
  className?: string;
}

export default function QrDisplay({ data, size = 280, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, data, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#ffffff' },
    }).catch(err => console.error('QR generation error:', err));
  }, [data, size]);

  return <canvas ref={canvasRef} className={className} />;
}
