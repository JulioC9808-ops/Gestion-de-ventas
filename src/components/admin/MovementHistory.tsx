import React from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import AnimatedTrash from '@/components/ui/animated-trash';
import { Button } from '@/components/ui/button';
import { playTrashSound } from '@/lib/soundUtils';

export default function MovementHistory() {
  const { movements, deleteMovement, users } = useData();
  const sorted = [...movements].reverse();

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : userId;
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Historial de Movimientos</h1>
          <HelpTip>Registro de todas las entradas de productos al stock de venta. Puedes eliminar registros incorrectos.</HelpTip>
        </div>
      </div>
      <div className="glass-card p-6">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">No hay movimientos registrados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Producto</th><th>Cantidad</th><th>Registrado por</th><th className="text-right">Acción</th></tr>
            </thead>
            <tbody>
              {sorted.map(m => (
                <tr key={m.id}>
                  <td className="text-sm">{new Date(m.movedAt).toLocaleString()}</td>
                  <td className="font-medium">{m.productName}</td>
                  <td className="font-semibold">+{m.quantity}</td>
                  <td className="text-muted-foreground">{getUserName(m.movedBy)}</td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        playTrashSound();
                        deleteMovement(m.id);
                      }}
                      className="group text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Eliminar movimiento"
                    >
                      <AnimatedTrash className="w-4 h-4 text-destructive" />
                    </Button>
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
