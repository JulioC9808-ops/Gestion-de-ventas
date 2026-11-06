import React, { useState, useRef } from 'react';
import HelpTip from '@/components/HelpTip';
import { useData } from '@/contexts/DataContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Pencil, Search, Camera, Image as ImageIcon, X, LayoutGrid, List } from 'lucide-react';
import AnimatedTrash from '@/components/ui/animated-trash';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CATEGORY_OPTIONS, UNIT_OPTIONS, getCategoryEmoji } from '@/lib/catalog';
import { playTrashSound, playStockEntrySound } from '@/lib/soundUtils';
import { fileToCompressedDataUrl } from '@/lib/imageUtils';
import { toast } from 'sonner';
import type { Product } from '@/types';

export default function ProductManagement() {
  const { products, addProduct, updateProduct, deleteProduct, settings } = useData();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    costPrice: '',
    category: '',
    unit: '',
    inventoryQty: '',
    imageUrl: null as string | null,
  });

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
    setForm({ name: '', price: '', costPrice: '', category: '', unit: '', inventoryQty: '', imageUrl: null });
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      price: String(p.price),
      costPrice: String(p.costPrice || 0),
      category: p.category,
      unit: p.unit,
      inventoryQty: String(p.inventoryQty || 0),
      imageUrl: p.imageUrl || null,
    });
    setDialogOpen(true);
  };

  const handleProductImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      // Máxima calidad y nitidez sin deformación
      const dataUrl = await fileToCompressedDataUrl(file, 3840);
      setForm(prev => ({ ...prev, imageUrl: dataUrl }));
      toast.success('Imagen del producto cargada en máxima calidad');
    } catch {
      toast.error('Error al procesar la imagen del producto');
    } finally {
      setUploadingImage(false);
      // Reset input value so same file can be re-selected if desired
      if (e.target) e.target.value = '';
    }
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
      imageUrl: form.imageUrl || null,
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar productos por nombre o categoría..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="flex items-center gap-1 self-end sm:self-center bg-muted/60 p-1 rounded-lg border border-border/50 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Vista en cuadrícula"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cuadrícula</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Vista en tabla"
            >
              <List className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
          </div>
        </div>

        {/* Vista en Cuadrícula (predeterminada según la petición del usuario) */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => {
              const profit = getProfit(p);
              const profitPct = getProfitPercent(p);
              return (
                <div
                  key={p.id}
                  className="stat-card flex flex-col justify-between overflow-hidden group hover:border-primary/50 transition-all shadow-sm"
                >
                  {/* Foto del producto o emoji por defecto */}
                  {p.imageUrl ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-black/20 border border-border/40 mb-3 shrink-0 shadow-inner">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden bg-muted/20 border border-border/30 mb-3 flex items-center justify-center text-5xl select-none shrink-0 group-hover:scale-102 transition-transform">
                      <span>{getCategoryEmoji(p.category)}</span>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary text-secondary-foreground">
                        {getCategoryEmoji(p.category)} {p.category}
                      </span>
                      <span className="text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        ${p.price.toFixed(2)}/{p.unit}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-lg mb-1 flex items-center gap-2 text-foreground">
                      <span className="truncate">{p.name}</span>
                    </h3>

                    <div className="grid grid-cols-2 gap-2 text-xs py-2 my-2 border-y border-border/30">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Costo</span>
                        <span className="font-semibold text-muted-foreground">${(p.costPrice || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase">Ganancia</span>
                        <span className={`font-bold ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                          ${profit.toFixed(2)} ({profitPct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">En Almacén</span>
                      <span className={`text-xl font-bold ${(p.inventoryQty || 0) <= 0 ? 'text-destructive' : 'text-primary'}`}>
                        {p.inventoryQty || 0} <span className="text-xs font-normal text-muted-foreground">{p.unit}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} title="Editar producto" className="h-8 w-8 p-0">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el producto "${p.name}" del almacén? Esta acción es irreversible.`);
                          if (!confirmed) return;
                          playTrashSound();
                          deleteProduct(p.id);
                          toast.success(`Producto "${p.name}" eliminado del almacén.`);
                        }}
                        className="h-8 w-8 p-0 group text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Eliminar producto"
                      >
                        <AnimatedTrash className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Vista en Tabla */
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
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover border border-border shadow-xs shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted/60 border border-border/50 flex items-center justify-center text-xl shrink-0">
                            {getCategoryEmoji(p.category)}
                          </div>
                        )}
                        <span className="font-semibold text-foreground">{p.name}</span>
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
                          const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el producto "${p.name}" del almacén? Esta acción es irreversible.`);
                          if (!confirmed) return;
                          playTrashSound();
                          deleteProduct(p.id);
                          toast.success(`Producto "${p.name}" eliminado del almacén.`);
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
        )}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">No se encontraron productos.</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Pizza Napolitana" />
            </div>

            {/* Selector de Imagen del Producto para Administrador */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Imagen del Producto</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProductImageFile}
              />
              {form.imageUrl ? (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-border bg-muted/30">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border/80 bg-black/40 shrink-0 shadow-xs">
                    <img
                      src={form.imageUrl}
                      alt="Vista previa del producto"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">Foto en máxima calidad</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Sin deformación • Sincronizable con todos los dispositivos</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage}
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-xs px-2.5"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1 text-primary" />
                        Cambiar imagen
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={uploadingImage}
                        onClick={() => setForm(prev => ({ ...prev, imageUrl: null }))}
                        className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Quitar
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/40 transition-all text-sm font-medium text-foreground cursor-pointer group"
                >
                  <span className="text-xl">📷</span>
                  <span className="font-semibold text-primary group-hover:underline">Añadir imagen del Producto</span>
                  <span className="text-xs text-muted-foreground">(Galería o Archivo)</span>
                </button>
              )}
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
            <Button onClick={handleSave} className="w-full" disabled={uploadingImage}>{editing ? 'Guardar Cambios' : 'Agregar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
