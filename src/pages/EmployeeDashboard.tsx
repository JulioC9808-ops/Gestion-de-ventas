import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowRightLeft, ClipboardCheck, Package, LogOut } from 'lucide-react';
import StockEntry from '@/components/admin/StockEntry';
import StockView from '@/components/employee/StockView';
import ShiftClose from '@/components/employee/ShiftClose';

const NAV = [
  { label: 'Stock Disponible', icon: Package, key: 'stock-view', tip: 'Mira qué productos tienes disponibles para vender.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock-entry', tip: 'Pasa productos del almacén a tu punto de venta.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Al terminar tu turno, registra aquí lo que vendiste y cuadra el dinero.' },
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
