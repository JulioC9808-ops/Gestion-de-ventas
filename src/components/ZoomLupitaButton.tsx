import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { applyScale, saveScale, getSavedScale, getCurrentScale } from '@/lib/pinchZoom';
import { triggerHaptic } from '@/lib/haptics';
import { toast } from 'sonner';

export default function ZoomLupitaButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState<number>(() => {
    return typeof window !== 'undefined' ? getCurrentScale() || getSavedScale() : 1.0;
  });

  useEffect(() => {
    if (open) {
      setScale(getCurrentScale() || getSavedScale());
    }
  }, [open]);

  const handleUpdateScale = (newScale: number) => {
    const clamped = Math.max(0.70, Math.min(1.35, Math.round(newScale * 100) / 100));
    setScale(clamped);
    applyScale(clamped, false);
    saveScale(clamped);
    triggerHaptic('light');
  };

  const handleReset = () => {
    handleUpdateScale(1.0);
    toast.success('Zoom restablecido al 100%');
  };

  const percent = Math.round(scale * 100);

  const presets = [
    { label: '85%', val: 0.85 },
    { label: '92%', val: 0.92 },
    { label: '100%', val: 1.00 },
    { label: '110%', val: 1.10 },
    { label: '120%', val: 1.20 },
    { label: '130%', val: 1.30 },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          triggerHaptic('selection');
          setOpen(true);
        }}
        title={`Zoom de la interfaz (${percent}%)`}
        aria-label="Ajustar zoom de pantalla"
        className={`p-2 rounded-xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 text-foreground transition-all duration-200 flex items-center gap-1.5 shadow-xs shrink-0 ${
          className || ''
        }`}
      >
        <ZoomIn className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono font-bold">{percent}%</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs sm:max-w-sm p-5 space-y-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
            <DialogTitle className="text-base font-display font-bold flex items-center gap-2">
              <ZoomIn className="w-5 h-5 text-primary" />
              <span>Zoom y Escala Visual</span>
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground block mb-1">Escala actual</span>
            <div className="text-3xl font-mono font-bold text-primary flex items-center justify-center gap-1">
              <span>{percent}</span>
              <span className="text-lg text-muted-foreground">%</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Ajusta el tamaño visual para adaptarlo cómodamente a tu dispositivo.
            </p>
          </div>

          {/* Botones +/- */}
          <div className="flex items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleUpdateScale(scale - 0.05)}
              disabled={scale <= 0.70}
              className="h-10 w-10 rounded-xl"
              title="Reducir zoom (-5%)"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>

            <Button
              type="button"
              variant={scale === 1.0 ? 'default' : 'secondary'}
              onClick={handleReset}
              className="text-xs font-bold px-4 h-10 rounded-xl flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              100% Normal
            </Button>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleUpdateScale(scale + 0.05)}
              disabled={scale >= 1.35}
              className="h-10 w-10 rounded-xl"
              title="Aumentar zoom (+5%)"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Slider */}
          <div className="pt-2">
            <input
              type="range"
              min="70"
              max="135"
              step="1"
              value={percent}
              onChange={e => handleUpdateScale(parseInt(e.target.value, 10) / 100)}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
          </div>

          {/* Presets rápidos */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {presets.map(p => (
              <button
                key={p.val}
                type="button"
                onClick={() => handleUpdateScale(p.val)}
                className={`py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border transition-all ${
                  Math.abs(scale - p.val) < 0.02
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card border-border hover:border-primary/40 text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-border flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold h-8"
            >
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
