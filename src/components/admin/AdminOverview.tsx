import React from 'react';
import { useData } from '@/contexts/DataContext';
import { Package, Users, TrendingUp, DollarSign } from 'lucide-react';

export default function AdminOverview() {
  const { products, stock, reports, users } = useData();

  const totalProducts = products.length;
  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalSales = reports.reduce((sum, r) => sum + r.totalSold, 0);
  const totalEmployees = users.filter(u => u.role === 'employee').length;

  const stats = [
    { label: 'Productos', value: totalProducts, icon: Package, color: 'text-primary' },
    { label: 'Unidades en Stock', value: totalStock, icon: TrendingUp, color: 'text-success' },
    { label: 'Total Vendido', value: `$${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-accent' },
    { label: 'Empleados', value: totalEmployees, icon: Users, color: 'text-primary' },
  ];

  const recentReports = [...reports].reverse().slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Panel de Administración</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="stat-card animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold font-display">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-xl font-display font-bold mb-4">Últimos Cierres de Turno</h2>
        {recentReports.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay reportes aún.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Empleado</th>
                <th>Turno</th>
                <th>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map(r => (
                <tr key={r.id}>
                  <td className="text-sm">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="text-sm font-medium">{r.employeeName}</td>
                  <td className="text-sm capitalize">{r.shift === 'morning' ? 'Mañana' : 'Tarde'}</td>
                  <td className="text-sm font-semibold">${r.totalSold.toLocaleString()}</td>
                  <td>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'balanced' ? 'bg-success/10 text-success' :
                      r.status === 'surplus' ? 'bg-warning/10 text-warning' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {r.status === 'balanced' ? '✅ Cuadrado' : r.status === 'surplus' ? '⬆️ Sobrante' : '⬇️ Faltante'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
