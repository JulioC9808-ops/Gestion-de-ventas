import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Key, RotateCcw } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const NAV = [
  { label: 'Configuración', icon: Settings, key: 'config' },
  { label: 'Contraseña', icon: Key, key: 'password' },
  { label: 'Restaurar', icon: RotateCcw, key: 'reset' },
];

export default function DevPanel() {
  const [active, setActive] = useState('config');
  const { settings, updateSettings, users, updateUser } = useData();
  const { currentUser } = useAuth();
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  const handleSaveName = () => {
    updateSettings({ businessName });
    toast.success('Nombre actualizado');
  };

  const handleChangePassword = () => {
    if (!currentUser) return;
    const devUser = users.find(u => u.id === currentUser.id);
    if (!devUser || devUser.password !== currentPwd) {
      toast.error('Contraseña actual incorrecta');
      return;
    }
    updateUser({ ...devUser, password: newPwd });
    setCurrentPwd('');
    setNewPwd('');
    toast.success('Contraseña actualizada');
  };

  const handleReset = () => {
    if (confirm('¿Restaurar toda la configuración a valores por defecto?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <AppLayout nav={NAV} activeKey={active} onNav={setActive}>
      {active === 'config' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Configuración del Sistema</h1>
          </div>
          <div className="glass-card p-6 max-w-lg space-y-6">
            <div>
              <label className="text-sm font-medium">Nombre del Negocio</label>
              <div className="flex gap-2 mt-1">
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)} />
                <Button onClick={handleSaveName}>Guardar</Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tema Actual</label>
              <p className="text-muted-foreground text-sm mt-1">Tema por defecto (Café). Más temas próximamente.</p>
            </div>
          </div>
        </div>
      )}

      {active === 'password' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Cambiar Contraseña</h1>
          </div>
          <div className="glass-card p-6 max-w-md space-y-4">
            <div>
              <label className="text-sm font-medium">Contraseña Actual</label>
              <Input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Nueva Contraseña</label>
              <Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
            </div>
            <Button onClick={handleChangePassword} className="w-full">Cambiar Contraseña</Button>
          </div>
        </div>
      )}

      {active === 'reset' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Restaurar Valores</h1>
          </div>
          <div className="glass-card p-6 max-w-md">
            <p className="text-muted-foreground mb-4">Esto eliminará todos los datos y restaurará la configuración por defecto.</p>
            <Button variant="destructive" onClick={handleReset}>Restaurar Todo</Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
