import React, { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const EULA_STORAGE_KEY = 'eula_accepted_v1';

/**
 * Muestra el texto EULA (settings.eulaText) la primera vez que se abre la app.
 * El usuario debe presionar "Acepto" para continuar. Se guarda en localStorage.
 */
export default function EulaGate() {
  const { settings } = useData();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem(EULA_STORAGE_KEY);
    if (!accepted && settings.eulaText && settings.eulaText.trim().length > 0) {
      // pequeño delay para que la intro (si existe) se muestre primero
      const t = setTimeout(() => setOpen(true), 300);
      return () => clearTimeout(t);
    }
  }, [settings.eulaText]);

  const accept = () => {
    localStorage.setItem(EULA_STORAGE_KEY, new Date().toISOString());
    setOpen(false);
  };

  if (!settings.eulaText) return null;

  return (
    <Dialog open={open} onOpenChange={() => { /* bloqueado hasta aceptar */ }}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="font-display">Acuerdo de Usuario Final (EULA)</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] pr-4">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{settings.eulaText}</p>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button onClick={accept} size="lg">Acepto</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
