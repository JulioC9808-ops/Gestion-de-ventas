package com.gestion.ventas;

import android.Manifest;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Environment;
import android.widget.Toast;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_REQUEST_CODE = 8021;
    private static final String CRASH_FILE = "crash_log.txt";
    // Archivo de versión en Sistema-Updates (lo creas tú, ver abajo)
    private static final String VERSION_URL =
            "https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/android-version.json";

    private long downloadId = -1;
    private DownloadManager downloadManager;
    private BroadcastReceiver downloadReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1) Capturador de errores PRIMERO que todo (permanente: si algo truena,
        //    la próxima apertura muestra el error en pantalla)
        installCrashHandler();

        SplashScreen.installSplashScreen(this);

        registerPlugin(LocalSyncPlugin.class);
        super.onCreate(savedInstanceState);

        // 2) Si la última vez la app se cerró por un error, muéstralo AHORA
        showCrashLogIfAny();

        requestCameraPermissionIfNeeded();

        // --- Configuración del WebView ---
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setBackgroundColor(android.graphics.Color.WHITE);
            WebSettings s = webView.getSettings();
            s.setSupportZoom(true);
            s.setBuiltInZoomControls(true);
            s.setDisplayZoomControls(false);
            s.setUseWideViewPort(true);
            s.setLoadWithOverviewMode(true);
            s.setTextZoom(100);
        }

        // NO descarga nada al abrir: solo CONSULTA si hay versión nueva.
        // Si la hay, pregunta Sí/No. Si dices No, vuelve a preguntar la próxima apertura.
        checkForUpdateAsync();
    }

    @Override
    protected void onDestroy() {
        if (downloadReceiver != null) {
            try {
                unregisterReceiver(downloadReceiver);
            } catch (Exception ignored) {
            }
            downloadReceiver = null;
        }
        super.onDestroy();
    }

    // ================= CAPTURADOR DE ERRORES =================
    private void installCrashHandler() {
        final Thread.UncaughtExceptionHandler defaultHandler =
                Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            try {
                StringWriter sw = new StringWriter();
                throwable.printStackTrace(new PrintWriter(sw));
                File logFile = new File(getFilesDir(), CRASH_FILE);
                try (FileWriter writer = new FileWriter(logFile, true)) {
                    writer.write("\n==== CRASH " + new java.util.Date() + " ====\n");
                    writer.write(sw.toString());
                }
            } catch (Exception ignored) {
            }
            if (defaultHandler != null) {
                defaultHandler.uncaughtException(thread, throwable);
            }
        });
    }

    private void showCrashLogIfAny() {
        try {
            File logFile = new File(getFilesDir(), CRASH_FILE);
            if (!logFile.exists() || logFile.length() == 0) return;

            byte[] bytes = new byte[(int) Math.min(logFile.length(), 100000)];
            int n;
            try (FileInputStream in = new FileInputStream(logFile)) {
                n = in.read(bytes);
            }
            String log = (n > 0) ? new String(bytes, 0, n) : "(log vacío)";
            logFile.delete(); // solo se muestra una vez

            new AlertDialog.Builder(this)
                    .setTitle("La app se cerró inesperadamente")
                    .setMessage(log)
                    .setPositiveButton("Cerrar", null)
                    .setNeutralButton("Copiar", (d, w) -> {
                        android.content.ClipboardManager cm = (android.content.ClipboardManager)
                                getSystemService(Context.CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(android.content.ClipData.newPlainText("crash", log));
                        Toast.makeText(this, "Copiado", Toast.LENGTH_SHORT).show();
                    })
                    .show();
        } catch (Exception ignored) {
        }
    }
    // =========================================================

    // ================= CHEQUEO DE ACTUALIZACIÓN =================
    private void checkForUpdateAsync() {
        new Thread(() -> {
            try {
                long remote = fetchLatestVersionCode();
                long current = getCurrentVersionCode();
                if (remote <= 0 || remote <= current) return; // nada nuevo, no pregunta
                runOnUiThread(() -> showUpdateDialog());
            } catch (Exception ignored) {
                // Sin internet o error: no pregunta nada. Reintenta en la próxima apertura.
            }
        }).start();
    }

    private long fetchLatestVersionCode() throws Exception {
        URL url = new URL(VERSION_URL + "?t=" + System.currentTimeMillis());
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(8000);
        conn.setReadTimeout(8000);
        conn.setInstanceFollowRedirects(true);
        int code = conn.getResponseCode();
        if (code != 200) throw new Exception("HTTP " + code);
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) sb.append(line);
        } finally {
            conn.disconnect();
        }
        return new JSONObject(sb.toString()).getLong("versionCode");
    }

    private long getCurrentVersionCode() throws Exception {
        PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
        return info.getLongVersionCode();
    }

    private void showUpdateDialog() {
        try {
            new AlertDialog.Builder(this)
                    .setTitle("¡Se ha encontrado una nueva versión!")
                    .setMessage("¿Deseas actualizar?")
                    .setPositiveButton("Sí", (d, w) -> startUpdateDownload())
                    .setNegativeButton("No", null) // se quita; vuelve a preguntar al reabrir
                    .show();
        } catch (Exception ignored) {
        }
    }
    // ============================================================

    private void requestCameraPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.CAMERA},
                    CAMERA_REQUEST_CODE
            );
        }
    }

    // --- descarga (SOLO se ejecuta si el usuario dijo Sí) ---
    private void startUpdateDownload() {
        Toast.makeText(this, "Descargando actualización...", Toast.LENGTH_SHORT).show();

        // Borra el APK anterior para que DownloadManager no lo renombre a update-1.apk
        File oldAp
