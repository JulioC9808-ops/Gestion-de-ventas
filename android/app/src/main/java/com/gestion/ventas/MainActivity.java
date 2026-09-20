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
import com.gestion.ventas.updates.UpdateManager;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_REQUEST_CODE = 8021;
    private static final String CRASH_FILE = "crash_log.txt";
    // Archivo de versión remoto para actualizaciones automáticas
    private static final String VERSION_URL =
            "https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/android-version.json";

    private UpdateManager updateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1) Capturador de errores PRIMERO que todo
        installCrashHandler();

        SplashScreen.installSplashScreen(this);

        registerPlugin(LocalSyncPlugin.class);
        registerPlugin(com.gestion.ventas.updates.AppUpdatePlugin.class);
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

        // Sistema de actualizaciones in-app con descarga streaming, barra de progreso y SHA-256
        updateManager = UpdateManager.Companion.init(this, VERSION_URL, 12L);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (updateManager != null) {
            updateManager.onActivityResult(requestCode);
        }
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
}
