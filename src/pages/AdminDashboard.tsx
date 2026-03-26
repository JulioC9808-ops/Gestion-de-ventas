import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { LayoutDashboard, Package, Users, ArrowRightLeft, ClipboardList, DollarSign, Clock } from 'lucide-react';
import ProductManagement from '@/components/admin/ProductManagement';
import UserManagement from '@/components/admin/UserManagement';
import StockEntry from '@/components/admin/StockEntry';
import Reports from '@/components/admin/Reports';
import SalaryHistory from '@/components/admin/SalaryHistory';
import MovementHistory from '@/components/admin/MovementHistory';
import AdminOverview from '@/components/admin/AdminOverview';

const NAV = [
  { label: 'Panel', icon: LayoutDashboard, key: 'overview' },
  { label: 'Productos', icon: Package, key: 'products' },
  { label: 'Usuarios', icon: Users, key: 'users' },
  { label: 'Entrada Stock', icon: ArrowRightLeft, key: 'stock' },
  { label: 'Reportes', icon: ClipboardList, key: 'reports' },
  { label: 'Salarios', icon: DollarSign, key: 'salaries' },
  { label: 'Movimientos', icon: Clock, key: 'movements' },
];

export default function AdminDashboard() {
  const [active, setActive] = useState('overview');

  const content: Record<string, React.ReactNode> = {
    overview: <AdminOverview />,
    products: <ProductManagement />,
    users: <UserManagement />,
    stock: <StockEntry />,
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
