import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { QrCode, Check, Shield, Users, RefreshCw, Smartphone, ArrowRightLeft, ScanLine } from 'lucide-react';
import QrScannerModal from '@/components/QrScannerModal';
import QrDisplay from '@/components/QrDisplay';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import HelpTip from '@/components/HelpTip';
import type { ShiftReport } from '@/types';
import { buildBackup } from '@/lib/backup';
import { isDeviceLicensed } from '@/lib/deviceLicense';
import {
  receiveShiftShare,
  startAdminShare,
  stopAdminShare,
  receiveAdminShare,
  type AdminSyncPackage,
} from '@/lib/syncTransport';

export default function ShiftSync() {
  const { products, stock, movements, users, reports, settings, addReport, applyBackup } = useData();
  const { currentUser, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'shift' | 'admin'>('shift');

  // Estado para escaneo de cierre de turno de empleados
  const [scanShiftOpen, setScanShiftOpen] = useState(false);
  const [ackReport, setAckReport] = useState<ShiftReport | null>(null);
  const [receivingShift, setReceivingShift] = useState(false);

  // Estado para sincronización Admin ↔ Admin
  const [scanAdminOpen, setScanAdminOpen] = useState(false);
  const [receivingAdmin, setReceivingAdmin] = useState(false);
  const [shareAdminQr, setShareAdminQr] = useState<string | null>(null);
  const [sharingAdmin, setSharingAdmin] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  // Limpiar servidor de compartir al desmontar
  useEffect(() => {
    return () => {
      stopAdminShare();
    };
  }, []);

  // ---- Verificación de privilegios para la sincronización ENTRE ADMINS ----
  // Regla: sesión de Administrador (o dev) abierta.
  // Transfiere los datos de la cafetería (productos, inventario, precios y tasas) a otro administrador.
  // NO transfiere licencias (cada terminal debe estar licenciado de forma independiente).
  const canUseAdminSync = (): boolean => {
    const activeRole = currentUser?.role || user?.role;
    if (activeRole !== 'admin' && activeRole !== 'dev') {
      toast.error('Solo una cuenta con sesión de Administrador puede emitir esta sincronización.');
      return false;
    }
    return true;
  };

  // Manejo de escaneo de turno de empleado
  const handleShiftScan = async (text: string) => {
    if (receivingShift) return;
    setReceivingShift(true);
    try {
      const report = await receiveShiftShare(text.trim());
      if (!report) {
        toast.error('Este QR no es un cierre de turno válido.');
        return;
      }
      const synced: ShiftReport = { ...report, synced: true };
      addReport(synced);
      setScanShiftOpen(false);
      setAckReport(synced);
      toast.success(`Turno de ${synced.employeeName} sincronizado.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'No se pudo leer el turno del QR.');
    } finally {
      setReceivingShift(false);
    }
  };

  // Generar QR para emitir sincronización a otro Administrador
  const handleStartAdminShare = async () => {
    if (!canUseAdminSync()) return;
    setSharingAdmin(true);
    try {
      const backupPayload = buildBackup({
        products,
        stock,
        movements,
        users,
        reports,
        settings,
      });
      const adminPackage: AdminSyncPackage = {
        v: 1,
        role: 'admin',
        timestamp: new Date().toISOString(),
        backup: backupPayload,
      };
      const qrData = await startAdminShare(adminPackage);
      setShareAdminQr(qrData);
      setShareDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar código QR de administrador.');
    } finally {
      setSharingAdmin(false);
    }
  };

  // Manejo de escaneo de sincronización de otro Administrador
  const handleAdminScan = async (text: string) => {
    if (receivingAdmin) return;
    if (!canUseAdminSync()) return;
    setReceivingAdmin(true);
    try {
      const pkg = await receiveAdminShare(text.trim());
      if (!pkg || pkg.role !== 'admin' || !pkg.backup) {
        toast.error('Este QR no corresponde a una sincronización autorizada entre Administradores.');
        return;
      }
      applyBackup(pkg.backup);
      setScanAdminOpen(false);
      toast.success('¡Datos del negocio sincronizados con éxito!', {
        description: 'Productos, inventario, reportes de ventas y tasas actualizados desde el otro Administrador.',
      });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al procesar el QR del otro Administrador.');
    } finally {
      setReceivingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Centro de Sincronización</h1>
          <HelpTip>
            Recibe cierres de turno de tus empleados o sincroniza todos los datos del negocio con otro Administrador sin internet.
          </HelpTip>
        </div>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Button
          variant={activeTab === 'shift' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('shift')}
          className="text-xs h-9"
        >
          <QrCode className="w-3.5 h-3.5 mr-1.5" />
          Cierres de Turno (Empleados)
        </Button>
        <Button
          variant={activeTab === 'admin' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('admin')}
          className="text-xs h-9"
        >
          <Shield className="w-3.5 h-3.5 mr-1.5 text-warning" />
          Sincronizar entre Administradores
        </Button>
      </div>

      {/* PESTAÑA 1: Cierres de Turno de Empleados */}
      {activeTab === 'shift' && (
        <div className="glass-card p-6 max-w-xl mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <QrCode className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-display font-bold">Recibir Cierre de Turno</h2>
          <p className="text-sm text-muted-foreground">
            Pídele a tu empleado que abra la sección "Cierre de Turno" y muestre su QR. Apunta la cámara hacia su pantalla para transferir las ventas del turno a tu dispositivo.
          </p>
          <Button onClick={() => setScanShiftOpen(true)} className="w-full text-sm font-semibold h-10 shadow-sm">
            <ScanLine className="w-4 h-4 mr-2" /> Escanear QR del Empleado
          </Button>
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground text-left space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-primary" /> Transferencia directa sin internet
            </p>
            <p>
              El cierre se registra en tu sistema y de inmediato se te muestra un QR de confirmación (ACK) para que el empleado pueda cerrar sesión tranquilamente.
            </p>
          </div>
        </div>
      )}

      {/* PESTAÑA 2: Sincronización entre Administradores */}
      {activeTab === 'admin' && (
        <div className="glass-card p-6 max-w-2xl mx-auto space-y-5">
          <div className="text-center space-y-2 pb-3 border-b border-border/60">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 text-warning flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-display font-bold">Sincronización Directa entre Administradores</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Diseñado para cuando hay dos administradores al frente del negocio. Permite transferir todo el catálogo, inventario, reportes de ventas y tasas entre terminales de forma instantánea.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción 1: Emitir QR */}
            <div className="p-4 rounded-xl border border-border/80 bg-background/50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary w-fit">
                  <QrCode className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">1. Emitir Sincronización</h3>
                <p className="text-xs text-muted-foreground">
                  Muestra el código QR con todos los datos actuales del negocio para que el otro Administrador lo escanee.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartAdminShare}
                disabled={sharingAdmin}
                className="w-full text-xs font-semibold h-9"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-primary ${sharingAdmin ? 'animate-spin' : ''}`} />
                {sharingAdmin ? 'Generando...' : 'Mostrar QR de Admin'}
              </Button>
            </div>

            {/* Opción 2: Escanear QR */}
            <div className="p-4 rounded-xl border border-border/80 bg-background/50 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 w-fit">
                  <ScanLine className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">2. Escanear y Recibir</h3>
                <p className="text-xs text-muted-foreground">
                  Apunta tu cámara al QR que está mostrando el otro Administrador para recibir y actualizar todos los datos.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setScanAdminOpen(true)}
                className="w-full text-xs font-semibold h-9"
              >
                <ScanLine className="w-3.5 h-3.5 mr-1.5" />
                Escanear QR de Admin
              </Button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 text-[11px] text-warning space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Protocolo de Seguridad Admin
            </p>
            <p>
              Solo funciona con sesión de Administrador abierta Y aplicación licenciada. La pantalla de licencia jamás acepta estos códigos, así nadie sin licencia puede capturar los datos. La licencia y preferencias visuales de cada equipo se conservan intactas.
            </p>
          </div>
        </div>
      )}

      {/* Modal Escáner de Cierre de Turno de Empleado */}
      <QrScannerModal
        open={scanShiftOpen}
        onClose={() => setScanShiftOpen(false)}
        onScan={handleShiftScan}
        keepOpen
        title="Escanear Cierre de Turno"
        hint={receivingShift ? 'Recibiendo turno del empleado…' : 'Apunta la cámara al QR que muestra el empleado en su teléfono.'}
      />

      {/* Modal Escáner de Sincronización Admin ↔ Admin */}
      <QrScannerModal
        open={scanAdminOpen}
        onClose={() => setScanAdminOpen(false)}
        onScan={handleAdminScan}
        keepOpen
        title="Escanear Datos de Administrador"
        hint={receivingAdmin ? 'Sincronizando datos con el Administrador…' : 'Apunta la cámara al QR que muestra el otro Administrador.'}
      />

      {/* Diálogo Confirmación (ACK) para Empleado */}
      <Dialog open={!!ackReport} onOpenChange={(o) => !o && setAckReport(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-foreground">
              <Check className="w-5 h-5 text-success" /> Turno Recibido y Guardado
            </DialogTitle>
          </DialogHeader>
          {ackReport && (
            <div className="space-y-3 text-center">
              <p className="text-sm">
                <strong>{ackReport.employeeName}</strong> — Turno {ackReport.shift === 'morning' ? 'Mañana' : 'Tarde'}<br />
                Total: <strong>${ackReport.totalSold.toLocaleString()}</strong>
              </p>
              <div className="flex justify-center bg-white p-3 rounded-xl border">
                <QrDisplay data={`ACK:${ackReport.id}`} size={240} />
              </div>
              <p className="text-xs text-muted-foreground">
                Muéstrale este código de confirmación al empleado para que su teléfono lo valide y finalice su turno.
              </p>
              <Button className="w-full" onClick={() => setAckReport(null)}>Listo</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo Mostrar QR de Sincronización Admin */}
      <Dialog open={shareDialogOpen} onOpenChange={(o) => {
        setShareDialogOpen(o);
        if (!o) stopAdminShare();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-display text-foreground">
              <Shield className="w-5 h-5 text-warning" /> QR de Sincronización entre Administradores
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pídele al otro Administrador que abra esta misma pestaña y pulse "Escanear QR de Admin".
            </DialogDescription>
          </DialogHeader>
          {shareAdminQr && (
            <div className="flex flex-col items-center justify-center p-3 space-y-3">
              <div className="bg-white p-3 rounded-2xl border shadow-sm flex items-center justify-center">
                <QrDisplay data={shareAdminQr} size={250} />
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                Incluye catálogo de productos, inventario, reportes de ventas, stock y tasas de cambio.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                setShareDialogOpen(false);
                stopAdminShare();
              }}
            >
              Cerrar Sincronización
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
