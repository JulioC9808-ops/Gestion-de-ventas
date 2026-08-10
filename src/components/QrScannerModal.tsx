import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  /** Si es true, el modal permanece abierto tras cada lectura (para leer varios QR). */
  keepOpen?: boolean;
}

const ELEMENT_ID = 'qr-scanner-region';

export default function QrScannerModal({ open, onClose, onScan, title = 'Escanear QR', hint, keepOpen }: Props) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [starting, setStarting] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setPermissionError(null);
    setAttempt(a => a + 1);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStarting(true);
    setPermissionError(null);

    const stop = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch { /* noop */ }
    };

    const start = async () => {
      try {
        // 1) Pedimos permiso explícitamente. En el WebView de Android esto dispara
        //    el diálogo del sistema; si ya está concedido, resuelve al instante.
        let granted: MediaStream | null = null;
        try {
          granted = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch (permErr) {
          console.error('Permiso de cámara denegado:', permErr);
          if (!cancelled) {
            setPermissionError(
              'La aplicación no tiene permiso de cámara. Ve a Ajustes del teléfono → Aplicaciones → esta app → Permisos → Cámara → Permitir, y vuelve a intentarlo.',
            );
            setStarting(false);
          }
          return;
        } finally {
          // Liberamos el stream de prueba: html5-qrcode abrirá el suyo.
          granted?.getTracks().forEach(t => t.stop());
        }

        if (cancelled) return;

        // 2) Elegimos la cámara trasera si existe.
        let cameraConfig: string | { facingMode: string } = { facingMode: 'environment' };
        try {
          const cams = await Html5Qrcode.getCameras();
          const back = cams.find(c => /back|rear|environment|trasera/i.test(c.label)) || cams[cams.length - 1];
          if (back?.id) cameraConfig = back.id;
        } catch { /* usamos facingMode */ }

        if (cancelled) return;

        const scanner = new Html5Qrcode(ELEMENT_ID, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          cameraConfig as string,
          { fps: 12, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (cancelled) return;
            onScanRef.current(decoded);
            if (!keepOpen) stop();
          },
          () => { /* ignoramos fallos de cuadro */ },
        );
        if (cancelled) await stop();
      } catch (err) {
        console.error('Error de cámara:', err);
        if (!cancelled) setPermissionError('No se pudo iniciar la cámara. Cierra otras apps que la estén usando e inténtalo de nuevo.');
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, attempt, keepOpen]);

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
          {permissionError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {permissionError}
            </div>
          )}
          <div className="flex gap-2">
            {permissionError && (
              <Button variant="secondary" className="flex-1" onClick={retry}>Reintentar</Button>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
