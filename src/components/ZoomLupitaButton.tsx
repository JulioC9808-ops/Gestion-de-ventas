import React, { useState } from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import FontSizeSelector from '@/components/FontSizeSelector';

/** Reading preference only; native Windows/browser zoom remains untouched. */
export default function ZoomLupitaButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" size="icon" onClick={() => setOpen(true)}
      title="Tamaño de letra" aria-label="Ajustar tamaño de letra" className={className}>
      <Type />
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tamaño de letra</DialogTitle>
          <DialogDescription>Preferencia de lectura de este dispositivo.</DialogDescription>
        </DialogHeader>
        <FontSizeSelector />
      </DialogContent>
    </Dialog>
  </>;
}
