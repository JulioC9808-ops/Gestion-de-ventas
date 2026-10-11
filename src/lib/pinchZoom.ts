/** Compatibility for existing intro/login callers. Native browser/Electron zoom owns gestures.
 * Layout never changes document geometry through CSS zoom or transform scaling.
 */
export function setPinchZoomActive(_active: boolean, _forceScale?: number): void {
  // Intentionally no global gesture interception or layout scaling.
}

export function initPinchZoom(): () => void {
  // Discard legacy CSS geometry, but preserve the independent saved font preference.
  document.body.style.removeProperty('zoom');
  document.body.style.removeProperty('--gv-ui-zoom');
  document.documentElement.style.removeProperty('--gv-ui-zoom');
  return () => {};
}
