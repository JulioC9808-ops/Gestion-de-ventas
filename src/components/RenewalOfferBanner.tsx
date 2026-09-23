import React, { useEffect, useState } from 'react';
import { Sparkles, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLicenseInfo } from '@/pages/LicenseGate';
import { getDeviceId } from '@/lib/machine';
import { formatFriendlyDeviceId } from '@/lib/cryptoLicense';
import RenewalOfferModal from '@/components/RenewalOfferModal';

export default function RenewalOfferBanner() {
  const [info, setInfo] = useState(() => getLicenseInfo());
  const [modalOpen, setModalOpen] = useState(false);
  const [terminalId, setTerminalId] = useState('GV-DEV-LOCAL');

  useEffect(() => {
    let alive = true;
    getDeviceId().then(d => {
      if (alive && d.id) {
        setTerminalId(formatFriendlyDeviceId(d.id));
      }
    });

    const checkInterval = setInterval(() => {
      setInfo(getLicenseInfo());
    }, 60 * 1000);

    return () => {
      alive = false;
      clearInterval(checkInterval);
    };
  }, []);

  // Solo se muestra si la licencia es periódica/timed y quedan 10 días o menos antes de vencer
  if (info.type !== 'timed') return null;

  const daysLeft = info.daysLeft ?? 0;
  if (daysLeft > 10) return null;

  return (
    <>
      <div className="mb-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/40 p-3 sm:p-4 shadow-sm animate-fade-in-up">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  {daysLeft <= 0 ? '⚠️ Licencia por Vencer Hoy' : `⏳ Vence en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`}
                </span>
                <span className="text-xs font-mono text-muted-foreground">Terminal: {terminalId}</span>
              </div>
              <h4 className="font-bold text-sm text-foreground mt-1">
                Ofertas Especiales de Renovación y Descuentos Exclusivos
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Asegura la continuidad de tu sistema eligiendo entre los planes <strong>Trimestral (3 Meses)</strong>, <strong>Anual</strong>, <strong>Mensual</strong> o <strong>Permanente</strong> con tarifas preferenciales.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs h-9 px-4 shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>Ver Planes y Pagar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <RenewalOfferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        daysLeft={daysLeft}
        terminalId={terminalId}
        onKeyActivated={() => setInfo(getLicenseInfo())}
      />
    </>
  );
}
