import React from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Crown } from 'lucide-react';
import {
  getShiftInfo,
  formatHavanaTime,
  formatHavanaDate,
} from '@/lib/havanaTime';

export default function VipSalesView() {
  const { reports } = useData();

  // Collect all VIP sales from all reports
  const allVip = reports.flatMap(r =>
    r.vipSales.map(v => ({
      ...v,
      employeeName: r.employeeName,
      date: r.date,
      closedAt: r.closedAt,
      closedTimeFormatted: r.closedTimeFormatted,
      shift: r.shift,
    }))
  ).reverse();

  const totalVip = allVip.reduce((s, v) => s + v.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Ventas VIP</h1>
          <HelpTip>Revisa todas las ventas VIP registradas para verificar que todo esté correcto.</HelpTip>
        </div>
      </div>

      <div className="stat-card mb-6 max-w-xs">
        <div className="flex items-center gap-3">
          <Crown className="w-5 h-5 text-accent" />
          <div>
            <p className="text-sm text-muted-foreground">Total VIP Acumulado</p>
            <p className="text-2xl font-bold font-display">${totalVip.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        {allVip.length === 0 ? (
          <p className="text-muted-foreground">No hay ventas VIP registradas.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha y Hora (La Habana)</th>
                <th>Empleado</th>
                <th>Turno</th>
                <th>Cliente</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              {allVip.map((v, i) => {
                const shiftInfo = getShiftInfo(v.shift);
                const formattedTime = v.closedTimeFormatted || formatHavanaTime(v.closedAt || v.date);
                const formattedDate = formatHavanaDate(v.closedAt || v.date, true);

                return (
                  <tr key={i}>
                    <td className="text-xs font-mono font-semibold">
                      <div className="text-foreground">{formattedDate}</div>
                      <div className="text-muted-foreground font-normal">{formattedTime}</div>
                    </td>
                    <td className="font-medium">{v.employeeName}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${shiftInfo.badgeClass}`}>
                        <span>{shiftInfo.icon}</span>
                        <span>{shiftInfo.label}</span>
                      </span>
                    </td>
                    <td>{v.concept}</td>
                    <td className="font-semibold font-mono">${v.amount.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
