# Empaquetado — Windows (.exe) y Android (.apk)

## 🪟 Windows — instalador con wizard (NSIS)

**Requisitos únicos en tu PC:** Node.js 20+ y npm.

```bash
git clone <tu-repo>
cd <tu-repo>
npm ci             # instala EXACTAMENTE las versiones del package-lock.json
npm run electron:installer
```

`npm ci` (no `npm install`) es lo que evita conflictos de dependencias:
borra `node_modules` y reinstala todo desde `package-lock.json` de forma
reproducible. Si algún día vuelve a fallar el empaquetado, borra
`node_modules` y `dist-installer/` y repite el comando.

El instalador queda en `dist-installer/GestionDeVentas-Setup-1.0.0.exe`.

**Imágenes e iconos del instalador ya incluidos en `build/`:**
- `installerHeader.bmp` — banner superior (150×57).
- `icon.ico` + `installer.ico` — icono del programa y del instalador.
- `LICENSE.txt` — EULA que aparece en la 2ª página del wizard.
- `CHANGELOG.txt` — Novedades que aparece en la 3ª página del wizard.
- `installer.nsh` — script que añade la página de novedades.

### Variante "carpeta suelta" (sin instalador)

```bash
npm run electron:package
```
Sale en `electron-release/`.



---

## 📱 Android — APK sin Android Studio

**Método: GitHub Actions (compila en la nube).**

1. Sube el proyecto a tu repositorio de GitHub (`JulioC9808-ops`).
2. En GitHub abre la pestaña **Actions** → activa los workflows si te lo pide.
3. Cada `push` a `main` dispara la build automáticamente. También puedes
   dispararla manualmente: **Actions → Build Android APK → Run workflow**.
4. Cuando termine, abre la ejecución y descarga el artifact
   **GestionDeVentas-release-apk**. Dentro está el APK listo para instalar.
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
