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

export interface RegisteredTerminal {
  id: string; // Terminal ID (ej: GV-FF46-931C)
  businessName: string; // Nombre del negocio asignado
  clientName?: string; // Nombre del cliente
  clientPhone?: string; // Teléfono / WhatsApp
  planType: 'lifetime' | 'timed_37' | 'timed_30' | 'timed_90' | 'promo_custom' | 'none';
  planLabel: string;
  pricePaid?: number;
  currency?: string;
  status: 'active' | 'blocked' | 'pending';
  activatedAt: string;
  expiresAt?: string | null;
  lastSeenOnline?: string;
  notes?: string;
}

export interface LicensePromo {
  id: string;
  title: string;
  description: string;
  durationDays: number;
  price: number;
  currency: string;
  active: boolean;
  highlightBadge?: string;
}

export interface PaymentTransaction {
  id: string;
  terminalId: string;
  businessName: string;
  clientName?: string;
  clientPhone?: string;
  planId: 'timed_37' | 'timed_90' | 'timed_365' | 'lifetime' | string;
  planTitle: string;
  amount: number;
  currency: string;
  transactionNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedKey?: string;
}

export interface BankPaymentConfig {
  cardNumber: string;
  confirmPhone: string;
  beneficiaryName: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  lifetimePrice: number;
  currency: string;
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
  animatedLoginEnabled?: boolean; // Activar login animado con mascota por hora del día (por defecto apagado)
  welcomeGreetingsEnabled?: boolean; // mostrar saludo y frase motivacional diaria del turno
  soundEffectsEnabled?: boolean; // reproducir efectos de sonido (bienvenida, confirmación, papelera)
  quoteLanguages?: string[]; // idiomas de las frases motivacionales: ['es'], ['en'], ['pt'], etc.
  allowNewRegistrations?: boolean; // si está desactivado, se bloquean nuevos registros de licencias
  blockedTerminalIds?: string[]; // lista negra de terminales bloqueados
  registeredTerminals?: RegisteredTerminal[]; // base de datos de terminales
  promos?: LicensePromo[]; // promociones configurables por Julio_GE
  bankPaymentConfig?: BankPaymentConfig; // configuración de pagos por transferencia
  paymentTransactions?: PaymentTransaction[]; // historial de transacciones recibidas
}
