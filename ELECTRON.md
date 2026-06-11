# Empaquetado Electron / Electron Fiddle

Este proyecto está listo para correr y empaquetarse como app de escritorio.

## Cambios clave ya aplicados
- `vite.config.ts` usa `base: "./"` (obligatorio para `file://`).
- `src/App.tsx` usa `HashRouter` (evita errores 404 con `file://`).
- `electron/main.cjs` carga `dist/index.html` con `loadFile()`.
- `package.json` ya tiene `"main": "electron/main.cjs"` y scripts listos.

## Pasos (clonar → empaquetar)
```bash
git clone <repo>
cd <repo>
npm install
npm install --save-dev electron @electron/packager
npm run build
npx @electron/packager . GestionDeVentas --overwrite --out=electron-release \
  --ignore="^/src$" --ignore="^/public$" --ignore="^/electron-release$"
```
El `.exe` (Windows) o binario (Linux/Mac) queda en `electron-release/`.

### Atajos npm
- `npm run electron` — abre la app ya compilada.
- `npm run electron:dev` — build + abrir Electron.
- `npm run electron:package` — build + empaquetar.

## Con Electron Fiddle
1. File → Open Folder → seleccionar este proyecto.
2. Fiddle detecta `package.json` y usa `electron/main.cjs` como entrada.
3. Antes de "Run" o "Package", ejecuta una vez en terminal:
   ```bash
   npm install
   npm run build
   ```
   (Fiddle no compila Vite; necesita `/dist` generado.)
4. Run ▶ para probar, Package para generar binario.

## ¿Pantalla en negro?
Casi siempre es uno de estos:
- Olvidaste `npm run build` antes de abrir Electron → no existe `/dist/index.html`.
- `base` distinto de `"./"` en `vite.config.ts` → assets con rutas absolutas rotas.
- Router `BrowserRouter` en lugar de `HashRouter` → 404 al cargar.

Para depurar, descomenta en `electron/main.cjs`:
```js
mainWindow.webContents.openDevTools({ mode: 'detach' });
```
Verás errores reales en la consola de DevTools.
