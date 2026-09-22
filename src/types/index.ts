export type UserRole = 'admin' | 'employee' | 'dev';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: UserRole;
  createdAt: string;
  salaryPercent?: number;
  /** Pista/nota personal para recordar la contraseña (no es la contraseña). */
  passwordHint?: string | null;
  /** Foto de perfil del usuario en alta resolución (Data URL) */
  avatarUrl?: string | null;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number; // precio de costo
  category: string;
  unit: string;
  inventoryQty: number; // total in warehouse/almacen
}

export interface StockItem {
  productId: string;
  quantity: number;
  addedAt: string;
  addedBy: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  quantitySold: number;
  subtotal: number;
}

export interface Transfer {
  id: string;
  amount: number;
  code: string;
}

export interface VipSale {
  id: string;
  concept: string;
  amount: number;
}

export interface ShiftReport {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  shift: 'morning' | 'afternoon';
  items: SaleItem[];
  cashTotal: number;
  cashBreakdown: Record<number, number>;
  transfers: Transfer[];
  vipSales: VipSale[];
  totalSold: number;
  salary: number;
  salaryPercent: number;
  status: 'balanced' | 'surplus' | 'deficit';
  difference: number;
  synced?: boolean;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  movedBy: string;
  movedAt: string;
}

export interface AppSettings {
  businessName: string;
  logoUrl: string | null;
  backgroundUrl: string | null;
  qrUrl: string | null;
  theme: string;
  font: string;
  fontColor?: string | null; // hex like #ffffff; null = usar el del tema
  navPosition: 'side' | 'side-right' | 'top';
  defaultSalaryPercent: number;
  salaryByPercentEnabled?: boolean;
  introVideoUrl?: string | null; // dataURL o URL de video que se reproduce al abrir la app
  introEnabled?: boolean;
  telegramUrl?: string | null;
  githubUpdatesUrl?: string | null;
  announcementUrl?: string | null;
  eulaText?: string | null; // texto EULA que se muestra la primera vez
  salesChartResetAt?: string | null; // ISO date: solo cuentan reportes con date >= a esta
}
