import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface HelpTipProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Help tip que funciona en escritorio (hover/click) y móvil (tap).
 * Usa Popover para garantizar compatibilidad táctil.
 */
export default function HelpTip({ children, className }: HelpTipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ayuda"
          className={`inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors ${className || ''}`}
          onClick={e => e.stopPropagation()}
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="max-w-xs text-sm">
        {children}
      </PopoverContent>
    </Popover>
  );
}
