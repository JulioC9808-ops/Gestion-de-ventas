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
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'JulioC9808-ops',
    repo: 'Sistema-Updates'
  });

  autoUpdater.checkForUpdates();

  // EVENTOS DEL AUTO-UPDATER
  autoUpdater.on('update-available', () => {
    if (mainWindow) mainWindow.webContents.send('update_available');
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow) mainWindow.webContents.send('update_progress', progress.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) mainWindow.webContents.send('update_downloaded');
    // Ya no instalamos automáticamente, esperamos al botón "Aplicar cambios"
  });
});

// IPC: aplicar update desde el renderer
ipcMain.on('apply_update', () => {
  autoUpdater.quitAndInstall();
});

app.on('window-all-closed', () => {
  stopSyncServer();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
