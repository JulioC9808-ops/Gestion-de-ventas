// Preload seguro: expone al renderer solo lo estrictamente necesario.
// - machineId: huella de hardware combinada (SHA-256) para licencia anti-copia.
// - hardwareComponents: hash SEPARADO por componente (disco/BIOS/CPU/RAM) para
//   tolerar un cambio de hardware (3 de 4 coinciden = misma máquina).
// - windowControls / sync server / eventos de actualización.
const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const crypto = require('crypto');

function readHardwareParts() {
  try {
    const { execSync } = require('child_process');
    const script = `
$disk = (Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber
$bios = (Get-CimInstance Win32_BIOS).SerialNumber
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId
$ram = ((Get-CimInstance Win32_PhysicalMemory | ForEach-Object { $_.SerialNumber }) | Sort-Object) -join '|'
"$disk`n$bios`n$cpu`n$ram"
`;
    const out = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 5000, windowsHide: true }
    ).trim();
    const raw = out.split('\n').map(s => (s || '').trim().toUpperCase()).slice(0, 4);
    while (raw.length < 4) raw.push('');
    // Normaliza valores genéricos de BIOS/placas que no identifican nada.
    const GENERIC = new Set([
      '', '0', 'NONE', 'TO BE FILLED BY O.E.M.', 'TO BE FILLED BY OEM',
      'DEFAULT STRING', 'SYSTEM SERIAL NUMBER', 'SERIAL NUMBER', 'NOT SPECIFIED',
      'CHASSIS VERSION', '0123456789',
    ]);
    return raw.map(v => (GENERIC.has(v) ? '' : v));
  } catch {
    return ['', '', '', ''];
  }
}

const PARTS = readHardwareParts();
// Combinado (misma fórmula que la versión anterior: las licencias ya activadas siguen valiendo)
const MACHINE_ID = crypto.createHash('sha256').update(PARTS.join('##')).digest('hex');
// Por componente: vacío = no válido (no cuenta para el 3 de 4)
const HARDWARE_COMPONENTS = {
  disk: PARTS[0] ? crypto.createHash('sha256').update(PARTS[0]).digest('hex') : '',
  bios: PARTS[1] ? crypto.createHash('sha256').update(PARTS[1]).digest('hex') : '',
  cpu: PARTS[2] ? crypto.createHash('sha256').update(PARTS[2]).digest('hex') : '',
  ram: PARTS[3] ? crypto.createHash('sha256').update(PARTS[3]).digest('hex') : '',
};

contextBridge.exposeInMainWorld('desktopBridge', {
  isElectron: true,
  machineId: MACHINE_ID,
  hardwareComponents: HARDWARE_COMPONENTS,
  platform: process.platform,
  // --- SYNC SERVER ---
  startSyncServer: (payload) => ipcRenderer.invoke('sync:start', payload),
  stopSyncServer: () => ipcRenderer.invoke('sync:stop'),
  // --- WINDOW CONTROLS ---
  windowControls: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (cb) => {
      const listener = (_e, value) => cb(!!value);
      ipcRenderer.on('window:maximized', listener);
      return () => ipcRenderer.removeListener('window:maximized', listener);
    },
  },
  // --- AUTO-UPDATER EVENTS ---
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    onChecking: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('update_checking', listener);
      return () => ipcRenderer.removeListener('update_checking', listener);
    },
    onAvailable: (cb) => {
      const listener = (_e, info) => cb(info);
      ipcRenderer.on('update_available', listener);
      return () => ipcRenderer.removeListener('update_available', listener);
    },
    onNotAvailable: (cb) => {
      const listener = (_e, info) => cb(info);
      ipcRenderer.on('update_not_available', listener);
      return () => ipcRenderer.removeListener('update_not_available', listener);
    },
    onProgress: (cb) => {
      const listener = (_e, percent) => cb(percent);
      ipcRenderer.on('update_progress', listener);
      return () => ipcRenderer.removeListener('update_progress', listener);
    },
    onDownloaded: (cb) => {
      const listener = (_e, info) => cb(info);
      ipcRenderer.on('update_downloaded', listener);
      return () => ipcRenderer.removeListener('update_downloaded', listener);
    },
    onError: (cb) => {
      const listener = (_e, err) => cb(err);
      ipcRenderer.on('update_error', listener);
      return () => ipcRenderer.removeListener('update_error', listener);
    },
    applyChanges: () => {
      ipcRenderer.send('apply_update');
    },
  },
});
