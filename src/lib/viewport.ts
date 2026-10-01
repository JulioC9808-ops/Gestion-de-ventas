/**
 * Gestor del Viewport para Android WebView y navegadores móviles.
 * Sincroniza las dimensiones reales del viewport visual (--app-viewport-height / --app-viewport-width)
 * teniendo en cuenta:
 * - Rotación de pantalla (vertical / horizontal)
 * - Barras dinámicas de Android (barra de navegación gestual o 3 botones, barra de estado)
 * - Cambios de escala y densidad del sistema operativo
 * - Redimensionamiento del WebView
 */

export function initViewportManager(): () => void {
  if (typeof window === 'undefined') return () => {};

  const updateViewportDimensions = () => {
    try {
      const vv = window.visualViewport;
      const height = vv ? vv.height : (window.innerHeight || document.documentElement.clientHeight);
      const width = vv ? vv.width : (window.innerWidth || document.documentElement.clientWidth);

      const root = document.documentElement;
      if (root) {
        root.style.setProperty('--app-viewport-height', `${height}px`);
        root.style.setProperty('--app-viewport-width', `${width}px`);
      }
    } catch {
      // Silencioso
    }
  };

  // Inicialización inmediata
  updateViewportDimensions();

  // Escuchar eventos de visualViewport (lo más preciso en Android WebView moderno)
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', updateViewportDimensions);
    vv.addEventListener('scroll', updateViewportDimensions);
  }

  // Fallbacks estándar de ventana y redimensionamiento de documento
  window.addEventListener('resize', updateViewportDimensions);
  window.addEventListener('orientationchange', updateViewportDimensions);
  window.addEventListener('pageshow', updateViewportDimensions);

  let resizeObserver: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined' && document.documentElement) {
    try {
      resizeObserver = new ResizeObserver(() => {
        updateViewportDimensions();
      });
      resizeObserver.observe(document.documentElement);
    } catch {
      // Silencioso
    }
  }

  return () => {
    if (vv) {
      vv.removeEventListener('resize', updateViewportDimensions);
      vv.removeEventListener('scroll', updateViewportDimensions);
    }
    window.removeEventListener('resize', updateViewportDimensions);
    window.removeEventListener('orientationchange', updateViewportDimensions);
    window.removeEventListener('pageshow', updateViewportDimensions);
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
  };
}
