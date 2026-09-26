/**
 * Gestor de escala táctil (Pinch-to-zoom / Pellizcar) para Android y móvil.
 * Permite reducir o aumentar toda la interfaz al pellizcar con 2 dedos.
 * - Ajuste 100% local al dispositivo (NO se transfiere por QR ni exportaciones).
 * - Rango de escala seguro: 0.65x (muy compacto) a 1.40x (ampliado).
 * - El zoom táctil se activa ÚNICAMENTE a partir de la pantalla de login (después de la carga/intro)
 *   para garantizar que el video y pantalla de presentación siempre llenen el 100% de la pantalla.
 */

const STORAGE_KEY = 'gv_personal_ui_zoom';
const MIN_SCALE = 0.70;
const MAX_SCALE = 1.35;
const PINCH_MIN_SCALE = 0.75;
const PINCH_MAX_SCALE = 1.05; // El pellizco se limita a achicar / compactar la escala (el zoom ampliado se hace con la lupita)

let currentScale = 1.0;
let initialDistance = 0;
let initialScale = 1.0;
let isPinching = false;
let isPinchZoomActive = false;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let toastEl: HTMLDivElement | null = null;

export function getSavedScale(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const num = parseFloat(raw);
      if (!isNaN(num) && num >= MIN_SCALE && num <= MAX_SCALE) {
        return Math.round(num * 100) / 100;
      }
    }
  } catch {
    // Silencioso
  }
  return 1.0;
}

export function saveScale(scale: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(scale * 100) / 100));
  } catch {
    // Silencioso
  }
}

export function applyScale(scale: number, showFeedback = false): void {
  const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(scale * 100) / 100));
  currentScale = clamped;

  if (typeof document !== 'undefined') {
    try {
      const body = document.body;
      if (body) {
        if (clamped === 1.0) {
          (body.style as unknown as { zoom: string }).zoom = '';
          body.style.removeProperty('zoom');
        } else {
          (body.style as unknown as { zoom: string }).zoom = String(clamped);
        }
      }
    } catch {
      // Navegadores que no soportan style.zoom
    }
  }

  if (showFeedback && isPinchZoomActive) {
    showZoomToast(clamped);
  }
}

export function resetZoom(): void {
  applyScale(1.0, true);
  saveScale(1.0);
}

export function getCurrentScale(): number {
  return currentScale;
}

/**
 * Controla si el zoom está habilitado.
 * Durante la pantalla de carga (video/intro), debe estar en `false` para que ocupe 100% de la pantalla.
 * Al pasar al Login o interfaz principal, se activa en `true`.
 */
export function setPinchZoomActive(active: boolean): void {
  isPinchZoomActive = active;

  if (typeof document === 'undefined') return;

  if (!active) {
    // Restaurar inmediatamente a escala 1.0 pura durante la pantalla de inicio
    try {
      if (document.body) {
        (document.body.style as unknown as { zoom: string }).zoom = '';
        document.body.style.removeProperty('zoom');
      }
      if (document.documentElement) {
        (document.documentElement.style as unknown as { zoom: string }).zoom = '';
        document.documentElement.style.removeProperty('zoom');
      }
    } catch {
      // Silencioso
    }

    if (toastEl) {
      toastEl.style.opacity = '0';
    }
  } else {
    // Activar zoom y aplicar la escala preferida por el usuario
    const saved = getSavedScale();
    applyScale(saved, false);
  }
}

function showZoomToast(scale: number): void {
  if (typeof document === 'undefined' || !isPinchZoomActive) return;

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'gv-pinch-zoom-indicator';
    toastEl.style.cssText = `
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(245, 158, 11, 0.5);
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 999999;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    toastEl.title = 'Toca para restablecer al 100%';
    toastEl.onclick = () => {
      resetZoom();
    };
    document.body.appendChild(toastEl);
  }

  const percent = Math.round(scale * 100);
  toastEl.innerHTML = `<span>🔍 Escala: <b>${percent}%</b></span> <span style="opacity:0.75; font-size:10px; text-decoration:underline;">(100%)</span>`;
  toastEl.style.opacity = '1';
  toastEl.style.transform = 'translateX(-50%) translateY(0)';

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    if (toastEl) {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateX(-50%) translateY(-8px)';
    }
  }, 1600);
}

/**
 * Calcula la distancia física entre dos toques usando screenX/screenY.
 * Esto es crucial para evitar el bug donde cambiar el CSS zoom altera recursivamente clientX/clientY.
 */
function getTouchDistance(e: TouchEvent): number {
  if (e.touches.length < 2) return 0;
  const t1 = e.touches[0];
  const t2 = e.touches[1];
  const dx = (t1.screenX || t1.clientX) - (t2.screenX || t2.clientX);
  const dy = (t1.screenY || t1.clientY) - (t2.screenY || t2.clientY);
  return Math.hypot(dx, dy);
}

export function initPinchZoom(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Si ya se reprodujo la intro previamente en la sesión, habilitar de inmediato
  const introAlreadyPlayed = sessionStorage.getItem('intro_played') === '1';
  if (introAlreadyPlayed) {
    setPinchZoomActive(true);
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (!isPinchZoomActive) return;

    if (e.touches.length === 2) {
      initialDistance = getTouchDistance(e);
      initialScale = currentScale;
      isPinching = initialDistance > 15;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isPinchZoomActive) return;

    if (e.touches.length === 2) {
      const currentDist = getTouchDistance(e);

      // Si los dedos no tocaron en el exacto mismo instante, reenganchar distancia inicial
      if (!isPinching || initialDistance <= 15) {
        initialDistance = currentDist;
        initialScale = currentScale;
        isPinching = initialDistance > 15;
        return;
      }

      if (initialDistance > 15 && currentDist > 15) {
        const ratio = currentDist / initialDistance;
        // El pellizco solo achica o escala compacta (0.75x a 1.05x), evitando conflictos con el zoom de la lupita
        const targetScale = Math.max(PINCH_MIN_SCALE, Math.min(PINCH_MAX_SCALE, Math.round(initialScale * ratio * 100) / 100));
        applyScale(targetScale, true);

        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!isPinchZoomActive) return;

    if (e.touches.length < 2) {
      if (isPinching) {
        isPinching = false;
        saveScale(currentScale);
      }
      initialDistance = 0;
    }
  };

  window.addEventListener('touchstart', handleTouchStart, { passive: true });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

  return () => {
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchEnd);
  };
}
