import React from 'react';
import { useFontSize, type FontSizeKey } from '@/hooks/useFontSize';
import { Type, CheckCircle2, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FontSizeSelector() {
  const { fontSize, setFontSize, options } = useFontSize();

  const currentIndex = options.findIndex(o => o.key === fontSize);
  const currentOption = options[currentIndex] || options[1];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    if (options[idx]) {
      setFontSize(options[idx].key);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header con botón restablecer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-base sm:text-lg">Tamaño de la Fuente</h3>
        </div>
        {fontSize !== 'base' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFontSize('base')}
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2.5"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Restablecer (100%)
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Ajusta el tamaño del texto para mejorar la legibilidad en tu pantalla.
      </p>

      {/* Control Deslizante (Slider) rápido */}
      <div className="bg-card/70 border border-border/80 rounded-xl p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-muted-foreground flex items-center gap-1">
            <ZoomOut className="w-3.5 h-3.5" /> Compacto (92%)
          </span>
          <span className="text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
            {currentOption.label} ({currentOption.badge})
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            Extra Grande (130%) <ZoomIn className="w-3.5 h-3.5" />
          </span>
        </div>

        <input
          type="range"
          min="0"
          max={options.length - 1}
          step="1"
          value={currentIndex >= 0 ? currentIndex : 1}
          onChange={handleSliderChange}
          className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-[11px] text-muted-foreground px-1 font-mono">
          {options.map((opt, i) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFontSize(opt.key)}
              className={`hover:text-primary transition-colors cursor-pointer ${
                fontSize === opt.key ? 'text-primary font-bold' : ''
              }`}
            >
              {opt.badge}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Responsivo de Tarjetas (se ajusta a 2, 3 o 5 columnas sin desbordarse nunca) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
        {options.map(opt => {
          const isSelected = fontSize === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFontSize(opt.key)}
              className={`w-full p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                  : 'border-border bg-card/60 hover:border-primary/40 hover:bg-muted/40'
              }`}
            >
              <div className="w-full">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-bold text-xs sm:text-sm text-foreground truncate">{opt.label}</span>
                  <span
                    className={`text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {opt.badge}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 mb-2 leading-tight">
                  {opt.sublabel}
                </p>
              </div>

              <div className="pt-2 border-t border-border/60 w-full mt-auto">
                <p
                  className="font-medium text-foreground truncate"
                  style={{ fontSize: opt.previewSize }}
                >
                  Aa 123
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                  {isSelected ? (
                    <span className="text-primary font-semibold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 shrink-0" /> Activo
                    </span>
                  ) : (
                    <span className="truncate">Elegir</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Caja de vista previa en tiempo real */}
      <div className="p-3.5 rounded-xl border border-border/70 bg-muted/30">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Vista previa del texto en vivo:
        </p>
        <p className="text-sm text-foreground leading-normal">
          Café con Leche • $250.00 CUP • Stock: 45 unidades disponibles
        </p>
      </div>
    </div>
  );
}
