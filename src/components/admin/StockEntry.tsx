import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function StockEntry() {
  const { products, getStockQuantity, addToStock } = useData();
  const { currentUser } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const handleEntry = (productId: string) => {
    const qty = Number(quantities[productId]);
    if (!qty || qty <= 0) return;
    addToStock(productId, qty, currentUser?.id || '');
    setQuantities(prev => ({ ...prev, [productId]: '' }));
    toast.success('Producto agregado al stock');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Entrada de Productos a Stock</h1>
      </div>

      <div className="glass-card p-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock Actual</th>
              <th>Cantidad a Agregar</th>
              <th className="text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td>
                <td>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary text-secondary-foreground">
                    {getStockQuantity(p.id)} {p.unit}
                  </span>
                </td>
                <td>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={quantities[p.id] || ''}
                    onChange={e => setQuantities(prev => ({ ...prev, [p.id]: e.target.value }))}
                    className="w-24"
                  />
                </td>
                <td className="text-right">
                  <Button size="sm" onClick={() => handleEntry(p.id)} disabled={!quantities[p.id] || Number(quantities[p.id]) <= 0}>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
