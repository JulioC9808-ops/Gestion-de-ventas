const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

let mainWindow = null;
let syncServer = null;
let syncPayload = '';
let syncToken = '';

function localIpv4() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family === 'IPv4' && !address.internal) return address.address;
    }
  }
  return null;
}

function stopSyncServer() {
  if (syncServer) syncServer.close();
  syncServer = null;
  syncPayload = '';
  syncToken = '';
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#ffffff',
    show: false,
    paintWhenInitiallyHidden: true,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
  mainWindow.loadFile(indexHtml).catch((err) => {
    console.error('Error cargando index.html:', err);
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized', false));
  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: controles de ventana
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return mainWindow.isMaximized();
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => !!mainWindow?.isMaximized());

// IPC: sincronización local
ipcMain.handle('sync:start', async (_event, payload) => {
  stopSyncServer();
  const ip = localIpv4();
  if (!ip) throw new Error('Conecta esta computadora a la misma red Wi-Fi del empleado.');
  syncPayload = String(payload || '');
  syncToken = crypto.randomUUID();

  syncServer = http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== `/sync/${syncToken}`) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    response.end(syncPayload);
  });

  await new Promise((resolve, reject) => {
    syncServer.once('error', reject);
    syncServer.listen(0, '0.0.0.0', resolve);
  });

  const address = syncServer.address();
  if (!address || typeof address === 'string') throw new Error('No se pudo abrir la transferencia local.');
  return `http://${ip}:${address.port}/sync/${syncToken}`;
});

ipcMain.handle('sync:stop', () => stopSyncServer());

// APP READY
app.whenReady().then(() => {
  createWindow();

  // CONFIGURAR AUTO-UPDATER
  autoUpdater.logger = console;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.allowPrerelease = true; // Permite releases marcados como prerelease en GitHub
  autoUpdater.allowDowngrade = false;

  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'JulioC9808-ops',
    repo: 'Sistema-Updates',
    private: false
  });

  // EVENTOS DEL AUTO-UPDATER
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Comprobando actualizaciones en JulioC9808-ops/Sistema-Updates...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Actualización disponible:', info?.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] No hay actualizaciones disponibles:', info?.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_not_available', info);
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const percent = progress ? progress.percent : 0;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_progress', percent);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Actualización descargada exitosamente:', info?.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_downloaded', info);
    }
  });

  autoUpdater.on('error', (err) => {
    console.warn('[AutoUpdater] Aviso o error en comprobación:', err?.message || err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update_error', err?.message || String(err));
    }
  });

  // Comprobación inicial diferida para arranque rápido y no bloqueante
  setTimeout(() => {
    try {
      autoUpdater.checkForUpdates().catch((err) => {
        console.warn('[AutoUpdater] Comprobación inicial no completada:', err?.message || err);
      });
    } catch (e) {
      console.warn('[AutoUpdater] Error al comprobar actualización al inicio:', e);
    }
  }, 3500);
});

// IPC: comprobación manual de actualización
ipcMain.handle('update:check', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      success: true,
      updateInfo: result?.updateInfo || null,
    };
  } catch (err) {
    console.warn('[AutoUpdater] Error en update:check IPC:', err?.message || err);
    return {
      success: false,
      error: err?.message || String(err),
    };
  }
});

// IPC: aplicar update desde el renderer
ipcMain.on('apply_update', () => {
  try {
    autoUpdater.quitAndInstall(false, true);
  } catch (err) {
    console.error('[AutoUpdater] Error ejecutando quitAndInstall:', err);
  }
});

app.on('window-all-closed', () => {
  stopSyncServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
