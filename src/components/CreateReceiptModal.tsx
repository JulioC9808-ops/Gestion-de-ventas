import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { Printer, Plus, Trash2, Receipt, Percent, DollarSign, CreditCard, User, Building, Clock, ShoppingBag, Image as ImageIcon, Check } from 'lucide-react';
import { toast } from 'sonner';
import { triggerHaptic } from '@/lib/haptics';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export default function CreateReceiptModal({ open, onClose }: Props) {
  const { products, settings, updateSettings } = useData();
  const { currentUser } = useAuth();

  // Logo actual del negocio (predeterminado y persistente)
  const savedReceiptLogo = typeof window !== 'undefined' ? localStorage.getItem('gv_receipt_default_logo') : null;
  const businessLogo =
    savedReceiptLogo || settings.logoUrl || ((settings as Record<string, unknown>).logo as string) || null;

  const [includeLogo, setIncludeLogo] = useState<boolean>(() => {
    const pref = typeof window !== 'undefined' ? localStorage.getItem('gv_receipt_include_logo') : null;
    if (pref !== null) return pref === '1';
    return Boolean(businessLogo);
  });
  const [customLogoUrl, setCustomLogoUrl] = useState<string>(() => savedReceiptLogo || '');

  const activeLogoDisplay = customLogoUrl || businessLogo;

  const handleToggleIncludeLogo = () => {
    setIncludeLogo(prev => {
      const next = !prev;
      localStorage.setItem('gv_receipt_include_logo', next ? '1' : '0');
      return next;
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 360;
        const maxH = 160;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/png');
          setCustomLogoUrl(compressed);
          setIncludeLogo(true);
          localStorage.setItem('gv_receipt_default_logo', compressed);
          localStorage.setItem('gv_receipt_include_logo', '1');
          updateSettings({ logoUrl: compressed });
          toast.success('Logo guardado como predeterminado para tus comprobantes');
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Encabezado del comprobante
  const [businessName, setBusinessName] = useState(() => settings.businessName || 'Mi Negocio');
  const [attendantName, setAttendantName] = useState(() => {
    if (currentUser?.role === 'admin') {
      return currentUser.name ? `${currentUser.name} (Admin)` : 'Administrador';
    }
    return currentUser?.name || 'Vendedor';
  });
  const [notes, setNotes] = useState('¡Gracias por su compra!');

  // Lista de productos en el comprobante
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customName, setCustomName] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState<number | ''>('');

  // Forma de pago y % transferencia (solo Efectivo, Transferencia y %)
  const [cashAmount, setCashAmount] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferPercent, setTransferPercent] = useState<string>(''); // % opcional

  // Subtotal base
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  }, [items]);

  // Recargo por transferencia si se especifica porcentaje (> 0)
  const transferFee = useMemo(() => {
    const pct = parseFloat(transferPercent);
    if (!isNaN(pct) && pct > 0) {
      const transAmt = parseFloat(transferAmount);
      const base = !isNaN(transAmt) && transAmt > 0 ? transAmt : subtotal;
      return Math.round((base * pct) / 100);
    }
    return 0;
  }, [subtotal, transferAmount, transferPercent]);

  const total = subtotal + transferFee;

  // Cálculo de vuelto si el total entregado supera el costo
  const changeDue = useMemo(() => {
    const cash = parseFloat(cashAmount) || 0;
    const transfer = parseFloat(transferAmount) || 0;
    const totalPaid = cash + transfer;
    if (cash > 0 && totalPaid > total) {
      return totalPaid - total;
    }
    return 0;
  }, [cashAmount, transferAmount, total]);

  // Agregar producto desde el catálogo
  const handleAddCatalogProduct = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => p.id === selectedProductId);
    if (!prod) return;

    setItems(prev => {
      const existsIndex = prev.findIndex(i => i.name.toLowerCase() === prod.name.toLowerCase() && i.unitPrice === prod.price);
      if (existsIndex >= 0) {
        const copy = [...prev];
        copy[existsIndex] = { ...copy[existsIndex], quantity: copy[existsIndex].quantity + 1 };
        return copy;
      }
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          name: prod.name,
          quantity: 1,
          unitPrice: prod.price,
        },
      ];
    });

    triggerHaptic('selection');
    setSelectedProductId('');
  };

  // Agregar ítem manual / libre
  const handleAddCustomItem = () => {
    const trimmed = customName.trim();
    const priceNum = typeof customPrice === 'number' ? customPrice : parseFloat(String(customPrice));

    if (!trimmed) {
      toast.error('Ingresa una descripción o nombre para el producto');
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Ingresa un precio válido');
      return;
    }

    setItems(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: trimmed,
        quantity: Math.max(1, customQty || 1),
        unitPrice: priceNum,
      },
    ]);

    triggerHaptic('selection');
    setCustomName('');
    setCustomQty(1);
    setCustomPrice('');
  };

  const handleUpdateItemQty = (id: string, delta: number) => {
    setItems(prev =>
      prev
        .map(item => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as ReceiptItem[]
    );
    triggerHaptic('selection');
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    triggerHaptic('selection');
  };

  // Función para imprimir el comprobante térmico / estándar
  const handlePrint = () => {
    if (items.length === 0) {
      toast.error('Agrega al menos un producto al comprobante antes de imprimir.');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión. Habilita las ventanas emergentes.');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const effectiveLogo = customLogoUrl || businessLogo;
    const logoHtml = includeLogo && effectiveLogo
      ? `<div style="text-align:center; margin-bottom: 10px;">
          <img src="${effectiveLogo}" alt="Logo" id="ticket-logo" style="max-height: 70px; max-width: 160px; object-fit: contain; display: block; margin: 0 auto;" />
         </div>`
      : '';

    const pctNum = parseFloat(transferPercent);
    const hasTransferFee = !isNaN(pctNum) && pctNum > 0 && transferFee > 0;
    const numCash = parseFloat(cashAmount) || 0;
    const numTransfer = parseFloat(transferAmount) || 0;

    const itemsRows = items
      .map(
        i => `
        <tr>
          <td style="padding: 3px 0; text-align: left; vertical-align: top;">
            <div style="font-weight: bold;">${i.name}</div>
            <div style="font-size: 11px; color: #555;">${i.quantity} x $${i.unitPrice.toLocaleString('es-ES')}</div>
          </td>
          <td style="padding: 3px 0; text-align: right; vertical-align: top; font-weight: bold;">
            $${(i.quantity * i.unitPrice).toLocaleString('es-ES')}
          </td>
        </tr>
      `
      )
      .join('');

    const paymentRowsHtml =
      numCash > 0 && numTransfer > 0
        ? `
        <div class="row">
          <span>Efectivo:</span>
          <span class="bold">$${numCash.toLocaleString('es-ES')} CUP</span>
        </div>
        <div class="row">
          <span>Transferencia:</span>
          <span class="bold">$${numTransfer.toLocaleString('es-ES')} CUP</span>
        </div>
      `
        : numTransfer > 0
        ? `
        <div class="row">
          <span>Pago:</span>
          <span class="bold">Transferencia ($${numTransfer.toLocaleString('es-ES')} CUP)</span>
        </div>
      `
        : numCash > 0
        ? `
        <div class="row">
          <span>Pago:</span>
          <span class="bold">Efectivo ($${numCash.toLocaleString('es-ES')} CUP)</span>
        </div>
      `
        : `
        <div class="row">
          <span>Pago:</span>
          <span class="bold">Efectivo</span>
        </div>
      `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante de Venta - ${businessName}</title>
        <style>
          @page {
            margin: 0;
            size: auto;
          }
          body {
            font-family: 'Courier New', Courier, monospace, monospace;
            width: 78mm;
            max-width: 100%;
            margin: 0 auto;
            padding: 12px 10px;
            color: #000;
            background: #fff;
            font-size: 12px;
            line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 8px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .total-row {
            font-size: 15px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="center">
          ${logoHtml}
          <div style="font-size: 16px; font-weight: bold; text-transform: uppercase;">${businessName}</div>
          <div style="font-size: 11px; margin-top: 2px;">COMPROBANTE DE COMPRA</div>
        </div>

        <div class="divider"></div>

        <div class="row">
          <span>Fecha: ${dateStr}</span>
          <span>Hora: ${timeStr}</span>
        </div>
        <div class="row">
          <span>Atendido por:</span>
          <span class="bold">${attendantName}</span>
        </div>
        ${paymentRowsHtml}

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 11px;">
              <th style="text-align: left; padding-bottom: 3px;">DESCRIPCIÓN</th>
              <th style="text-align: right; padding-bottom: 3px;">IMPORTE</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="divider"></div>

        ${
          hasTransferFee
            ? `
          <div class="row">
            <span>Subtotal:</span>
            <span>$${subtotal.toLocaleString('es-ES')} CUP</span>
          </div>
          <div class="row">
            <span>Recargo Transferencia (${transferPercent}%):</span>
            <span>+$${transferFee.toLocaleString('es-ES')} CUP</span>
          </div>
        `
            : ''
        }

        <div class="total-row">
          <span>TOTAL:</span>
          <span>$${total.toLocaleString('es-ES')} CUP</span>
        </div>

        ${
          changeDue > 0
            ? `
          <div class="divider"></div>
          <div class="row bold">
            <span>Cambio / Vuelto:</span>
            <span>$${changeDue.toLocaleString('es-ES')} CUP</span>
          </div>
        `
            : ''
        }

        <div class="double-divider"></div>

        <div class="center" style="margin-top: 10px; font-size: 12px; font-weight: bold;">
          ${notes}
        </div>
        <div class="center" style="margin-top: 4px; font-size: 10px; color: #666;">
          Conserve este comprobante
        </div>

        <script>
          function doPrint() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 800);
          }
          window.addEventListener('load', function() {
            var logo = document.getElementById('ticket-logo');
            if (logo) {
              if (logo.complete && logo.naturalHeight !== 0) {
                setTimeout(doPrint, 250);
              } else {
                logo.onload = function() { setTimeout(doPrint, 250); };
                logo.onerror = function() { doPrint(); };
                setTimeout(doPrint, 2500);
              }
            } else {
              setTimeout(doPrint, 150);
            }
          });
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    triggerHaptic('success');
    toast.success('Comprobante enviado a imprimir');
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card/60 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-bold">
                  Crear Comprobante de Venta (Opcional)
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Genera e imprime un comprobante o ticket personalizado para entregar al cliente.
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {/* Configuración de Logo e Identidad */}
          <div className="p-3.5 rounded-xl border border-border bg-card/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-14 h-14 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                {activeLogoDisplay ? (
                  <img
                    src={activeLogoDisplay}
                    alt="Logo del negocio"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
                )}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Logo del Negocio</span>
                  {activeLogoDisplay ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-semibold">
                      Disponible
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                      Sin logo
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {includeLogo ? 'Se incluirá en el encabezado del comprobante' : 'Omitido en la impresión'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {activeLogoDisplay && (
                <button
                  type="button"
                  onClick={handleToggleIncludeLogo}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all ${
                    includeLogo
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border bg-muted/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {includeLogo ? '✓ Imprimir Logo' : 'Omitir Logo'}
                </button>
              )}

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center text-xs px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted font-semibold text-foreground transition-colors">
                  <ImageIcon className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  {activeLogoDisplay ? 'Cambiar Logo' : 'Subir Logo'}
                </span>
              </label>
            </div>
          </div>

          {/* Datos del encabezado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-card/40">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-primary" /> Nombre del Negocio
              </label>
              <Input
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Nombre del local"
                className="h-8 text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" /> Atendido por
              </label>
              <Input
                value={attendantName}
                onChange={e => setAttendantName(e.target.value)}
                placeholder="Nombre del dependiente / vendedor"
                className="h-8 text-xs font-medium"
              />
            </div>
          </div>

          {/* Agregar productos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-primary" /> Productos del Comprobante
              </h3>
              <span className="text-xs text-muted-foreground">
                {items.length} producto(s) en lista
              </span>
            </div>

            {/* Selector de catálogo */}
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Seleccionar producto del menú / inventario --</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price.toLocaleString()} CUP)
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handleAddCatalogProduct}
                disabled={!selectedProductId}
                className="h-9 px-3 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Añadir
              </Button>
            </div>

            {/* O agregar ítem personalizado */}
            <div className="p-3 rounded-xl border border-dashed border-border/80 bg-muted/20 space-y-2">
              <p className="text-[11px] font-semibold text-muted-foreground">
                O agregar ítem / concepto manual:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <Input
                  placeholder="Descripción (ej. Café con leche especial)"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  className="sm:col-span-6 h-8 text-xs"
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Cant."
                  value={customQty}
                  onChange={e => setCustomQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="sm:col-span-2 h-8 text-xs"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Precio ($)"
                  value={customPrice}
                  onChange={e => setCustomPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="sm:col-span-2 h-8 text-xs font-semibold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCustomItem}
                  className="sm:col-span-2 h-8 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </div>

            {/* Tabla de ítems añadidos */}
            {items.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                No hay productos agregados todavía. Selecciona un producto del menú o escribe uno manual.
              </div>
            ) : (
              <div className="border border-border rounded-xl overflow-hidden bg-card/50">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                    <tr>
                      <th className="py-2 px-3 text-left">Producto</th>
                      <th className="py-2 px-3 text-center w-24">Cantidad</th>
                      <th className="py-2 px-3 text-right w-24">P. Unitario</th>
                      <th className="py-2 px-3 text-right w-24">Subtotal</th>
                      <th className="py-2 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-semibold text-foreground">{item.name}</td>
                        <td className="py-2 px-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-background border border-border rounded-md px-1.5 py-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, -1)}
                              className="text-muted-foreground hover:text-foreground font-bold px-1"
                            >
                              -
                            </button>
                            <span className="font-bold min-w-[16px] text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateItemQty(item.id, 1)}
                              className="text-muted-foreground hover:text-foreground font-bold px-1"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground">
                          ${item.unitPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-foreground">
                          ${(item.quantity * item.unitPrice).toLocaleString()}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Forma de Pago: Solo Efectivo, Transferencia y % */}
          <div className="p-4 rounded-xl border border-border bg-card/60 space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Forma de Pago</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Campo Efectivo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Efectivo ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Monto en efectivo"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
              </div>

              {/* Campo Transferencia */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-500" /> Transferencia ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Monto en transferencia"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="h-9 text-xs font-semibold"
                />
              </div>
            </div>

            {/* % de Transferencia */}
            <div className="pt-2 border-t border-border/60">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-primary" /> % de Transferencia (Opcional)
                  </span>
                  {transferFee > 0 && (
                    <span className="text-[11px] font-bold text-primary">
                      +${transferFee.toLocaleString('es-ES')} CUP
                    </span>
                  )}
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="Ej: 5 o 10 (vacío = no sale en la impresión)"
                  value={transferPercent}
                  onChange={e => setTransferPercent(e.target.value)}
                  className="h-8 text-xs font-medium"
                />
                <p className="text-[11px] text-muted-foreground">
                  {transferFee > 0
                    ? `Se aplicará un recargo del ${transferPercent}% por transferencia.`
                    : 'Si no pones porcentaje, no aparecerá en el comprobante impreso.'}
                </p>
              </div>
            </div>

            {/* Vuelto si el efectivo supera el total */}
            {changeDue > 0 && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Cambio / Vuelto al cliente:</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-display">
                  ${changeDue.toLocaleString('es-ES')} CUP
                </span>
              </div>
            )}

            <div className="space-y-1 pt-1">
              <label className="text-xs font-medium text-muted-foreground">
                Mensaje de pie de ticket:
              </label>
              <Input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="¡Gracias por su visita!"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Resumen Total */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Total del Comprobante
              </span>
              {transferFee > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Subtotal: ${subtotal.toLocaleString()} + Transf. (${transferPercent}%): ${transferFee.toLocaleString()}
                </p>
              )}
            </div>
            <span className="text-2xl font-display font-extrabold text-primary">
              ${total.toLocaleString()} <span className="text-xs font-normal text-foreground">CUP</span>
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 border-t border-border bg-card/60 flex items-center justify-between gap-3 shrink-0">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cerrar
          </Button>

          <Button
            type="button"
            onClick={handlePrint}
            disabled={items.length === 0}
            className="text-xs font-bold px-5 h-9 bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir Comprobante
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
