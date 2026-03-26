import { useAuth } from '@/contexts/AuthContext';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/AdminDashboard';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import DevPanel from '@/pages/DevPanel';

export default function Index() {
  const { currentUser } = useAuth();

  if (!currentUser) return <Login />;

  switch (currentUser.role) {
    case 'admin': return <AdminDashboard />;
    case 'employee': return <EmployeeDashboard />;
    case 'dev': return <DevPanel />;
    default: return <Login />;
  }
}
