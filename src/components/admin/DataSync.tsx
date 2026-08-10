import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import QrDisplay from '@/components/QrDisplay';
import QrScannerModal from '@/components/QrScannerModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, ScanLine, Pause, Play } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import {
  buildBackup, encodeBackup, decodeBackup, chunkPayload, parseChunk, joinChunks,
} from '@/lib/backup';
import HelpTip from '@/components/HelpTip';

/**
 * Sincronización total de datos entre dispositivos por QR (sin internet).
 * El dispositivo con los datos más actualizados MUESTRA la secuencia de códigos;
 * el otro los ESCANEA hasta completar el respaldo.
 */
export default function DataSync() {
  const { products, stock, movements, users, settings, applyBackup } = useData();
  const [showQr, setShowQr] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const chunks = useMemo(
    () => chunkPayload(encodeBackup(buildBackup({ products, stock, movements, users, settings }))),
    [products, stock, movements, users, settings],
  );

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!showQr || !playing || chunks.length <= 1) return;
    const id = setInterval(() => setIndex(i => (i + 1) % chunks.length), 1400);
    return () => clearInterval(id);
  }, [showQr, playing, chunks.length]);

  // ---- Recepción ----
  const [received, setReceived] = useState<Map<number, string>>(new Map());
  const [expected, setExpected] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);

  const resetReception = () => {
    setReceived(new Map());
    setExpected(0);
    setBatchId(null);
  };

  const handleScan = (text: string) => {
    const chunk = parseChunk(text);
    if (!chunk) {
      toast.error('Este QR no es de sincronización de datos.');
      return;
    }

    let nextMap: Map<number, string>;
    if (batchId && batchId !== chunk.id) {
      nextMap = new Map([[chunk.index, chunk.data]]);
      setBatchId(chunk.id);
    } else {
      nextMap = new Map(received);
      nextMap.set(chunk.index, chunk.data);
      if (!batchId) setBatchId(chunk.id);
    }
    setReceived(nextMap);
    setExpected(chunk.total);

    const joined = joinChunks(nextMap, chunk.total);
    if (!joined) return;

    const payload = decodeBackup(joined);
    if (!payload) {
      toast.error('Los datos recibidos están dañados. Vuelve a escanear.');
      resetReception();
      return;
    }
    applyBackup(payload);
    setScanOpen(false);
    resetReception();
    toast.success('Datos sincronizados: productos, stock y usuarios actualizados.');
  };

  const progress = expected ? `${received.size}/${expected}` : '0/?';

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg">Sincronizar datos por QR</h3>
        <HelpTip>
          El dispositivo que tiene los datos más nuevos muestra los códigos; el otro los escanea.
          Se envían productos, almacén, stock de venta, movimientos y usuarios. Las imágenes (logo/fondo) no se envían.
        </HelpTip>
      </div>
      <p className="text-sm text-muted-foreground">
        Úsalo cuando compres productos nuevos o cambies precios: así todos los dispositivos venden
        con la misma información, sin internet.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button onClick={() => { setIndex(0); setPlaying(true); setShowQr(true); }}>
          <QrCode className="w-4 h-4 mr-2" /> Mostrar mis datos
        </Button>
        <Button variant="secondary" onClick={() => { resetReception(); setScanOpen(true); }}>
          <ScanLine className="w-4 h-4 mr-2" /> Recibir datos
        </Button>
      </div>

      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Enviar datos ({index + 1}/{chunks.length})</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3">
            <div className="bg-white p-3 rounded-lg">
              <QrDisplay data={chunks[index]} size={250} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Mantén los códigos girando frente a la cámara del otro dispositivo hasta que complete
              los {chunks.length} fragmentos.
            </p>
            <div className="flex w-full gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPlaying(p => !p)}>
                {playing ? <><Pause className="w-4 h-4 mr-2" />Pausar</> : <><Play className="w-4 h-4 mr-2" />Reanudar</>}
              </Button>
              <Button className="flex-1" onClick={() => setShowQr(false)}>Listo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QrScannerModal
        open={scanOpen}
        onClose={() => { setScanOpen(false); resetReception(); }}
        onScan={handleScan}
        keepOpen
        title={`Recibiendo datos ${progress}`}
        hint="Apunta la cámara a los códigos del otro dispositivo. Se van leyendo uno por uno automáticamente."
      />
    </div>
  );
}
