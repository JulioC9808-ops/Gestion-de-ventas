import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { readEmployeeLicense, isEmployeeLicenseActive, employeeHoursRemaining } from '@/lib/employeeLicense';

/**
 * Aviso permanente para los dispositivos activados con el QR del jefe:
 * licencia de SOLO EMPLEADO, válida 24 horas.
 */
export default function EmployeeLicenseBanner() {
  const lic = readEmployeeLicense();
  if (!lic || !isEmployeeLicenseActive(lic)) return null;

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong>Usted está usando una licencia de SOLO EMPLEADO.</strong> No tiene acceso al panel de
        Administración. Caduca en {employeeHoursRemaining(lic)} h; después deberá volver a escanear el
        QR del jefe para mantener los datos sincronizados.
      </p>
    </div>
  );
}
