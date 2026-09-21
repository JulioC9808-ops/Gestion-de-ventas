import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Camera, Database, Lock, EyeOff, FileText } from 'lucide-react';

interface PrivacyPolicyDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function PrivacyPolicyDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: PrivacyPolicyDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const onOpenChange = isControlled ? setControlledOpen! : setInternalOpen;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            Política de Privacidad
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100%-1rem)] max-w-2xl max-h-[85dvh] p-0 flex flex-col min-h-0 overflow-hidden">
        <DialogHeader className="shrink-0 p-4 sm:p-6 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Política de Privacidad</DialogTitle>
              <p className="text-xs text-muted-foreground">Última actualización: Septiembre 2026</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 text-sm leading-relaxed">
          <div className="space-y-4">
            <section className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                1. Compromiso de Privacidad y Seguridad
              </h4>
              <p className="text-muted-foreground">
                La aplicación <strong>Gestión de Ventas</strong> ha sido desarrollada para ofrecer una herramienta
                eficiente, segura y offline-first para la administración de inventario, turnos y ventas. La privacidad
                y el control absoluto de sus datos empresariales son nuestra máxima prioridad.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                2. Uso del Permiso de Cámara
              </h4>
              <p className="text-muted-foreground">
                La aplicación solicita acceso a la cámara <strong>únicamente</strong> para:
              </p>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Escanear códigos QR para sincronización directa entre dispositivos en red local (punto de venta).</li>
                <li>Escanear códigos de barras de productos para agilizar altas e inventario.</li>
              </ul>
              <p className="text-muted-foreground text-xs bg-muted/40 p-2.5 rounded-lg">
                <strong>Importante:</strong> Las imágenes capturadas por el sensor de la cámara se procesan en tiempo
                real de forma estrictamente local dentro de su dispositivo. Ninguna fotografía, video ni transmisión es
                almacenada ni enviada a servidores externos.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                3. Almacenamiento y Control de Datos
              </h4>
              <p className="text-muted-foreground">
                Todos los datos ingresados en la aplicación (inventario, catálogo, movimientos, precios, ventas,
                empleados y reportes) se guardan en el almacenamiento local seguro y aislado de la propia aplicación
                (Sandbox local). Usted es el único propietario y responsable de su información comercial.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                4. Sincronización en Red Local (Wi-Fi)
              </h4>
              <p className="text-muted-foreground">
                Cuando utiliza la función de sincronización entre el dispositivo de caja (Administrador) y el dependiente
                (Empleado), la comunicación se efectúa de manera directa punto a punto a través de su red Wi-Fi local.
                No se transfieren datos por servidores de terceros ni intermediarios.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-primary" />
                5. Sin Rastreo, Publicidad ni Venta de Datos
              </h4>
              <p className="text-muted-foreground">
                No recopilamos telemetría invasiva, identificadores publicitarios (Advertising ID), ni vendemos datos a
                terceros bajo ninguna circunstancia. La aplicación no incluye bibliotecas de anuncios ni SDKs de rastreo
                comercial.
              </p>
            </section>

            <section className="space-y-2">
              <h4 className="font-semibold text-foreground">6. Contacto y Soporte</h4>
              <p className="text-muted-foreground">
                Para cualquier consulta sobre esta política o asistencia técnica, puede comunicarse directamente con el
                desarrollador a través de las opciones de contacto disponibles en la sección de Ayuda de la aplicación.
              </p>
            </section>
          </div>
        </div>

        <div className="shrink-0 p-4 border-t border-border/50 bg-muted/20 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
