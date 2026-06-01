import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { SaleItem, Transfer, VipSale, ShiftReport } from '@/types';
import { Check, Trash2, Plus, Printer, LogOut, Pencil, ArrowLeft, Package, Coffee, UtensilsCrossed, Sandwich } from 'lucide-react';

const DENOMINATIONS = [1000, 500, 200, 100, 50, 20, 10, 5, 3, 1];

export default function ShiftClose() {
  const { products, getStockQuantity, reduceStock, addReport, settings, users } = useData();
  const { currentUser, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [isClosing, setIsClosing] = useState(false);

  // Get fresh user data from DataContext to pick up salary changes
  const freshUser = users.find(u => u.id === currentUser?.id);
  const salaryPercent = freshUser?.salaryPercent ?? settings.defaultSalaryPercent ?? currentUser?.salaryPercent ?? 2;

  // Step 1: remaining quantities
  const stockProducts = useMemo(() =>
    products.filter(p => getStockQuantity(p.id) > 0).map(p => ({
      ...p,
      stockQty: getStockQuantity(p.id),
    })), [products, getStockQuantity]);

  const [remaining, setRemaining] = useState<Record<string, string>>({});

  // Step 2: payment breakdown
  const [bills, setBills] = useState<Record<number, number>>(() =>
    Object.fromEntries(DENOMINATIONS.map(d => [d, 0]))
  );
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [newTransfer, setNewTransfer] = useState({ amount: '', code: '' });
  const [editingTransfer, setEditingTransfer] = useState<string | null>(null);
  const [editTransferData, setEditTransferData] = useState({ amount: '', code: '' });
  const [vipSales, setVipSales] = useState<VipSale[]>([]);
  const [newVip, setNewVip] = useState({ concept: '', amount: '' });

  // Step 3: final report
  const [finalReport, setFinalReport] = useState<ShiftReport | null>(null);

  // Calculate sold items
  const saleItems: SaleItem[] = useMemo(() =>
    stockProducts.map(p => {
      const rem = Number(remaining[p.id]) || 0;
      const sold = Math.max(0, p.stockQty - rem);
      return {
        productId: p.id,
        productName: p.name,
        price: p.price,
        quantitySold: sold,
        subtotal: sold * p.price,
      };
    }).filter(item => item.quantitySold > 0), [stockProducts, remaining]);

  const totalSold = saleItems.reduce((s, i) => s + i.subtotal, 0);
  const salaryAmount = totalSold * (salaryPercent / 100);
  const cashTotal = Object.entries(bills).reduce((s, [denom, count]) => s + Number(denom) * count, 0);
  const transferTotal = transfers.reduce((s, t) => s + t.amount, 0);
  const vipTotal = vipSales.reduce((s, v) => s + v.amount, 0);
  const totalDeclared = cashTotal + transferTotal + vipTotal;
  const difference = totalDeclared - totalSold;
  const isBalanced = Math.abs(difference) < 0.01;

  const currentShift = (): 'morning' | 'afternoon' => {
    const hour = new Date().getHours();
    return hour < 14 ? 'morning' : 'afternoon';
  };

  const addTransfer = () => {
    if (!newTransfer.amount) return;
    setTransfers(prev => [...prev, { id: crypto.randomUUID(), amount: Number(newTransfer.amount), code: newTransfer.code || '' }]);
    setNewTransfer({ amount: '', code: '' });
  };

  const saveEditTransfer = (id: string) => {
    setTransfers(prev => prev.map(t => t.id === id ? { ...t, amount: Number(editTransferData.amount), code: editTransferData.code } : t));
    setEditingTransfer(null);
  };

  const addVip = () => {
    if (!newVip.amount || !newVip.concept) return;
    setVipSales(prev => [...prev, { id: crypto.randomUUID(), concept: newVip.concept, amount: Number(newVip.amount) }]);
    setNewVip({ concept: '', amount: '' });
  };

  const buildReport = (): ShiftReport => {
    return {
      id: crypto.randomUUID(),
      employeeId: freshUser?.id || currentUser?.id || '',
      employeeName: freshUser?.name || currentUser?.name || '',
      date: new Date().toISOString(),
      shift: currentShift(),
      items: saleItems,
      cashTotal,
      cashBreakdown: bills,
      transfers,
      vipSales,
      totalSold,
      salary: salaryAmount,
      salaryPercent,
      status: isBalanced ? 'balanced' : difference > 0 ? 'surplus' : 'deficit',
      difference,
    };
  };

  const handleFinalize = () => {
    setFinalReport(buildReport());
    setStep(3);
  };

  const handleGoBack = () => {
    setFinalReport(null);
    setStep(2);
  };

  const handleCloseAndLogout = () => {
    if (isClosing) return;

    setIsClosing(true);
    const report = finalReport ?? buildReport();
    saleItems.forEach(item => reduceStock(item.productId, item.quantitySold));
    addReport(report);
    toast.success('Turno cerrado exitosamente');
    logout();
  };

  if (step === 3 && finalReport) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card p-8 animate-fade-in-up">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <Check className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-display font-bold">Revisión Final del Turno</h1>
            <p className="text-muted-foreground">
              {new Date(finalReport.date).toLocaleDateString()} — Turno {finalReport.shift === 'morning' ? 'Mañana' : 'Tarde'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="stat-card text-center">
              <p className="text-sm text-muted-foreground">Total Vendido</p>
              <p className="text-2xl font-bold font-display">${finalReport.totalSold.toLocaleString()}</p>
            </div>
            <div className="stat-card text-center">
              <p className="text-sm text-muted-foreground">Salario ({finalReport.salaryPercent}%)</p>
              <p className="text-2xl font-bold font-display text-success">${finalReport.salary.toFixed(2)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-display font-bold mb-2">📋 Productos Vendidos</h3>
              <table className="data-table text-sm">
                <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                <tbody>
                  {finalReport.items.map(item => (
                    <tr key={item.productId}>
                      <td>{item.productName}</td>
                      <td>{item.quantitySold}</td>
                      <td>${item.price}</td>
                      <td>${item.subtotal.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-border">
                    <td colSpan={3}>Total Liquidación Productos</td>
                    <td>${finalReport.totalSold.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="font-display font-bold mb-2">💰 Desglose de Pagos</h3>
              
              {/* Cash breakdown */}
              <div className="mb-2">
                <p className="text-sm font-medium mb-1">💵 Efectivo:</p>
                <div className="grid grid-cols-5 gap-1 text-xs ml-4 mb-1">
                  {Object.entries(finalReport.cashBreakdown).filter(([_, count]) => count > 0).map(([denom, count]) => (
                    <span key={denom} className="bg-secondary/50 rounded px-2 py-1 text-center">${denom} × {count}</span>
                  ))}
                </div>
                <p className="text-sm font-bold ml-4">Subtotal: ${finalReport.cashTotal.toLocaleString()}</p>
              </div>

              {finalReport.transfers.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium">💳 Transferencias:</p>
                  {finalReport.transfers.map(t => (
                    <p key={t.id} className="text-sm ml-4">• ${t.amount}{t.code ? ` — ID: ${t.code}` : ''}</p>
                  ))}
                  <p className="text-sm font-bold ml-4">Subtotal: ${transferTotal.toLocaleString()}</p>
                </div>
              )}
              {finalReport.vipSales.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm font-medium">👑 VIP:</p>
                  {finalReport.vipSales.map(v => (
                    <p key={v.id} className="text-sm ml-4">• {v.concept} — ${v.amount}</p>
                  ))}
                  <p className="text-sm font-bold ml-4">Subtotal: ${vipTotal.toLocaleString()}</p>
                </div>
              )}

              <div className="border-t-2 border-border pt-2 mt-2">
                <p className="text-base font-bold">Total General: ${finalReport.totalSold.toLocaleString()}</p>
              </div>
            </div>

            <div className={`p-3 rounded-lg text-sm font-medium ${
              finalReport.status === 'balanced' ? 'bg-success/10 text-success' :
              finalReport.status === 'surplus' ? 'bg-warning/10 text-warning' :
              'bg-destructive/10 text-destructive'
            }`}>
              {finalReport.status === 'balanced' ? '✅ Todo cuadrado' :
               finalReport.status === 'surplus' ? `⬆️ Sobrante: $${finalReport.difference.toFixed(2)}` :
               `⬇️ Faltante: $${Math.abs(finalReport.difference).toFixed(2)}`}
            </div>
          </div>

          <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mt-6 text-center">
            <p className="text-sm font-medium text-warning">⚠️ Revise bien todos los datos. El reporte solo se guardará cuando confirme y cierre la sesión.</p>
          </div>

          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Corregir
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
            <Button className="flex-1" onClick={handleCloseAndLogout} disabled={isClosing}>
              <LogOut className="w-4 h-4 mr-2" />
              {isClosing ? 'Guardando...' : 'Confirmar y Cerrar Sesión'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Cierre de Turno</h1>
          <HelpTip>Registra lo que queda de cada producto para calcular lo vendido, luego desglosa los pagos recibidos. El turno solo se cierra si los montos cuadran.</HelpTip>
        </div>
        <div className="step-indicator">
          <div className={`step-dot ${step === 1 ? 'active' : step > 1 ? 'completed' : 'pending'}`}>1</div>
          <div className="w-8 h-0.5 bg-border" />
          <div className={`step-dot ${step === 2 ? 'active' : step > 2 ? 'completed' : 'pending'}`}>2</div>
        </div>
      </div>

      {step === 1 && (
        <div className="glass-card p-6 animate-fade-in-up">
          <h2 className="text-lg font-display font-bold mb-4">Paso 1: Rebajar Productos</h2>
          <p className="text-sm text-muted-foreground mb-4">Ingresa la cantidad que <strong>entregas/queda</strong> de cada producto. Stock - Entregado = Total Vendido.</p>
          <table className="data-table">
            <thead>
              <tr><th>Producto</th><th>Stock Inicial</th><th>Entregas</th><th>Vendidos</th><th>Subtotal</th></tr>
            </thead>
            <tbody>
              {stockProducts.map(p => {
                const rem = Number(remaining[p.id]) || 0;
                const sold = Math.max(0, p.stockQty - rem);
                return (
                  <tr key={p.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.category?.toLowerCase().includes('bebida') ? <Coffee className="w-4 h-4 text-muted-foreground" /> :
                         p.category?.toLowerCase().includes('alimento') ? <UtensilsCrossed className="w-4 h-4 text-muted-foreground" /> :
                         p.category?.toLowerCase().includes('panadería') || p.category?.toLowerCase().includes('panaderia') ? <Sandwich className="w-4 h-4 text-muted-foreground" /> :
                         <Package className="w-4 h-4 text-muted-foreground" />}
                        {p.name}
                      </div>
                    </td>
                    <td>{p.stockQty}</td>
                    <td>
                      <Input
                        type="number"
                        min="0"
                        max={p.stockQty}
                        value={remaining[p.id] || ''}
                        onChange={e => setRemaining(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-20"
                        placeholder="0"
                      />
                    </td>
                    <td className="font-semibold">{sold}</td>
                    <td className="font-semibold">${(sold * p.price).toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex items-center justify-between mt-6">
            <p className="text-lg font-bold font-display">Total Vendido: <span className="text-primary">${totalSold.toLocaleString()}</span></p>
            <Button onClick={() => setStep(2)}>Continuar →</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="glass-card p-6 animate-fade-in-up">
          {/* Salary & Total at top */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendido</p>
                <p className="text-xl font-bold font-display">${totalSold.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Tu Salario ({salaryPercent}%)</p>
                  <p className="text-xl font-bold font-display text-success">${salaryAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <h2 className="text-lg font-display font-bold mb-4">Paso 2: Desglose de Pagos</h2>

          {/* Cash */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">💵 Efectivo</h3>
            <div className="grid grid-cols-5 gap-2">
              {DENOMINATIONS.map(d => (
                <div key={d} className="text-center">
                  <label className="text-xs text-muted-foreground">${d}</label>
                  <Input
                    type="number"
                    min="0"
                    value={bills[d] || ''}
                    onChange={e => setBills(prev => ({ ...prev, [d]: Number(e.target.value) || 0 }))}
                    className="text-center"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <p className="text-sm mt-2 font-medium">Subtotal Efectivo: <span className="text-primary">${cashTotal.toLocaleString()}</span></p>
          </div>

          {/* Transfers */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">💳 Transferencias</h3>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Monto *" type="number" value={newTransfer.amount} onChange={e => setNewTransfer(prev => ({ ...prev, amount: e.target.value }))} className="w-28" />
              <Input placeholder="ID (opcional)" value={newTransfer.code} onChange={e => setNewTransfer(prev => ({ ...prev, code: e.target.value }))} />
              <Button size="sm" onClick={addTransfer}><Plus className="w-4 h-4" /></Button>
            </div>
            {transfers.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 mb-1">
                {editingTransfer === t.id ? (
                  <div className="flex gap-2 flex-1 mr-2">
                    <Input type="number" value={editTransferData.amount} onChange={e => setEditTransferData(prev => ({ ...prev, amount: e.target.value }))} className="w-24" />
                    <Input value={editTransferData.code} onChange={e => setEditTransferData(prev => ({ ...prev, code: e.target.value }))} placeholder="ID (opcional)" />
                    <Button size="sm" variant="outline" onClick={() => saveEditTransfer(t.id)}>
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm">${t.amount}{t.code ? ` — ID: ${t.code}` : ''}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingTransfer(t.id); setEditTransferData({ amount: String(t.amount), code: t.code }); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setTransfers(prev => prev.filter(x => x.id !== t.id))}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <p className="text-sm font-medium">Subtotal Transferencias: <span className="text-primary">${transferTotal.toLocaleString()}</span></p>
          </div>

          {/* VIP */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">👑 VIP</h3>
            <div className="flex gap-2 mb-2">
              <Input placeholder="Nombre del Cliente" value={newVip.concept} onChange={e => setNewVip(prev => ({ ...prev, concept: e.target.value }))} />
              <Input placeholder="Monto" type="number" value={newVip.amount} onChange={e => setNewVip(prev => ({ ...prev, amount: e.target.value }))} className="w-28" />
              <Button size="sm" onClick={addVip}><Plus className="w-4 h-4" /></Button>
            </div>
            {vipSales.map(v => (
              <div key={v.id} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 mb-1">
                <span className="text-sm">{v.concept} — <span className="font-medium">${v.amount}</span></span>
                <Button variant="ghost" size="sm" onClick={() => setVipSales(prev => prev.filter(x => x.id !== v.id))}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))}
            <p className="text-sm font-medium">Subtotal VIP: <span className="text-primary">${vipTotal.toLocaleString()}</span></p>
          </div>

          {/* Totals summary */}
          <div className="bg-muted/50 rounded-lg p-4 mb-4">
            <p className="text-sm">Total Productos Vendidos: <span className="font-bold">${totalSold.toLocaleString()}</span></p>
          </div>

          {/* Verification */}
          <div className={`p-4 rounded-xl border-2 mb-6 ${isBalanced ? 'border-success bg-success/5' : 'border-destructive bg-destructive/5'}`}>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Total Vendido</p>
                <p className="text-xl font-bold">${totalSold.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Declarado</p>
                <p className="text-xl font-bold">${totalDeclared.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`text-xl font-bold ${isBalanced ? 'text-success' : 'text-destructive'}`}>
                  {isBalanced ? '✅ $0' : `${difference > 0 ? '+' : ''}$${difference.toFixed(2)}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>← Volver</Button>
            <Button className="flex-1" disabled={!isBalanced} onClick={handleFinalize}>
              {isBalanced ? 'Revisar Cierre ✅' : 'Diferencia detectada ❌'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
