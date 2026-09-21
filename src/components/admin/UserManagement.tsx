import React, { useEffect, useState } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { User } from '@/types';
import { isMobileDevice } from '@/lib/platform';
import QrDisplay from '@/components/QrDisplay';
import { buildBackup } from '@/lib/backup';
import { startEmployeeShare, stopEmployeeShare, type EmployeeLicenseGrant } from '@/lib/syncTransport';
import { getAdminLicenseGrant } from '@/pages/LicenseGate';
import { daysRemaining, readLinkedLicense } from '@/lib/employeeLicense';

export default function UserManagement() {
  const { users, addUser, updateUser, deleteUser, settings, products, stock, movements, reports } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'employee' as 'employee' | 'admin', salaryPercent: '', passwordHint: '' });
  const [qrUser, setQrUser] = useState<User | null>(null);
  const [qrMode, setQrMode] = useState<'h24' | 'admin' | 'permanent'>('h24');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const mobile = isMobileDevice();

  const visibleUsers = users.filter(u => u.role !== 'dev');
  // El primer administrador creado no puede perder su rol (protección anti-lockout).
  const firstAdminId = [...users]
    .filter(u => u.role === 'admin')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.id;
  const isProtectedAdmin = editing && editing.id === firstAdminId;

  // Expiración de la licencia del admin (para el modo "igual que la del admin").
  const adminGrant = getAdminLicenseGrant();
  const adminDays = adminGrant?.expiresAt ? Math.max(1, Math.ceil((adminGrant.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))) : null;

  // Un solo QR: licencia elegida + cuenta del empleado + SUS datos (nunca los de otros).
  useEffect(() => {
    if (!qrUser) {
      setQrPayload(null);
      setQrError(null);
      void stopEmployeeShare();
      return;
    }
    let cancelled = false;
    setQrPayload(null);
    setQrError(null);

    const license: EmployeeLicenseGrant = qrMode === 'h24'
      ? { mode: 'h24', issuedAt: Date.now() }
      : qrMode === 'admin'
        ? { mode: 'admin', expiresAt: adminGrant?.expiresAt ?? null, issuedAt: Date.now() }
        : { mode: 'permanent', issuedAt: Date.now() };

    // SEGURIDAD: el respaldo solo lleva al usuario destino (nunca admins ni otros empleados).
    const targetOnly = users.filter(u => u.id === qrUser.id && u.role !== 'admin' && u.role !== 'dev');

    startEmployeeShare({
      v: 3,
      account: {
        u: qrUser.username,
        p: qrUser.password,
        n: qrUser.name,
        r: 'employee',
        s: qrUser.salaryPercent ?? settings.defaultSalaryPercent ?? 2,
        h: qrUser.passwordHint ?? null,
      },
      license,
      backup: buildBackup({ products, stock, movements, users: targetOnly, reports, settings }),
    })
      .then(code => { if (!cancelled) setQrPayload(code); })
      .catch(err => {
        if (!cancelled) setQrError(err instanceof Error ? err.message : 'No se pudo preparar el QR.');
      });
    return () => { cancelled = true; };
  }, [qrUser, qrMode, products, stock, movements, users, reports, settings]);

  const openNew = () => {
    setEditing(null);
    setForm({ username: '', password: '', name: '', role: 'employee', salaryPercent: String(settings.defaultSalaryPercent || 2), passwordHint: '' });
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, password: u.password, name: u.name, role: u.role as 'employee' | 'admin', salaryPercent: String(u.salaryPercent ?? settings.defaultSalaryPercent ?? 2), passwordHint: u.passwordHint ?? '' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.username || !form.password || !form.name) return;
    // Nunca degradar al primer admin
    const safeRole = editing && editing.id === firstAdminId ? 'admin' : form.role;
    const userData = { ...form, role: safeRole, salaryPercent: Number(form.salaryPercent) || 2, passwordHint: form.passwordHint.trim() || null };
    if (editing) {
      updateUser({ ...editing, ...userData });
    } else {
      addUser(userData);
    }
    setDialogOpen(false);
  };

  const currentEmployeeDays = qrUser ? (() => {
    const linked = readLinkedLicense();
    if (!linked || linked.username !== qrUser.username || linked.expiresAt === null) return null;
    return daysRemaining(linked);
  })() : null;

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Gestión de Usuarios</h1>
          <HelpTip>Crea y administra cuentas. Puedes configurar el porcentaje de salario individual y la posición de la barra de navegación.</HelpTip>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <div className="glass-card p-6">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              {settings.salaryByPercentEnabled && <th>Salario %</th>}
              <th>Fecha Creación</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map(u => (
              <tr key={u.id}>
                <td className="font-medium">{u.name}</td>
                <td className="text-muted-foreground">@{u.username}</td>
                <td>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
                  }`}>
                    {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                  </span>
                </td>
                {settings.salaryByPercentEnabled && (
                  <td className="text-success font-medium">{u.salaryPercent ?? settings.defaultSalaryPercent ?? 2}%</td>
                )}
                <td className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setQrUser(u)} title="QR de activación">
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {u.role !== 'admin' && (
                    <Button variant="ghost" size="sm" onClick={() => deleteUser(u.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nombre Completo</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Usuario</label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Contraseña</label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoCapitalize="none" spellCheck={false} />
            </div>
            <div>
              <label className="text-sm font-medium">Nota para recordar la contraseña (opcional)</label>
              <Input
                value={form.passwordHint}
                onChange={e => setForm({ ...form, passwordHint: e.target.value })}
                placeholder="Ej: el nombre de mi primer perro"
              />
              <p className="text-xs text-muted-foreground mt-1">No escribas la contraseña: solo una pista para recordarla.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as 'employee' | 'admin' })}
                disabled={!!isProtectedAdmin}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
              {isProtectedAdmin && (
                <p className="text-xs text-warning mt-1">
                  🔒 Este es el administrador principal — su rol no se puede cambiar (protección contra bloqueo).
                </p>
              )}
            </div>
            {settings.salaryByPercentEnabled && (
              <div>
                <label className="text-sm font-medium">Porcentaje de Salario (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.salaryPercent}
                  onChange={e => setForm({ ...form, salaryPercent: e.target.value })}
                />
              </div>
            )}
            <Button onClick={handleSave} className="w-full">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrUser} onOpenChange={(o) => !o && setQrUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-center">Credenciales por QR</DialogTitle>
          </DialogHeader>
          {qrUser && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-full space-y-1">
                <label className="text-sm font-medium">Licencia que recibirá {qrUser.name}:</label>
                <select
                  value={qrMode}
                  onChange={e => setQrMode(e.target.value as 'h24' | 'admin' | 'permanent')}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="h24">Solo 24 horas</option>
                  <option value="admin" disabled={!adminGrant}>
                    {adminGrant
                      ? adminGrant.expiresAt === null
                        ? 'Igual que la mía (permanente)'
                        : `Igual que la mía (${adminDays} día${adminDays === 1 ? '' : 's'} restantes)`
                      : 'Igual que la mía (sin licencia activa)'}
                  </option>
                  <option value="permanent">Permanente</option>
                </select>
                {currentEmployeeDays !== null && (
                  <p className="text-xs text-muted-foreground">
                    Este empleado ya tiene licencia por ~{currentEmployeeDays} día(s). Escanear nunca la acorta.
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Que <strong>{qrUser.name}</strong> escanee este QR desde la pantalla de
                <strong> Activación</strong> en su celular. Recibirá su cuenta y todos los datos.
                Sin internet: por Wi-Fi local o WiFi Direct.
              </p>
              <div className="bg-white p-3 rounded-lg min-h-[240px] min-w-[240px] flex items-center justify-center">
                {qrPayload
                  ? <QrDisplay data={qrPayload} size={240} />
                  : <span className="text-xs text-black/60 text-center px-4">{qrError ?? 'Preparando…'}</span>}
              </div>
              <div className="text-xs text-muted-foreground text-center">
                Usuario: <code className="bg-secondary px-1 rounded">{qrUser.username}</code>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
