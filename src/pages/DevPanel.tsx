import React, { useState, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Key, RotateCcw, Image, Send, UserCog } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const NAV = [
  { label: 'Configuración', icon: Settings, key: 'config', tip: 'Cambia el nombre del negocio y otras configuraciones generales.' },
  { label: 'Logo', icon: Image, key: 'logo', tip: 'Sube o cambia el logo que aparece en el login y la navegación.' },
  { label: 'Actualizaciones', icon: Send, key: 'updates', tip: 'Configura el canal de Telegram y el repositorio público de actualizaciones.' },
  { label: 'Contraseña', icon: Key, key: 'password', tip: 'Cambia tu contraseña de desarrollador.' },
  { label: 'Restablecer Admin', icon: UserCog, key: 'admin', tip: 'Devuelve el administrador principal a Usuario: admin y Contraseña: admin123.' },
  { label: 'Restaurar', icon: RotateCcw, key: 'reset', tip: 'Restaura toda la configuración y datos a valores por defecto.' },
];

export default function DevPanel() {
  const [active, setActive] = useState('config');
  const { settings, updateSettings, users, updateUser, resetAdminCredentials } = useData();
  const { currentUser } = useAuth();
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [telegramUrl, setTelegramUrl] = useState(settings.telegramUrl || 'https://t.me/+G8geeJ1gwYo4N2Ex');
  const [githubUpdatesUrl, setGithubUpdatesUrl] = useState(settings.githubUpdatesUrl || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

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

  const handleResetAdmin = () => {
    if (confirm('¿Restablecer el administrador principal a Usuario: admin / Contraseña: admin123?')) {
      resetAdminCredentials();
      toast.success('Administrador restablecido: admin / admin123');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'background') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === 'logo') updateSettings({ logoUrl: dataUrl });
      else if (type === 'background') updateSettings({ backgroundUrl: dataUrl });
      toast.success(`${type === 'logo' ? 'Logo' : 'Fondo'} actualizado`);
    };
    reader.readAsDataURL(file);
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
              <label className="text-sm font-medium">Fondo del Login</label>
              <div className="flex gap-2 mt-1">
                <Button variant="outline" onClick={() => bgInputRef.current?.click()}>
                  {settings.backgroundUrl ? 'Cambiar Fondo' : 'Subir Fondo'}
                </Button>
                {settings.backgroundUrl && (
                  <Button variant="destructive" size="sm" onClick={() => updateSettings({ backgroundUrl: null })}>
                    Quitar
                  </Button>
                )}
                <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'background')} />
              </div>
              {settings.backgroundUrl && (
                <img src={settings.backgroundUrl} alt="Fondo" className="w-32 h-20 object-cover rounded-lg mt-2 border border-border" />
              )}
            </div>
          </div>
        </div>
      )}

      {active === 'logo' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Logo del Negocio</h1>
          </div>
          <div className="glass-card p-6 max-w-lg space-y-6">
            <div className="flex flex-col items-center gap-4">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-32 h-32 object-cover rounded-2xl border-2 border-border" />
              ) : (
                <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                  <Image className="w-12 h-12" />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={() => logoInputRef.current?.click()}>
                  {settings.logoUrl ? 'Cambiar Logo' : 'Subir Logo'}
                </Button>
                {settings.logoUrl && (
                  <Button variant="destructive" onClick={() => updateSettings({ logoUrl: null })}>
                    Quitar Logo
                  </Button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'logo')} />
              <p className="text-sm text-muted-foreground text-center">El logo aparecerá en la pantalla de login y en la barra de navegación.</p>
            </div>
          </div>
        </div>
      )}

      {active === 'updates' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Canales de Actualización</h1>
          </div>
          <div className="glass-card p-6 max-w-lg space-y-6">
            <div>
              <label className="text-sm font-medium">Link de Telegram (Actualizaciones)</label>
              <div className="flex gap-2 mt-1">
                <Input value={telegramUrl} onChange={e => setTelegramUrl(e.target.value)} placeholder="https://t.me/..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Repositorio público de GitHub</label>
              <Input value={githubUpdatesUrl} onChange={e => setGithubUpdatesUrl(e.target.value)} placeholder="https://github.com/usuario/repositorio" />
              <p className="text-xs text-muted-foreground mt-2">La aplicación consultará las publicaciones de Releases cuando tenga internet.</p>
            </div>
            <Button onClick={() => {
              updateSettings({ telegramUrl: telegramUrl.trim(), githubUpdatesUrl: githubUpdatesUrl.trim() || null });
              toast.success('Canales de actualización guardados');
            }}>Guardar canales</Button>
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

      {active === 'admin' && (
        <div>
          <div className="page-header">
            <h1 className="page-title">Restablecer Administrador</h1>
          </div>
          <div className="glass-card p-6 max-w-md space-y-3">
            <p className="text-sm text-muted-foreground">
              Si el dueño olvidó su usuario o contraseña, esto devuelve la cuenta de administrador
              principal a las credenciales iniciales. Los productos, ventas y demás datos NO se borran.
            </p>
            <p className="text-sm font-medium">Usuario: <strong>admin</strong> — Contraseña: <strong>admin123</strong></p>
            <Button onClick={handleResetAdmin} className="w-full">Restablecer a admin / admin123</Button>
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
