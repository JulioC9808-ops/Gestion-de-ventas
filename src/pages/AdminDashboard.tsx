import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { LayoutDashboard, Package, Users, ArrowRightLeft, ClipboardList, DollarSign, Clock, ClipboardCheck, Crown, Settings, Palette, Type, QrCode } from 'lucide-react';
import ProductManagement from '@/components/admin/ProductManagement';
import UserManagement from '@/components/admin/UserManagement';
import StockEntry from '@/components/admin/StockEntry';
import Reports from '@/components/admin/Reports';
import SalaryHistory from '@/components/admin/SalaryHistory';
import MovementHistory from '@/components/admin/MovementHistory';
import AdminOverview from '@/components/admin/AdminOverview';
import ShiftClose from '@/components/employee/ShiftClose';
import VipSalesView from '@/components/admin/VipSalesView';
import AdminSettings from '@/components/admin/AdminSettings';
import ShiftSync from '@/components/admin/ShiftSync';
import { isMobileDevice } from '@/lib/platform';

const BASE_NAV = [
  { label: 'Panel', icon: LayoutDashboard, key: 'overview', tip: 'Aquí ves un resumen rápido de todo tu negocio.' },
  { label: 'Productos', icon: Package, key: 'products', tip: 'Agrega o edita los productos que vendes y su precio.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock', tip: 'Pasa productos del almacén al punto de venta.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Registra lo que vendiste y cuadra el dinero del turno.' },
  { label: 'Ventas VIP', icon: Crown, key: 'vip', tip: 'Revisa las ventas a crédito o VIP de tus empleados.' },
  { label: 'Reportes', icon: ClipboardList, key: 'reports', tip: 'Consulta las ventas por fecha, empleado o producto.' },
  { label: 'Salarios', icon: DollarSign, key: 'salaries', tip: 'Mira cuánto se le ha pagado a cada empleado.' },
  { label: 'Movimientos', icon: Clock, key: 'movements', tip: 'Historial de productos que se pasaron al stock (al eliminar, se revierte).' },
  { label: 'Ajustes', icon: Settings, key: 'settings', tip: 'Usuarios, notas importantes, temas, fuentes y más.' },
];

const SYNC_NAV = { label: 'Sincronizar', icon: QrCode, key: 'sync', tip: 'Escanea el QR del empleado para recibir su cierre de turno desde su celular.' };

export default function AdminDashboard() {
  const [active, setActive] = useState('overview');
  const NAV = useMemo(() => isMobileDevice() ? [...BASE_NAV, SYNC_NAV] : BASE_NAV, []);

  const content: Record<string, React.ReactNode> = {
    overview: <AdminOverview onNav={setActive} />,
    products: <ProductManagement />,
    stock: <StockEntry />,
    shift: <ShiftClose />,
    vip: <VipSalesView />,
    reports: <Reports />,
    salaries: <SalaryHistory />,
    movements: <MovementHistory />,
    settings: <AdminSettings />,
    sync: <ShiftSync />,
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {content[active]}
    </AppLayout>
  );
}
