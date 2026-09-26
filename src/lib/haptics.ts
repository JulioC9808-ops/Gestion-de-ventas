/**
 * Utilidad para respuesta háptica (vibración) táctil y nativa.
 * Configurable por el usuario en Ajustes y compatible con Android (WebView / Capacitor) y navegadores móviles.
 */

export function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const val = localStorage.getItem('pos_haptics_enabled');
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('pos_haptics_enabled', enabled ? 'true' : 'false');
  } catch {
    // Silencioso
  }
}

export type HapticFeedbackType = 'light' | 'selection' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Dispara una respuesta háptica sutil si la vibración está habilitada en el dispositivo y ajustes.
 */
export function triggerHaptic(type: HapticFeedbackType = 'selection') {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
  if (!isHapticsEnabled()) return;

  try {
    if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') return;

    switch (type) {
      case 'light':
        // Pulsación rápida para teclado o tipeo
        navigator.vibrate(8);
        break;
      case 'selection':
        // Clic táctil en botones o switches
        navigator.vibrate(14);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        // Doble toque gratificante para escaneo QR o venta exitosa
        navigator.vibrate([15, 30, 15]);
        break;
      case 'warning':
      case 'error':
        // Alerta táctil
        navigator.vibrate([35, 40, 35]);
        break;
    }
  } catch {
    // Ignorar si el navegador bloquea vibración
  }
}
