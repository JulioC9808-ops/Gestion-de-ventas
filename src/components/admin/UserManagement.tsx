import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { User } from '@/types';

export default function UserManagement() {
  const { users, addUser, updateUser, deleteUser } = useData();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', name: '', role: 'employee' as const });

  const visibleUsers = users.filter(u => u.role !== 'dev');

  const openNew = () => {
    setEditing(null);
    setForm({ username: '', password: '', name: '', role: 'employee' });
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({ username: u.username, password: u.password, name: u.name, role: u.role as 'employee' });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.username || !form.password || !form.name) return;
    if (editing) {
      updateUser({ ...editing, ...form });
    } else {
      addUser(form);
    }
    setDialogOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de Usuarios</h1>
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
                <td className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="text-right">
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
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Rol</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as 'employee' })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="employee">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Guardar' : 'Crear'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
