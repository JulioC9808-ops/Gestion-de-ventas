import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowRightLeft, ClipboardCheck, Package } from 'lucide-react';
import StockEntry from '@/components/admin/StockEntry';
import StockView from '@/components/employee/StockView';
import ShiftClose from '@/components/employee/ShiftClose';

const NAV = [
  { label: 'Stock Disponible', icon: Package, key: 'stock-view' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock-entry' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift' },
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
