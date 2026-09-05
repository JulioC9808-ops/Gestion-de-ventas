import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowRightLeft, ClipboardCheck, Package, LogOut, QrCode } from 'lucide-react';
import StockEntry from '@/components/admin/StockEntry';
import StockView from '@/components/employee/StockView';
import ShiftClose from '@/components/employee/ShiftClose';
import EmployeeDataSync from '@/components/employee/EmployeeDataSync';

const NAV = [
  { label: 'Stock Disponible', icon: Package, key: 'stock-view', tip: 'Mira qué productos tienes disponibles para vender.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock-entry', tip: 'Pasa productos del almacén a tu punto de venta.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Al terminar tu turno, registra aquí lo que vendiste y cuadra el dinero.' },
  { label: 'Actualizar datos', icon: QrCode, key: 'sync', tip: 'Escanea el QR del jefe para recibir los productos, precios y datos más recientes.' },
];

export default function EmployeeDashboard() {
  const [active, setActive] = useState('stock-view');

  const content: Record<string, React.ReactNode> = {
    'stock-view': <StockView />,
    'stock-entry': <StockEntry />,
    shift: <ShiftClose />,
    sync: <EmployeeDataSync />,
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {content[active]}
    </AppLayout>
  );
}
