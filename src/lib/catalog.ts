// Catálogo de categorías con emoji y unidades sugeridas.
// Si un producto no coincide con ninguna categoría, se marca como "Otros" 📦.

export interface CategoryOption {
  value: string;
  emoji: string;
  keywords?: string[];
}

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'Café', emoji: '☕', keywords: ['café', 'cafe', 'cafetería', 'cafeteria', 'espresso', 'capuchino', 'cappuccino', 'latte'] },
  { value: 'Bebidas', emoji: '🥤', keywords: ['bebida', 'jugo', 'refresco', 'té', 'te', 'agua'] },
  { value: 'Botellas', emoji: '🍾', keywords: ['botella', 'vino', 'licor', 'ron', 'whisky', 'cerveza'] },
  { value: 'Latas', emoji: '🥫', keywords: ['lata', 'conserva', 'enlatado', 'puré', 'leche condensada', 'cerveza'] },
  { value: 'Alimentos', emoji: '🍽️', keywords: ['alimento', 'comida', 'plato', 'sandwich', 'hamburguesa', 'pizza'] },
  { value: 'Panadería', emoji: '🥖', keywords: ['pan', 'panadería', 'panaderia', 'croissant', 'bolleria', 'dulce', 'kake'] },
  { value: 'Caramelos', emoji: '🍬', keywords: ['caramelo', 'dulce', 'chocolate', 'bombón', 'chupa chupa', 'chicle'] },
  { value: 'Helados', emoji: '🍦', keywords: ['helado', 'nieve', 'paleta'] },
  { value: 'Galletas', emoji: '🍪', keywords: ['galleta', 'galletas', 'galletica', 'cookie', 'oreo', 'barquillo'] },
  { value: 'Snacks', emoji: '🍿', keywords: ['pelli', 'papas', 'chips', 'palomitas'] },
  { value: 'Cigarros', emoji: '🚬', keywords: ['cigarro', 'tabaco', 'cigarrillo'] },
  { value: 'Limpieza', emoji: '🧴', keywords: ['limpieza', 'jabón', 'frazada', 'detergente', 'cloro'] },
  { value: 'Otros', emoji: '📦' },
];

export const UNIT_OPTIONS = [
  'c/u', 'pieza', 'taza', 'botella', 'lata', 'paquete', 'caja', 'kg', 'g', 'L', 'ml',
];

export function getCategoryEmoji(rawCategory: string | undefined | null): string {
  if (!rawCategory) return '📦';
  const cat = rawCategory.trim().toLowerCase();
  // Coincidencia exacta con el nombre
  const exact = CATEGORY_OPTIONS.find(c => c.value.toLowerCase() === cat);
  if (exact) return exact.emoji;
  // Coincidencia parcial por palabras clave
  const partial = CATEGORY_OPTIONS.find(c =>
    c.keywords?.some(k => cat.includes(k) || k.includes(cat))
  );
  return partial ? partial.emoji : '📦';
}
