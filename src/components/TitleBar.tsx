import React, { useEffect, useState } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { Coffee } from 'lucide-react';

/**
 * Barra de título custom estilo VSCode — visible SOLO cuando la app corre
 * dentro de Electron (window.desktopBridge existe). En navegador se oculta.
 * Región arrastrable: -webkit-app-region: drag; botones con no-drag.
 */
export default function TitleBar() {
  const bridge = typeof window !== 'undefined' ? window.desktopBridge : undefined;
  const { settings } = useData();
  const [isMax, setIsMax] = useState(false);

  useEffect(() => {
    if (!bridge?.windowControls) return;
    bridge.windowControls.isMaximized().then(setIsMax);
    const unsub = bridge.windowControls.onMaximizeChange(setIsMax);
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [bridge]);

  if (!bridge?.isElectron) return null;

  const controls = bridge.windowControls;

  return (
    <div
      className="flex items-center justify-between h-9 select-none transition-colors duration-300
                 bg-sidebar/90 backdrop-blur-xl
                 text-sidebar-foreground border-b border-sidebar-border/80 shadow-xs"
      style={{
        WebkitAppRegion: 'drag',
        backgroundColor: 'hsl(var(--sidebar-background))',
        color: 'hsl(var(--sidebar-foreground))',
        borderColor: 'hsl(var(--sidebar-border))',
      } as React.CSSProperties}
    >
      {/* Logo + nombre */}
      <div className="flex items-center gap-2 px-3 text-xs font-semibold overflow-hidden">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="" className="w-4 h-4 rounded-sm object-cover shadow-xs" />
        ) : (
          <Coffee className="w-4 h-4 text-primary" />
        )}
        <span className="truncate tracking-tight">{settings.businessName || 'Gestión de Ventas'}</span>
      </div>

      {/* Botones de ventana */}
      <div
        className="flex items-stretch h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => controls.minimize()}
          className="w-11 h-full flex items-center justify-center 
                     hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          aria-label="Minimizar"
          title="Minimizar"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => controls.toggleMaximize()}
          className="w-11 h-full flex items-center justify-center 
                     hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          aria-label={isMax ? 'Restaurar' : 'Maximizar'}
          title={isMax ? 'Restaurar' : 'Maximizar'}
        >
          {isMax ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => controls.close()}
          className="w-11 h-full flex items-center justify-center 
                     hover:bg-destructive hover:text-destructive-foreground transition-colors"
          aria-label="Cerrar"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
