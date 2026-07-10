// Preload seguro: expone al renderer solo lo estrictamente necesario.
// Aquí generamos una "huella de hardware" (hostname + usuario + plataforma + arch + MACs)
// y la hasheamos en SHA-256 hex. El renderer NUNCA ve los datos crudos.
const { contextBridge } = require('electron');
const os = require('os');
const crypto = require('crypto');

function computeMachineId() {
  try {
    const parts = [
      os.hostname(),
      os.userInfo().username,
      os.platform(),
      os.arch(),
      // MAC address estable
      Object.values(os.networkInterfaces())
        .flat()
        .filter(Boolean)
        .map((n) => n && n.mac)
        .filter((m) => m && m !== '00:00:00:00:00:00')
        .sort()
        .join('|'),
    ];
    return crypto.createHash('sha256').update(parts.join('##')).digest('hex');
  } catch {
    return 'unknown';
  }
}

const MACHINE_ID = computeMachineId();

contextBridge.exposeInMainWorld('desktopBridge', {
  isElectron: true,
  machineId: MACHINE_ID,
  platform: process.platform,
});
