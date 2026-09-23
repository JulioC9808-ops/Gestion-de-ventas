import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataProvider } from "@/contexts/DataContext";
import IntroPlayer from "@/components/IntroPlayer";
import EulaGate from "@/components/EulaGate";
import TitleBar from "@/components/TitleBar";
import UpdateChecker from "@/components/UpdateChecker";
import UpdateBar from "@/components/UpdateBar";
import AnnouncementChecker from "@/components/AnnouncementChecker";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useEffect, useState } from "react";
import { getDeviceId } from "@/lib/machine";
import { formatFriendlyDeviceId, isTerminalIdBlocked } from "@/lib/cryptoLicense";
import { getLicenseStatus, initLicenseStatusChecker, subscribeLicenseStatus } from "@/lib/licenseStatus";
import { initRemoteRegistryQueue } from "@/lib/remoteRegistry";
import { ShieldAlert, MessageCircle, AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

const DEV_WHATSAPP = '+5351616816';

function SuspendedScreen({ friendlyId, reason }: { friendlyId: string; reason: string }) {
  const handleOpenWhatsApp = () => {
    const text = encodeURIComponent(`Hola Julio_GE, mi terminal ${friendlyId} aparece suspendido con motivo: "${reason}". Deseo consultar los detalles para reactivarlo.`);
    window.open(`https://wa.me/${DEV_WHATSAPP.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center p-4 select-none"
      style={{ background: 'linear-gradient(135deg, hsl(0 0% 5%), hsl(0 30% 8%), hsl(0 0% 12%))' }}
    >
      <div className="w-full max-w-md bg-card border border-destructive/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shadow-lg">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-destructive/20 text-destructive border border-destructive/30 uppercase tracking-wider">
            <AlertOctagon className="w-3.5 h-3.5" />
            Acceso Suspendido
          </span>
          <h1 className="text-2xl font-bold font-display text-foreground">Terminal Bloqueado</h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            El acceso de este dispositivo ha sido suspendido de forma centralizada por el desarrollador.
          </p>
        </div>

        <div className="space-y-3 text-left">
          <div className="p-3 rounded-xl bg-background/80 border border-border">
            <div className="text-[10px] uppercase font-bold text-muted-foreground">ID de este Terminal:</div>
            <div className="font-mono text-sm font-bold text-primary">{friendlyId}</div>
          </div>

          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 space-y-1">
            <div className="text-[10px] uppercase font-bold text-destructive">Motivo de la Suspensión:</div>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {reason || 'Suspensión administrativa del sistema.'}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            onClick={handleOpenWhatsApp}
            className="w-full h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold text-sm shadow-md flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            Contactar por WhatsApp (+53 51616816)
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Desarrollado por Julio_GE • Atención directa
          </p>
        </div>
      </div>
    </div>
  );
}

const App = () => {
  const [updatePercent, setUpdatePercent] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [blockedState, setBlockedState] = useState<{ isBlocked: boolean; reason: string }>({
    isBlocked: false,
    reason: '',
  });

  useEffect(() => {
    if (window.desktopBridge?.updates) {
      window.desktopBridge.updates.onProgress((percent) => {
        setUpdatePercent(percent);
      });
    }

    // Iniciar el despachador de la cola de phone-home / registros
    initRemoteRegistryQueue();

    // Iniciar chequeo remoto de licencias y bloqueos
    initLicenseStatusChecker();

    // Obtener ID de hardware y verificar estado inicial
    let alive = true;
    getDeviceId().then(d => {
      if (!alive) return;
      const rawId = d.id;
      setDeviceId(rawId);

      const status = getLicenseStatus(rawId);
      const locallyBlocked = isTerminalIdBlocked(rawId);
      if (status.isBlocked || locallyBlocked) {
        setBlockedState({
          isBlocked: true,
          reason: status.blockedReason || 'Terminal suspendido por el desarrollador.',
        });
      }
    });

    const unsub = subscribeLicenseStatus(() => {
      if (!alive) return;
      getDeviceId().then(d => {
        if (!alive) return;
        const status = getLicenseStatus(d.id);
        const locallyBlocked = isTerminalIdBlocked(d.id);
        if (status.isBlocked || locallyBlocked) {
          setBlockedState({
            isBlocked: true,
            reason: status.blockedReason || 'Terminal suspendido por el desarrollador.',
          });
        } else {
          setBlockedState({ isBlocked: false, reason: '' });
        }
      });
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  // Si el terminal está bloqueado globalmente: desmontar todo y mostrar solo pantalla de suspensión
  if (blockedState.isBlocked) {
    const friendly = formatFriendlyDeviceId(deviceId);
    return <SuspendedScreen friendlyId={friendly} reason={blockedState.reason} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Toaster />
        <Sonner />
        <DataProvider>
          <AuthProvider>
            <TitleBar />
            <UpdateChecker />
            <AnnouncementChecker />
            <IntroPlayer />
            <EulaGate />

            {/* Barra de progreso abajo a la izquierda */}
            {updatePercent > 0 && (
              <UpdateBar percent={updatePercent} />
            )}

            <HashRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </HashRouter>
          </AuthProvider>
        </DataProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
