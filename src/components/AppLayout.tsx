import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Coffee, LogOut, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: React.ReactNode;
  nav: { label: string; icon: LucideIcon; key: string }[];
  activeKey: string;
  onNav: (key: string) => void;
}

export default function AppLayout({ children, nav, activeKey, onNav }: AppLayoutProps) {
  const { currentUser, logout } = useAuth();
  const { settings } = useData();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sidebar-nav w-64 flex flex-col shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Coffee className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-display font-bold text-sm text-sidebar-foreground">{settings.businessName}</h2>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{currentUser?.role === 'dev' ? 'Desarrollador' : currentUser?.role === 'admin' ? 'Administrador' : 'Empleado'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(item => {
            const Icon = item.icon;
            const active = activeKey === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNav(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sidebar-accent text-sidebar-primary'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-bold text-sidebar-foreground">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser?.name}</p>
              <p className="text-xs text-sidebar-foreground/50">@{currentUser?.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
