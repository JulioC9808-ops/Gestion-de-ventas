// Preload seguro: expone al renderer solo lo estrictamente necesario.
// - machineId: huella de hardware (SHA-256) para licencia anti-copia.
// - windowControls: control de ventana frameless (minimize/maximize/close).
// - update events: eventos del auto-updater para barra de progreso y avisos.

const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');
const crypto = require('crypto');

function computeMachineId() {
  try {
    const parts = [
      os.hostname(),
      os.userInfo().username,
      os.platform(),
      os.arch(),
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
