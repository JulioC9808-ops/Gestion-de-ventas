import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import AnimatedTrash from '@/components/ui/animated-trash';
import { playTrashSound } from '@/lib/soundUtils';
import { toast } from 'sonner';
import {
  getShiftInfo,
  formatHavanaTime,
  formatHavanaDate,
  formatHavanaDateTime,
  formatClosureSummary,
} from '@/lib/havanaTime';

export default function Reports() {
  const { reports, clearReports } = useData();
  const [tab, setTab] = useState<'period' | 'employee' | 'topProducts' | 'slowProducts'>('period');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const tabs = [
    { key: 'period', label: '📅 Por Período' },
    { key: 'employee', label: '👤 Por Empleado' },
    { key: 'topProducts', label: '🔥 Más Vendidos' },
    { key: 'slowProducts', label: '🐌 Venta Lenta' },
  ] as const;

  const filteredReports = reports.filter(r => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(r.date);
    if (dateFrom && d < new Date(dateFrom)) return false;
    if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
    return true;
  });

  // Aggregate sales by product
  const productSales: Record<string, { name: string; qty: number; total: number }> = {};
  filteredReports.forEach(r => {
    r.items.forEach(item => {
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, qty: 0, total: 0 };
      }
      productSales[item.productId].qty += item.quantitySold;
      productSales[item.productId].total += item.subtotal;
    });
  });

  const sortedProducts = Object.values(productSales).sort((a, b) => b.qty - a.qty);

  // Aggregate by employee
  const employeeSales: Record<string, { name: string; total: number; shifts: number }> = {};
  filteredReports.forEach(r => {
    if (!employeeSales[r.employeeId]) {
      employeeSales[r.employeeId] = { name: r.employeeName, total: 0, shifts: 0 };
    }
    employeeSales[r.employeeId].total += r.totalSold;
    employeeSales[r.employeeId].shifts += 1;
  });

  const toggleExpand = (id: string) => {
    setExpandedReport(prev => prev === id ? null : id);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Reportes</h1>
          <HelpTip>Consulta reportes detallados de ventas. Haz clic en un reporte para ver el desglose completo de efectivo, transferencias y VIP.</HelpTip>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <Button
            key={t.key}
            variant={tab === t.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="text-sm font-medium text-muted-foreground">Desde</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-44" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground">Hasta</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="glass-card p-6">
        {tab === 'period' && (
          <>
            <h2 className="text-lg font-display font-bold mb-4">Ventas por Período</h2>
            {filteredReports.length === 0 ? (
              <p className="text-muted-foreground">No hay ventas en este período.</p>
            ) : (
              <div className="space-y-2">
                {filteredReports.map(r => {
                  const transferTot = r.transfers.reduce((s, t) => s + t.amount, 0);
                  const vipTot = r.vipSales.reduce((s, v) => s + v.amount, 0);
                  const methods = [
                    { name: 'Efectivo', amount: r.cashTotal },
                    { name: 'Transferencia', amount: transferTot },
                    { name: 'VIP', amount: vipTot },
                  ];
                  const top = methods.reduce((a, b) => (b.amount > a.amount ? b : a));
                  const topMethod = top.amount > 0 ? top.name : '—';
                  const shiftInfo = getShiftInfo(r.shift);
                  const closureSummary = formatClosureSummary(r.employeeName, r.closedAt || r.date);
                  const formattedDate = formatHavanaDate(r.closedAt || r.date);
                  const formattedTime = r.closedTimeFormatted || formatHavanaTime(r.closedAt || r.date);

                  return (
                  <div key={r.id} className="border border-border rounded-xl overflow-hidden shadow-xs hover:border-border/90 transition-all">
                    <button
                      onClick={() => toggleExpand(r.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full pr-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${shiftInfo.badgeClass}`}>
                              <span>{shiftInfo.icon}</span>
                              <span>{shiftInfo.label}</span>
                            </span>
                            <span className="text-xs font-mono text-muted-foreground font-semibold">
                              {formattedDate} • {formattedTime}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {closureSummary}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div>
                            <span className="text-xs text-muted-foreground block sm:hidden">Vendido:</span>
                            <span className="font-bold text-foreground font-mono text-base">${r.totalSold.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground block sm:hidden">Salario:</span>
                            <span className="text-success font-semibold">${r.salary.toFixed(2)}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                            {topMethod}
                          </span>
                        </div>
                      </div>
                      {expandedReport === r.id ? <ChevronUp className="w-4 h-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />}
                    </button>
                    
                    {expandedReport === r.id && (
                      <div className="border-t border-border p-4 bg-muted/20 space-y-3">
                        {/* Summary Header */}
                        <div className="p-2.5 rounded-lg bg-card/70 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Responsable del turno: </span>
                            <strong className="text-foreground font-semibold">{r.employeeName}</strong>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hora de Cierre (La Habana): </span>
                            <strong className="text-foreground font-mono font-bold">{formattedTime}</strong>
                            <span className="text-muted-foreground"> ({formattedDate})</span>
                          </div>
                        </div>

                        {/* Products */}
                        <div>
                          <p className="text-sm font-bold mb-1">📋 Productos Vendidos:</p>
                          <div className="space-y-1 ml-2">
                            {r.items.map(item => (
                              <div key={item.productId} className="text-xs sm:text-sm flex justify-between py-0.5 border-b border-border/40">
                                <span>• {item.productName} ({item.quantitySold} × ${item.price})</span>
                                <span className="font-semibold font-mono">${item.subtotal.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Cash breakdown */}
                        <div>
                          <p className="text-sm font-bold mb-1">💵 Desglose Efectivo (${r.cashTotal.toLocaleString()}):</p>
                          <div className="flex flex-wrap gap-1 ml-4">
                            {Object.entries(r.cashBreakdown || {}).filter(([_, count]) => count > 0).map(([denom, count]) => (
                              <span key={denom} className="bg-secondary/50 rounded px-2 py-0.5 text-xs">${denom} × {count}</span>
                            ))}
                          </div>
                        </div>
                        {/* Transfers */}
                        {r.transfers.length > 0 && (
                          <div>
                            <p className="text-sm font-bold mb-1">💳 Transferencias (${r.transfers.reduce((s, t) => s + t.amount, 0).toLocaleString()}):</p>
                            {r.transfers.map(t => (
                              <p key={t.id} className="text-sm ml-4">• ${t.amount} — ID: {t.code}</p>
                            ))}
                          </div>
                        )}
                        {/* VIP */}
                        {r.vipSales.length > 0 && (
                          <div>
                            <p className="text-sm font-bold mb-1">👑 VIP (${r.vipSales.reduce((s, v) => s + v.amount, 0).toLocaleString()}):</p>
                            {r.vipSales.map(v => (
                              <p key={v.id} className="text-sm ml-4">• {v.concept} — ${v.amount}</p>
                            ))}
                          </div>
                        )}
                        {/* Status */}
                        <div className={`text-sm font-medium ${
                          r.status === 'balanced' ? 'text-success' : r.status === 'surplus' ? 'text-warning' : 'text-destructive'
                        }`}>
                          {r.status === 'balanced' ? '✅ Todo cuadrado' :
                           r.status === 'surplus' ? `⬆️ Sobrante: $${r.difference.toFixed(2)}` :
                           `⬇️ Faltante: $${Math.abs(r.difference).toFixed(2)}`}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
                <div className="border-t-2 border-border pt-3 mt-3 flex justify-between font-bold text-sm">
                  <span>Total del Período</span>
                  <div className="flex gap-6">
                    <span>${filteredReports.reduce((s, r) => s + r.totalSold, 0).toLocaleString()}</span>
                    <span className="text-success">${filteredReports.reduce((s, r) => s + r.salary, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'employee' && (
          <>
            <h2 className="text-lg font-display font-bold mb-4">Ventas por Empleado</h2>
            <table className="data-table">
              <thead>
                <tr><th>Empleado</th><th>Turnos</th><th>Total Vendido</th></tr>
              </thead>
              <tbody>
                {Object.values(employeeSales).map((e, i) => (
                  <tr key={i}>
                    <td className="font-medium">{e.name}</td>
                    <td>{e.shifts}</td>
                    <td className="font-semibold">${e.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'topProducts' && (
          <>
            <h2 className="text-lg font-display font-bold mb-4">Productos Más Vendidos</h2>
            <table className="data-table">
              <thead>
                <tr><th>#</th><th>Producto</th><th>Cantidad</th><th>Total</th></tr>
              </thead>
              <tbody>
                {sortedProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="font-bold text-accent">{i + 1}</td>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.qty}</td>
                    <td className="font-semibold">${p.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'slowProducts' && (
          <>
            <h2 className="text-lg font-display font-bold mb-4">Productos de Venta Lenta</h2>
            <table className="data-table">
              <thead>
                <tr><th>Producto</th><th>Cantidad Vendida</th><th>Total</th></tr>
              </thead>
              <tbody>
                {[...sortedProducts].reverse().map((p, i) => (
                  <tr key={i}>
                    <td className="font-medium">{p.name}</td>
                    <td>{p.qty}</td>
                    <td>${p.total.toLocaleString()}</td>
                  </tr>
                ))}
                {sortedProducts.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-muted-foreground py-4">Sin datos</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {/* Botón para borrar todo el historial */}
        {reports.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              className="group"
              onClick={() => {
                if (!confirm('¿Seguro que quieres BORRAR TODO el historial de ventas? Esta acción es irreversible.')) return;
                if (!confirm('Confirmación final: se eliminarán todos los cierres. ¿Continuar?')) return;
                playTrashSound();
                clearReports();
                toast.success('Historial de ventas eliminado');
              }}
            >
              <AnimatedTrash className="w-4 h-4 mr-2" />
              Borrar todo el historial
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
