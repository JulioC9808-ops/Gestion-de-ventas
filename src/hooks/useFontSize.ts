import { useState, useEffect } from 'react';

export type FontSizeKey = 'sm' | 'base' | 'md' | 'lg' | 'xl';

export interface FontSizeOption {
  key: FontSizeKey;
  label: string;
  sublabel: string;
  scalePercent: number;
  previewSize: string;
  badge: string;
}

export const FONT_SIZE_OPTIONS: FontSizeOption[] = [
  { key: 'sm', label: 'Compacta', sublabel: 'Para pantallas con mucha información', scalePercent: 92, previewSize: '14px', badge: '92%' },
  { key: 'base', label: 'Normal', sublabel: 'Tamaño estándar del sistema', scalePercent: 100, previewSize: '16px', badge: '100%' },
  { key: 'md', label: 'Mediana', sublabel: 'Lectura más cómoda y clara', scalePercent: 110, previewSize: '17.5px', badge: '110%' },
  { key: 'lg', label: 'Grande', sublabel: 'Texto ampliado de alta visibilidad', scalePercent: 120, previewSize: '19px', badge: '120%' },
  { key: 'xl', label: 'Extra Grande', sublabel: 'Máxima legibilidad y contraste', scalePercent: 130, previewSize: '21px', badge: '130%' },
];

const STORAGE_KEY = 'local_device_font_size';

export function getSavedFontSize(): FontSizeKey {
  if (typeof window === 'undefined') return 'base';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as FontSizeKey | null;
    if (saved && FONT_SIZE_OPTIONS.some(opt => opt.key === saved)) {
      return saved;
    }
  } catch {
    // fallback
  }
  return 'base';
}

export function applyFontSizeToDOM(key: FontSizeKey) {
  if (typeof document === 'undefined') return;
  const option = FONT_SIZE_OPTIONS.find(o => o.key === key) || FONT_SIZE_OPTIONS[1];
  // Aplicar porcentaje al elemento raíz para escalar unidades rem de forma natural y armónica
  document.documentElement.style.fontSize = `${option.scalePercent}%`;
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSizeKey>(() => getSavedFontSize());

  useEffect(() => {
    applyFontSizeToDOM(fontSize);
  }, [fontSize]);

  const setFontSize = (newKey: FontSizeKey) => {
    setFontSizeState(newKey);
    try {
      localStorage.setItem(STORAGE_KEY, newKey);
    } catch {
      // safe
    }
    applyFontSizeToDOM(newKey);
  };

  return { fontSize, setFontSize, options: FONT_SIZE_OPTIONS };
}
