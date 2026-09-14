import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface Step {
  title: string;
  body: string;
}

const ADMIN_STEPS: Step[] = [
  {
    title: '¡Bienvenido, Administrador!',
    body: 'Aquí controlas todo el negocio: productos, empleados, ventas y reportes. Te mostraremos lo básico en pocos pasos.',
  },
  {
    title: 'Panel',
    body: 'En "Panel" verás un resumen rápido de tus ventas, stock y empleados activos.',
  },
  {
    title: 'Productos',
    body: 'Crea, edita o elimina productos. Define precio de venta, precio de costo y cantidad en almacén para que estén disponibles para pasar a Stock de Venta.',
  },
  {
    title: 'Usuarios',
    body: 'Crea cuentas para tus empleados. En el celular puedes generar un QR de credenciales para que entren sin escribir la contraseña, Esto está en Ajustes',
  },
  {
    title: 'Entrada de Stock',
    body: 'Pasa productos del almacén al punto de venta. Solo lo que esté en stock se puede vender.',
  },
  {
    title: 'Cierre de Turno',
    body: 'Al terminar el turno se registran las ventas, el efectivo, las transferencias y el sistema cuadra el dinero automáticamente.',
  },
  {
    title: 'Reportes y Salarios',
    body: 'Consulta cuánto se vendió por fecha, empleado o producto, y mira cuánto se le ha pagado a cada uno.',
  },
  {
    title: 'Ajustes',
    body: 'Personaliza el tema, la fuente y el color de las letras. También activas o no el salario por porcentaje.',
  },
];

const EMPLOYEE_STEPS: Step[] = [
  {
    title: '¡Bienvenido!',
    body: 'Esta app te ayuda a llevar el control de tu turno: lo que vendes y lo que cobras.',
  },
  {
    title: 'Stock Disponible',
    body: 'Aquí ves qué productos puedes vender hoy y cuántos quedan.',
  },
  {
    title: 'Entrada de Stock',
    body: 'Aquí puedes pasar productos del almacén a tu punto de venta, para realizar el Cierre de Turno.',
  },
  {
    title: 'Cierre de Turno',
    body: 'Al terminar, registra lo vendido, el efectivo y las transferencias. (Si estás en el celular, genera un QR y pide al admin que lo escanee para sincronizar).',
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

  const finish = () => {
    localStorage.setItem(`tutorial_seen_${currentUser.id}`, '1');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {current.title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-foreground leading-relaxed py-2">{current.body}</p>

        <div className="flex items-center justify-center gap-1 my-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-primary w-4' : 'bg-muted'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" onClick={finish}>
            Saltar
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={first}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            {last ? (
              <Button size="sm" onClick={finish}>Terminar</Button>
            ) : (
              <Button size="sm" onClick={() => setStep(s => s + 1)}>
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
