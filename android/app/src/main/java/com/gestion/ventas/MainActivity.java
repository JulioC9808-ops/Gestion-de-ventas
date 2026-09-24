package com.gestion.ventas;

import android.Manifest;
import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.gestion.ventas.updates.UpdateManager;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.security.MessageDigest;

public class MainActivity extends BridgeActivity {

    private static final int PERMISSIONS_REQUEST_CODE = 8021;
    private static final String CRASH_FILE = "crash_log.txt";

    // Archivo de versión remoto para actualizaciones automáticas
    private static final String VERSION_URL =
            "https://raw.githubusercontent.com/JulioC9808-ops/Sistema-Updates/main/android-version.json";

    // Anti-repackaging: SHA-256 del certificado de firma original.
    private static final String EXPECTED_SIG = "8F9343F18A4AB91098AE352544B9A253822C0A20A4920A39A7F956E3BC91A612";

    private UpdateManager updateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1) Capturador de errores PRIMERO que todo
        installCrashHandler();

        SplashScreen.installSplashScreen(this);

        registerPlugin(LocalSyncPlugin.class);
        registerPlugin(com.gestion.ventas.WiFiDirectPlugin.class);
        registerPlugin(com.gestion.ventas.updates.AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);

        // 1.1) Verificación anti-repackaging
        verifyApkIntegrity();

        // 2) Si la última vez la app se cerró por un error, muéstralo AHORA
        showCrashLogIfAny();

        requestEssentialPermissionsIfNeeded();

        // --- Configuración del WebView ---
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                WebView.setWebContentsDebuggingEnabled(false);
            }
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.setBackgroundColor(android.graphics.Color.TRANSPARENT);
                WebSettings s = webView.getSettings();
                s.setSupportZoom(true);
                s.setBuiltInZoomControls(true);
                s.setDisplayZoomControls(false);
                s.setUseWideViewPort(true);
                s.setLoadWithOverviewMode(true);
                s.setTextZoom(100);
            }
        } catch (Throwable t) {
            // WebView customization fallback
        }

        // Sistema de actualizaciones (notificaciones nativas de Android)
        try {
            updateManager = UpdateManager.Companion.init(this, VERSION_URL, 12L);
        } catch (Throwable t) {
            // Logged to crash handler if fatal, but prevents startup crash
        }
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

    // ================= ANTI-REPACKAGING =================
    private boolean apkIsOriginal() {
        try {
            PackageManager pm = getPackageManager();
            byte[] certBytes;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo info = pm.getPackageInfo(getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                if (info.signingInfo == null) return false;
                Signature[] sigs = info.signingInfo.getApkContentsSigners();
                if (sigs == null || sigs.length == 0) return false;
                certBytes = sigs[0].toByteArray();
            } else {
                PackageInfo info = pm.getPackageInfo(getPackageName(), PackageManager.GET_SIGNATURES);
                certBytes = info.signatures[0].toByteArray();
            }
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            StringBuilder sb = new StringBuilder();
            for (byte b : md.digest(certBytes)) sb.append(String.format("%02x", b));
            return EXPECTED_SIG.equalsIgnoreCase(sb.toString());
        } catch (Exception e) {
            return false;
        }
    }

    private void verifyApkIntegrity() {
        if (!apkIsOriginal()) {
            new AlertDialog.Builder(this)
                    .setTitle("Aplicación modificada")
                    .setMessage("Esta instalación no es la original del desarrollador y no puede iniciarse.")
                    .setCancelable(false)
                    .setPositiveButton("Cerrar", (d, w) -> finishAffinity())
                    .show();
        }
    }
    // =====================================================

    /**
     * Pide en un solo diálogo: CÁMARA y (Android 13+) permiso de NOTIFICACIONES,
     * necesario para que el sistema de actualización muestre sus notificaciones.
     */
    private void requestEssentialPermissionsIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return;

        java.util.List<String> needed = new java.util.ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            needed.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(
                    this,
                    needed.toArray(new String[0]),
                    PERMISSIONS_REQUEST_CODE
            );
        }
    }
}
