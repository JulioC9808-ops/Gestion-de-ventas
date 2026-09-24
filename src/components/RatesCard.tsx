import React, { useEffect, useMemo, useState } from 'react';
import { Search, AlertCircle, Info, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
// Banderas SVG (se ven igual en PC y Android, a diferencia de los emojis de bandera)
import {
  US, EU, CU, MX, CA, CH, GB, BR, CO, CL, AR, VE, PE, DO, PA,
  CR, GT, HN, NI, SV, PY, UY, BO, JP, CN, KR, RU, TR, IN, IL,
  AE, AU, NZ, SE, NO, DK, PL,
} from 'country-flag-icons/react/3x2';
// Logo de elTOQUE empaquetado por Vite (ruta garantizada en Electron y Android)
import elToqueLogoUrl from '@/assets/eltoque.png';
import {
  getElToqueRates,
  initElToqueWatcher,
  loadCachedRates,
  getRateDelta,
  type ElToqueSnapshot,
  type CurrencyRate,
  type RateDelta,
} from '@/lib/elToque';

// ---- Banderas de países: mapa estático (Vite solo incluye las usadas) ----
const FLAG_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  USD: US, EUR: EU, MXN: MX, CAD: CA,
  CHF: CH, GBP: GB, BRL: BR, COP: CO, CLP: CL, ARS: AR, VES: VE,
  PEN: PE, DOP: DO, PAB: PA, CRC: CR, GTQ: GT, HNL: HN, NIO: NI,
  SVC: SV, PYG: PY, UYU: UY, BOB: BO, JPY: JP, CNY: CN, KRW: KR,
  RUB: RU, TRY: TR, INR: IN, ILS: IL, AED: AE, AUD: AU, NZD: NZ,
  SEK: SE, NOK: NO, DKK: DK, PLN: PL,
};

// ---- Iconos especiales dibujados en SVG (fieles a elTOQUE y las tarjetas oficiales) ----

/** MLC: tarjeta verde/gris con chip bancario */
function MlcCardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className || 'w-6'} style={{ aspectRatio: '3 / 2' }} aria-label="MLC">
      <rect width="24" height="16" rx="2.5" fill="#52796F" />
      <rect y="10.5" width="24" height="5.5" rx="1.5" fill="#354F52" />
      <rect x="2.8" y="3" width="5" height="4" rx="0.8" fill="#F4A261" />
      <rect x="9" y="3.5" width="12" height="1.6" rx="0.8" fill="#ffffff" opacity="0.9" />
      <rect x="9" y="6" width="8" height="1.6" rx="0.8" fill="#ffffff" opacity="0.65" />
    </svg>
  );
}

/** Zelle: icono morado oficial con la Z y una sola raya vertical centrada que solo sobresale arriba y abajo */
function ZelleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className || 'w-6 h-6'} aria-label="Zelle">
      <rect width="24" height="24" rx="5.5" fill="#7414CA" />
      {/* Punta vertical superior que sobresale arriba */}
      <rect x="10.9" y="3.2" width="2.2" height="5" rx="1.1" fill="#ffffff" />
      {/* Punta vertical inferior que sobresale abajo */}
      <rect x="10.9" y="15.8" width="2.2" height="5" rx="1.1" fill="#ffffff" />
      {/* Letra Z central limpia */}
      <path
        d="M6 6.8h12v2.4l-7.4 8h7.4v2.4H6v-2.4l7.4-8H6V6.8z"
        fill="#ffffff"
      />
    </svg>
  );
}

/** CLA: Tarjeta Clásica (Fincimex USD - Fondo verde azulado/teal con ondas cian dinámicas, chip dorado y logo Clásica) */
function ClasicaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 24"
      className={className || 'w-6'}
      style={{ aspectRatio: '3 / 2' }}
      aria-label="Tarjeta Clásica"
    >
      <defs>
        {/* Fondo degradado verde azulado oscuro / teal */}
        <linearGradient id="claBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#042f2e" />
          <stop offset="45%" stopColor="#0f514d" />
          <stop offset="100%" stopColor="#022c2b" />
        </linearGradient>

        {/* Ondas cian brillantes de la tarjeta clásica */}
        <linearGradient id="claCyanWave" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
        </linearGradient>

        {/* Chip dorado */}
        <linearGradient id="claGoldChip" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Tarjeta Base */}
      <rect width="36" height="24" rx="3" fill="url(#claBg)" />

      {/* Ondas dinámicas cian características de la Tarjeta Clásica */}
      <path
        d="M0,7 C12,4 20,16 36,9 L36,16 C22,23 10,13 0,16 Z"
        fill="url(#claCyanWave)"
      />
      <path
        d="M0,17 C10,13 22,22 36,13 L36,18 C24,25 12,18 0,22 Z"
        fill="#38bdf8"
        opacity="0.4"
      />
      <path
        d="M6,0 C15,8 24,3 36,5 L36,1 C26,0 16,3 6,0 Z"
        fill="#67e8f9"
        opacity="0.3"
      />

      {/* Chip EMV Dorado Inteligente */}
      <g transform="translate(4, 7.5)">
        <rect width="6.5" height="5" rx="1" fill="url(#claGoldChip)" />
        <rect x="0.8" y="0.8" width="4.9" height="3.4" rx="0.5" fill="none" stroke="#78350f" strokeWidth="0.3" opacity="0.6" />
        <line x1="0.8" y1="2.5" x2="5.7" y2="2.5" stroke="#78350f" strokeWidth="0.3" opacity="0.6" />
        <line x1="3.25" y1="0.8" x2="3.25" y2="4.2" stroke="#78350f" strokeWidth="0.3" opacity="0.6" />
      </g>

      {/* Símbolo Contactless */}
      <g transform="translate(12, 8.5)" stroke="#67e8f9" strokeWidth="0.5" fill="none" opacity="0.8" strokeLinecap="round">
        <path d="M0,1.5 A2,2 0 0,1 0,3.5" />
        <path d="M1,0.8 A3.5,3.5 0 0,1 1,4.2" />
        <path d="M2,0.1 A5,5 0 0,1 2,4.9" />
      </g>

      {/* Texto de la Marca "Clásica" en tipografía dorada/blanca estilizada */}
      <text
        x="24.5"
        y="10.5"
        textAnchor="middle"
        fill="#fef08a"
        fontSize="3.8"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontStyle="italic"
        fontWeight="bold"
        letterSpacing="0.2"
      >
        Clásica
      </text>

      {/* Indicador USD */}
      <text
        x="24.5"
        y="14.5"
        textAnchor="middle"
        fill="#ffffff"
        opacity="0.85"
        fontSize="2.1"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="800"
        letterSpacing="0.6"
      >
        USD
      </text>
    </svg>
  );
}

/** Icono de respaldo genérico para divisas sin bandera */
function CurrencyFallbackIcon({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[3px] bg-muted text-[10px] font-mono font-bold text-foreground ring-1 ring-black/10 align-middle ${className || 'w-6'}`}
      style={{ aspectRatio: '3 / 2' }}
    >
      {code.slice(0, 3)}
    </span>
  );
}

/**
 * Icono de la moneda, con prioridad:
 * 1) SVG especial (MLC, ZELLE, CLA)  2) Bandera de país SVG oficial  3) Respaldo
 */
function CurrencyFlag({ code, className }: { code: string; className?: string }) {
  const upper = code.toUpperCase();
  if (upper === 'MLC') return <MlcCardIcon className={className} />;
  if (upper === 'ZELLE') return <ZelleIcon className={className} />;
  if (upper === 'CLA' || upper === 'CLASICA') return <ClasicaIcon className={className} />;
  const Flag = FLAG_MAP[upper];
  if (Flag) {
    return (
      <span
        className={`inline-flex shrink-0 overflow-hidden rounded-[3px] shadow-sm ring-1 ring-black/10 align-middle ${className || 'w-6'}`}
        style={{ aspectRatio: '3 / 2' }}
      >
        <Flag className="h-full w-full object-cover" />
      </span>
    );
  }
  return <CurrencyFallbackIcon code={upper} className={className} />;
}

/** Formatea números de variación permitiendo decimales (ej. 3.5, 43.3) */
function formatDeltaNumber(val: number): string {
  const abs = Math.abs(val);
  if (Number.isInteger(abs)) return String(abs);
  const rounded = Math.round(abs * 100) / 100;
  return rounded.toString();
}

/** Formatea números de tasas permitiendo decimales cuando existan */
function formatRateNumber(val?: number | null): string {
  if (val == null || !isFinite(val)) return '0';
  if (Number.isInteger(val)) {
    return val.toLocaleString('es-ES');
  }
  return val.toLocaleString('es-ES', {
    minimumFractionDigits: Number.isInteger(val * 10) ? 1 : 2,
    maximumFractionDigits: 2,
  });
}

/** Chip ▲/▼ estilo elTOQUE: verde al subir con flecha arriba, rojo al bajar con flecha abajo, gris sin flecha al mantenerse igual */
function DeltaChip({ delta, big }: { delta?: RateDelta | null; big?: boolean }) {
  const d = delta || { diff: 0, direction: 'equal' };

  if (d.direction === 'up' && d.diff > 0) {
    const text = formatDeltaNumber(d.diff);
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-bold font-mono whitespace-nowrap text-emerald-600 dark:text-emerald-400 ${big ? 'text-xs' : 'text-[11px]'}`}
        title={`Aumento de ${text} CUP`}
      >
        ▲ +{text}
      </span>
    );
  }

  if (d.direction === 'down' && d.diff > 0) {
    const text = formatDeltaNumber(d.diff);
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-bold font-mono whitespace-nowrap text-rose-600 dark:text-rose-400 ${big ? 'text-xs' : 'text-[11px]'}`}
        title={`Descenso de ${text} CUP`}
      >
        ▼ -{text}
      </span>
    );
  }

  // Se mantiene igual -> en gris sin flecha
  return (
    <span
      className={`inline-flex items-center font-bold font-mono whitespace-nowrap text-muted-foreground/75 ${big ? 'text-xs' : 'text-[11px]'}`}
      title="Sin cambio respecto al valor anterior"
    >
      0
    </span>
  );
}

/** Logo de elTOQUE desde src/assets; si el archivo faltara, badge de respaldo. */
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
      src={elToqueLogoUrl}
      alt="elTOQUE"
      onError={() => setFailed(true)}
      className={`object-contain ${className || 'w-6 h-6'}`}
    />
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

/** Fila estilo elTOQUE: "1 USD [icono] ... 720.00 CUP ▲ +3" con números que cambian de color según aumento/descenso */
function RateRow({
  rate, accent, big, delta,
}: { rate: CurrencyRate; accent?: string; big?: boolean; delta?: RateDelta | null }) {
  const d = delta || { diff: 0, direction: 'equal' };

  const isUp = d.direction === 'up' && d.diff > 0;
  const isDown = d.direction === 'down' && d.diff > 0;

  // Clase de color según variación para el número de precio (verde si subió, rojo si bajó)
  const priceColorClass = isUp
    ? 'text-emerald-600 dark:text-emerald-400'
    : isDown
    ? 'text-rose-600 dark:text-rose-400'
    : '';

  const fallbackStyle = !priceColorClass && accent ? { color: accent } : undefined;

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
            <span className={`font-bold ${priceColorClass || 'text-foreground'}`}>
              ${formatRateNumber(rate.buy)}
            </span>
            <span className="text-[10px] text-muted-foreground mx-1">/</span>
            <span className="text-[10px] text-muted-foreground mr-1">V:</span>
            <span className={`font-bold ${priceColorClass || ''}`} style={fallbackStyle}>
              {`${formatRateNumber(rate.sell)} CUP`}
            </span>
            <span className="ml-1.5"><DeltaChip delta={delta} big={big} /></span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 justify-end">
            <span className={`font-bold ${big ? 'text-base' : 'text-sm'} ${priceColorClass || ''}`} style={fallbackStyle}>
              {`${formatRateNumber(rate.value)} CUP`}
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
  const [snapshot, setSnapshot] = useState<ElToqueSnapshot | null>(() => loadCachedRates());
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

  // ---- Estado sin datos: aviso honesto, NINGÚN número inventado ----
  if (!snapshot || snapshot.data.length === 0) {
    return (
      <div className="glass-card p-4 md:p-5 mb-6 border border-border/60 bg-card/40 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <ElToqueLogo className="w-6 h-6" />
          <h2 className="text-base font-display font-bold">Mercado Informal de Divisas</h2>
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground px-2.5 py-2 rounded bg-muted/50 border border-border/40">
          <WifiOff className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            {statusMessage || 'No se pudieron cargar las tasas. Se intentará automáticamente al recuperar conexión.'}
          </span>
        </div>
      </div>
    );
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
            <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
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

      {/* ---- Modal expandido estilo elTOQUE ---- */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0 overflow-hidden">
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
              placeholder="Buscar"
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
