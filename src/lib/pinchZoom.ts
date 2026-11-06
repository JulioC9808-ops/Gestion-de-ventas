/**
 * Gestor de Zoom / Escala Visual.
 * No utiliza body.style.zoom ni transform: scale() en contenedores de aplicación,
 * ya que en WebViews móviles (Android/WebKit) distorsionan las coordenadas de scroll
 * y bloquean el desplazamiento con el dedo.
 *
 * Utiliza escalado armónico mediante tamaño de fuente raíz (rem), permitiendo que
 * toda la interfaz (tipografía, espacios, tamaños de componentes) responda a la escala
 * elegida sin romper contenedores ni impedir el deslizamiento horizontal o vertical.
 */

import { isMobileDevice } from '@/lib/platform';

const STORAGE_KEY = 'gv_personal_ui_zoom';

let currentScale = 1.0;

export function getSavedScale(): number {
  if (typeof window === 'undefined') return 1.0;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0.70 && parsed <= 1.40) {
        return parsed;
      }
    }
  } catch {
    // Silencioso
  }
  return 1.0;
}

export function saveScale(scale: number): void {
  try {
    const clamped = Math.max(0.70, Math.min(1.35, Math.round(scale * 100) / 100));
    localStorage.setItem(STORAGE_KEY, String(clamped));
  } catch {
    // Silencioso
  }
}

export function getCurrentScale(): number {
  return currentScale;
}

export function applyScale(scale: number, _showFeedback = false): void {
  if (typeof document === 'undefined') return;
  const clamped = Math.max(0.70, Math.min(1.35, Math.round(scale * 100) / 100));
  currentScale = clamped;

  try {
    const html = document.documentElement;
    const body = document.body;

    // Limpieza estricta: retirar cualquier propiedad zoom de WebKit que impida el scroll
    if (body) {
      body.style.removeProperty('zoom');
      body.style.removeProperty('--gv-ui-zoom');
      (body.style as unknown as { zoom: string }).zoom = '';
    }
    if (html) {
      html.style.removeProperty('zoom');
      html.style.removeProperty('--gv-ui-zoom');
      (html.style as unknown as { zoom: string }).zoom = '';
    }

    // Aplicar escala a través del tamaño de fuente raíz del documento (rem scaling).
    // Base móvil (<=767px): 15px (93.75%). Base escritorio: 16px (100%).
    const isMobileViewport = typeof window !== 'undefined' && (window.innerWidth <= 767 || isMobileDevice());
    const basePercent = isMobileViewport ? 93.75 : 100;
    const computedPercent = Math.round(basePercent * clamped * 10) / 10;

    html.style.fontSize = `${computedPercent}%`;
    html.style.setProperty('--gv-ui-scale', String(clamped));

    const toastEl = document.getElementById('gv-pinch-zoom-indicator');
    if (toastEl) {
      toastEl.remove();
    }
  } catch {
    // Silencioso
  }
}

export function resetZoom(): void {
  applyScale(1.0);
  saveScale(1.0);
}

export function setPinchZoomActive(active: boolean, forceScale?: number): void {
  if (typeof window === 'undefined') return;
  if (!active) {
    // Modo pantalla fija (ej. Login en Android al 80% o PC al 100%)
    const targetScale = typeof forceScale === 'number' ? forceScale : 1.0;
    applyScale(targetScale);
    return;
  }

  // Activo dentro de la aplicación principal: restaurar la escala guardada del usuario
  const saved = getSavedScale();
  applyScale(saved);
}

export function initPinchZoom(): () => void {
  // Inicialización limpia
  const initialScale = getSavedScale();
  applyScale(initialScale);

  return () => {
    // Limpieza al desmontar
  };
}
