/**
 * Gestor de escala táctil (Pinch-to-zoom / Pellizcar) para Android y móvil.
 * Permite reducir o aumentar toda la interfaz al pellizcar con 2 dedos.
 * - Ajuste 100% local al dispositivo (NO se transfiere por QR ni exportaciones).
 * - Rango de escala seguro: 0.65x (muy compacto) a 1.40x (ampliado).
 */

const STORAGE_KEY = 'gv_personal_ui_zoom';
const MIN_SCALE = 0.65;
const MAX_SCALE = 1.40;

let currentScale = 1.0;
let initialDistance = 0;
let initialScale = 1.0;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;
let toastEl: HTMLDivElement | null = null;

function getSavedScale(): number {
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

function saveScale(scale: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(Math.round(scale * 100) / 100));
  } catch {
    // Silencioso
  }
}

function applyScale(scale: number, showFeedback = false): void {
  const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.round(scale * 100) / 100));
  currentScale = clamped;

  // Aplicar zoom a nivel de documento
  try {
    const body = document.body;
    if (body) {
      (body.style as unknown as { zoom: string }).zoom = clamped === 1.0 ? '' : String(clamped);
    }
  } catch {
    // Fallback
  }

  if (showFeedback) {
    showZoomToast(clamped);
  }
}

function showZoomToast(scale: number): void {
  if (typeof document === 'undefined') return;

  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'gv-pinch-zoom-indicator';
    toastEl.style.cssText = `
      position: fixed;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 23, 42, 0.92);
      border: 1px solid rgba(59, 130, 246, 0.5);
      color: #ffffff;
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      font-family: system-ui, -apple-system, sans-serif;
      z-index: 999999;
      pointer-events: auto;
      cursor: pointer;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    toastEl.title = 'Toca para restablecer al 100%';
    toastEl.onclick = () => {
      applyScale(1.0, true);
      saveScale(1.0);
    };
    document.body.appendChild(toastEl);
  }

  const percent = Math.round(scale * 100);
  toastEl.innerHTML = `<span>🔍 Escala: <b>${percent}%</b></span> <span style="opacity:0.7; font-size:10px;">(Toca para 100%)</span>`;
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

function getTouchDistance(e: TouchEvent): number {
  if (e.touches.length < 2) return 0;
  const t1 = e.touches[0];
  const t2 = e.touches[1];
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

let isPinching = false;

export function initPinchZoom(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Aplicar escala guardada al iniciar
  currentScale = getSavedScale();
  if (currentScale !== 1.0) {
    applyScale(currentScale, false);
  }

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance = getTouchDistance(e);
      initialScale = currentScale;
      isPinching = initialDistance > 10;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      const currentDist = getTouchDistance(e);
      if (initialDistance > 0 && currentDist > 0) {
        const ratio = currentDist / initialDistance;
        const targetScale = initialScale * ratio;
        applyScale(targetScale, true);
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (isPinching && e.touches.length < 2) {
      isPinching = false;
      saveScale(currentScale);
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
