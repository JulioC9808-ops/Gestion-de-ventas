import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { LayoutDashboard, Package, Users, ArrowRightLeft, ClipboardList, DollarSign, Clock, ClipboardCheck, Crown } from 'lucide-react';
import ProductManagement from '@/components/admin/ProductManagement';
import UserManagement from '@/components/admin/UserManagement';
import StockEntry from '@/components/admin/StockEntry';
import Reports from '@/components/admin/Reports';
import SalaryHistory from '@/components/admin/SalaryHistory';
import MovementHistory from '@/components/admin/MovementHistory';
import AdminOverview from '@/components/admin/AdminOverview';
import ShiftClose from '@/components/employee/ShiftClose';
import VipSalesView from '@/components/admin/VipSalesView';

const NAV = [
  { label: 'Panel', icon: LayoutDashboard, key: 'overview', tip: 'Resumen general del negocio: ventas, stock y empleados.' },
  { label: 'Productos', icon: Package, key: 'products', tip: 'Agrega, edita o elimina productos del almacén.' },
  { label: 'Usuarios', icon: Users, key: 'users', tip: 'Crea y administra cuentas de empleados y administradores.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock', tip: 'Mueve productos del almacén al stock de venta.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Registra tus ventas del turno y liquida el efectivo.' },
  { label: 'Ventas VIP', icon: Crown, key: 'vip', tip: 'Revisa todas las ventas VIP registradas por empleados.' },
  { label: 'Reportes', icon: ClipboardList, key: 'reports', tip: 'Consulta reportes de ventas por período, empleado y producto.' },
  { label: 'Salarios', icon: DollarSign, key: 'salaries', tip: 'Historial de salarios pagados a todos los empleados.' },
  { label: 'Movimientos', icon: Clock, key: 'movements', tip: 'Registro de entradas de productos al stock.' },
];

export default function AdminDashboard() {
  const [active, setActive] = useState('overview');

  const content: Record<string, React.ReactNode> = {
    overview: <AdminOverview />,
    products: <ProductManagement />,
    users: <UserManagement />,
    stock: <StockEntry />,
    shift: <ShiftClose />,
    vip: <VipSalesView />,
    reports: <Reports />,
    salaries: <SalaryHistory />,
    movements: <MovementHistory />,
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {content[active]}
    </AppLayout>
  );
}
