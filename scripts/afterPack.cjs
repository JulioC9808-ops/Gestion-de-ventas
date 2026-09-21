// Hook afterPack de electron-builder: asarmor (Capa 4) + fuses (Capa 1).
// electron-builder ejecuta esto ANTES de crear el instalador y de calcular
// los sha512 de latest.yml → electron-updater sigue validando sin problemas.
const path = require('path');
const asarmor = require('asarmor');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterPack(context) {
  const { appOutDir, packager, electronPlatformName } = context;

  // ---- Capa 4: asarmor (parchea app.asar) ----
  if (electronPlatformName === 'win32') {
    try {
      const asarPath = path.join(packager.getResourcesDir(appOutDir), 'app.asar');
      const archive = await asarmor.open(asarPath);
      archive.patch();                                  // entradas basura en el header
      archive.patch(asarmor.createBloatPatch(1000));    // 1000 archivos falsos: disuade extracción
      await archive.write();
      console.log('[afterPack] app.asar blindado con asarmor');
    } catch (err) {
      console.warn('[afterPack] asarmor falló (el build continúa):', err.message);
    }
  }

  // ---- Capa 1: fuses ----
  const exePath = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
  await flipFuses(exePath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });
  console.log('[afterPack] Fuses aplicados al ejecutable');
};
