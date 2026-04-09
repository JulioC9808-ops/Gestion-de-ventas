import { useAuth } from '@/contexts/AuthContext';
import { useThemeApplier } from '@/hooks/useTheme';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/AdminDashboard';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import DevPanel from '@/pages/DevPanel';
import LicenseGate from '@/pages/LicenseGate';

export default function Index() {
  const { currentUser } = useAuth();
  useThemeApplier();

  return (
    <LicenseGate>
      {!currentUser ? <Login /> : (
        currentUser.role === 'admin' ? <AdminDashboard /> :
        currentUser.role === 'employee' ? <EmployeeDashboard /> :
        currentUser.role === 'dev' ? <DevPanel /> :
        <Login />
      )}
    </LicenseGate>
  );
}
