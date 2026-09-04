import React, { useState } from 'react';
import { RefreshCw, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import QrScannerModal from '@/components/QrScannerModal';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { receiveEmployeeShare } from '@/lib/syncTransport';

export default function EmployeeDataSync() {
  const { applyBackup } = useData();
  const [scanOpen, setScanOpen] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const handleScan = async (text: string) => {
    if (receiving) return;
    setReceiving(true);
    try {
      const packet = await receiveEmployeeShare(text.trim());
      if (!packet) {
        toast.error('Este no es el QR de datos del jefe.');
        return;
      }
      applyBackup(packet.backup);
      setScanOpen(false);
      toast.success('Datos actualizados: productos, precios, stock y demás información recibida.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo recibir el respaldo del jefe.');
    } finally {
      setReceiving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Actualizar datos</h1>
          <HelpTip>Escanea el mismo QR que te muestra el jefe para recibir el catálogo y los datos más recientes.</HelpTip>
        </div>
      </div>
      <div className="glass-card mx-auto max-w-xl space-y-4 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <RefreshCw className="h-8 w-8 text-primary" />
        </div>
        <h2 className="font-display text-lg font-bold">Recibir respaldo del jefe</h2>
        <p className="text-sm text-muted-foreground">Conecta ambos dispositivos a la misma red Wi‑Fi y escanea el QR del empleado que aparece en Ajustes → Usuarios.</p>
        <Button className="w-full" onClick={() => setScanOpen(true)}>
          <ScanLine className="mr-2 h-4 w-4" /> Escanear QR del jefe
        </Button>
      </div>
      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleScan}
        keepOpen
        title="Actualizar datos"
        hint={receiving ? 'Recibiendo respaldo…' : 'Apunta al QR que te muestra el jefe.'}
      />
    </div>
  );
}