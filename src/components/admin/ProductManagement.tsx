import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Product } from '@/types';

export default function ProductManagement() {
  const { products, addProduct, updateProduct, deleteProduct } = useData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', price: '', category: '', unit: '' });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', price: '', category: '', unit: '' });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), category: p.category, unit: p.unit });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    if (editing) {
      updateProduct({ ...editing, name: form.name, price: Number(form.price), category: form.category, unit: form.unit });
    } else {
      addProduct({ name: form.name, price: Number(form.price), category: form.category, unit: form.unit });
    }
    setDialogOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Gestión de Productos</h1>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Producto
        </Button>
      </div>

      <div className="glass-card p-6">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar productos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Precio</th>
              <th>Categoría</th>
              <th>Unidad</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td>
                <td>${p.price.toFixed(2)}</td>
                <td>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {p.category}
                  </span>
                </td>
                <td className="text-muted-foreground">{p.unit}</td>
                <td className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteProduct(p.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No se encontraron productos.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Precio</label>
              <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Categoría</label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium">Unidad</label>
              <Input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Guardar Cambios' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
