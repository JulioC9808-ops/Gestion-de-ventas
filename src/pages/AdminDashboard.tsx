import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { LayoutDashboard, Package, Users, ArrowRightLeft, ClipboardList, DollarSign, Clock, ClipboardCheck, Crown, Settings, Palette, Type } from 'lucide-react';
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

const NAV = [
  { label: 'Panel', icon: LayoutDashboard, key: 'overview', tip: 'Resumen general del negocio: ventas, stock y empleados.' },
  { label: 'Productos', icon: Package, key: 'products', tip: 'Agrega, edita o elimina productos del almacén. Incluye precio de costo y ganancia.' },
  { label: 'Usuarios', icon: Users, key: 'users', tip: 'Crea y administra cuentas de empleados y administradores.' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock', tip: 'Mueve productos del almacén al stock de venta. Descuenta del inventario.' },
  { label: 'Cierre de Turno', icon: ClipboardCheck, key: 'shift', tip: 'Registra tus ventas del turno y liquida el efectivo.' },
  { label: 'Ventas VIP', icon: Crown, key: 'vip', tip: 'Revisa todas las ventas VIP registradas por empleados para verificación.' },
  { label: 'Reportes', icon: ClipboardList, key: 'reports', tip: 'Consulta reportes de ventas por período, empleado y producto con desglose completo.' },
  { label: 'Salarios', icon: DollarSign, key: 'salaries', tip: 'Historial de salarios pagados a todos los empleados.' },
  { label: 'Movimientos', icon: Clock, key: 'movements', tip: 'Registro de entradas de productos al stock con opción de eliminar.' },
  { label: 'Ajustes', icon: Settings, key: 'settings', tip: 'Cambia el tema de colores, fuente, posición de navegación y porcentaje de salario.' },
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
    settings: <AdminSettings />,
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {content[active]}
    </AppLayout>
  );
}
