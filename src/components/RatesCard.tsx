import React, { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
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
  getRateDelta,
  INITIAL_FALLBACK_RATES,
  type ElToqueSnapshot,
  type CurrencyRate,
  type RateDelta,
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

/** Logo de elTOQUE. Carga public/eltoque.png; si falta, muestra un badge de respaldo. */
function ElToqueLogo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-primary/10 text-primary font-black tracking-tighter ${className || 'w-6 h-6'}`}
        style={{ fontSize: '0.45em' }}
      >
        ((Q))
      </span>
    );
  }
  return (
    <img
      src="eltoque.png"
      alt="elTOQUE"
      onError={() => setFailed(true)}
      className={`object-contain ${className || 'w-6 h-6'}`}
    />
  );
}

/** Bandera SVG de la moneda; emoji de respaldo para cripto */
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
      {upper === 'USDT' ? '💵' : upper === 'BTC' ? '₿' : upper === 'ETH' ? 'Ξ' : upper === 'TRX' ? '⚡' : '💱'}
    </span>
  );
}

/** Chip ▲/▼ estilo elTOQUE: rojo al subir, verde al bajar */
function DeltaChip({ delta, big }: { delta?: RateDelta | null; big?: boolean }) {
  if (!delta) return null;
  const up = delta.direction === 'up';
  const value = Math.abs(delta.diff);
  const text = value % 1 === 0 ? String(value) : value.toFixed(2);
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-bold whitespace-nowrap ${big ? 'text-[11px]' : 'text-[10px]'}`}
      style={{ color: up ? '#dc2626' : '#16a34a' }}
    >
      {up ? '▲' : '▼'} {up ? '+' : '-'}{text}
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

/** Fila estilo elTOQUE: "1 USD [bandera] ... 720.00 CUP ▲ +3" */
function RateRow({
  rate, accent, big, delta,
}: { rate: CurrencyRate; accent?: string; big?: boolean; delta?: RateDelta | null }) {
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
            <span className="ml-1.5"><DeltaChip delta={delta} big={big} /></span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 justify-end">
            <span className={`font-bold ${big ? 'text-base' : 'text-sm'}`} style={{ color: accent }}>
              {`${rate.value.toLocaleString()} CUP`}
            </span>
            <DeltaChip delta={delta} big={big} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function RatesCard() {
  const { settings } = useData();
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

  // Deltas ▲/▼ del snapshot actual contra el snapshot oficial anterior
  const deltas = useMemo(() => {
    const map: Record<string, RateDelta | null> = {};
    if (snapshot?.data) {
      for (const r of snapshot.data) {
        map[r.code] = getRateDelta(r.code, snapshot);
      }
    }
    return map;
  }, [snapshot]);

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
            <ElToqueLogo className="w-6 h-6" />
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
            <ElToqueLogo className="w-4 h-4 shrink-0" />
            <span className="truncate">{statusMessage}</span>
          </div>
        )}

        <div className="px-1">
          {featured.map((r) => (
            <RateRow key={r.code} rate={r} accent={accent} delta={deltas[r.code]} />
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

      {/* ---- Modal expandido estilo elTOQUE (con logo centrado en cabecera) ---- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {/* Cabecera azul estilo elTOQUE */}
          <div className="relative bg-gradient-to-b from-blue-500 to-blue-600 text-white px-4 pt-4 pb-4 text-center shrink-0">
            <div className="flex justify-center mb-1.5">
              <ElToqueLogo className="w-10 h-10" />
            </div>
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
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
              <ElToqueLogo className="w-4 h-4 shrink-0" />
              <span className="truncate">{statusMessage}</span>
            </div>
          )}

          {/* Lista de monedas con divisores y deltas, como elTOQUE */}
          <div className="flex-1 overflow-y-auto px-3 pb-2 min-h-[160px] max-h-[50vh]">
            {filtered.map((r) => (
              <RateRow key={r.code} rate={r} accent={accent} big delta={deltas[r.code]} />
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
    </>
  );
}
