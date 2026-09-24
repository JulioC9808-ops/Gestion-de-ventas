import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Package,
  ArrowRightLeft,
  DollarSign,
  QrCode,
  BarChart3,
  Settings,
  Users,
  CheckCircle2,
  TrendingUp,
  Boxes,
  Smartphone,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  Layers,
  ShoppingBag,
  Store,
} from 'lucide-react';

interface TutorialStep {
  title: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  interactiveComponent: React.ComponentType;
}

// 1. Componente interactivo para Catálogo de Productos
function InteractiveProductDemo() {
  const [cost, setCost] = useState(45);
  const [price, setPrice] = useState(120);
  const [warehouseStock, setWarehouseStock] = useState(60);
  const profit = price - cost;
  const margin = price > 0 ? Math.round((profit / price) * 100) : 0;

  return (
    <div className="p-3.5 bg-card/90 border border-border/80 rounded-xl space-y-3">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
            ☕
          </div>
          <div>
            <div className="text-xs font-bold text-foreground">Café Bombón Especial</div>
            <div className="text-[10px] text-muted-foreground">Interactúa con los controles para probar:</div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
          +{margin}% Margen
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-muted/60 border border-border/40">
          <div className="text-[10px] text-muted-foreground">Costo</div>
          <div className="flex items-center justify-center gap-1 mt-1 font-mono font-bold">
            <button
              type="button"
              onClick={() => setCost(c => Math.max(5, c - 5))}
              className="w-5 h-5 rounded bg-background border flex items-center justify-center hover:bg-muted"
            >
              -
            </button>
            <span>${cost}</span>
            <button
              type="button"
              onClick={() => setCost(c => c + 5)}
              className="w-5 h-5 rounded bg-background border flex items-center justify-center hover:bg-muted"
            >
              +
            </button>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-muted/60 border border-border/40">
          <div className="text-[10px] text-muted-foreground">Venta</div>
          <div className="flex items-center justify-center gap-1 mt-1 font-mono font-bold text-primary">
            <button
              type="button"
              onClick={() => setPrice(p => Math.max(cost + 5, p - 10))}
              className="w-5 h-5 rounded bg-background border flex items-center justify-center hover:bg-muted"
            >
              -
            </button>
            <span>${price}</span>
            <button
              type="button"
              onClick={() => setPrice(p => p + 10)}
              className="w-5 h-5 rounded bg-background border flex items-center justify-center hover:bg-muted"
            >
              +
            </button>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <div className="text-[10px]">Ganancia</div>
          <div className="font-mono font-bold text-sm mt-1.5">+${profit} CUP</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 text-muted-foreground">
        <span>Almacén general:</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWarehouseStock(s => Math.max(0, s - 10))}
            className="px-1.5 py-0.5 rounded text-[10px] bg-muted border"
          >
            -10
          </button>
          <strong className="font-mono text-foreground">{warehouseStock} unidades</strong>
          <button
            type="button"
            onClick={() => setWarehouseStock(s => s + 10)}
            className="px-1.5 py-0.5 rounded text-[10px] bg-muted border"
          >
            +10
          </button>
        </div>
      </div>
    </div>
  );
}

// 2. Componente interactivo para Entrada de Stock
function InteractiveStockDemo() {
  const [warehouse, setWarehouse] = useState(120);
  const [turnStock, setTurnStock] = useState(25);
  const [lastAction, setLastAction] = useState<string | null>('+5 unidades transferidas');

  const transferToShift = (amount: number) => {
    if (warehouse < amount) return;
    setWarehouse(w => w - amount);
    setTurnStock(s => s + amount);
    setLastAction(`+${amount} unidades pasadas al stock de venta`);
  };

  const returnToWarehouse = (amount: number) => {
    if (turnStock < amount) return;
    setTurnStock(s => s - amount);
    setWarehouse(w => w + amount);
    setLastAction(`-${amount} unidades devueltas al almacén`);
  };

  return (
    <div className="p-3.5 bg-card/90 border border-border/80 rounded-xl space-y-3">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="p-2.5 rounded-xl bg-muted/60 border border-border/60">
          <div className="text-[10px] text-muted-foreground uppercase font-bold">📦 Almacén Central</div>
          <div className="text-xl font-bold font-mono text-foreground mt-1">{warehouse} u</div>
        </div>
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <div className="text-[10px] text-primary uppercase font-bold">🛍️ Stock en Barra / Venta</div>
          <div className="text-xl font-bold font-mono text-primary mt-1">{turnStock} u</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => returnToWarehouse(5)}
          disabled={turnStock < 5}
          className="text-xs h-8"
        >
          <Minus className="w-3.5 h-3.5 mr-1 text-destructive" /> Devolver 5
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => transferToShift(5)}
          disabled={warehouse < 5}
          className="text-xs h-8 font-semibold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1 text-primary-foreground" /> Pasar +5 a Venta
        </Button>
      </div>

      {lastAction && (
        <div className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
          ✓ {lastAction}
        </div>
      )}
    </div>
  );
}

// 3. Componente interactivo para Cierre de Turno
function InteractiveShiftCloseDemo() {
  const targetSales = 15000;
  const [cash, setCash] = useState(10000);
  const [transfer, setTransfer] = useState(5000);
  const totalCounted = cash + transfer;
  const diff = totalCounted - targetSales;

  return (
    <div className="p-3.5 bg-card/90 border border-border/80 rounded-xl space-y-3 font-mono text-xs">
      <div className="flex justify-between items-center bg-muted/40 p-2 rounded-lg border border-border/60">
        <span className="font-sans text-muted-foreground">Total Ventas Registradas:</span>
        <span className="font-bold text-foreground text-sm">${targetSales.toLocaleString()} CUP</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-muted-foreground text-[11px]">💵 Efectivo contado:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCash(c => Math.max(0, c - 500))}
              className="px-1.5 py-0.5 rounded bg-muted border font-sans"
            >
              -$500
            </button>
            <span className="font-bold w-16 text-right">${cash.toLocaleString()}</span>
            <button
              type="button"
              onClick={() => setCash(c => c + 500)}
              className="px-1.5 py-0.5 rounded bg-muted border font-sans"
            >
              +$500
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-sans text-muted-foreground text-[11px]">📱 Transferencias (EnZona/TM):</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTransfer(t => Math.max(0, t - 500))}
              className="px-1.5 py-0.5 rounded bg-muted border font-sans"
            >
              -$500
            </button>
            <span className="font-bold w-16 text-right">${transfer.toLocaleString()}</span>
            <button
              type="button"
              onClick={() => setTransfer(t => t + 500)}
              className="px-1.5 py-0.5 rounded bg-muted border font-sans"
            >
              +$500
            </button>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border flex justify-between items-center">
        <span className="font-sans font-semibold">Total Contado: ${totalCounted.toLocaleString()}</span>
        {diff === 0 ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px] font-sans">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> ¡Caja Cuadrada Exacta!
          </span>
        ) : diff > 0 ? (
          <span className="text-blue-500 font-bold text-[11px] font-sans">
            +${diff.toLocaleString()} (Sobrante)
          </span>
        ) : (
          <span className="text-destructive font-bold text-[11px] font-sans">
            -${Math.abs(diff).toLocaleString()} (Faltante)
          </span>
        )}
      </div>
    </div>
  );
}

// 4. Componente interactivo para Sincronización QR
function InteractiveQrDemo() {
  const [scanned, setScanned] = useState(false);

  return (
    <div className="p-3.5 bg-card/90 border border-border/80 rounded-xl space-y-3">
      <div className="flex items-center gap-3">
        <div
          onClick={() => setScanned(s => !s)}
          className="w-16 h-16 rounded-xl bg-foreground text-background flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform shadow-xs"
          title="Toca para simular escaneo"
        >
          <QrCode className="w-12 h-12" />
        </div>
        <div className="text-xs space-y-1">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-primary" /> Transferencia Instantánea
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Transmite cierres de turno de empleados o sincroniza la cafetería completa con otro administrador sin conexión a internet.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between p-2 rounded-lg bg-muted/60 border border-border/60 text-xs">
        <span className="text-muted-foreground">Estado del escáner:</span>
        <button
          type="button"
          onClick={() => setScanned(s => !s)}
          className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
            scanned
              ? 'bg-emerald-500 text-white shadow-xs'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          }`}
        >
          {scanned ? '✓ ¡Datos Sincronizados!' : '⚡ Simular Escaneo QR'}
        </button>
      </div>
    </div>
  );
}

// 5. Componente interactivo para Respaldo y Doble Copia .old
function InteractiveBackupDemo() {
  const [copied, setCopied] = useState(false);
  const [hasOld, setHasOld] = useState(true);

  return (
    <div className="p-3.5 bg-card/90 border border-border/80 rounded-xl space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span className="font-bold text-foreground">Doble Copia Protegida (.gvbak)</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
          Anti-manipulación
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 border border-border/40 font-mono text-[11px]">
          <span className="text-foreground">📄 backup_actual.gvbak</span>
          <span className="text-emerald-500 font-bold">● Reciente</span>
        </div>
        {hasOld && (
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/30 font-mono text-[11px] text-muted-foreground">
            <span>📦 backup_anterior.old.gvbak</span>
            <span className="text-amber-500 font-bold">● Respaldo .old</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-muted-foreground">Rotación automática cada día:</span>
        <button
          type="button"
          onClick={() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="text-[11px] font-semibold text-primary hover:underline"
        >
          {copied ? '✓ ¡Respaldo rotado!' : '🔄 Simular nueva rotación'}
        </button>
      </div>
    </div>
  );
}

const ADMIN_STEPS: TutorialStep[] = [
  {
    title: '¡Bienvenido a Gestión de Ventas!',
    badge: 'Inicio Rápido',
    description: 'Controla todo tu negocio desde un solo lugar: productos, inventario en almacén, ventas de tus empleados, salarios y cierres de turno exactos.',
    icon: Sparkles,
    interactiveComponent: () => (
      <div className="p-3 bg-card border border-border/80 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">☕</div>
            <div>
              <div className="text-xs font-bold text-foreground">Tu Cafetería / Negocio</div>
              <div className="text-[10px] text-emerald-500 font-medium">● Sistema Operativo y Listo</div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono font-bold">Admin</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 rounded-lg bg-muted/60 border border-border/50 text-center">
            <div className="text-[10px] text-muted-foreground">Ventas del Día</div>
            <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">$18,450 CUP</div>
          </div>
          <div className="p-2 rounded-lg bg-muted/60 border border-border/50 text-center">
            <div className="text-[10px] text-muted-foreground">Catálogo Activo</div>
            <div className="text-sm font-bold font-mono text-primary">24 Productos</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Catálogo de Productos y Precios',
    badge: 'Paso 1: Catálogo',
    description: 'Crea tus productos con costo y precio de venta. Define el stock disponible en almacén para suministrar a tus dependientes.',
    icon: Package,
    interactiveComponent: InteractiveProductDemo,
  },
  {
    title: 'Entrada de Stock al Turno',
    badge: 'Paso 2: Inventario',
    description: 'Pasa mercancía del almacén general al stock del turno para que los empleados puedan venderla. Todo queda registrado de forma auditable.',
    icon: ArrowRightLeft,
    interactiveComponent: InteractiveStockDemo,
  },
  {
    title: 'Cierre de Turno y Cuadre de Caja',
    badge: 'Paso 3: Cierre Diario',
    description: 'Al finalizar la jornada, ingresa el dinero en efectivo y transferencias (Transfermóvil/EnZona). El sistema calcula si la caja cuadra al centavo.',
    icon: DollarSign,
    interactiveComponent: InteractiveShiftCloseDemo,
  },
  {
    title: 'Sincronización QR sin Internet',
    badge: 'Paso 4: Conectividad',
    description: 'Tus empleados pueden emitir su cierre en un código QR para que lo escanees al instante, o sincronizar toda la cafetería con otro Administrador.',
    icon: QrCode,
    interactiveComponent: InteractiveQrDemo,
  },
  {
    title: 'Doble Copia de Seguridad y Ajustes',
    badge: 'Paso 5: Seguridad',
    description: 'Tus datos se respaldan con rotación (.gvbak y .old) con suma criptográfica para evitar cualquier pérdida o manipulación.',
    icon: ShieldCheck,
    interactiveComponent: InteractiveBackupDemo,
  },
];

const EMPLOYEE_STEPS: TutorialStep[] = [
  {
    title: '¡Bienvenido a tu Punto de Venta!',
    badge: 'Inicio Rápido',
    description: 'Esta aplicación te permite registrar tus ventas diarias, controlar las existencias de tu turno y realizar tu cierre de caja fácilmente.',
    icon: Sparkles,
    interactiveComponent: () => (
      <div className="p-3 bg-card border border-border/80 rounded-xl space-y-2 text-center">
        <div className="text-xs font-bold text-foreground">Turno Listo para Iniciar</div>
        <div className="text-[11px] text-muted-foreground">Todo lo que vendas se sumará y ordenará automáticamente.</div>
      </div>
    ),
  },
  {
    title: 'Entrada de Stock y Disponibilidad',
    badge: 'Stock de Venta',
    description: 'Consulta los productos disponibles para tu turno. Pasa las cantidades necesarias desde el almacén para comenzar a vender.',
    icon: Boxes,
    interactiveComponent: InteractiveStockDemo,
  },
  {
    title: 'Cierre de Turno y Entrega con QR',
    badge: 'Cierre Diario',
    description: 'Al finalizar tu turno, cuenta tu efectivo y transferencias. Genera tu código QR para que el administrador lo escanee y tu turno quede registrado.',
    icon: QrCode,
    interactiveComponent: InteractiveShiftCloseDemo,
  },
];

export default function Tutorial() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!currentUser || currentUser.role === 'dev') return;
    const key = `tutorial_seen_${currentUser.id}`;
    if (!localStorage.getItem(key)) {
      setStep(0);
      setOpen(true);
    }
  }, [currentUser]);

  if (!currentUser || currentUser.role === 'dev') return null;

  const steps = currentUser.role === 'admin' ? ADMIN_STEPS : EMPLOYEE_STEPS;
  const last = step >= steps.length - 1;
  const first = step === 0;
  const current = steps[step];
  const StepIcon = current.icon;
  const InteractiveView = current.interactiveComponent;

  const finish = () => {
    localStorage.setItem(`tutorial_seen_${currentUser.id}`, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {current.badge}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground font-semibold">
              Paso {step + 1} de {steps.length}
            </span>
          </div>
          <DialogTitle className="font-display font-bold text-base sm:text-lg flex items-center gap-2 pt-1 text-foreground">
            <StepIcon className="w-5 h-5 text-primary shrink-0" />
            {current.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {current.description}
          </DialogDescription>
        </DialogHeader>

        {/* Vista interactiva según el paso actual */}
        <div className="my-2.5 transition-all duration-300">
          <InteractiveView />
        </div>

        {/* Indicador de barra de progreso interactivo */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === step ? 'bg-primary w-6' : 'bg-muted-foreground/30 hover:bg-muted-foreground/60 w-2'
              }`}
              title={`Ir al paso ${i + 1}`}
            />
          ))}
        </div>

        {/* Botones de navegación */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
          <Button variant="ghost" size="sm" onClick={finish} className="text-xs text-muted-foreground">
            Saltar Guía
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={first}
              className="text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Anterior
            </Button>
            {last ? (
              <Button size="sm" onClick={finish} className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                ¡Entendido! Comenzar
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((s) => s + 1)} className="text-xs font-semibold">
                Siguiente <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
