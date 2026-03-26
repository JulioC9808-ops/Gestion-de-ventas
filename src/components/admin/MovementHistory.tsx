import React from 'react';
import { useData } from '@/contexts/DataContext';

export default function MovementHistory() {
  const { movements } = useData();
  const sorted = [...movements].reverse();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historial de Movimientos</h1>
      </div>
      <div className="glass-card p-6">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">No hay movimientos registrados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Registrado por</th></tr>
            </thead>
            <tbody>
              {sorted.map(m => (
                <tr key={m.id}>
                  <td className="text-sm">{new Date(m.movedAt).toLocaleString()}</td>
                  <td className="font-medium">{m.productName}</td>
                  <td className="font-semibold">+{m.quantity}</td>
                  <td className="text-muted-foreground">{m.movedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
