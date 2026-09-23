import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const EULA_STORAGE_KEY = 'eula_accepted_v2';

// Fecha inyectada en tiempo de compilación (ver vite.config.ts → define.__BUILD_DATE__)
const BUILD_DATE = (() => {
  try {
    const d = new Date(__BUILD_DATE__);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return new Date().toLocaleDateString('es-ES');
  }
})();

const EULA_TEXT = `ACUERDO DE LICENCIA DE USUARIO FINAL (EULA)

Sistema de Gestión de Ventas – Desarrollado por Julio_GE
Última actualización: ${BUILD_DATE}

Le rogamos leer detenidamente este Acuerdo de Licencia de Usuario Final antes de comenzar a utilizar la aplicación. Al instalar, registrar o utilizar este software, usted acepta plenamente los términos y condiciones aquí estipulados.

1. NATURALEZA Y PROPÓSITO DEL SOFTWARE
Gestión de Ventas es una solución tecnológica offline-first diseñada para la gestión comercial integral, control riguroso de inventario, auditoría de flujo de caja, liquidación precisa de salarios y automatización de cierres de turno, orientada a salvaguardar la transparencia operativa del negocio.

2. CONCESIÓN DE LICENCIA Y ALCANCE
• La licencia concedida otorga el derecho de uso personal e intransferible para el establecimiento comercial o terminal registrado.
• El uso en sucursales, negocios adicionales o terminales independientes requerirá la adquisición de las licencias correspondientes.
• Las licencias permanentes otorgan acceso continuo e ilimitado al software y a las actualizaciones del canal oficial para el dispositivo autorizado.
• Las licencias temporales o de prueba permiten la operación del sistema durante el período contratado.

3. DERECHOS DE PROPIEDAD INTELECTUAL Y RESTRICCIONES
El software, su arquitectura, diseño de interfaz, algoritmos criptográficos y código fuente son propiedad intelectual exclusiva de su Desarrollador.
El usuario se compromete a:
• No realizar ingeniería inversa, descompilación, extracción no autorizada de componentes ni desensamblado del aplicativo.
• No redistribuir, arrendar, sublicenciar, clonar ni comercializar copias no autorizadas del sistema.
• No intentar vulnerar ni eludir los mecanismos de seguridad, validación de licencias o protocolos criptográficos del software.

4. PROTECCIÓN DEL SISTEMA E INTEGRIDAD DE DATOS
La aplicación incorpora mecanismos de verificación de integridad diseñados para proteger la consistencia de la base de datos y evitar manipulaciones maliciosas. Ante intentos de alteración forzada del binario o corrupción intencional de registros, el sistema bloqueará el acceso al entorno operativo para resguardar la seguridad comercial.

5. RESPALDOS Y CONTINUIDAD OPERATIVA
• El sistema incluye utilidades nativas para la generación y restauración de copias de seguridad (.gvbak y respaldo diario automatizado).
• La información comercial generada es propiedad exclusiva del usuario y reside de forma local y soberana en el dispositivo.
• El usuario es responsable de realizar copias de respaldo periódicas y de salvaguardar su equipo ante fallos de hardware o software ajenos al aplicativo.

6. SOPORTE TÉCNICO Y ACTUALIZACIONES
• El Desarrollador ofrece asistencia técnica para la resolución de incidencias operativas a través de los canales de comunicación habilitados.
• Las actualizaciones de mantenimiento, estabilidad y nuevas funciones se distribuyen a través del canal oficial de la aplicación.

7. LIMITACIÓN DE RESPONSABILIDAD
El software se suministra en su estado actual para optimizar la gestión comercial. El Desarrollador no asume responsabilidad por pérdidas derivadas de negligencia en el resguardo de credenciales de acceso, errores en el ingreso manual de montos o interrupciones causadas por fallos en el sistema operativo o hardware del usuario.

8. RESCISIÓN Y CANCELACIÓN
El presente acuerdo quedará sin efecto de pleno derecho si el usuario incumple las cláusulas estipuladas, particularmente en lo relativo a ingeniería inversa, redistribución no autorizada o alteración de mecanismos de seguridad.

9. ACEPTACIÓN EXPRESA
Al pulsar "Acepto", instalar o utilizar el software, usted manifiesta su conformidad total con los términos aquí expuestos. Si no está de acuerdo con alguna disposición, deberá abstenerse de utilizar el aplicativo.`;

/**
 * Muestra el EULA la primera vez que se abre la app. Bloqueante hasta aceptar.
 */
export default function EulaGate() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(EULA_STORAGE_KEY);
    if (!accepted) {
      const t = setTimeout(() => setOpen(true), 300);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(EULA_STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* bloqueado hasta aceptar */ }}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">Acuerdo de Licencia de Usuario Final (EULA)</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[55vh] pr-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{EULA_TEXT}</p>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button onClick={accept} size="lg">Acepto</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
