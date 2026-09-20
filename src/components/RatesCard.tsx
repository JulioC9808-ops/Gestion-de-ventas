import { useEffect, useMemo, useState } from 'react';
import { Search, TrendingUp, WifiOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useData } from '@/contexts/DataContext';
import {
  getBestRates,
  initRatesSync,
  loadCachedSnapshot,
  type RatesSnapshot,
} from '@/lib/exchangeRates';

// Convierte #RRGGBB a rgba con transparencia ("cristalino")
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
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

const FEATURED = ['USD', 'EUR'];

export default function RatesCard() {
  const { settings } = useData();
  const [snapshot, setSnapshot] = useState<RatesSnapshot | null>(() => loadCachedSnapshot());
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => initRatesSync(() => {
    getBestRates().then(({ snapshot: s, error: e }) => {
      setSnapshot(s);
      setError(e ?? null);
    });
  }), []);

  const accent = withAlpha(settings.fontColor, 0.85);
  const accentSoft = withAlpha(settings.fontColor, 0.55);

  const featured = useMemo(
    () => FEATURED.map(code => snapshot?.rates.find(r => r.code === code)).filter(Boolean),
    [snapshot]
  );

  const filtered = useMemo(() => {
    if (!snapshot) return [];
    const q = query.trim().toUpperCase();
    return snapshot.rates
      .filter(r => !q || r.code.includes(q))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [snapshot, query]);

  if (!snapshot) {
    return (
      <div className="glass-card p-4 mb-6 text-sm text-muted-foreground flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        {error ?? 'Cargando tasas de cambio...'}
      </div>
    );
  }

  return (
    <>
      <div
        className="glass-card p-4 mb-6 cursor-pointer hover:opacity-90 transition"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-bold">Tasas de cambio</h2>
          </div>
          <span className="text-xs text-muted-foreground">{timeAgo(snapshot.fetchedAt)}</span>
        </div>
        {error && <p className="text-xs text-muted-foreground mb-2">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          {featured.map(r => r && (
            <div key={r.code} className="rounded-lg border border-border p-3">
              <p className="text-xs uppercase text-muted-foreground">{r.code} → CUP</p>
              <p className="text-2xl font-bold" style={{ color: accent }}>
                {r.buy != null && r.sell != null ? (
                  <span className="text-base">
                    <span style={{ color: accent }}>Compra {r.buy}</span>
                    <span style={{ color: accentSoft }}> / </span>
                    <span style={{ color: accent }}>Venta {r.sell}</span>
                  </span>
                ) : (
                  r.value
                )}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Toca para ver todas las monedas</p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Todas las monedas</DialogTitle>
          </DialogHeader>
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar moneda..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-1">
            {filtered.map(r => (
              <div key={r.code} className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="font-medium">{r.code}</span>
                <span style={{ color: accent }} className="font-bold">
                  {r.buy != null && r.sell != null
                    ? `${r.buy} / ${r.sell}`
                    : r.value}
                </span>
              </div>
            ))}
            {!filtered.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No se encontró "{query}"
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Fuente: elTOQUE · {timeAgo(snapshot.fetchedAt)}
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
