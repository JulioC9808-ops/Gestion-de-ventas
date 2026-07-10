import { useEffect } from 'react';
import { useData } from '@/contexts/DataContext';

// Todos los temas definen EXACTAMENTE las mismas variables (paridad completa)
// para que al cambiar de un tema a otro no queden valores residuales.
type ThemeVars = Record<string, string>;

const WHITE: ThemeVars = {
  '--background': '0 0% 100%',
  '--foreground': '0 0% 0%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 0%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 0%',
  '--primary': '0 0% 0%',
  '--primary-foreground': '0 0% 100%',
  '--secondary': '0 0% 96%',
  '--secondary-foreground': '0 0% 0%',
  '--muted': '0 0% 96%',
  '--muted-foreground': '0 0% 30%',
  '--accent': '0 0% 10%',
  '--accent-foreground': '0 0% 100%',
  '--destructive': '0 72% 45%',
  '--destructive-foreground': '0 0% 100%',
  '--success': '142 65% 38%',
  '--success-foreground': '0 0% 100%',
  '--warning': '38 92% 45%',
  '--warning-foreground': '0 0% 100%',
  '--border': '0 0% 85%',
  '--input': '0 0% 85%',
  '--ring': '0 0% 0%',
  '--sidebar-background': '0 0% 98%',
  '--sidebar-foreground': '0 0% 0%',
  '--sidebar-primary': '0 0% 0%',
  '--sidebar-primary-foreground': '0 0% 100%',
  '--sidebar-accent': '0 0% 92%',
  '--sidebar-accent-foreground': '0 0% 0%',
  '--sidebar-border': '0 0% 85%',
  '--sidebar-ring': '0 0% 0%',
};

// Helper: genera un tema completo a partir de valores base
function buildTheme(overrides: Partial<ThemeVars>): ThemeVars {
  return { ...WHITE, ...overrides };
}

const THEMES: Record<string, ThemeVars> = {
  white: WHITE,
  // NEGRO PURO — todo oscuro, letras claras (incluye tarjetas, popovers, sidebar)
  black: buildTheme({
    '--background': '0 0% 6%',
    '--foreground': '0 0% 98%',
    '--card': '0 0% 10%',
    '--card-foreground': '0 0% 98%',
    '--popover': '0 0% 10%',
    '--popover-foreground': '0 0% 98%',
    '--primary': '0 0% 98%',
    '--primary-foreground': '0 0% 8%',
    '--secondary': '0 0% 15%',
    '--secondary-foreground': '0 0% 98%',
    '--muted': '0 0% 14%',
    '--muted-foreground': '0 0% 70%',
    '--accent': '0 0% 20%',
    '--accent-foreground': '0 0% 98%',
    '--border': '0 0% 22%',
    '--input': '0 0% 22%',
    '--ring': '0 0% 98%',
    '--sidebar-background': '0 0% 4%',
    '--sidebar-foreground': '0 0% 95%',
    '--sidebar-primary': '0 0% 98%',
    '--sidebar-primary-foreground': '0 0% 8%',
    '--sidebar-accent': '0 0% 12%',
    '--sidebar-accent-foreground': '0 0% 95%',
    '--sidebar-border': '0 0% 18%',
    '--sidebar-ring': '0 0% 98%',
  }),
  sunset: buildTheme({
    '--background': '30 30% 96%',
    '--foreground': '15 40% 12%',
    '--card': '30 40% 99%',
    '--card-foreground': '15 40% 12%',
    '--popover': '30 40% 99%',
    '--popover-foreground': '15 40% 12%',
    '--primary': '15 80% 50%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '30 30% 90%',
    '--secondary-foreground': '15 40% 15%',
    '--muted': '30 20% 93%',
    '--muted-foreground': '15 25% 30%',
    '--accent': '25 70% 45%',
    '--accent-foreground': '0 0% 100%',
    '--border': '30 20% 82%',
    '--input': '30 20% 82%',
    '--ring': '15 80% 50%',
    '--sidebar-background': '15 40% 12%',
    '--sidebar-foreground': '30 30% 95%',
    '--sidebar-primary': '15 80% 55%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '15 30% 22%',
    '--sidebar-accent-foreground': '30 30% 95%',
    '--sidebar-border': '15 30% 20%',
    '--sidebar-ring': '15 80% 55%',
  }),
  forest: buildTheme({
    '--background': '140 20% 96%',
    '--foreground': '150 30% 8%',
    '--card': '140 25% 99%',
    '--card-foreground': '150 30% 8%',
    '--popover': '140 25% 99%',
    '--popover-foreground': '150 30% 8%',
    '--primary': '150 60% 30%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '140 15% 90%',
    '--secondary-foreground': '150 30% 12%',
    '--muted': '140 10% 92%',
    '--muted-foreground': '150 20% 30%',
    '--accent': '145 50% 28%',
    '--accent-foreground': '0 0% 100%',
    '--border': '140 15% 82%',
    '--input': '140 15% 82%',
    '--ring': '150 60% 30%',
    '--sidebar-background': '150 40% 10%',
    '--sidebar-foreground': '140 20% 95%',
    '--sidebar-primary': '150 60% 45%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '150 25% 20%',
    '--sidebar-accent-foreground': '140 20% 95%',
    '--sidebar-border': '150 25% 18%',
    '--sidebar-ring': '150 60% 45%',
  }),
  ocean: buildTheme({
    '--background': '210 30% 97%',
    '--foreground': '220 30% 8%',
    '--card': '210 40% 99%',
    '--card-foreground': '220 30% 8%',
    '--popover': '210 40% 99%',
    '--popover-foreground': '220 30% 8%',
    '--primary': '215 70% 45%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '210 20% 90%',
    '--secondary-foreground': '220 30% 12%',
    '--muted': '210 15% 92%',
    '--muted-foreground': '215 20% 30%',
    '--accent': '210 60% 40%',
    '--accent-foreground': '0 0% 100%',
    '--border': '210 20% 82%',
    '--input': '210 20% 82%',
    '--ring': '215 70% 45%',
    '--sidebar-background': '220 40% 10%',
    '--sidebar-foreground': '210 30% 95%',
    '--sidebar-primary': '215 70% 55%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '220 25% 20%',
    '--sidebar-accent-foreground': '210 30% 95%',
    '--sidebar-border': '220 25% 18%',
    '--sidebar-ring': '215 70% 55%',
  }),
  night: buildTheme({
    '--background': '240 15% 12%',
    '--foreground': '240 10% 95%',
    '--card': '240 15% 16%',
    '--card-foreground': '240 10% 95%',
    '--popover': '240 15% 16%',
    '--popover-foreground': '240 10% 95%',
    '--primary': '250 60% 60%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '240 12% 22%',
    '--secondary-foreground': '240 10% 92%',
    '--muted': '240 12% 20%',
    '--muted-foreground': '240 8% 70%',
    '--accent': '245 50% 50%',
    '--accent-foreground': '0 0% 100%',
    '--border': '240 12% 25%',
    '--input': '240 12% 25%',
    '--ring': '250 60% 60%',
    '--sidebar-background': '240 15% 8%',
    '--sidebar-foreground': '240 10% 92%',
    '--sidebar-primary': '250 60% 65%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '240 15% 18%',
    '--sidebar-accent-foreground': '240 10% 92%',
    '--sidebar-border': '240 15% 22%',
    '--sidebar-ring': '250 60% 65%',
  }),
  coffee: buildTheme({
    '--background': '30 15% 95%',
    '--foreground': '25 45% 10%',
    '--card': '30 20% 98%',
    '--card-foreground': '25 45% 10%',
    '--popover': '30 20% 98%',
    '--popover-foreground': '25 45% 10%',
    '--primary': '25 60% 35%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '30 15% 88%',
    '--secondary-foreground': '25 45% 12%',
    '--muted': '30 10% 91%',
    '--muted-foreground': '25 25% 28%',
    '--accent': '30 50% 32%',
    '--accent-foreground': '0 0% 100%',
    '--border': '30 15% 80%',
    '--input': '30 15% 80%',
    '--ring': '25 60% 35%',
    '--sidebar-background': '25 45% 10%',
    '--sidebar-foreground': '30 15% 95%',
    '--sidebar-primary': '25 60% 50%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '25 30% 20%',
    '--sidebar-accent-foreground': '30 15% 95%',
    '--sidebar-border': '25 30% 18%',
    '--sidebar-ring': '25 60% 50%',
  }),
};

// Variables de texto que se sobrescriben cuando el usuario elige fontColor manual
const TEXT_VARS = [
  '--foreground',
  '--card-foreground',
  '--popover-foreground',
  '--secondary-foreground',
  '--muted-foreground',
  '--accent-foreground',
  '--sidebar-foreground',
  '--sidebar-accent-foreground',
];

export function useThemeApplier() {
  const { settings } = useData();

  useEffect(() => {
    const themeKey = settings.theme && THEMES[settings.theme] ? settings.theme : 'white';
    const vars = THEMES[themeKey];
    const root = document.documentElement;

    // 1) Aplicar TODAS las variables del tema (limpia residuos porque todos los temas
    //    tienen la misma lista de claves).
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 2) color-scheme para inputs nativos
    const bgLightness = parseInt(vars['--background'].split(' ')[2] || '100', 10);
    root.style.colorScheme = bgLightness < 50 ? 'dark' : 'light';

    // 3) Si hay fontColor personalizado, sobrescribe TODOS los textos.
    //    Si es null/vacío, elimina cualquier override previo para que respete el tema.
    if (settings.fontColor) {
      const hsl = hexToHsl(settings.fontColor);
      if (hsl) TEXT_VARS.forEach(k => root.style.setProperty(k, hsl));
    }
    // (no removemos porque el paso 1 ya reescribió los valores base del tema)

    // 4) Aplicar el color de fondo al <body> como fallback duro
    document.body.style.backgroundColor = `hsl(${vars['--background']})`;
    document.body.style.color = settings.fontColor
      ? settings.fontColor
      : `hsl(${vars['--foreground']})`;
  }, [settings.theme, settings.fontColor]);

  useEffect(() => {
    document.body.style.fontFamily = settings.font
      ? `'${settings.font}', system-ui, sans-serif`
      : '';
  }, [settings.font]);
}

function hexToHsl(hex: string): string | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return null;
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export const AVAILABLE_THEMES = Object.keys(THEMES);
