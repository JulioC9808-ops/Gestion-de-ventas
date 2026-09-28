import React from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import {
  getShiftInfo,
  formatHavanaTime,
  formatHavanaDate,
} from '@/lib/havanaTime';

export default function SalaryHistory() {
  const { reports } = useData();
  const sorted = [...reports].reverse();

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Historial de Salarios</h1>
          <HelpTip>Registro completo de salarios pagados por cada cierre de turno con fecha y hora oficial de La Habana.</HelpTip>
        </div>
      </div>
      <div className="glass-card p-6">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">No hay salarios registrados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Hora (La Habana)</th>
                <th>Empleado</th>
                <th>Turno</th>
                <th>Total Vendido</th>
                <th>% Salario</th>
                <th>Salario</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const shiftInfo = getShiftInfo(r.shift);
                const formattedTime = r.closedTimeFormatted || formatHavanaTime(r.closedAt || r.date);
                const formattedDate = formatHavanaDate(r.closedAt || r.date, true);

                return (
                  <tr key={r.id}>
                    <td className="text-xs font-mono font-semibold">
                      <div className="text-foreground">{formattedDate}</div>
                      <div className="text-muted-foreground font-normal">{formattedTime}</div>
                    </td>
                    <td className="font-medium">{r.employeeName}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${shiftInfo.badgeClass}`}>
                        <span>{shiftInfo.icon}</span>
                        <span>{shiftInfo.label}</span>
                      </span>
                    </td>
                    <td className="font-mono font-semibold">${r.totalSold.toLocaleString()}</td>
                    <td className="text-muted-foreground font-mono">{r.salaryPercent ?? 2}%</td>
                    <td className="font-semibold font-mono text-success">${r.salary.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="font-bold border-t-2 border-border">
                <td colSpan={5}>Total Salarios Pagados</td>
                <td className="text-success font-mono">${sorted.reduce((s, r) => s + r.salary, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
