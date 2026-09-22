import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, CheckCircle2, X, PackagePlus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { getCategoryEmoji } from '@/lib/catalog';
import { AnimatePresence, motion } from 'motion/react';
import { playStockEntrySound } from '@/lib/soundUtils';

interface EntryAnnouncement {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  timestamp: string;
}

export default function StockEntry() {
  const { products, getStockQuantity, addToStock } = useData();
  const { currentUser } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [recentEntries, setRecentEntries] = useState<EntryAnnouncement[]>([]);

  const dismissAnnouncement = (id: string) => {
    setRecentEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleEntry = (productId: string) => {
    const qty = Number(quantities[productId]);
    if (!qty || qty <= 0) return;
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) return;

    const success = addToStock(productId, qty, currentUser?.id || '');
    if (!success) {
      toast.error('No hay suficiente cantidad en almacén');
      return;
    }

    playStockEntrySound();

    // Crear el nuevo anuncio de entrada
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEntry: EntryAnnouncement = {
      id: `${productId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      productId,
      productName: targetProduct.name,
      category: targetProduct.category,
      quantity: qty,
      unit: targetProduct.unit,
      timestamp: timeString,
    };

    // Mantener máximo 4 elementos: si ya hay 4, se remueve el más viejo con animación deslizante
    setRecentEntries(prev => {
      const updated = [newEntry, ...prev];
      return updated.slice(0, 4);
    });

    setQuantities(prev => ({ ...prev, [productId]: '' }));
    toast.success(`+${qty} ${targetProduct.unit} de "${targetProduct.name}" ingresado a stock`);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Entrada de Productos a Stock</h1>
          <HelpTip>Mueve productos del almacén al stock de venta. La cantidad se descuenta automáticamente del almacén.</HelpTip>
        </div>
      </div>

      {/* Cartel / Anuncio animado de productos entrados (máximo 4, deslizamiento lateral) */}
      <AnimatePresence mode="popLayout">
        {recentEntries.length > 0 && (
          <motion.div
            layout
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mb-6 space-y-2"
          >
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                <span>Últimas Entradas Registradas (Máx. 4)</span>
              </div>
              <button
                type="button"
                onClick={() => setRecentEntries([])}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Limpiar todo
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <AnimatePresence>
                {recentEntries.map(entry => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -60, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      x: 100,
                      scale: 0.85,
                      transition: { duration: 0.3, ease: 'easeOut' },
                    }}
                    transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                    className="relative overflow-hidden flex items-center justify-between p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl shrink-0 border border-emerald-500/20">
                        {getCategoryEmoji(entry.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-sm text-foreground truncate">{entry.productName}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500 text-white shadow-xs">
                            +{entry.quantity} {entry.unit}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => dismissAnnouncement(entry.id)}
                      className="p-1 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0 ml-1"
                      title="Descartar anuncio"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card p-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>En Almacén</th>
              <th>Stock Venta</th>
              <th>Cantidad a Mover</th>
              <th className="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => {
              const maxQty = p.inventoryQty || 0;
              const entryQty = Number(quantities[p.id]) || 0;
              return (
                <tr key={p.id}>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryEmoji(p.category)}</span>
                      {p.name}
                    </div>
                  </td>
                  <td>
                    <span className={`font-bold ${maxQty <= 0 ? 'text-destructive' : 'text-primary'}`}>
                      {maxQty} {p.unit}
                    </span>
                  </td>
                  <td>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
                      {getStockQuantity(p.id)} {p.unit}
                    </span>
                  </td>
                  <td>
                    <Input
                      type="number"
                      min="0"
                      max={maxQty}
                      placeholder="0"
                      value={quantities[p.id] || ''}
                      onChange={e => setQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-24"
                    />
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      onClick={() => handleEntry(p.id)}
                      disabled={!quantities[p.id] || entryQty <= 0 || entryQty > maxQty}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
