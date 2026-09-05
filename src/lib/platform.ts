// Detecta si la app corre en un dispositivo móvil real (Android/iOS nativo via Capacitor)
// o, como fallback, un navegador móvil. En PC/Electron retorna false.
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Capacitor nativo (Android/iOS empaquetado)
  const cap = window.Capacitor;
  if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
    return true;
  }

  // Electron => PC
  if (navigator.userAgent && /Electron/i.test(navigator.userAgent)) {
    return false;
  }

  // Fallback: User-Agent móvil + pantalla táctil
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  return isMobileUA && isTouch;
}
