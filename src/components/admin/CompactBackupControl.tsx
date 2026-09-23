import React, { useState, useRef, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { HardDriveDownload, Upload, Download, FileCheck, RefreshCw, Shield, FolderSearch, History, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { exportBackupFile, parseBackupFile, getAutoBackupInfo, type FullBackupData } from '@/lib/backupUtils';

export default function CompactBackupControl() {
  const { products, stock, movements, users, reports, settings, applyBackup } = useData();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<FullBackupData | null>(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreOldDialogOpen, setRestoreOldDialogOpen] = useState(false);
  const [pathsDialogOpen, setPathsDialogOpen] = useState(false);
  const [autoInfo, setAutoInfo] = useState(() => getAutoBackupInfo());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshInfo = () => {
    setAutoInfo(getAutoBackupInfo());
  };

  useEffect(() => {
    refreshInfo();
  }, [products, stock, movements, users, reports]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const success = await exportBackupFile({
        products,
        stock,
        movements,
        users,
        reports,
        settings,
      });
      if (success) {
        toast.success('¡Copia de seguridad guardada con éxito!', {
          description: 'Se ha generado el archivo de respaldo con todos tus datos.',
        });
      }
    } catch {
      toast.error('Error al generar la copia de seguridad.');
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await parseBackupFile(file);
      setSelectedFile(file);
      setPreviewData(parsed);
      setRestoreDialogOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar el archivo de respaldo.');
      setSelectedFile(null);
      setPreviewData(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmRestore = () => {
    if (!previewData) return;
    setImporting(true);
    try {
      applyBackup({
        products: previewData.products,
        stock: previewData.stock,
        movements: previewData.movements,
        users: previewData.users,
        reports: previewData.reports,
        settings: previewData.settings,
        ratesSnapshot: previewData.ratesSnapshot,
      });
      setRestoreDialogOpen(false);
      setSelectedFile(null);
      setPreviewData(null);
      refreshInfo();
      toast.success('¡Copia de seguridad restaurada con éxito!', {
        description: 'Se han cargado todos los productos, usuarios, ventas y reportes del respaldo.',
      });
    } catch {
      toast.error('Error al aplicar la copia de seguridad.');
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmRestoreOld = () => {
    if (!autoInfo.oldData) return;
    setImporting(true);
    try {
      applyBackup({
        products: autoInfo.oldData.products,
        stock: autoInfo.oldData.stock,
        movements: autoInfo.oldData.movements,
        users: autoInfo.oldData.users,
        reports: autoInfo.oldData.reports,
        settings: autoInfo.oldData.settings,
        ratesSnapshot: autoInfo.oldData.ratesSnapshot,
      });
      setRestoreOldDialogOpen(false);
      refreshInfo();
      toast.success('¡Penúltima copia (Backup.old) restaurada con éxito!');
    } catch {
      toast.error('Error al aplicar la copia de seguridad anterior.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="glass-card p-4 md:p-5 space-y-3 border-border/80 bg-card/60">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          <HardDriveDownload className="w-4 h-4 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              Copia de Seguridad
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Respalda y restaura productos, ventas y usuarios de forma segura.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setPathsDialogOpen(true)}
          className="text-muted-foreground hover:text-primary p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          title="Rutas de extracción física manual"
        >
          <FolderSearch className="w-4 h-4" />
        </button>
      </div>

      {/* Indicador de estado de backup automático de la madrugada */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-muted/40 border border-border/60 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>Auto-backup diario:</span>
          {autoInfo.lastDate ? (
            <span className="font-medium text-foreground">
              {new Date(autoInfo.lastDate).toLocaleDateString()} {new Date(autoInfo.lastDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : (
            <span className="text-emerald-500 font-medium">Activo (madrugada / inicio)</span>
          )}
        </div>

        {autoInfo.hasOld && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRestoreOldDialogOpen(true)}
            className="h-6 text-[11px] px-2 text-primary hover:bg-primary/10"
          >
            <History className="w-3 h-3 mr-1" />
            Restaurar Backup.old
          </Button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept=".gvbak,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={exporting}
          onClick={handleExport}
          className="text-xs h-8 font-medium shadow-2xs flex-1 min-w-[140px]"
        >
          <Download className={`w-3.5 h-3.5 mr-1.5 text-primary ${exporting ? 'animate-bounce' : ''}`} />
          {exporting ? 'Generando...' : 'Descargar Copia'}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs h-8 font-medium shadow-2xs flex-1 min-w-[140px]"
        >
          <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
          Restaurar Copia
        </Button>
      </div>

      {/* Diálogo de Confirmación para Restaurar Respaldo */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-base">
              <FileCheck className="w-5 h-5" />
              Restaurar Copia de Seguridad
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-muted-foreground space-y-3">
              <div className="p-3 bg-muted/60 rounded-xl border border-border space-y-1 font-mono text-[11px] text-foreground">
                <p>Archivo: <strong>{selectedFile?.name}</strong></p>
                <p>Fecha: <strong>{previewData?.exportedAt ? new Date(previewData.exportedAt).toLocaleString() : 'N/A'}</strong></p>
                <p>📦 Productos: <strong>{previewData?.products.length || 0}</strong></p>
                <p>👥 Usuarios: <strong>{previewData?.users.length || 0}</strong></p>
                <p>📊 Cierres de Turno: <strong>{previewData?.reports.length || 0}</strong></p>
              </div>
              <p className="text-foreground text-xs leading-relaxed">
                <Shield className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
                <strong>Información:</strong> Se cargarán todos los datos contenidos en la copia. La licencia de este terminal permanecerá intacta.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" size="sm" onClick={() => setRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirmRestore} disabled={importing} className="font-semibold">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Restaurando...' : 'Confirmar y Restaurar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmación para Restaurar Penúltimo Backup (Backup.old) */}
      <Dialog open={restoreOldDialogOpen} onOpenChange={setRestoreOldDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-base">
              <History className="w-5 h-5" />
              Restaurar Copia Anterior (Backup.old)
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-muted-foreground space-y-3">
              <p>
                ¿Deseas restaurar la penúltima copia de seguridad automática guardada en este dispositivo?
              </p>
              {autoInfo.oldData && (
                <div className="p-3 bg-muted/60 rounded-xl border border-border space-y-1 font-mono text-[11px] text-foreground">
                  <p>Fecha: <strong>{new Date(autoInfo.oldData.exportedAt).toLocaleString()}</strong></p>
                  <p>📦 Productos: <strong>{autoInfo.oldData.products.length}</strong></p>
                  <p>👥 Usuarios: <strong>{autoInfo.oldData.users.length}</strong></p>
                  <p>📊 Cierres: <strong>{autoInfo.oldData.reports.length}</strong></p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" size="sm" onClick={() => setRestoreOldDialogOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleConfirmRestoreOld} disabled={importing} className="font-semibold">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${importing ? 'animate-spin' : ''}`} />
              {importing ? 'Restaurando...' : 'Sí, Restaurar Backup.old'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Explicativo de Rutas Físicas de Almacenamiento Manual */}
      <Dialog open={pathsDialogOpen} onOpenChange={setPathsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground text-base">
              <FolderSearch className="w-5 h-5 text-primary" />
              Rutas para Extracción Manual de Datos
            </DialogTitle>
            <DialogDescription className="pt-2 text-xs text-muted-foreground space-y-3">
              <p>
                Si la aplicación no abre por algún error externo del sistema operativo o dispositivo, los datos físicos se encuentran almacenados en:
              </p>

              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px]">
                  <p className="font-bold text-foreground">📱 Teléfonos Android (APK):</p>
                  <p className="font-mono text-[10px] text-primary break-all mt-0.5">
                    /data/data/com.gestion.ventas/app_webview/Default/Local Storage/leveldb/
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    (O mediante comando ADB backup: <code className="text-foreground">adb backup -f backup.ab -noapk com.gestion.ventas</code>)
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px]">
                  <p className="font-bold text-foreground">💻 Windows PC (Desktop / Electron):</p>
                  <p className="font-mono text-[10px] text-primary break-all mt-0.5">
                    %APPDATA%\gestion-ventas\Local Storage\leveldb\
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    (Pegar en el Explorador de Windows: <code className="text-foreground">Win + R → %appdata%</code>)
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-muted/60 border border-border text-[11px]">
                  <p className="font-bold text-foreground">🌐 Navegador Web:</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Presionar <code className="text-foreground">F12 → Pestaña Application / Almacenamiento → Local Storage</code>.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button size="sm" onClick={() => setPathsDialogOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
