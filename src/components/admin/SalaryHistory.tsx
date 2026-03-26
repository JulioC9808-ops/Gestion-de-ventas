import React from 'react';
import { useData } from '@/contexts/DataContext';

export default function SalaryHistory() {
  const { reports } = useData();
  const sorted = [...reports].reverse();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Historial de Salarios</h1>
      </div>
      <div className="glass-card p-6">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground">No hay salarios registrados.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Fecha</th><th>Empleado</th><th>Turno</th><th>Total Vendido</th><th>Salario (2%)</th></tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td className="font-medium">{r.employeeName}</td>
                  <td className="capitalize">{r.shift === 'morning' ? 'Mañana' : 'Tarde'}</td>
                  <td>${r.totalSold.toLocaleString()}</td>
                  <td className="font-semibold text-success">${r.salary.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t-2 border-border">
                <td colSpan={4}>Total Salarios Pagados</td>
                <td className="text-success">${sorted.reduce((s, r) => s + r.salary, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
