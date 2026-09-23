import React, { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, AlertCircle, Edit3, KeyRound, Check, RefreshCw, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
// Banderas SVG (se ven igual en PC y Android, a diferencia de los emojis de bandera)
import {
  US, EU, CU, MX, CA, CH, GB, BR, CO, CL, AR, VE, PE, DO, PA,
  CR, GT, HN, NI, SV, PY, UY, BO, JP, CN, KR, RU, TR, IN, IL,
  AE, AU, NZ, SE, NO, DK, PL,
} from 'country-flag-icons/react/3x2';
import {
  getElToqueRates,
  initElToqueWatcher,
  loadCachedRates,
  getCurrencyCountryCode,
  CURRENCY_EMOJI_FALLBACK,
  getElToqueApiKey,
  saveElToqueApiKey,
  updateManualRates,
  INITIAL_FALLBACK_RATES,
  type ElToqueSnapshot,
  type CurrencyRate,
} from '@/lib/elToque';

// ---- Banderas: mapa estático (así Vite solo incluye las usadas) ----
const FLAG_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  USD: US, ZELLE: US, EUR: EU, MLC: CU, CUP: CU, MXN: MX, CAD: CA,
  CHF: CH, GBP: GB, BRL: BR, COP: CO, CLP: CL, ARS: AR, VES: VE,
  PEN: PE, DOP: DO, PAB: PA, CRC: CR, GTQ: GT, HNL: HN, NIO: NI,
  SVC: SV, PYG: PY, UYU: UY, BOB: BO, JPY: JP, CNY: CN, KRW: KR,
  RUB: RU, TRY: TR, INR: IN, ILS: IL, AED: AE, AUD: AU, NZD: NZ,
  SEK: SE, NOK: NO, DKK: DK, PLN: PL,
};

/** Bandera circular/rectangular SVG de cada moneda; emoji de respaldo para cripto */
function CurrencyFlag({ code, className }: { code: string; className?: string }) {
  const upper = code.toUpperCase();
  const Flag = FLAG_MAP[upper];
  if (Flag) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10 align-middle ${className || 'w-6'}`}
        style={{ aspectRatio: '3 / 2' }}
      >
        <Flag className="h-full w-full" />
      </span>
    );
  }
  return (
    <span className={`inline-flex shrink-0 items-center justify-center align-middle ${className || 'w-6'}`}>
      {CURRENCY_EMOJI_FALLBACK[upper] || '💱'}
    </span>
  );
}

function withAlpha(hex: string | null | undefined, alpha: number): string | undefined {
  if (!hex) return undefined;
  const m = hex.replace('#', '');
  if (m.length !== 6) return undefined;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatSpanishDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
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

/** Fila estilo elTOQUE: "1 USD 🇺🇸   720.00 CUP" */
function RateRow({ rate, accent, big }: { rate: CurrencyRate; accent?: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/40 last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`font-bold font-mono text-foreground ${big ? 'text-sm' : 'text-xs'}`}>
          1 {rate.code}
        </span>
        <CurrencyFlag code={rate.code} className={big ? 'w-7' : 'w-5'} />
      </div>
      <div className="text-right font-mono min-w-0">
        {rate.buy != null && rate.sell != null ? (
          <div className={big ? 'text-sm' : 'text-xs'}>
            <span className="text-[10px] text-muted-foreground mr-1">C:</span>
            <span className="font-bold text-foreground">${rate.buy.toLocaleString()}</span>
            <span className="text-[10px] text-muted-foreground mx-1">/</span>
            <span className="text-[10px] text-muted-foreground mr-1">V:</span>
            <span className="font-bold" style={{ color: accent }}>{`${rate.sell.toLocaleString()} CUP`}</span>
          </div>
        ) : (
          <span className={`font-bold ${big ? 'text-base' : 'text-sm'}`} style={{ color: accent }}>
            {`${rate.value.toLocaleString()} CUP`}
          </span>
        )}
      </div>
    </div>
  );
}

export default function RatesCard() {
  const { settings } = useData();
  const { user } = useAuth();
  const [snapshot, setSnapshot] = useState<ElToqueSnapshot | null>(() => {
    const cached = loadCachedRates();
    if (cached?.data) {
      const usd = cached.data.find(r => r.code === 'USD');
      if (usd && usd.value < 400) {
        return { data: INITIAL_FALLBACK_RATES, fetchedAt: new Date().toISOString(), source: 'Mercado Actual' };
      }
    }
    return cached;
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
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
      if (res.snapshot) setSnapshot(res.snapshot);
      setStatusMessage(res.message ?? null);
    };
    loadRates();
    const cleanup = initElToqueWatcher((res) => {
      if (!mounted) return;
      if (res.snapshot) setSnapshot(res.snapshot);
      setStatusMessage(res.message ?? null);
    });
    return () => {
      mounted = false;
      cleanup();
    };
  }, []);

  const accent = withAlpha(settings.fontColor, 0.95);

  const featured = useMemo(() => {
    if (!snapshot?.data) return [];
    const usd = snapshot.data.find(r => r.code === 'USD');
    const eur = snapshot.data.find(r => r.code === 'EUR');
    return [usd, eur].filter(Boolean) as CurrencyRate[];
  }, [snapshot]);

  const filtered = useMemo(() => {
    if (!snapshot?.data) return [];
    const q = query.trim().toUpperCase();
    if (!q) return snapshot.data;
    return snapshot.data.filter(
      r => r.code.includes(q) || (r.name && r.name.toUpperCase().includes(q))
    );
  }, [snapshot, query]);

  const handleOpenEdit = () => {
    if (snapshot?.data) setEditRates(JSON.parse(JSON.stringify(snapshot.data)));
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
      {/* ---- Tarjeta compacta (dashboard) ---- */}
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
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold flex items-center gap-2">
              Mercado Informal de Divisas
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                elTOQUE
              </span>
            </h2>
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            Actualizado: {timeAgo(snapshot.fetchedAt)}
          </div>
        </div>

        {statusMessage && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2 px-2.5 py-1 rounded bg-muted/50 border border-border/40">
            <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        {/* Filas estilo elTOQUE: 1 USD [bandera] ... 720.00 CUP */}
        <div className="px-1">
          {featured.map((r) => (
            <RateRow key={r.code} rate={r} accent={accent} />
          ))}
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1 group-hover:text-primary transition-colors">
            <Search className="w-3 h-3" />
            Ver todas las monedas ({snapshot.data.length})
          </span>
          <span className="text-[10px] opacity-70">Actualizaciones: 10:00 AM y 10:00 PM</span>
        </div>
      </div>

      {/* ---- Modal expandido estilo elTOQUE ---- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Cabecera azul estilo elTOQUE */}
          <div className="relative bg-gradient-to-b from-blue-500 to-blue-600 text-white px-4 pt-5 pb-4 text-center shrink-0">
            {user?.role === 'admin' && (
              <div className="absolute right-2 top-2 flex items-center gap-0.5">
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                  title="Actualizar ahora"
                  disabled={refreshing}
                  onClick={handleForceRefresh}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                  title="Editar tasas manualmente"
                  onClick={handleOpenEdit}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/20"
                  title="Configurar Token API elTOQUE"
                  onClick={handleOpenApiKey}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Mercado Informal de Divisas en Cuba
            </DialogTitle>
            <DialogDescription className="text-xs text-white/85 mt-0.5">
              (Tiempo Real) — Fuente: {snapshot.source || 'elTOQUE'}
            </DialogDescription>
          </div>

          {/* Buscador */}
          <div className="relative px-3 pt-3 pb-1 shrink-0 bg-background">
            <Search className="absolute left-6 top-1/2 -translate-y-1/3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar moneda (ej: USD, EUR, Zelle, MXN)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-background/60"
            />
          </div>

          {statusMessage && (
            <div className="mx-3 mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground px-2.5 py-1 rounded bg-muted/50 border border-border/40 shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </div>
          )}

          {/* Lista de monedas con divisores, como elTOQUE */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-[160px] max-h-[50vh]">
            {filtered.map((r) => (
              <RateRow key={r.code} rate={r} accent={accent} big />
            ))}
            {filtered.length === 0 && (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No se encontró ninguna moneda que coincida con "{query}"
              </div>
            )}
          </div>

          {/* Pie con fecha, como elTOQUE */}
          <div className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-border/60 text-[11px] italic text-muted-foreground shrink-0">
            <Info className="w-3.5 h-3.5 opacity-60" />
            {formatSpanishDateTime(snapshot.fetchedAt)}
          </div>
        </DialogContent>
      </Dialog>

      {/* ---- Modal Editar Tasas (admin) ---- */}
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
                    <CurrencyFlag code={r.code} className="w-5" /> {r.code} ({r.name || r.code})
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

      {/* ---- Modal API Key (admin) ---- */}
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
              placeholder="Bearer Token de elTOQUE"
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
