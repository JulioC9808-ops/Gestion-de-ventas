// Preload seguro: expone al renderer solo lo estrictamente necesario.
// - machineId: huella de hardware (SHA-256) para licencia anti-copia.
// - windowControls: control de ventana frameless (minimize/maximize/close).
// - update events: eventos del auto-updater para barra de progreso y avisos.

const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const crypto = require('crypto');

function computeHardwareFingerprint() {
  try {
    const { execSync } = require('child_process');
    const script = `
      $disk  = (Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber
      $bios  = (Get-CimInstance Win32_BIOS).SerialNumber
      $cpu   = (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId
      $ram   = ((Get-CimInstance Win32_PhysicalMemory | ForEach-Object { $_.SerialNumber }) | Sort-Object) -join '|'
      "$disk`n$bios`n$cpu`n$ram"
    `;
    const out = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"')}"`,
      { encoding: 'utf8', timeout: 5000, windowsHide: true }
    ).trim();
    const parts = out.split('\n').map(s => (s || '').trim().toUpperCase()).slice(0, 4);
    return crypto.createHash('sha256').update(parts.join('##')).digest('hex');
  } catch {
    // Fallback: sin huella de hardware disponible (no bloquea la app)
    return 'unknown';
  }
}
const MACHINE_ID = computeHardwareFingerprint();

contextBridge.exposeInMainWorld('desktopBridge', {
  isElectron: true,
  machineId: MACHINE_ID,
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
