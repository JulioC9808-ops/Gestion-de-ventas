import React, { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, AlertCircle, Layers, Edit3, KeyRound, Check, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  getElToqueRates,
  initElToqueWatcher,
  loadCachedRates,
  getCurrencyFlag,
  getElToqueApiKey,
  saveElToqueApiKey,
  updateManualRates,
  INITIAL_FALLBACK_RATES,
  type ElToqueSnapshot,
  type CurrencyRate,
} from '@/lib/elToque';

function withAlpha(hex: string | null | undefined, alpha: number): string | undefined {
  if (!hex) return undefined;
  const m = hex.replace('#', '');
  if (m.length !== 6) return undefined;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  const days = Math.floor(h / 24);
  return `hace ${days} d`;
}

export default function RatesCard() {
  const { settings } = useData();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<ElToqueSnapshot | null>(() => {
    const cached = loadCachedRates();
    // Si la caché tenía las tasas desactualizadas antiguas (< 400), inicializar con las nuevas +700
    if (cached?.data) {
      const usd = cached.data.find(r => r.code === 'USD');
      if (usd && usd.value < 400) {
        return {
          data: INITIAL_FALLBACK_RATES,
          fetchedAt: new Date().toISOString(),
          source: 'Mercado Actual',
        };
      }
    }
    return cached;
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Modales de Ajuste Manual y API Key para Admin
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [editRates, setEditRates] = useState<CurrencyRate[]>([]);
  const [inputApiKey, setInputApiKey] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadRates = async () => {
      const res = await getElToqueRates();
      if (!mounted) return;
      if (res.snapshot) {
        setSnapshot(res.snapshot);
      }
      if (res.message) {
        setStatusMessage(res.message);
      } else {
        setStatusMessage(null);
      }
    };

    loadRates();

    const cleanup = initElToqueWatcher((res) => {
      if (!mounted) return;
      if (res.snapshot) {
        setSnapshot(res.snapshot);
      }
      if (res.message) {
        setStatusMessage(res.message);
      } else {
        setStatusMessage(null);
      }
    });

    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const accent = withAlpha(settings.fontColor, 0.95);

  // Destacados principales: USD y EUR
  const featured = useMemo(() => {
    if (!snapshot?.data) return [];
    const usd = snapshot.data.find(r => r.code === 'USD');
    const eur = snapshot.data.find(r => r.code === 'EUR');
    return [usd, eur].filter(Boolean) as CurrencyRate[];
  }, [snapshot]);

  // Lista filtrada en el modal
  const filtered = useMemo(() => {
    if (!snapshot?.data) return [];
    const q = query.trim().toUpperCase();
    if (!q) return snapshot.data;
    return snapshot.data.filter(
      r => r.code.includes(q) || (r.name && r.name.toUpperCase().includes(q))
    );
  }, [snapshot, query]);

  const handleOpenEdit = () => {
    if (snapshot?.data) {
      setEditRates(JSON.parse(JSON.stringify(snapshot.data)));
    }
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    const updated = updateManualRates(editRates);
    setSnapshot(updated);
    setEditModalOpen(false);
    toast.success('Tasas de cambio actualizadas correctamente.');
  };

  const handleOpenApiKey = () => {
    setInputApiKey(getElToqueApiKey());
    setApiKeyModalOpen(true);
  };

  const handleSaveApiKey = async () => {
    saveElToqueApiKey(inputApiKey);
    setApiKeyModalOpen(false);
    toast.success('Clave de API elTOQUE guardada.');
    setRefreshing(true);
    try {
      const res = await getElToqueRates({ force: true });
      if (res.snapshot) setSnapshot(res.snapshot);
      if (res.message) setStatusMessage(res.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await getElToqueRates({ force: true });
      if (res.snapshot) {
        setSnapshot(res.snapshot);
        toast.success('Tasas actualizadas desde el servidor.');
      }
      if (res.message) setStatusMessage(res.message);
    } catch {
      toast.error('No se pudo conectar con el servidor.');
    } finally {
      setRefreshing(false);
    }
  };

  if (!snapshot || snapshot.data.length === 0) {
    return null;
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="glass-card p-4 md:p-5 mb-6 cursor-pointer hover:border-primary/50 transition-all border border-border/60 bg-card/40 backdrop-blur-md shadow-sm group"
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold flex items-center gap-2">
                Tasas de Cambio
                <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                  elTOQUE
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
            <span>Actualizado: {timeAgo(snapshot.fetchedAt)}</span>
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-3 px-2.5 py-1 rounded bg-muted/50 border border-border/40">
            <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {featured.map((r) => (
            <div
              key={r.code}
              className="rounded-xl border border-border/70 p-3.5 bg-background/50 backdrop-blur-sm group-hover:bg-background/70 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span className="text-sm">{getCurrencyFlag(r.code)}</span>
                  {r.code} → CUP
                </span>
                <span className="text-[10px] text-muted-foreground">{r.name}</span>
              </div>

              {r.buy != null && r.sell != null ? (
                <div className="flex items-baseline justify-between mt-1 pt-1 border-t border-border/40">
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Compra</span>
                    <span className="text-lg font-bold font-mono" style={{ color: accent }}>
                      ${r.buy.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground block">Venta</span>
                    <span className="text-lg font-bold font-mono" style={{ color: accent }}>
                      ${r.sell.toLocaleString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-1 pt-1 border-t border-border/40">
                  <span className="text-[10px] uppercase text-muted-foreground block">Tasa</span>
                  <span className="text-xl font-bold font-mono" style={{ color: accent }}>
                    ${r.value.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">CUP</span>
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
            <Layers className="w-3 h-3" />
            Toca para ver todas las monedas ({snapshot.data.length})
          </span>
          <span className="text-[10px] opacity-70">Actualizaciones: 10:00 AM y 10:00 PM</span>
        </div>
      </div>

      {/* Modal / Dialog cristalino con todas las monedas, banderas y buscador */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-card/90 backdrop-blur-xl border-border/80">
          <DialogHeader className="pb-2 border-b border-border/60">
            <div className="flex items-center justify-between gap-2 pr-4">
              <div>
                <DialogTitle className="flex items-center gap-2 text-base font-display">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Tasas del Mercado Informal (elTOQUE)
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Actualización: después de las 10:00 AM y 10:00 PM
                </DialogDescription>
              </div>

              {user?.role === 'admin' && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    title="Actualizar ahora"
                    disabled={refreshing}
                    onClick={handleForceRefresh}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    title="Editar tasas manualmente"
                    onClick={handleOpenEdit}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    title="Configurar Token API elTOQUE"
                    onClick={handleOpenApiKey}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Buscador de monedas en tiempo real */}
          <div className="relative my-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código o nombre (ej: USD, EUR, Zelle, MXN)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/60"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[50vh] min-h-[160px]">
            {filtered.map((r) => (
              <div
                key={r.code}
                className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/40 hover:bg-background/70 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl shrink-0">{getCurrencyFlag(r.code)}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm font-mono text-foreground">{r.code}</span>
                      <span className="text-[10px] text-muted-foreground">→ CUP</span>
                    </div>
                    {r.name && <p className="text-[11px] text-muted-foreground">{r.name}</p>}
                  </div>
                </div>

                <div className="text-right font-mono">
                  {r.buy != null && r.sell != null ? (
                    <div className="text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground mr-1">C:</span>
                        <span className="font-bold text-foreground">${r.buy.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground mr-1">V:</span>
                        <span className="font-bold text-primary" style={{ color: accent }}>
                          ${r.sell.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-primary" style={{ color: accent }}>
                      ${r.value.toLocaleString()} CUP
                    </span>
                  )}
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No se encontró ninguna moneda que coincida con "{query}"
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Fuente: {snapshot.source || 'elTOQUE'}</span>
            <span>{timeAgo(snapshot.fetchedAt)}</span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Editar Tasas Manualmente */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Edit3 className="w-4 h-4 text-primary" /> Editar Tasas Manualmente
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajusta los precios de compra y venta según el valor actual de tu mercado.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh] py-2">
            {editRates.map((r, i) => (
              <div key={r.code} className="p-2.5 rounded-lg border border-border bg-background/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5">
                    <span>{getCurrencyFlag(r.code)}</span> {r.code} ({r.name || r.code})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Compra (CUP)</label>
                    <Input
                      type="number"
                      value={r.buy ?? r.value ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const copy = [...editRates];
                        copy[i] = { ...copy[i], buy: val, value: copy[i].sell ?? val };
                        setEditRates(copy);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Venta (CUP)</label>
                    <Input
                      type="number"
                      value={r.sell ?? r.value ?? ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const copy = [...editRates];
                        copy[i] = { ...copy[i], sell: val, value: val };
                        setEditRates(copy);
                      }}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveEdit}>
              <Check className="w-3.5 h-3.5 mr-1" /> Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para configurar API Key de elTOQUE */}
      <Dialog open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-4 h-4 text-primary" /> Token de API elTOQUE
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ingresa tu token Bearer de la API de elTOQUE si cuentas con una clave privada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Input
              type="password"
              placeholder="Bearer Token de elTOQUE (ej: eyJhbGci...)"
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
              className="text-xs font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              Se guarda en tu dispositivo local para actualizar automáticamente 2 veces al día.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button variant="outline" size="sm" onClick={() => setApiKeyModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveApiKey}>
              <Check className="w-3.5 h-3.5 mr-1" /> Guardar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
