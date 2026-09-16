import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { ArrowRightLeft, ClipboardCheck, Package, LogOut, QrCode } from 'lucide-react';
import StockEntry from '@/components/admin/StockEntry';
import StockView from '@/components/employee/StockView';
import ShiftClose from '@/components/employee/ShiftClose';
import EmployeeDataSync from '@/components/employee/EmployeeDataSync';
import { isMobileDevice } from '@/lib/platform';

const BASE_NAV = [
  { label: 'Stock Disponible', icon: Package, key: 'stock-view', tip: 'Mira qué productos tienes disponibles para vender.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock-entry', tip: 'Pasa productos del almacén a tu punto de venta.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Al terminar tu turno, registra aquí lo que vendiste y cuadra el dinero.' },
];

const SYNC_NAV_ITEM = { label: 'Actualizar datos', icon: QrCode, key: 'sync', tip: 'Escanea el QR del jefe para recibir los productos, precios y datos más recientes.' };

// "Actualizar datos" solo tiene sentido en el celular (Android), donde no hay
// una red compartida con el PC del jefe de la misma forma. En PC/Electron se oculta.
const NAV = isMobileDevice() ? [...BASE_NAV, SYNC_NAV_ITEM] : BASE_NAV;

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
