import React from 'react';
import { useData } from '@/contexts/DataContext';

export default function StockView() {
  const { products, getStockQuantity } = useData();

  const stockItems = products.map(p => ({
    ...p,
    stock: getStockQuantity(p.id),
  })).filter(p => p.stock > 0);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Stock Disponible</h1>
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
            <h3 className="font-display font-bold text-lg mb-1">{p.name}</h3>
            <p className="text-3xl font-bold text-primary">{p.stock} <span className="text-base font-normal text-muted-foreground">{p.unit}</span></p>
          </div>
        ))}
      </div>
    </div>
  );
}
