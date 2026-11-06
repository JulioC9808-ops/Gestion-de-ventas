import React from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReceiptModal } from '@/lib/receiptModalStore';
import { getCategoryEmoji } from '@/lib/catalog';

export default function StockView() {
  const { products, getStockQuantity } = useData();
  const { openReceipt } = useReceiptModal();

  const stockItems = products.map(p => ({
    ...p,
    stock: getStockQuantity(p.id),
  })).filter(p => p.stock > 0);

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Stock Disponible</h1>
          <HelpTip>Estos son los productos disponibles para la venta en tu turno actual.</HelpTip>
        </div>
        <Button
          type="button"
          onClick={openReceipt}
          variant="outline"
          className="border-primary/40 bg-primary/5 hover:bg-primary hover:text-primary-foreground text-foreground text-xs sm:text-sm font-semibold h-9 shrink-0 shadow-xs"
        >
          <Printer className="w-4 h-4 mr-1.5" />
          Crear Comprobante (Opcional)
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stockItems.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">No hay productos en stock.</p>
        ) : stockItems.map(p => (
          <div
            key={p.id}
            className="stat-card flex flex-col justify-between overflow-hidden group hover:border-primary/50 transition-all shadow-sm"
          >
            {/* Foto del producto en alta resolución o emoji por defecto */}
            {p.imageUrl ? (
              <div className="relative w-full h-40 rounded-xl overflow-hidden bg-black/20 border border-border/40 mb-3 shrink-0 shadow-inner">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="relative w-full h-36 rounded-xl overflow-hidden bg-muted/20 border border-border/30 mb-3 flex items-center justify-center text-5xl select-none shrink-0 group-hover:scale-102 transition-transform">
                <span>{getCategoryEmoji(p.category)}</span>
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{p.category}</span>
                <span className="text-xs font-bold text-foreground bg-secondary/80 px-2 py-0.5 rounded-md border border-border/40">
                  ${p.price.toFixed(2)}/{p.unit}
                </span>
              </div>
              <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2 text-foreground">
                <span className="text-base shrink-0">{getCategoryEmoji(p.category)}</span>
                <span className="truncate">{p.name}</span>
              </h3>
            </div>

            <div className="pt-2 mt-2 border-t border-border/30 flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Disponible:</span>
              <p className="text-3xl font-extrabold text-primary font-display">
                {p.stock} <span className="text-sm font-normal text-muted-foreground">{p.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
