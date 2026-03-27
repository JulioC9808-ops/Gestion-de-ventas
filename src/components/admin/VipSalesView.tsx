import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Crown, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function VipSalesView() {
  const { reports } = useData();

  // Collect all VIP sales from all reports
  const allVip = reports.flatMap(r =>
    r.vipSales.map(v => ({
      ...v,
      employeeName: r.employeeName,
      date: r.date,
      shift: r.shift,
    }))
  ).reverse();

  const totalVip = allVip.reduce((s, v) => s + v.amount, 0);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Ventas VIP</h1>
          <Tooltip>
            <TooltipTrigger><HelpCircle className="w-5 h-5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent><p className="max-w-xs">Revisa todas las ventas VIP registradas para verificar que todo esté correcto.</p></TooltipContent>
          </Tooltip>
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
              <tr><th>Fecha</th><th>Empleado</th><th>Turno</th><th>Cliente</th><th>Monto</th></tr>
            </thead>
            <tbody>
              {allVip.map((v, i) => (
                <tr key={i}>
                  <td className="text-sm">{new Date(v.date).toLocaleDateString()}</td>
                  <td className="font-medium">{v.employeeName}</td>
                  <td className="capitalize">{v.shift === 'morning' ? 'Mañana' : 'Tarde'}</td>
                  <td>{v.concept}</td>
                  <td className="font-semibold">${v.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
