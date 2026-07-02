import React, { useState, useMemo } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Package, Users, TrendingUp, DollarSign, Crown, Info, PieChart as PieIcon, RefreshCw, ClipboardList } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  onNav?: (key: string) => void;
}

export default function AdminOverview({ onNav }: Props) {
  const { products, stock, reports, users, settings, updateSettings } = useData();
  const [showInfo, setShowInfo] = useState(false);

  const totalProducts = products.length;
  const totalInventory = products.reduce((sum, p) => sum + (p.inventoryQty || 0), 0);
  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalSales = reports.reduce((sum, r) => sum + r.totalSold, 0);
  const totalEmployees = users.filter(u => u.role === 'employee').length;
  const totalVip = reports.reduce((sum, r) => sum + r.vipSales.reduce((s, v) => s + v.amount, 0), 0);

  // Cada tarjeta ahora navega a su sección correspondiente
  const stats = [
    { label: 'Productos', value: totalProducts, icon: Package, color: 'text-primary', nav: 'products' },
    { label: 'En Almacén', value: totalInventory, icon: Package, color: 'text-accent', nav: 'products' },
    { label: 'En Stock Venta', value: totalStock, icon: TrendingUp, color: 'text-success', nav: 'stock' },
    { label: 'Total Vendido', value: `$${totalSales.toLocaleString()}`, icon: DollarSign, color: 'text-accent', nav: 'reports' },
    { label: 'VIP Total', value: `$${totalVip.toLocaleString()}`, icon: Crown, color: 'text-warning', nav: 'vip' },
    { label: 'Empleados', value: totalEmployees, icon: Users, color: 'text-primary', nav: 'users' },
  ];

  // ================= GRÁFICO DE VENTAS (efectivo / transferencia / VIP) =================
  const resetAt = settings.salesChartResetAt ? new Date(settings.salesChartResetAt).getTime() : 0;
  const chartData = useMemo(() => {
    const filtered = reports.filter(r => new Date(r.date).getTime() >= resetAt);
    const cash = filtered.reduce((s, r) => s + (r.cashTotal || 0), 0);
    const transfer = filtered.reduce((s, r) => s + r.transfers.reduce((a, t) => a + t.amount, 0), 0);
    const vip = filtered.reduce((s, r) => s + r.vipSales.reduce((a, v) => a + v.amount, 0), 0);
    return { cash, transfer, vip, total: cash + transfer + vip };
  }, [reports, resetAt]);

  const handleResetChart = () => {
    if (!confirm('¿Reiniciar el gráfico de ventas? (los reportes históricos se mantienen intactos)')) return;
    updateSettings({ salesChartResetAt: new Date().toISOString() });
    toast.success('Gráfico reiniciado desde ahora');
  };

  const recentReports = [...reports].reverse().slice(0, 5);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Panel de Administración</h1>
          <HelpTip>Resumen general de tu negocio. Toca cualquier tarjeta para ir a esa sección.</HelpTip>
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
          const clickable = !!onNav && !!stat.nav;
          return (
            <button
              key={i}
              type="button"
              onClick={() => clickable && onNav!(stat.nav)}
              disabled={!clickable}
              className={`stat-card text-left animate-fade-in-up ${clickable ? 'cursor-pointer hover:border-primary/60' : 'cursor-default'}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="text-3xl font-bold font-display">{stat.value}</p>
            </button>
          );
        })}
      </div>

      {/* Gráfico de ventas por método */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-bold">Ventas por método</h2>
            <HelpTip>Muestra la proporción de ventas en efectivo, transferencia y VIP desde el último reinicio.</HelpTip>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetChart}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reiniciar gráfico
          </Button>
        </div>
        <SalesPieChart data={chartData} />
        {settings.salesChartResetAt && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Contando desde: {new Date(settings.salesChartResetAt).toLocaleString()}
          </p>
        )}
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-bold">Últimos Cierres de Turno</h2>
          {onNav && (
            <Button variant="ghost" size="sm" onClick={() => onNav('reports')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Ver todos
            </Button>
          )}
        </div>
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

// ============ Pie chart en SVG puro (sin dependencias) ============
function SalesPieChart({ data }: { data: { cash: number; transfer: number; vip: number; total: number } }) {
  const { cash, transfer, vip, total } = data;

  const slices = [
    { key: 'cash', label: '💵 Efectivo', value: cash, color: 'hsl(var(--success))' },
    { key: 'transfer', label: '💳 Transferencia', value: transfer, color: 'hsl(var(--primary))' },
    { key: 'vip', label: '👑 VIP', value: vip, color: 'hsl(var(--warning))' },
  ];

  if (total === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        Sin ventas registradas todavía.
      </div>
    );
  }

  // Compute pie paths
  const size = 220;
  const radius = 100;
  const cx = size / 2, cy = size / 2;
  let angleStart = -Math.PI / 2;

  const paths = slices.map(s => {
    const frac = s.value / total;
    const angleEnd = angleStart + frac * Math.PI * 2;
    const x1 = cx + radius * Math.cos(angleStart);
    const y1 = cy + radius * Math.sin(angleStart);
    const x2 = cx + radius * Math.cos(angleEnd);
    const y2 = cy + radius * Math.sin(angleEnd);
    const large = frac > 0.5 ? 1 : 0;
    const d = frac >= 1
      ? `M ${cx - radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx + radius} ${cy} A ${radius} ${radius} 0 1 1 ${cx - radius} ${cy} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    angleStart = angleEnd;
    return { ...s, d, frac };
  });

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map(p => p.value > 0 && (
          <path key={p.key} d={p.d} fill={p.color} stroke="hsl(var(--background))" strokeWidth={2} />
        ))}
        <circle cx={cx} cy={cy} r={radius * 0.55} fill="hsl(var(--card))" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground" style={{ fontSize: 12 }}>Total</text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-foreground font-bold" style={{ fontSize: 18 }}>${total.toLocaleString()}</text>
      </svg>
      <div className="space-y-2 min-w-[180px]">
        {paths.map(p => (
          <div key={p.key} className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ background: p.color }} />
              <span>{p.label}</span>
            </div>
            <div className="text-right">
              <div className="font-semibold">${p.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{(p.frac * 100).toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
