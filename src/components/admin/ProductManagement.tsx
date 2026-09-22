import React, { useState } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Search } from 'lucide-react';
import AnimatedTrash from '@/components/ui/animated-trash';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CATEGORY_OPTIONS, UNIT_OPTIONS, getCategoryEmoji } from '@/lib/catalog';
import { playTrashSound, playStockEntrySound } from '@/lib/soundUtils';
import type { Product } from '@/types';

export default function ProductManagement() {
  const { products, addProduct, updateProduct, deleteProduct, settings } = useData();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: '', price: '', costPrice: '', category: '', unit: '', inventoryQty: '' });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalProducts = products.length;
  const totalInventory = products.reduce((s, p) => s + (p.inventoryQty || 0), 0);
  const salaryPercent = settings.defaultSalaryPercent ?? 2;

  const getProfit = (p: Product) => {
    const cost = p.costPrice || 0;
    const salaryPerUnit = p.price * (salaryPercent / 100);
    return p.price - cost - salaryPerUnit;
  };
  const getProfitPercent = (p: Product) => (!p.price ? 0 : (getProfit(p) / p.price) * 100);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', price: '', costPrice: '', category: '', unit: '', inventoryQty: '' });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({ name: p.name, price: String(p.price), costPrice: String(p.costPrice || 0), category: p.category, unit: p.unit, inventoryQty: String(p.inventoryQty || 0) });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return;
    const data = {
      name: form.name,
      price: Number(form.price),
      costPrice: Number(form.costPrice) || 0,
      category: form.category || 'Otros',
      unit: form.unit || 'c/u',
      inventoryQty: Number(form.inventoryQty) || 0,
    };
    if (editing) updateProduct({ ...editing, ...data });
    else addProduct(data);
    playStockEntrySound();
    setDialogOpen(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Gestión de Productos</h1>
          <HelpTip>Agrega, edita y elimina productos del almacén. La cantidad se descuenta al mover al stock de venta. Ganancia = Precio − Costo − Salario({salaryPercent}%).</HelpTip>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Producto
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="stat-card text-center">
          <p className="text-sm text-muted-foreground">Total Productos</p>
          <p className="text-2xl font-bold font-display">{totalProducts}</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-sm text-muted-foreground">Total Unidades en Almacén</p>
          <p className="text-2xl font-bold font-display text-primary">{totalInventory}</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar productos..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Precio Venta</th>
                <th>Precio Costo</th>
                <th>Ganancia</th>
                <th>Categoría</th>
                <th>Unidad</th>
                <th>En Almacén</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const profit = getProfit(p);
                const profitPct = getProfitPercent(p);
                return (
                  <tr key={p.id}>
                    <td className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryEmoji(p.category)}</span>
                        {p.name}
                      </div>
                    </td>
                    <td>${p.price.toFixed(2)}</td>
                    <td className="text-muted-foreground">${(p.costPrice || 0).toFixed(2)}</td>
                    <td>
                      <span className={`font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>${profit.toFixed(2)}</span>
                      <span className="text-xs text-muted-foreground ml-1">({profitPct.toFixed(1)}%)</span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                        {getCategoryEmoji(p.category)} {p.category}
                      </span>
                    </td>
                    <td className="text-muted-foreground">{p.unit}</td>
                    <td>
                      <span className={`font-bold ${(p.inventoryQty || 0) <= 0 ? 'text-destructive' : 'text-primary'}`}>
                        {p.inventoryQty || 0}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar producto">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          playTrashSound();
                          deleteProduct(p.id);
                        }}
                        className="group text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar producto"
                      >
                        <AnimatedTrash className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron productos.</p>}
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Precio de Venta</label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Precio de Costo</label>
                <Input type="number" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
              </div>
            </div>
            {form.price && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p>Ganancia estimada: <span className="font-bold text-success">
                  ${(Number(form.price) - (Number(form.costPrice) || 0) - Number(form.price) * (salaryPercent / 100)).toFixed(2)}
                </span> por unidad (descontando {salaryPercent}% de salario)</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Categoría</label>
              <select
                value={CATEGORY_OPTIONS.some(c => c.value === form.category) ? form.category : ''}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mb-2"
              >
                <option value="">— Selecciona una categoría —</option>
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.value}</option>
                ))}
              </select>
              <Input
                placeholder="O escribe una categoría personalizada"
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                list="cat-list"
              />
              <datalist id="cat-list">
                {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value} />)}
              </datalist>
              <p className="text-xs text-muted-foreground mt-1">
                Se mostrará: <span className="text-base">{getCategoryEmoji(form.category)}</span> {form.category || 'Otros'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">Unidad</label>
              <select
                value={UNIT_OPTIONS.includes(form.unit) ? form.unit : ''}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm mb-2"
              >
                <option value="">— Selecciona una unidad —</option>
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <Input
                placeholder="O escribe una unidad personalizada"
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                list="unit-list"
              />
              <datalist id="unit-list">
                {UNIT_OPTIONS.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>

            <div>
              <label className="text-sm font-medium">Cantidad en Almacén</label>
              <Input type="number" min="0" value={form.inventoryQty} onChange={e => setForm({ ...form, inventoryQty: e.target.value })} />
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Guardar Cambios' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
