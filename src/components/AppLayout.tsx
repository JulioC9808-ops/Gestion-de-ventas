import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Coffee, LogOut, type LucideIcon, HelpCircle, PanelLeftOpen, PanelLeftClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isMobileDevice, getAppVersion, getPlatformLabel } from '@/lib/platform';
import { useIsMobile } from '@/hooks/use-mobile';
import { getPendingShift } from '@/lib/syncStore';
import { toast } from 'sonner';
import Tutorial from '@/components/Tutorial';
import EmployeeLicenseBanner from '@/components/EmployeeLicenseBanner';
import RenewalOfferBanner from '@/components/RenewalOfferBanner';

interface NavItem {
  label: string;
  icon: LucideIcon;
  key: string;
  tip?: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  nav: NavItem[];
  activeKey: string;
  onNav: (key: string) => void;
}

export default function AppLayout({ children, nav, activeKey, onNav }: AppLayoutProps) {
  const { currentUser, logout } = useAuth();
  const { settings } = useData();
  const isMobile = useIsMobile();
  const native = isMobileDevice();
  // En Android/celular NUNCA hay barra superior: solo lateral (izquierda o derecha).
  const isTop = !isMobile && !native && settings.navPosition === 'top';
  const onRight = settings.navPosition === 'side-right';
  const [collapsed, setCollapsed] = React.useState(isMobile);


  React.useEffect(() => {
    setCollapsed(isMobile);
  }, [isMobile]);

  const handleLogout = () => {
    if (isMobileDevice() && currentUser?.role === 'employee') {
      const pending = getPendingShift();
      if (pending && pending.employeeId === currentUser.id) {
        toast.error('Debes sincronizar tu turno con el dueño antes de cerrar sesión.');
        return;
      }
    }
    logout();
  };


  if (isTop) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Top navbar */}
        <header className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              {settings.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-sidebar-primary-foreground" />
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <h2 className="font-display font-bold text-sm text-sidebar-foreground">{settings.businessName}</h2>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sidebar-accent/80 text-sidebar-foreground/90 border border-sidebar-border/50">
                  v{getAppVersion()}
                </span>
              </div>
              <span className="text-xs text-sidebar-foreground/60 capitalize ml-1">
                {currentUser?.role === 'dev' ? 'Desarrollador' : currentUser?.role === 'admin' ? 'Admin' : 'Empleado'}
              </span>
            </div>

            <nav className="flex items-center gap-1">
              {nav.map(item => {
                const Icon = item.icon;
                const active = activeKey === item.key;
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => onNav(item.key)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          active
                            ? 'bg-sidebar-accent text-sidebar-primary'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden lg:inline">{item.label}</span>
                      </button>
                    </TooltipTrigger>
                    {item.tip && (
                      <TooltipContent><p className="max-w-xs">{item.tip}</p></TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover border border-sidebar-border shadow-sm ring-1 ring-sidebar-accent/50"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground border border-sidebar-border">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium text-sidebar-foreground hidden md:inline">{currentUser?.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          <EmployeeLicenseBanner />
          <RenewalOfferBanner />
          {children}
        </main>
        <Tutorial />
      </div>
    );
  }

  // Side nav (classic) — colapsable. En celular se comporta como cajón flotante
  // para que el contenido siempre use el ancho completo de la pantalla.
  const drawer = isMobile;

  return (
    <div className={`flex min-h-screen w-full ${onRight ? 'flex-row-reverse' : ''}`}>
      <aside
        className={`sidebar-nav flex flex-col shrink-0 transition-all duration-200 ${
          drawer
            ? `fixed top-0 bottom-0 z-40 ${onRight ? 'right-0' : 'left-0'} ${
                collapsed ? 'w-14' : 'w-[15.5rem] shadow-2xl'
              }`
            : collapsed
              ? 'w-14'
              : 'w-56 md:w-64'
        }`}
      >

        <div className={`border-b border-sidebar-border ${collapsed ? 'p-2' : 'p-5'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="w-10 h-10 rounded-xl object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
                <Coffee className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
            )}
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h2 className="font-display font-bold text-sm text-sidebar-foreground truncate">{settings.businessName}</h2>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sidebar-accent/90 text-sidebar-foreground/90 border border-sidebar-border/40 shrink-0">
                    v{getAppVersion()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-sidebar-foreground/60 capitalize mt-0.5">
                  <span>{currentUser?.role === 'dev' ? 'Desarrollador' : currentUser?.role === 'admin' ? 'Administrador' : 'Empleado'}</span>
                  {native && <span className="text-[10px] font-medium text-emerald-500 font-sans">Android</span>}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`px-2 py-2 flex ${collapsed ? 'justify-center' : onRight ? 'justify-start' : 'justify-end'}`}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? 'Expandir menú' : 'Recoger menú'}
            className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={() => setCollapsed(c => !c)}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </Button>
        </div>

        <nav className={`flex-1 space-y-1 ${collapsed ? 'p-1.5' : 'p-3'}`}>
          {nav.map(item => {
            const Icon = item.icon;
            const active = activeKey === item.key;
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => { onNav(item.key); if (drawer) setCollapsed(true); }}
                    aria-label={item.label}
                    className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-4 py-2.5'
                    } ${
                      active
                        ? 'bg-sidebar-accent text-sidebar-primary'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="max-w-xs">{item.tip ?? item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        <div className={`border-t border-sidebar-border ${collapsed ? 'p-1.5' : 'p-3'}`}>
          {collapsed ? (
            <div className="flex justify-center my-2" title={currentUser?.name}>
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-sidebar-border shadow-sm ring-1 ring-sidebar-accent/50"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground border border-sidebar-border">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl bg-sidebar-accent/20 border border-sidebar-border/40">
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover border border-sidebar-border shadow-sm shrink-0 ring-1 ring-sidebar-accent/50"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground border border-sidebar-border shrink-0">
                  {currentUser?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser?.name}</p>
                <div className="flex items-center justify-between text-xs text-sidebar-foreground/50">
                  <span className="truncate">@{currentUser?.username}</span>
                  <span className="font-mono text-[10px] opacity-75">{native ? 'Android' : 'PC'}</span>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            aria-label="Cerrar Sesión"
            className={`text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${
              collapsed ? 'w-full px-0 justify-center' : 'w-full justify-start'
            }`}
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
          </Button>
        </div>
      </aside>

      {/* Espacio reservado del riel + fondo oscuro cuando el cajón está abierto */}
      {drawer && <div className="w-14 shrink-0" aria-hidden />}
      {drawer && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setCollapsed(true)}
          aria-hidden
        />
      )}

      <main className="flex-1 min-w-0 max-w-full p-3 md:p-8 overflow-x-hidden overflow-y-auto">
        <EmployeeLicenseBanner />
        <RenewalOfferBanner />
        {children}
      </main>

      <Tutorial />
    </div>
  );
}
