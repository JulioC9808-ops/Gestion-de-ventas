import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Package, Users, TrendingUp, DollarSign, Crown, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminOverview() {
  const { products, stock, reports, users } = useData();
  const [showInfo, setShowInfo] = useState(false);

  const totalProducts = products.length;
  const totalInventory = products.reduce((sum, p) => sum + (p.inventoryQty || 0), 0);
  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalSales = reports.reduce((sum, r) => sum + r.totalSold, 0);
  const totalEmployees = users.filter(u => u.role === 'employee').length;
  const totalVip = reports.reduce((sum, r) => sum + r.vipSales.reduce((s, v) => s + v.amount, 0), 0);

  const stats = [
    { label: 'Productos', value: totalProducts, icon: Package, color: 'text-primary' },
    { label: 'En Almacén', value: totalInventory, icon: Package, color: 'text-accent' },
    { label: 'En Stock Venta', value: totalStock, icon: TrendingUp, color: 'text-success' },
    { label: 'Total Vendido', value: `$${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-accent' },
    { label: 'VIP Total', value: `$${totalVip.toLocaleString()}`, icon: Crown, color: 'text-warning' },
    { label: 'Empleados', value: totalEmployees, icon: Users, color: 'text-primary' },
  ];

  const recentReports = [...reports].reverse().slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Panel de Administración</h1>
          <HelpTip>Resumen general de tu negocio: productos, ventas, empleados y VIP.</HelpTip>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            title="Notas importantes"
            aria-label="Notas importantes"
          >
            <Info className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display italic font-bold">¡Hola, espero que tengas buen día!</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm italic font-bold leading-relaxed">
            <p className="font-bold italic">(Notas importantes a tener en cuenta)</p>
            <p><strong className="italic">1-</strong> Este programa existe para evitar fraudes con sus empleados ya que usted tiene el control de todo lo que entra y sale de su negocio, y puede ver el flujo de dinero.</p>
            <p><strong className="italic">2-</strong> Cualquier error o duda que encuentre <em>CONTÁCTEME</em> (Este servicio será totalmente gratuito si usted ha pagado por la licencia permanente).</p>
            <p><strong className="italic">3-</strong> Si usted piensa usar su programa para otro negocio tiene que pagar nuevamente por su servicio.</p>
            <p><strong className="italic">4-</strong> Si usted desea hacer algún cambio <em>¡CONTÁCTEME!</em> Este servicio se le cobrará dependiendo de lo complejo que este sea.</p>
            <p><strong className="italic">5-</strong> No fuerces el programa (se puede desinstalar y volver a instalar sin problemas ya que este hace un <em>BACKUP</em> en sus archivos internos).</p>
            <p><strong className="italic">6-</strong> Este programa tiene un sistema <em>¡Anti-Hacking!</em> que si se detecta que intentan configurarlo externamente este borrará archivos necesarios dentro de sí mismo para su funcionamiento adecuado.</p>
            <p className="pt-2 border-t border-border italic">Muchas gracias por su atención, y le deseo buena suerte. Espero que me vuelva a contactar y si le gustó la aplicación me encantaría que me recomendara… no intentes copiarlo porque no va a dejar usarlo.</p>
          </div>
        </DialogContent>
      </Dialog>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
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
                <th>VIP</th>
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
                  <td className="text-sm">${r.vipSales.reduce((s, v) => s + v.amount, 0).toLocaleString()}</td>
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
