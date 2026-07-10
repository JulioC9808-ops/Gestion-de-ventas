# Empaquetado — Windows (.exe) y Android (.apk)

## 🪟 Windows — instalador con wizard (NSIS)

**En tu PC con Node.js instalado:**

```bash
git clone <tu-repo>
cd <tu-repo>
npm install
npm run electron:installer
```

El instalador queda en `dist-installer/GestionDeVentas-Setup-1.0.0.exe`.

**Antes de empaquetar coloca tus imágenes en `build/`** (ver `build/README.md`
para tamaños exactos). Si faltan, se usan las por defecto de electron-builder.

### Variante "carpeta suelta" (sin instalador)

```bash
npm run electron:package
```
Sale en `electron-release/`.

---

## 📱 Android — APK sin Android Studio

**Método: GitHub Actions (compila en la nube).**

1. Sube el proyecto a un repo de GitHub (Lovable puede hacerlo desde el botón
   "Export to GitHub").
2. En GitHub abre la pestaña **Actions** → activa los workflows si te lo pide.
3. Cada `push` a `main` dispara la build automáticamente. También puedes
   dispararla manualmente: **Actions → Build Android APK → Run workflow**.
4. Cuando termine (5-8 min), abre la ejecución y descarga el artifact
   **GestionDeVentas-debug-apk**. Dentro está `app-debug.apk`.
5. Copia el APK al celular e instálalo (permite "orígenes desconocidos").

El workflow (`.github/workflows/android-apk.yml`) hace todo:
`npm install → vite build → npx cap add android → npx cap sync → gradle assembleDebug`.

> **Importante:** el workflow **no toca tu proyecto ni requiere que instales
> nada local**. Todo corre en un runner efímero de GitHub.

---

## 🔐 Protección anti-copia (Windows)

Cada instalación calcula una huella de hardware (hostname + usuario + MACs)
y la guarda junto a la licencia. Si alguien copia
`C:\Users\...\AppData\Roaming\GestionDeVentas` a otra PC, la huella no coincide
y la app pide reactivar la clave. Tu propia licencia sigue funcionando
donde la activaste.

---

## Depurar pantalla negra en Electron

- Ejecutar `npm run build` antes de abrir Electron.
- Verificar `base: "./"` en `vite.config.ts`.
- Verificar `HashRouter` en `src/App.tsx`.
- Descomentar `openDevTools` en `electron/main.cjs`.
