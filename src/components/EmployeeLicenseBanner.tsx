import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { readEmployeeLicense, isEmployeeLicenseActive, employeeHoursRemaining } from '@/lib/employeeLicense';

/**
 * Aviso informativo para los terminales activados con el QR de personal:
 * sesión de ventas activa y tiempo restante de sincronización.
 */
export default function EmployeeLicenseBanner() {
  const lic = readEmployeeLicense();
  if (!lic || !isEmployeeLicenseActive(lic)) return null;

  const hours = employeeHoursRemaining(lic);

  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-foreground/80 shadow-sm">
      <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
      <p className="leading-snug">
        <span className="font-semibold text-foreground">Sesión de Punto de Venta activa:</span> Esta terminal cuenta con acceso operativo de personal ({hours} h restantes). Recuerda sincronizar tu cierre con el Administrador al terminar la jornada.
      </p>
    </div>
  );
}
