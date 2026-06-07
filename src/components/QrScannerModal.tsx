import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (text: string) => void;
  title?: string;
  hint?: string;
}

const ELEMENT_ID = 'qr-scanner-region';

export default function QrScannerModal({ open, onClose, onScan, title = 'Escanear QR', hint }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStarting(true);

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(ELEMENT_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decoded) => {
            if (cancelled) return;
            onScan(decoded);
            stop();
          },
          () => {} // ignore frame failures
        );
        if (cancelled) await stop();
      } catch (err) {
        console.error('Camera error:', err);
        toast.error('No se pudo acceder a la cámara. Revisa los permisos.');
        onClose();
      } finally {
        setStarting(false);
      }
    };

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch { /* noop */ }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, onClose, onScan]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
          <div id={ELEMENT_ID} className="w-full rounded-lg overflow-hidden bg-black/40 min-h-[280px]" />
          {starting && <p className="text-xs text-muted-foreground text-center">Iniciando cámara…</p>}
          <Button variant="outline" className="w-full" onClick={onClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
