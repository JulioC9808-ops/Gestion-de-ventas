import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const EULA_STORAGE_KEY = 'eula_accepted_v2';

const EULA_TEXT = `POR FAVOR LEA DETENIDAMENTE EL ACUERDO DE LICENCIA SIGUIENTE ANTES DE CONTINUAR CON LA INSTALACION.

Acuerdo de Licencia de Usuario Final

Sistema de Ventas – Julio_GE Software

Última actualización: 06/26

Este Acuerdo de Licencia de Usuario Final ("EULA") es un contrato legal entre usted y Julio_GE Software que es el desarrollador para el uso del sistema de ventas y gestión comercial (el "Software").

Al instalar, activar o utilizar el Software, usted acepta todos los términos establecidos en este documento.

1. Propósito del Software

El Software está diseñado para ayudar a los negocios a evitar fraudes internos, permitiendo al (USUARIO PRINCIPAL) que es usted supervisar el flujo de dinero, controlar entradas y salidas, y gestionar operaciones comerciales de manera segura y transparente.

Tambien le facilita los cierres de turno de una manera mas practica y sencilla ya que el programa calculara todo por usted

2. Licencia de Uso

La licencia otorgada es exclusiva para el negocio registrado al momento de la compra.

Si el Usuario desea utilizar el Software en otro negocio, sucursal o entidad (ya sea de usted mismo), deberá adquirir una nueva licencia.

Con el uso de la licencia mensual usted no tiene derecho a reclamar algo que le este sucediendo al programa.

3. Restricciones del Usuario

El Usuario NO puede:

- Modificar, descompilar, manipular o intentar alterar el Software.
- Intentar copiar, clonar o reproducir el sistema para uso propio o de terceros.
- Forzar el programa, manipular sus archivos internos o intentar evadir los mecanismos de seguridad.
- Usar el Software para actividades ilegales o fraudulentas.

4. Sistema Anti-Hacking

El Software incluye un sistema de protección que detecta manipulaciones externas, intentos de ingeniería inversa o alteraciones no autorizadas.

Si se detecta actividad sospechosa, el Software eliminará automáticamente archivos esenciales para impedir su funcionamiento y proteger la integridad del sistema.

5. Instalación, Reinstalación y Backups

El Software puede desinstalarse y reinstalarse sin afectar la información del negocio, ya que realiza copias de seguridad internas.

El Usuario es responsable de mantener su dispositivo libre de virus, malware o daños que puedan afectar el funcionamiento del Software.

6. Soporte Técnico

Cualquier error, duda o problema debe ser reportado directamente al Desarrollador, puede tardar hasta 24h en responder su mensaje.

El soporte técnico es gratuito únicamente para usuarios con licencia permanente.

Solicitudes de cambios, mejoras o personalizaciones a su gusto tendrán un costo adicional según la complejidad del trabajo.

7. Actualizaciones

El Desarrollador puede lanzar actualizaciones para mejorar seguridad, rendimiento o funciones.

El Usuario acepta que algunas actualizaciones pueden ser obligatorias para mantener la estabilidad del sistema.

Las actualizaciones estarán disponibles en el canal oficial de Telegram del Desarrollador.

8. Propiedad Intelectual

El Software, su código, diseño, interfaz y funciones son propiedad exclusiva del Desarrollador.

No se otorga ningún derecho de propiedad al Usuario, solo el derecho de uso bajo licencia.

Cualquier intento de copia o reproducción será considerado una violación grave del EULA.

9. Limitación de Responsabilidad

El Desarrollador no será responsable por:

- Pérdidas económicas derivadas de mal uso del Software.
- Daños ocasionados por hardware defectuoso, virus o sistemas operativos corruptos.
- Manipulaciones externas realizadas por el Usuario o terceros.

10. Terminación del Contrato

Este EULA se terminará automáticamente si:

- El Usuario viola cualquiera de las restricciones mencionadas.
- Se detecta manipulación, hackeo o intento de copia del Software.
- El Usuario utiliza el Software en un negocio no autorizado.

En caso de terminación, el Usuario perderá el derecho de uso sin reembolso.

11. Aceptación

Al instalar o usar el Software, usted declara haber leído, entendido y aceptado este EULA.

Si no está de acuerdo con los términos, no debe instalar ni utilizar el Software.`;

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
