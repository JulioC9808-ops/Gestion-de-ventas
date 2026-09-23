import React, { useEffect, useState, useRef } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, QrCode, Image as ImageIcon, Camera, Trash2, Eye, EyeOff } from 'lucide-react';
import AnimatedTrash from '@/components/ui/animated-trash';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { User } from '@/types';
import { isMobileDevice } from '@/lib/platform';
import QrDisplay from '@/components/QrDisplay';
import { buildBackup } from '@/lib/backup';
import { startEmployeeShare, stopEmployeeShare, type EmployeeLicenseGrant } from '@/lib/syncTransport';
import { getAdminLicenseGrant } from '@/pages/LicenseGate';
import { daysRemaining, readLinkedLicense } from '@/lib/employeeLicense';
import { fileToCompressedDataUrl } from '@/lib/imageUtils';
import { playTrashSound } from '@/lib/soundUtils';
import { toast } from 'sonner';

export default function UserManagement() {
  const { users, addUser, updateUser, deleteUser, settings, products, stock, movements, reports } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'employee' as 'employee' | 'admin',
    salaryPercent: '',
    passwordHint: '',
    avatarUrl: null as string | null,
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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
  const isAdminPermanent = adminGrant && adminGrant.expiresAt === null;
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

    // Si el admin no tiene licencia permanente, el empleado no puede recibir permanente
    const effectiveMode = (!isAdminPermanent && qrMode === 'permanent') ? 'admin' : qrMode;

    const license: EmployeeLicenseGrant = effectiveMode === 'h24'
      ? { mode: 'h24', issuedAt: Date.now() }
      : effectiveMode === 'admin'
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
  }, [qrUser, qrMode, products, stock, movements, users, reports, settings, adminGrant?.expiresAt, isAdminPermanent]);

  const openNew = () => {
    setEditing(null);
    setForm({
      username: '',
      password: '',
      name: '',
      role: 'employee',
      salaryPercent: String(settings.defaultSalaryPercent || 2),
      passwordHint: '',
      avatarUrl: null,
    });
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.role as 'employee' | 'admin',
      salaryPercent: String(u.salaryPercent ?? settings.defaultSalaryPercent ?? 2),
      passwordHint: u.passwordHint ?? '',
      avatarUrl: u.avatarUrl ?? null,
    });
    setDialogOpen(true);
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      // Máxima calidad y nitidez 4K
      const dataUrl = await fileToCompressedDataUrl(file, 3840);
      setForm(prev => ({ ...prev, avatarUrl: dataUrl }));
      toast.success('Foto cargada en máxima calidad');
    } catch {
      toast.error('Error al procesar la foto');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = () => {
    if (!form.username || !form.password || !form.name) return;
    // Nunca degradar al primer admin
    const safeRole = editing && editing.id === firstAdminId ? 'admin' : form.role;
    const userData = {
      ...form,
      role: safeRole,
      salaryPercent: Number(form.salaryPercent) || 2,
      passwordHint: form.passwordHint.trim() || null,
      avatarUrl: form.avatarUrl,
    };
    if (editing) {
      updateUser({ ...editing, ...userData });
      toast.success('Usuario actualizado');
    } else {
      addUser(userData);
      toast.success('Usuario creado');
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

      <div className="glass-card p-4 sm:p-6">
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre y Usuario</th>
                <th>Rol</th>
                {settings.salaryByPercentEnabled && <th>Salario %</th>}
                <th className="hidden sm:table-cell">Fecha Creación</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">
                    <div className="flex items-center gap-3">
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={u.name}
                          className="w-9 h-9 rounded-full object-cover border border-border shadow-sm ring-1 ring-primary/20 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                          {u.name.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground text-sm leading-tight">{u.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
                    }`}>
                      {u.role === 'admin' ? 'Administrador' : 'Empleado'}
                    </span>
                  </td>
                  {settings.salaryByPercentEnabled && (
                    <td className="text-success font-semibold">{u.salaryPercent ?? settings.defaultSalaryPercent ?? 2}%</td>
                  )}
                  <td className="text-sm text-muted-foreground hidden sm:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setQrUser(u)} title="QR de activación">
                      <QrCode className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {u.role !== 'admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          playTrashSound();
                          deleteUser(u.id);
                        }}
                        className="group text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar usuario"
                      >
                        <AnimatedTrash className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-6 pr-3 sm:pr-6">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2 pb-2">
            {/* Foto de perfil */}
            <div className="flex flex-col items-center gap-2 pb-2 border-b border-border/50">
              <div className="relative group">
                {form.avatarUrl ? (
                  <img
                    src={form.avatarUrl}
                    alt="Foto de perfil"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-secondary/80 border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="w-6 h-6 mb-1 opacity-60" />
                    <span className="text-[10px]">Sin foto</span>
                  </div>
                )}
                {form.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      playTrashSound();
                      setForm(prev => ({ ...prev, avatarUrl: null }));
                    }}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:scale-110 transition-transform"
                    title="Eliminar foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  {form.avatarUrl ? 'Cambiar Foto' : 'Cargar Foto de Perfil'}
                </Button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Se mostrará en la barra superior y lateral durante su sesión. Máxima calidad.
              </p>
            </div>

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
              <div className="relative mt-1">
                <Input
                  type="text"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  autoCapitalize="none"
                  spellCheck={false}
                  className={`pr-10 ${
                    !showPasswordModal && form.password ? 'threads-obfuscated' : 'threads-revealed'
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPasswordModal ? 'Ocultar contraseña' : 'Ver contraseña'}
                  onClick={() => setShowPasswordModal(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors p-1"
                >
                  {showPasswordModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              <div className="space-y-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
                <label className="text-sm font-medium">Porcentaje de Salario (1% al 7%)</label>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map(pct => {
                    const isSelected = Number(form.salaryPercent) === pct;
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setForm({ ...form, salaryPercent: String(pct) })}
                        className={`h-9 rounded-lg font-bold text-xs transition-all border ${
                          isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                            : 'bg-card text-foreground border-border hover:border-primary/50'
                        }`}
                      >
                        {pct}%
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Valor:</span>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    step="0.5"
                    value={form.salaryPercent}
                    onChange={e => setForm({ ...form, salaryPercent: e.target.value })}
                    className="w-20 h-8 text-center font-bold text-xs"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
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
                  <option value="permanent" disabled={!isAdminPermanent}>
                    {isAdminPermanent
                      ? 'Permanente'
                      : 'Permanente (Bloqueado: tu cuenta tiene licencia mensual)'}
                  </option>
                </select>
                {!isAdminPermanent && qrMode === 'permanent' && (
                  <p className="text-xs text-destructive">
                    Como tu cuenta de administrador tiene licencia mensual, solo puedes transferir licencias de 24h o mensuales.
                  </p>
                )}
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
