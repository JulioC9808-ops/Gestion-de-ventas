import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Product, StockItem, ShiftReport, StockMovement, User, AppSettings } from '@/types';
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
  addUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  getProductById: (id: string) => Product | undefined;
  deleteMovement: (id: string) => void;
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
  } catch {}
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

function getReportKey(report: ShiftReport) {
  const date = new Date(report.date);
  const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return `${report.employeeId}-${report.shift}-${dayKey}`;
}

function dedupeReports(reports: ShiftReport[]) {
  const latestByKey = new Map<string, ShiftReport>();

  reports.forEach(report => {
    latestByKey.set(getReportKey(report), report);
  });

  return Array.from(latestByKey.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Café Americano', price: 35, costPrice: 10, category: 'Bebidas', unit: 'taza', inventoryQty: 100 },
  { id: 'p2', name: 'Cappuccino', price: 45, costPrice: 15, category: 'Bebidas', unit: 'taza', inventoryQty: 80 },
  { id: 'p3', name: 'Latte', price: 50, costPrice: 18, category: 'Bebidas', unit: 'taza', inventoryQty: 80 },
  { id: 'p4', name: 'Pan de Chocolate', price: 25, costPrice: 8, category: 'Panadería', unit: 'pieza', inventoryQty: 50 },
  { id: 'p5', name: 'Croissant', price: 30, costPrice: 10, category: 'Panadería', unit: 'pieza', inventoryQty: 40 },
  { id: 'p6', name: 'Sandwich Club', price: 65, costPrice: 25, category: 'Alimentos', unit: 'pieza', inventoryQty: 30 },
];

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
};

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
    // Migración: limpiar el QR por defecto antiguo (apuntaba a WhatsApp)
    if (loaded.qrUrl === defaultQr.url) {
      loaded.qrUrl = null;
      save('settings', loaded);
    }
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

  const deleteMovement = useCallback((id: string) => {
    setM(prev => prev.filter(x => x.id !== id));
  }, []);

  return (
    <DataContext.Provider value={{
      products, stock, reports, movements, users, settings,
      addProduct, updateProduct, deleteProduct,
      addToStock, getStockQuantity, reduceStock,
      addReport, addUser, updateUser, deleteUser,
      updateSettings, getProductById, deleteMovement,
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
