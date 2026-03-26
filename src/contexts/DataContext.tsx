import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Product, StockItem, ShiftReport, StockMovement, User, AppSettings } from '@/types';

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
  addToStock: (productId: string, qty: number, userId: string) => void;
  getStockQuantity: (productId: string) => number;
  reduceStock: (productId: string, qty: number) => void;
  addReport: (r: ShiftReport) => void;
  addUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  getProductById: (id: string) => Product | undefined;
}

const DataContext = createContext<DataContextType | null>(null);

function load<T>(key: string, fallback: T): T {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : fallback;
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Café Americano', price: 35, category: 'Bebidas', unit: 'taza' },
  { id: 'p2', name: 'Cappuccino', price: 45, category: 'Bebidas', unit: 'taza' },
  { id: 'p3', name: 'Latte', price: 50, category: 'Bebidas', unit: 'taza' },
  { id: 'p4', name: 'Pan de Chocolate', price: 25, category: 'Panadería', unit: 'pieza' },
  { id: 'p5', name: 'Croissant', price: 30, category: 'Panadería', unit: 'pieza' },
  { id: 'p6', name: 'Sandwich Club', price: 65, category: 'Alimentos', unit: 'pieza' },
];

const DEFAULT_SETTINGS: AppSettings = {
  businessName: 'Mi Negocio',
  logoUrl: null,
  backgroundUrl: null,
  qrUrl: null,
  theme: 'default',
  font: 'Source Sans 3',
};

const DEFAULT_USERS: User[] = [
  { id: 'dev-1', username: 'dev', password: 'dev123', name: 'Desarrollador', role: 'dev', createdAt: new Date().toISOString() },
  { id: 'admin-1', username: 'admin', password: 'admin123', name: 'Administrador', role: 'admin', createdAt: new Date().toISOString() },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => load('products', DEFAULT_PRODUCTS));
  const [stock, setStock] = useState<StockItem[]>(() => load('stock', []));
  const [reports, setReports] = useState<ShiftReport[]>(() => load('reports', []));
  const [movements, setMovements] = useState<StockMovement[]>(() => load('movements', []));
  const [users, setUsers] = useState<User[]>(() => load('users', DEFAULT_USERS));
  const [settings, setSettings] = useState<AppSettings>(() => load('settings', DEFAULT_SETTINGS));

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

  const addToStock = useCallback((productId: string, qty: number, userId: string) => {
    const product = products.find(p => p.id === productId);
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
  }, [products]);

  const getStockQuantity = useCallback((productId: string) => {
    return stock.find(s => s.productId === productId)?.quantity || 0;
  }, [stock]);

  const reduceStock = useCallback((productId: string, qty: number) => {
    setS(prev => prev.map(s => s.productId === productId ? { ...s, quantity: Math.max(0, s.quantity - qty) } : s));
  }, []);

  const addReport = useCallback((r: ShiftReport) => {
    setR(prev => [...prev, r]);
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
    setSt(prev => ({ ...prev, ...s }));
  }, []);

  const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);

  return (
    <DataContext.Provider value={{
      products, stock, reports, movements, users, settings,
      addProduct, updateProduct, deleteProduct,
      addToStock, getStockQuantity, reduceStock,
      addReport, addUser, updateUser, deleteUser,
      updateSettings, getProductById,
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
