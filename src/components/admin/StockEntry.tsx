import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function StockEntry() {
  const { products, getStockQuantity, addToStock } = useData();
  const { currentUser } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, string>>({});

  const handleEntry = (productId: string) => {
    const qty = Number(quantities[productId]);
    if (!qty || qty <= 0) return;
    const success = addToStock(productId, qty, currentUser?.id || '');
    if (!success) {
      toast.error('No hay suficiente cantidad en almacén');
      return;
    }
    setQuantities(prev => ({ ...prev, [productId]: '' }));
    toast.success('Producto agregado al stock de venta');
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Entrada de Productos a Stock</h1>
          <Tooltip>
            <TooltipTrigger><HelpCircle className="w-5 h-5 text-muted-foreground" /></TooltipTrigger>
            <TooltipContent><p className="max-w-xs">Mueve productos del almacén al stock de venta. La cantidad se descuenta automáticamente del almacén.</p></TooltipContent>
          </Tooltip>
        </div>
      </div>

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
                  <td className="font-medium">{p.name}</td>
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
