const { autoUpdater } = require('electron-updater');
const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

const fs = require('fs');

let mainWindow = null;
let syncServer = null;
let syncPayload = '';
let syncToken = '';

// Sistema de diagnóstico y registro seguro para depurar errores de carga en producción
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'app-runtime.log');

function logDiagnostic(level, message, details = '') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message} ${details ? JSON.stringify(details) : ''}\n`;
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(logFile, line);
  } catch {
    // Silencioso
  }
  if (level === 'ERROR' || level === 'FATAL') {
    console.error(`[${level}]`, message, details);
  } else {
    console.log(`[${level}]`, message, details);
  }
}

// Capturar excepciones globales del proceso principal
process.on('uncaughtException', (err) => {
  logDiagnostic('FATAL', 'UncaughtException en proceso principal:', err?.stack || err?.message || String(err));
});

process.on('unhandledRejection', (reason) => {
  logDiagnostic('ERROR', 'UnhandledRejection en proceso principal:', reason?.stack || reason?.message || String(reason));
});

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
  logDiagnostic('INFO', 'Iniciando creación de ventana principal', { isPackaged: app.isPackaged, version: app.getVersion() });

  const appIconPath = path.join(__dirname, '..', 'resources', 'icon.ico');

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
    icon: fs.existsSync(appIconPath) ? appIconPath : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
      devTools: true,
    },
  });

  // Capturar mensajes de consola del renderer y guardarlos en el log de diagnóstico
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    const lvl = levels[level] || 'RENDERER';
    logDiagnostic(lvl, `[Renderer] ${message}`, { sourceId, line });
  });

  // Diagnóstico del proceso renderer y pantalla de rescate en caso de error
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    logDiagnostic('ERROR', 'did-fail-load detectado en webContents:', { errorCode, errorDescription, validatedURL });
    const recoveryHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Diagnóstico de Carga - GEVEN</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; background: #0b1120; color: #f8fafc; padding: 40px; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { max-width: 620px; width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          h2 { color: #f43f5e; margin-top: 0; font-size: 20px; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; }
          pre { background: #020617; color: #fb7185; padding: 14px; border-radius: 8px; font-size: 12px; overflow-x: auto; border: 1px solid #1e293b; word-break: break-all; }
          .btn-group { margin-top: 24px; display: flex; gap: 12px; }
          button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
          button:hover { background: #2563eb; }
          .log-info { font-size: 11px; color: #64748b; margin-top: 16px; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Aviso de Carga en GEVEN</h2>
          <p>No se pudo cargar el archivo principal de la interfaz (${errorCode}: ${errorDescription}).</p>
          <pre>${validatedURL}</pre>
          <p class="log-info">Archivo de registro: ${logFile.replace(/\\/g, '\\\\')}</p>
          <div class="btn-group">
            <button onclick="location.reload()">Reintentar Carga</button>
          </div>
        </div>
      </body>
      </html>
    `;
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(recoveryHtml)}`).catch(() => {});
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    logDiagnostic('FATAL', 'render-process-gone:', details);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    logDiagnostic('FATAL', 'El proceso de renderizado crasheó:', { killed });
  });

  // Atajos de diagnóstico: F12 o Ctrl+Shift+I abren DevTools para depuración
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (
      input.key === 'F12' ||
      ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i')
    ) {
      if (mainWindow?.webContents.isDevToolsOpened()) {
        mainWindow?.webContents.closeDevTools();
      } else {
        mainWindow?.webContents.openDevTools({ mode: 'detach' });
      }
      event.preventDefault();
    }
  });

  // Localizar index.html con comprobación de rutas alternativas
  let indexHtml = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(indexHtml)) {
    const altAppPath = path.join(app.getAppPath(), 'dist', 'index.html');
    if (fs.existsSync(altAppPath)) {
      indexHtml = altAppPath;
    }
  }
  logDiagnostic('INFO', 'Cargando index.html desde:', indexHtml);

  mainWindow.loadFile(indexHtml).catch((err) => {
    logDiagnostic('ERROR', 'Error al ejecutar loadFile(index.html):', err?.stack || err?.message || String(err));
  });

  mainWindow.once('ready-to-show', () => {
    logDiagnostic('INFO', 'Ventana principal lista para mostrarse (ready-to-show)');
    mainWindow?.show();
  });

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
