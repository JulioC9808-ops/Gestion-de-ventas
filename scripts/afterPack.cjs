// Hook afterPack de electron-builder: fuses de seguridad y verificación de empaquetado.
// NOTA CRÍTICA: NO usar asarmor (archive.patch / bloatPatch) en Electron 28+.
// asarmor altera los encabezados de app.asar corrompiendo la tabla interna de archivos,
// lo que causa que Chromium devuelva ERR_FILE_NOT_FOUND (-6) al intentar cargar
// dist/index.html. El código ya está 100% protegido con Bytenode (V8 bytecode binario)
// y javascript-obfuscator en el frontend.
const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterPack(context) {
  const { appOutDir, packager } = context;

  // Fuses de seguridad
  const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
  try {
    await flipFuses(exePath, {
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
      [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
      [FuseV1Options.GrantFileProtocolExtraPrivileges]: true,
    });
    console.log('[afterPack] Fuses de seguridad aplicados correctamente al ejecutable');
  } catch (err) {
    console.warn('[afterPack] Aviso al aplicar fuses (el build continúa):', err.message);
  }
};
