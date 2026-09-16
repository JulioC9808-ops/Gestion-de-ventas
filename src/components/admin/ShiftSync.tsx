import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { QrCode, Check } from 'lucide-react';
import QrScannerModal from '@/components/QrScannerModal';
import QrDisplay from '@/components/QrDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import HelpTip from '@/components/HelpTip';
import type { ShiftReport } from '@/types';
import { receiveShiftShare } from '@/lib/syncTransport';

export default function ShiftSync() {
  const { addReport } = useData();
  const [scanOpen, setScanOpen] = useState(false);
  const [ackReport, setAckReport] = useState<ShiftReport | null>(null);
  const [receiving, setReceiving] = useState(false);

  const handleScan = async (text: string) => {
    if (receiving) return;
    setReceiving(true);
    try {
      const report = await receiveShiftShare(text.trim());
      if (!report) {
        toast.error('Este QR no es un cierre de turno válido.');
        return;
      }
      const synced: ShiftReport = { ...report, synced: true };
      addReport(synced);
      setScanOpen(false);
      setAckReport(synced);
      toast.success(`Turno de ${synced.employeeName} sincronizado.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'No se pudo leer el turno del QR.');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Sincronizar Turnos</h1>
          <HelpTip>
            Escanea el QR que muestra el empleado al final de su turno para recibir los datos en tu dispositivo.
            Luego enséñale el QR de confirmación para que pueda cerrar sesión.
          </HelpTip>
        </div>
      </div>

      <div className="glass-card p-6 max-w-xl mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <QrCode className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-lg font-display font-bold">Recibir cierre de turno</h2>
        <p className="text-sm text-muted-foreground">
          Pídele a tu empleado que abra la pestaña "Cierre de Turno" y muestre el QR. Conecta ambos dispositivos a la misma red Wi‑Fi y apunta la cámara hacia él.
        </p>
        <Button onClick={() => setScanOpen(true)} className="w-full">
          <QrCode className="w-4 h-4 mr-2" /> Escanear QR del empleado
        </Button>
        <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 text-xs text-warning text-left">
          ℹ️ Nota: esta función transfiere los datos por la red Wi‑Fi local, sin necesitar internet. El turno se guarda en tu
          dispositivo y luego debes mostrarle al empleado el QR de confirmación para que pueda salir.
        </div>
      </div>

      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleScan}
        keepOpen
        title="Escanear cierre de turno"
        hint={receiving ? 'Recibiendo turno…' : 'Apunta al QR que muestra el empleado.'}
      />

      <Dialog open={!!ackReport} onOpenChange={(o) => !o && setAckReport(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Check className="w-5 h-5 text-success" /> Turno recibido
            </DialogTitle>
          </DialogHeader>
          {ackReport && (
            <div className="space-y-3 text-center">
              <p className="text-sm">
                <strong>{ackReport.employeeName}</strong> — Turno {ackReport.shift === 'morning' ? 'Mañana' : 'Tarde'}<br />
                Total: <strong>${ackReport.totalSold.toLocaleString()}</strong>
              </p>
              <div className="flex justify-center bg-white p-3 rounded-lg">
                <QrDisplay data={`ACK:${ackReport.id}`} size={240} />
              </div>
              <p className="text-xs text-muted-foreground">
                Muéstrale este QR al empleado para que pueda cerrar sesión.
              </p>
              <Button className="w-full" onClick={() => setAckReport(null)}>Listo</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
