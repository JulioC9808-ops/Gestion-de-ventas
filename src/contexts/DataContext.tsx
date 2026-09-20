import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Product, StockItem, ShiftReport, StockMovement, User, AppSettings } from '@/types';
import type { BackupPayload } from '@/lib/backup';
import defaultQr from '@/assets/dev-qr.png.asset.json';

export const DEFAULT_DEV_QR_URL = defaultQr.url;

interface DataContextType {
  products: Product[];
  stock: StockItem[];
  reports: ShiftReport[];
  movements: StockMovement[];
  users: User[];
  settings: AppSettings;
  addProduct: (p: Omit<Product, 'id'>) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;
  addToStock: (productId: string, qty: number, userId: string) => boolean;
  getStockQuantity: (productId: string) => number;
  reduceStock: (productId: string, qty: number) => void;
  addReport: (r: ShiftReport) => void;
  clearReports: () => void;
  addUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  getProductById: (id: string) => Product | undefined;
  deleteMovement: (id: string) => void;
  /** Aplica un respaldo recibido por QR desde otro dispositivo. */
  applyBackup: (payload: BackupPayload) => void;
  /** Restablece el usuario administrador a admin / admin123. */
  resetAdminCredentials: () => void;
}

const DataContext = createContext<DataContextType | null>(null);

// ---- Anti-tamper: huella simple por clave ----
function fingerprint(value: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

const PROTECTED_KEYS = ['products', 'stock', 'reports', 'movements', 'users', 'settings'];

function verifyIntegrity() {
  try {
    for (const key of PROTECTED_KEYS) {
      const raw = localStorage.getItem(key);
      const fp = localStorage.getItem(`__fp_${key}`);
      if (raw && fp && fingerprint(raw) !== fp) {
        // Manipulación externa detectada: wipe defensivo
        PROTECTED_KEYS.forEach(k => {
          localStorage.removeItem(k);
          localStorage.removeItem(`__fp_${k}`);
        });
        console.warn('[Anti-Hacking] Manipulación externa detectada. Datos restablecidos.');
        return;
      }
    }
  } catch {
    // Integrity check failed or localStorage unavailable
  }
}

verifyIntegrity();

function load<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function save<T>(key: string, data: T) {
  const serialized = JSON.stringify(data);
  localStorage.setItem(key, serialized);
  localStorage.setItem(`__fp_${key}`, fingerprint(serialized));
}

// Se conservan TODOS los turnos cerrados (histórico completo).
// La única deduplicación real es por id, para evitar duplicados exactos por doble-clic.
function dedupeReports(reports: ShiftReport[]) {
  const seen = new Set<string>();
  const out: ShiftReport[] = [];
  for (const r of reports) {
    if (!r?.id || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Sin productos de ejemplo: el dueño crea su propio catálogo.
const DEFAULT_PRODUCTS: Product[] = [];

// IDs de los productos de demostración antiguos (se eliminan una sola vez)
const DEMO_PRODUCT_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const DEMO_WIPE_FLAG = '__demo_products_wiped_v1';

// Repo donde se publican las versiones de PC y Android
export const GITHUB_UPDATES_URL = 'https://github.com/JulioC9808-ops/Sistema-Updates';
// Ruta por defecto para avisos y comunicados
export const DEFAULT_ANNOUNCEMENT_URL = 'https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/announcement.json';

const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Mi Negocio',
  logoUrl: null,
  backgroundUrl: null,
  qrUrl: null,
  theme: 'white',
  font: 'Source Sans 3',
  fontColor: null,
  navPosition: 'top',
  defaultSalaryPercent: 2,
  salaryByPercentEnabled: false,
  telegramUrl: 'https://t.me/Gestion_Ventas',
  githubUpdatesUrl: GITHUB_UPDATES_URL,
  announcementUrl: DEFAULT_ANNOUNCEMENT_URL,
};

// Migración: borra SOLO los productos de demostración (y su stock/movimientos),
// conservando intactos los productos, reportes y datos creados por el usuario.
function wipeDemoProducts() {
  try {
    if (localStorage.getItem(DEMO_WIPE_FLAG)) return;
    const raw = localStorage.getItem('products');
    if (raw) {
      const list = JSON.parse(raw) as Product[];
      const kept = list.filter(p => !DEMO_PRODUCT_IDS.includes(p.id));
      if (kept.length !== list.length) {
        save('products', kept);
        const stockRaw = localStorage.getItem('stock');
        if (stockRaw) {
          const st = (JSON.parse(stockRaw) as StockItem[]).filter(s => !DEMO_PRODUCT_IDS.includes(s.productId));
          save('stock', st);
        }
        const movRaw = localStorage.getItem('movements');
        if (movRaw) {
          const mv = (JSON.parse(movRaw) as StockMovement[]).filter(m => !DEMO_PRODUCT_IDS.includes(m.productId));
          save('movements', mv);
        }
      }
    }
    localStorage.setItem(DEMO_WIPE_FLAG, '1');
  } catch {
    // Ignore error if localStorage is not accessible
  }
}

wipeDemoProducts();

const DEFAULT_USERS: User[] = [
  { id: 'dev-1', username: 'DEVJ260208C', password: 'J260208C', name: 'Desarrollador', role: 'dev', createdAt: new Date().toISOString() },
  { id: 'admin-1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin', createdAt: new Date().toISOString() },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => load('products', DEFAULT_PRODUCTS));
  const [stock, setStock] = useState<StockItem[]>(() => load('stock', []));
  const [reports, setReports] = useState<ShiftReport[]>(() => dedupeReports(load('reports', [])));
  const [movements, setMovements] = useState<StockMovement[]>(() => load('movements', []));
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = load<User[]>('users', DEFAULT_USERS);
    let changed = false;
    const migrated = loaded.map(u => {
      if (u.role === 'dev' && (u.username === 'dev' || u.password === 'dev123')) {
        changed = true;
        return { ...u, username: 'DEVJ260208C', password: 'J260208C', name: 'Desarrollador' };
      }
      return u;
    });
    if (changed) save('users', migrated);
    return migrated;
  });
  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = load<AppSettings>('settings', DEFAULT_SETTINGS);
    let dirty = false;
    // Migración: limpiar el QR por defecto antiguo (apuntaba a WhatsApp)
    if (loaded.qrUrl === defaultQr.url) {
      loaded.qrUrl = null;
      dirty = true;
    }
    // Migración: forzar tema blanco predeterminado (los temas oscuros antiguos daban ilegibilidad)
    if (!loaded.theme || loaded.theme === 'default' || loaded.theme === 'night') {
      loaded.theme = 'white';
      dirty = true;
    }
    if (!loaded.telegramUrl || loaded.telegramUrl.includes('Agu7IJDwGU4NGM5')) {
      loaded.telegramUrl = 'https://t.me/Gestion_Ventas';
      dirty = true;
    }
    // Migración: el repo antiguo de actualizaciones no existe, apuntar al correcto
    if (!loaded.githubUpdatesUrl || loaded.githubUpdatesUrl.includes('Gestion-de-ventas-PC')) {
      loaded.githubUpdatesUrl = GITHUB_UPDATES_URL;
      dirty = true;
    }
    if (!loaded.announcementUrl || loaded.announcementUrl.includes('Gestion-de-ventas-PC')) {
      loaded.announcementUrl = DEFAULT_ANNOUNCEMENT_URL;
      dirty = true;
    }
    if (dirty) save('settings', loaded);
    return loaded;
  });

  useEffect(() => {
    setReports(prev => {
      const next = dedupeReports(prev);
      save('reports', next);
      return next;
    });
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === null) {
        setProducts(load<Product[]>('products', DEFAULT_PRODUCTS));
        setStock(load<StockItem[]>('stock', []));
        setReports(dedupeReports(load<ShiftReport[]>('reports', [])));
        setMovements(load<StockMovement[]>('movements', []));
        setUsers(load<User[]>('users', DEFAULT_USERS));
        setSettings(load<AppSettings>('settings', DEFAULT_SETTINGS));
        return;
      }
      switch (event.key) {
        case 'products':
          setProducts(load<Product[]>('products', DEFAULT_PRODUCTS));
          break;
        case 'stock':
          setStock(load<StockItem[]>('stock', []));
          break;
        case 'reports':
          setReports(dedupeReports(load<ShiftReport[]>('reports', [])));
          break;
        case 'movements':
          setMovements(load<StockMovement[]>('movements', []));
          break;
        case 'users':
          setUsers(load<User[]>('users', DEFAULT_USERS));
          break;
        case 'settings':
          setSettings(load<AppSettings>('settings', DEFAULT_SETTINGS));
          break;
        default:
          break;
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const persist = <T,>(key: string, setter: React.Dispatch<React.SetStateAction<T>>) =>
    (updater: T | ((prev: T) => T)) => {
      setter(prev => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        save(key, next);
        return next;
      });
    };

  const setP = persist('products', setProducts);
  const setS = persist('stock', setStock);
  const setR = persist('reports', setReports);
  const setM = persist('movements', setMovements);
  const setU = persist('users', setUsers);
  const setSt = persist('settings', setSettings);

  const addProduct = useCallback((p: Omit<Product, 'id'>) => {
    setP(prev => [...prev, { ...p, id: crypto.randomUUID() }]);
  }, []);

  const updateProduct = useCallback((p: Product) => {
    setP(prev => prev.map(x => x.id === p.id ? p : x));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setP(prev => prev.filter(x => x.id !== id));
  }, []);

  // addToStock now deducts from product inventoryQty
  const addToStock = useCallback((productId: string, qty: number, userId: string): boolean => {
    const product = products.find(p => p.id === productId);
    if (!product || product.inventoryQty < qty) return false;
    // Deduct from inventory
    setP(prev => prev.map(p => p.id === productId ? { ...p, inventoryQty: p.inventoryQty - qty } : p));
    setS(prev => {
      const existing = prev.find(s => s.productId === productId);
      if (existing) {
        return prev.map(s => s.productId === productId ? { ...s, quantity: s.quantity + qty } : s);
      }
      return [...prev, { productId, quantity: qty, addedAt: new Date().toISOString(), addedBy: userId }];
    });
    setM(prev => [...prev, {
      id: crypto.randomUUID(),
      productId,
      productName: product?.name || '',
      quantity: qty,
      movedBy: userId,
      movedAt: new Date().toISOString(),
    }]);
    return true;
  }, [products]);

  const getStockQuantity = useCallback((productId: string) => {
    return stock.find(s => s.productId === productId)?.quantity || 0;
  }, [stock]);

  const reduceStock = useCallback((productId: string, qty: number) => {
    setS(prev => prev.map(s => s.productId === productId ? { ...s, quantity: Math.max(0, s.quantity - qty) } : s));
  }, []);

  const addReport = useCallback((r: ShiftReport) => {
    setR(prev => dedupeReports([...prev, r]));
  }, []);

  const clearReports = useCallback(() => {
    setR(() => []);
  }, []);

  const addUser = useCallback((u: Omit<User, 'id' | 'createdAt'>) => {
    setU(prev => [...prev, { ...u, id: crypto.randomUUID(), createdAt: new Date().toISOString() }]);
  }, []);

  const updateUser = useCallback((u: User) => {
    setU(prev => prev.map(x => x.id === u.id ? u : x));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setU(prev => prev.filter(x => x.id !== id));
  }, []);

  const updateSettings = useCallback((s: Partial<AppSettings>) => {
    if (s.defaultSalaryPercent !== undefined && s.defaultSalaryPercent !== settings.defaultSalaryPercent) {
      setU(prev => prev.map(user => {
        if (user.role !== 'employee') return user;
        if (user.salaryPercent == null || user.salaryPercent === settings.defaultSalaryPercent) {
          const { salaryPercent: _salaryPercent, ...nextUser } = user;
          return nextUser;
        }
        return user;
      }));
    }
    setSt(prev => ({ ...prev, ...s }));
  }, [settings.defaultSalaryPercent]);

  const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);

  // Al eliminar un movimiento REVERTIMOS la acción:
  // - quita del stock de venta la cantidad (nunca por debajo de 0)
  // - devuelve la cantidad completa al almacén (inventoryQty del producto)
  const deleteMovement = useCallback((id: string) => {
    setM(prev => {
      const mov = prev.find(x => x.id === id);
      if (mov) {
        // Restar del stock de venta (nunca negativo)
        setS(stPrev => stPrev.map(s =>
          s.productId === mov.productId
            ? { ...s, quantity: Math.max(0, s.quantity - mov.quantity) }
            : s
        ));
        // Devolver al almacén
        setP(pPrev => pPrev.map(p =>
          p.id === mov.productId
            ? { ...p, inventoryQty: (p.inventoryQty || 0) + mov.quantity }
            : p
        ));
      }
      return prev.filter(x => x.id !== id);
    });
  }, []);

  // Aplica un respaldo recibido por QR. Se respetan las imágenes locales
  // (logo/fondo/QR) porque no viajan en el respaldo.
  const applyBackup = useCallback((payload: BackupPayload) => {
    setP(() => payload.products || []);
    setS(() => payload.stock || []);
    setM(() => payload.movements || []);
    setU(() => payload.users || []);
    // Los cierres de turno se FUSIONAN (nunca se pierde historial de ningún dispositivo)
    if (payload.reports?.length) {
      setR(prev => dedupeReports([...prev, ...payload.reports!]));
    }
    setSt(prev => ({
      ...prev,
      ...payload.settings,
      logoUrl: prev.logoUrl,
      backgroundUrl: prev.backgroundUrl,
      qrUrl: prev.qrUrl,
    }));
  }, []);

  // Restablece el administrador principal a las credenciales iniciales.
  const resetAdminCredentials = useCallback(() => {
    setU(prev => {
      const admins = prev
        .filter(u => u.role === 'admin')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const target = admins[0];
      if (!target) {
        return [...prev, {
          id: crypto.randomUUID(),
          username: 'admin',
          password: 'admin123',
          name: 'Administrador',
          role: 'admin' as const,
          createdAt: new Date().toISOString(),
        }];
      }
      return prev.map(u =>
        u.id === target.id ? { ...u, username: 'admin', password: 'admin123', passwordHint: null } : u
      );
    });
  }, []);

  return (
    <DataContext.Provider value={{
      products, stock, reports, movements, users, settings,
      addProduct, updateProduct, deleteProduct,
      addToStock, getStockQuantity, reduceStock,
      addReport, clearReports, addUser, updateUser, deleteUser,
      updateSettings, getProductById, deleteMovement,
      applyBackup, resetAdminCredentials,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
