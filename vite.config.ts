import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import packageJson from "./package.json";

// Lee versionName directamente de android/app/build.gradle (única fuente de verdad para Android).
// Así el badge de versión en la app siempre coincide con lo que compila Gradle.
function readAndroidVersionName(): string {
  try {
    const gradle = fs.readFileSync(
      path.resolve(__dirname, "android/app/build.gradle"),
      "utf8"
    );
    const m = gradle.match(/versionName\s+"([^"]+)"/);
    if (m && m[1]) return m[1];
  } catch {
    // Silencioso: usa el fallback declarado en platform.ts
  }
  return "2.1";
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // base relativo es OBLIGATORIO para que el build funcione bajo file:// (Electron)
  base: "./",
  define: {
    // Fecha en que se compiló el bundle (se inyecta en tiempo de build)
    __BUILD_DATE__: JSON.stringify(new Date().toISOString()),
    // Versión de PC: tomada del package.json
    __APP_VERSION__: JSON.stringify(packageJson.version),
    // Versión de Android: tomada de android/app/build.gradle
    __ANDROID_APP_VERSION__: JSON.stringify(readAndroidVersionName()),
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1200,
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
    legalComments: "none",
  },
}));
