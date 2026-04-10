import React from 'react';
import { useData } from '@/contexts/DataContext';
import { HelpCircle, Package, Coffee, UtensilsCrossed, Sandwich } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function StockView() {
  const { products, getStockQuantity } = useData();

  const stockItems = products.map(p => ({
    ...p,
    stock: getStockQuantity(p.id),
  })).filter(p => p.stock > 0);

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Stock Disponible</h1>
          <Tooltip>
            <TooltipTrigger><HelpCircle className="w-5 h-5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent><p className="max-w-xs">Estos son los productos disponibles para la venta en tu turno actual.</p></TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stockItems.length === 0 ? (
          <p className="text-muted-foreground col-span-full text-center py-12">No hay productos en stock.</p>
        ) : stockItems.map(p => (
          <div key={p.id} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{p.category}</span>
              <span className="text-xs font-medium text-muted-foreground">${p.price}/{p.unit}</span>
            </div>
            <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2">
              {p.category?.toLowerCase().includes('bebida') ? <Coffee className="w-5 h-5 text-muted-foreground" /> :
               p.category?.toLowerCase().includes('alimento') ? <UtensilsCrossed className="w-5 h-5 text-muted-foreground" /> :
               p.category?.toLowerCase().includes('panadería') || p.category?.toLowerCase().includes('panaderia') ? <Sandwich className="w-5 h-5 text-muted-foreground" /> :
               <Package className="w-5 h-5 text-muted-foreground" />}
              {p.name}
            </h3>
            <p className="text-3xl font-bold text-primary">{p.stock} <span className="text-base font-normal text-muted-foreground">{p.unit}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
