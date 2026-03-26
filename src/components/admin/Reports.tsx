import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Reports() {
  const { reports, products } = useData();
  const [tab, setTab] = useState<'period' | 'employee' | 'topProducts' | 'slowProducts'>('period');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reportes</h1>
      </div>

      <div className="flex gap-2 mb-6">
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
              <table className="data-table">
                <thead>
                  <tr><th>Fecha</th><th>Empleado</th><th>Turno</th><th>Total</th><th>Salario</th></tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr key={r.id}>
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td className="font-medium">{r.employeeName}</td>
                      <td className="capitalize">{r.shift === 'morning' ? 'Mañana' : 'Tarde'}</td>
                      <td className="font-semibold">${r.totalSold.toLocaleString()}</td>
                      <td className="text-success font-medium">${r.salary.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td colSpan={3}>Total</td>
                    <td>${filteredReports.reduce((s, r) => s + r.totalSold, 0).toLocaleString()}</td>
                    <td className="text-success">${filteredReports.reduce((s, r) => s + r.salary, 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
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
      </div>
    </div>
  );
}
