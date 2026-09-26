import React, { useMemo, useState, useEffect } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Package, Users, TrendingUp, DollarSign, Crown, PieChart as PieIcon, RefreshCw, ClipboardList, Printer, Receipt, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import RatesCard from '@/components/RatesCard';
import CreateReceiptModal from '@/components/CreateReceiptModal';

interface Props {
  onNav?: (key: string) => void;
}

export default function AdminOverview({ onNav }: Props) {
  const { products, stock, reports, users, settings, updateSettings, getStockQuantity } = useData();
  const [createReceiptOpen, setCreateReceiptOpen] = useState(false);

  // Alerta de productos con stock bajo (< 5 unidades en almacén o venta)
  const lowStockAlerts = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      location: 'almacén' | 'venta';
      qty: number;
    }> = [];

    products.forEach(p => {
      const saleQty = getStockQuantity(p.id);
      if (p.inventoryQty < 5) {
        list.push({ id: `${p.id}-inv`, name: p.name, location: 'almacén', qty: p.inventoryQty });
      }
      if (saleQty < 5) {
        list.push({ id: `${p.id}-sale`, name: p.name, location: 'venta', qty: saleQty });
      }
    });

    return list;
  }, [products, getStockQuantity]);

  // Notificar al admin al cargar la vista si hay stock bajo
  useEffect(() => {
    if (lowStockAlerts.length > 0 && !sessionStorage.getItem('notified_low_stock')) {
      sessionStorage.setItem('notified_low_stock', '1');
      const first = lowStockAlerts[0];
      toast.warning(
        `⚠️ Stock bajo: "${first.name}" tiene solo ${first.qty} en ${first.location}${
          lowStockAlerts.length > 1 ? ` (+${lowStockAlerts.length - 1} productos más)` : ''
        }`,
        { duration: 6000 }
      );
    }
  }, [lowStockAlerts]);

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
    { label: 'Empleados', value: totalEmployees, icon: Users, color: 'text-primary', nav: 'settings' },
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
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Panel de Administración</h1>
          <HelpTip>Resumen general de tu negocio. Toca cualquier tarjeta para ir a esa sección.</HelpTip>
        </div>
        <Button
          type="button"
          onClick={() => setCreateReceiptOpen(true)}
          variant="outline"
          className="border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-foreground text-xs sm:text-sm font-semibold h-9 shrink-0 shadow-xs"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Crear Comprobante (Opcional)
        </Button>
      </div>

      {/* Alerta de Stock Bajo (< 5 unidades) */}
      {lowStockAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-display font-bold text-foreground">
                  Alerta: Productos con Stock Bajo (&lt; 5 unidades)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  {lowStockAlerts.length} aviso(s)
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Los siguientes productos se están acabando y requieren reposición urgente:
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {lowStockAlerts.slice(0, 6).map(item => (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-background/80 border border-amber-500/30 text-foreground"
                  >
                    <span>{item.name}:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">
                      {item.qty} en {item.location}
                    </span>
                  </span>
                ))}
                {lowStockAlerts.length > 6 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs text-muted-foreground font-medium">
                    +{lowStockAlerts.length - 6} más
                  </span>
                )}
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onNav && onNav('stock')}
            className="border-amber-500/40 text-xs font-semibold h-8 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0 self-end sm:self-center"
          >
            Revisar Inventario
          </Button>
        </div>
      )}

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
            <h2 className="text-xl font-display font-bold">Método de Pago</h2>
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
      {/* Crear Comprobante (Opcional) */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold">Crear Comprobante (Opcional)</h2>
              <p className="text-xs text-muted-foreground">
                Crea e imprime un ticket/comprobante personalizado para el cliente al instante con desglose, % de transferencia y datos del negocio.
              </p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setCreateReceiptOpen(true)}
            className="h-9 px-4 text-xs font-semibold shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Crear Comprobante Personalizado
          </Button>
        </div>
      </div>

      <RatesCard />

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


// ============ Compact & Ultra-Modern Payment Breakdown ============
function SalesPieChart({ data }: { data: { cash: number; transfer: number; vip: number; total: number } }) {
  const { cash, transfer, vip, total } = data;
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const methods = [
    {
      key: 'cash',
      label: 'Efectivo',
      icon: '💵',
      value: cash,
      color: '#10b981',
      colorTo: '#059669',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    },
    {
      key: 'transfer',
      label: 'Transferencia',
      icon: '💳',
      value: transfer,
      color: '#06b6d4',
      colorTo: '#3b82f6',
      badgeClass: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    },
    {
      key: 'vip',
      label: 'VIP',
      icon: '👑',
      value: vip,
      color: '#f59e0b',
      colorTo: '#ea580c',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    },
  ];

  if (total === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-xs flex flex-col items-center justify-center gap-1.5">
        <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-base">
          📊
        </div>
        <p className="font-medium">Sin ventas registradas en el período.</p>
      </div>
    );
  }

  const size = 136;
  const radius = 60;
  const innerRadius = 42;
  const cx = size / 2, cy = size / 2;
  let currentAngle = -Math.PI / 2;

  const slices = methods.map(m => {
    const fraction = total > 0 ? m.value / total : 0;
    const angleSpan = fraction * Math.PI * 2;
    const endAngle = currentAngle + angleSpan;
    const isHovered = activeKey === m.key;
    const rOuter = isHovered ? radius + 3 : radius;
    const rInner = isHovered ? innerRadius - 1 : innerRadius;

    const x1 = cx + rOuter * Math.cos(currentAngle);
    const y1 = cy + rOuter * Math.sin(currentAngle);
    const x2 = cx + rOuter * Math.cos(endAngle);
    const y2 = cy + rOuter * Math.sin(endAngle);

    const x3 = cx + rInner * Math.cos(endAngle);
    const y3 = cy + rInner * Math.sin(endAngle);
    const x4 = cx + rInner * Math.cos(currentAngle);
    const y4 = cy + rInner * Math.sin(currentAngle);

    const largeArc = fraction > 0.5 ? 1 : 0;
    const pathData = fraction >= 0.9999
      ? `M ${cx} ${cy - rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy + rOuter} A ${rOuter} ${rOuter} 0 1 1 ${cx} ${cy - rOuter} M ${cx} ${cy - rInner} A ${rInner} ${rInner} 0 1 0 ${cx} ${cy + rInner} A ${rInner} ${rInner} 0 1 0 ${cx} ${cy - rInner} Z`
      : `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${largeArc} 0 ${x4} ${y4} Z`;

    currentAngle = endAngle;
    return { ...m, fraction, percentage: (fraction * 100).toFixed(1), pathData, isHovered };
  });

  const activeMethod = methods.find(m => m.key === activeKey);

  return (
    <div className="space-y-3">
      {/* Mini Top Distribution Bar */}
      <div className="h-2 w-full bg-muted/60 rounded-full flex gap-0.5 overflow-hidden border border-border/40">
        {slices.map(s => {
          if (s.value <= 0) return null;
          return (
            <div
              key={s.key}
              onMouseEnter={() => setActiveKey(s.key)}
              onMouseLeave={() => setActiveKey(null)}
              className="h-full rounded-sm transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{
                width: `${Math.max(s.fraction * 100, 2)}%`,
                background: `linear-gradient(90deg, ${s.color}, ${s.colorTo})`,
              }}
              title={`${s.label}: $${s.value.toLocaleString()} (${s.percentage}%)`}
            />
          );
        })}
      </div>

      {/* Compact Main Row: Donut + Horizontal Pill Cards */}
      <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
        {/* Compact SVG Donut */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
            <defs>
              {methods.map(m => (
                <linearGradient key={`grad-${m.key}`} id={`grad-${m.key}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={m.color} />
                  <stop offset="100%" stopColor={m.colorTo} />
                </linearGradient>
              ))}
            </defs>

            <circle
              cx={cx}
              cy={cy}
              r={(radius + innerRadius) / 2}
              stroke="hsl(var(--muted))"
              strokeWidth={radius - innerRadius}
              fill="none"
              opacity={0.2}
            />

            {slices.map(s => s.value > 0 && (
              <path
                key={s.key}
                d={s.pathData}
                fill={`url(#grad-${s.key})`}
                stroke="hsl(var(--card))"
                strokeWidth={1.5}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setActiveKey(s.key)}
                onMouseLeave={() => setActiveKey(null)}
                style={{
                  filter: s.isHovered ? `drop-shadow(0 2px 8px ${s.color}66)` : undefined,
                }}
              />
            ))}

            <circle cx={cx} cy={cy} r={innerRadius - 2} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth={1} />
          </svg>

          {/* Compact Info Hub */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
            {activeMethod ? (
              <div className="animate-in fade-in duration-150">
                <span className="text-xs leading-none">{activeMethod.icon}</span>
                <p className="text-[10px] font-bold text-foreground leading-tight mt-0.5">${activeMethod.value.toLocaleString()}</p>
                <span className="text-[9px] font-bold text-primary">{((activeMethod.value / total) * 100).toFixed(0)}%</span>
              </div>
            ) : (
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase">Total</p>
                <p className="text-xs font-black text-foreground">${total.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>

        {/* Compact Method Items */}
        <div className="grid grid-cols-1 gap-1.5 w-full flex-1">
          {slices.map(s => {
            const isSelected = activeKey === s.key;
            return (
              <div
                key={s.key}
                onMouseEnter={() => setActiveKey(s.key)}
                onMouseLeave={() => setActiveKey(null)}
                className={`px-3 py-2 rounded-lg border transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-primary/10 border-primary/40 shadow-xs'
                    : 'bg-card/60 border-border/60 hover:bg-card hover:border-border'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{s.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{s.label}</p>
                    <div className="w-16 sm:w-24 h-1 bg-muted rounded-full overflow-hidden mt-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${s.fraction * 100}%`,
                          background: `linear-gradient(90deg, ${s.color}, ${s.colorTo})`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-foreground">${s.value.toLocaleString()}</span>
                  <span className={`text-[10px] font-bold ml-1.5 px-1.5 py-0.2 rounded border ${s.badgeClass}`}>
                    {s.percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateReceiptModal
        open={createReceiptOpen}
        onClose={() => setCreateReceiptOpen(false)}
      />
    </div>
  );
}
