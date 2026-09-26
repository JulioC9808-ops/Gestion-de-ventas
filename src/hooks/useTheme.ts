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
    '--background': '0 0% 3%',
    '--foreground': '0 0% 98%',
    '--card': '0 0% 8%',
    '--card-foreground': '0 0% 98%',
    '--popover': '0 0% 8%',
    '--popover-foreground': '0 0% 98%',
    '--primary': '0 0% 98%',
    '--primary-foreground': '0 0% 5%',
    '--secondary': '0 0% 12%',
    '--secondary-foreground': '0 0% 98%',
    '--muted': '0 0% 11%',
    '--muted-foreground': '0 0% 70%',
    '--accent': '0 0% 16%',
    '--accent-foreground': '0 0% 98%',
    '--border': '0 0% 16%',
    '--input': '0 0% 14%',
    '--ring': '0 0% 98%',
    '--sidebar-background': '0 0% 2%',
    '--sidebar-foreground': '0 0% 95%',
    '--sidebar-primary': '0 0% 98%',
    '--sidebar-primary-foreground': '0 0% 5%',
    '--sidebar-accent': '0 0% 9%',
    '--sidebar-accent-foreground': '0 0% 95%',
    '--sidebar-border': '0 0% 14%',
    '--sidebar-ring': '0 0% 98%',
  }),
  // Atardecer: cálido, tonos naranja/durazno en todo el fondo
  sunset: buildTheme({
    '--background': '25 70% 88%',
    '--foreground': '15 55% 12%',
    '--card': '25 80% 94%',
    '--card-foreground': '15 55% 12%',
    '--popover': '25 80% 94%',
    '--popover-foreground': '15 55% 12%',
    '--primary': '15 80% 45%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '25 55% 82%',
    '--secondary-foreground': '15 55% 15%',
    '--muted': '25 45% 85%',
    '--muted-foreground': '15 35% 25%',
    '--accent': '25 70% 45%',
    '--accent-foreground': '0 0% 100%',
    '--border': '25 40% 72%',
    '--input': '25 40% 78%',
    '--ring': '15 80% 45%',
    '--sidebar-background': '15 55% 18%',
    '--sidebar-foreground': '25 60% 95%',
    '--sidebar-primary': '15 80% 55%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '15 40% 28%',
    '--sidebar-accent-foreground': '25 60% 95%',
    '--sidebar-border': '15 40% 25%',
    '--sidebar-ring': '15 80% 55%',
  }),
  // Bosque: verdes en toda la interfaz
  forest: buildTheme({
    '--background': '140 40% 85%',
    '--foreground': '150 50% 10%',
    '--card': '140 45% 92%',
    '--card-foreground': '150 50% 10%',
    '--popover': '140 45% 92%',
    '--popover-foreground': '150 50% 10%',
    '--primary': '150 60% 28%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '140 30% 78%',
    '--secondary-foreground': '150 50% 12%',
    '--muted': '140 25% 82%',
    '--muted-foreground': '150 30% 22%',
    '--accent': '145 55% 28%',
    '--accent-foreground': '0 0% 100%',
    '--border': '140 25% 68%',
    '--input': '140 25% 76%',
    '--ring': '150 60% 28%',
    '--sidebar-background': '150 50% 12%',
    '--sidebar-foreground': '140 30% 95%',
    '--sidebar-primary': '150 60% 45%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '150 35% 22%',
    '--sidebar-accent-foreground': '140 30% 95%',
    '--sidebar-border': '150 35% 20%',
    '--sidebar-ring': '150 60% 45%',
  }),
  // Océano: azules en toda la interfaz
  ocean: buildTheme({
    '--background': '205 60% 86%',
    '--foreground': '220 55% 10%',
    '--card': '205 70% 93%',
    '--card-foreground': '220 55% 10%',
    '--popover': '205 70% 93%',
    '--popover-foreground': '220 55% 10%',
    '--primary': '215 75% 42%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '205 45% 78%',
    '--secondary-foreground': '220 55% 12%',
    '--muted': '205 35% 82%',
    '--muted-foreground': '215 35% 25%',
    '--accent': '210 65% 38%',
    '--accent-foreground': '0 0% 100%',
    '--border': '205 35% 68%',
    '--input': '205 35% 76%',
    '--ring': '215 75% 42%',
    '--sidebar-background': '220 55% 12%',
    '--sidebar-foreground': '205 50% 95%',
    '--sidebar-primary': '215 75% 55%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '220 40% 22%',
    '--sidebar-accent-foreground': '205 50% 95%',
    '--sidebar-border': '220 40% 20%',
    '--sidebar-ring': '215 75% 55%',
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
  // Café: marrones cálidos en toda la interfaz
  coffee: buildTheme({
    '--background': '28 45% 82%',
    '--foreground': '25 55% 10%',
    '--card': '30 50% 90%',
    '--card-foreground': '25 55% 10%',
    '--popover': '30 50% 90%',
    '--popover-foreground': '25 55% 10%',
    '--primary': '25 65% 32%',
    '--primary-foreground': '0 0% 100%',
    '--secondary': '28 35% 75%',
    '--secondary-foreground': '25 55% 12%',
    '--muted': '28 25% 80%',
    '--muted-foreground': '25 30% 25%',
    '--accent': '25 55% 30%',
    '--accent-foreground': '0 0% 100%',
    '--border': '28 25% 65%',
    '--input': '28 25% 72%',
    '--ring': '25 65% 32%',
    '--sidebar-background': '25 55% 12%',
    '--sidebar-foreground': '28 30% 95%',
    '--sidebar-primary': '25 65% 50%',
    '--sidebar-primary-foreground': '0 0% 100%',
    '--sidebar-accent': '25 40% 22%',
    '--sidebar-accent-foreground': '28 30% 95%',
    '--sidebar-border': '25 40% 20%',
    '--sidebar-ring': '25 65% 50%',
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
    const vars = THEMES[themeKey] || THEMES.white;
    const root = document.documentElement;

    // 1) Aplicar TODAS las variables del tema
    root.setAttribute('data-theme', themeKey);
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // 2) color-scheme y clase .dark para Tailwind y componentes
    const bgLightness = parseInt(vars['--background'].split(' ')[2] || '100', 10);
    const isDark = bgLightness < 50;
    root.style.colorScheme = isDark ? 'dark' : 'light';
    root.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);

    // 3) Si hay fontColor personalizado, sobrescribe textos con contraste garantizado
    if (settings.fontColor) {
      const hsl = hexToHsl(settings.fontColor);
      if (hsl) {
        root.style.setProperty('--foreground', hsl);
        root.style.setProperty('--card-foreground', hsl);
        root.style.setProperty('--popover-foreground', hsl);
        root.style.setProperty('--secondary-foreground', hsl);
        root.style.setProperty('--sidebar-foreground', hsl);
        root.style.setProperty('--sidebar-accent-foreground', hsl);

        // Muted foreground: mantener contraste relativo para que etiquetas y subtítulos sean legibles
        const parts = hsl.split(' ');
        if (parts.length === 3) {
          const lNum = parseInt(parts[2], 10);
          const mutedL = isDark ? Math.max(lNum - 26, 68) : Math.min(lNum + 28, 42);
          root.style.setProperty('--muted-foreground', `${parts[0]} ${parts[1]} ${mutedL}%`);
        }
      }
    }

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
