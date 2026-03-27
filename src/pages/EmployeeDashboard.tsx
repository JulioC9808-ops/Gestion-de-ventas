import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowRightLeft, ClipboardCheck, Package, LogOut } from 'lucide-react';
import StockEntry from '@/components/admin/StockEntry';
import StockView from '@/components/employee/StockView';
import ShiftClose from '@/components/employee/ShiftClose';

const NAV = [
  { label: 'Stock Disponible', icon: Package, key: 'stock-view', tip: 'Consulta los productos disponibles para la venta en tu turno.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock-entry', tip: 'Mueve productos del almacén al stock de venta. Se descuenta del almacén.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Registra lo vendido, desglosa los pagos y cierra tu turno.' },
];

export default function EmployeeDashboard() {
  const [active, setActive] = useState('stock-view');

  const content: Record<string, React.ReactNode> = {
    'stock-view': <StockView />,
    'stock-entry': <StockEntry />,
    shift: <ShiftClose />,
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {content[active]}
    </AppLayout>
  );
}
