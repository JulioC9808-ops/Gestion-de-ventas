package com.gestion.ventas;

import android.Manifest;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Environment;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileWriter;
import java.io.PrintWriter;
import java.io.StringWriter;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_REQUEST_CODE = 8021;
    private static final String CRASH_FILE = "crash_log.txt";

    // --- referencias a la barra ---
    private ProgressBar progressBar;
    private Button applyButton;
    private View updateBarContainer;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1) Instala el capturador de errores PRIMERO que todo
        installCrashHandler();

        // Inicializa el splash theme ANTES de todo
        SplashScreen.installSplashScreen(this);

        registerPlugin(LocalSyncPlugin.class);
        super.onCreate(savedInstanceState);

        // 2) Si la última vez la app se cerró por un error, muéstralo AHORA
        showCrashLogIfAny();

        // Pide el permiso de cámara al iniciar
        requestCameraPermissionIfNeeded();

        // --- Configuración del WebView (tu bloque original) ---
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Fondo blanco: evita el destello negro mientras carga la web
            webView.setBackgroundColor(android.graphics.Color.WHITE);
            WebSettings s = webView.getSettings();
            s.setSupportZoom(true);
            s.setBuiltInZoomControls(true);
            s.setDisplayZoomControls(false);
            s.setUseWideViewPort(true);
            s.setLoadWithOverviewMode(true);
            s.setTextZoom(100);
        }

        // --- inicializar barra de actualización ---
        updateBarContainer = findViewById(R.id.updateBarContainer);
        progressBar = findViewById(R.id.progressBar);
        applyButton = findViewById(R.id.applyButton);

        if (updateBarContainer != null) {
            updateBarContainer.setVisibility(View.GONE);
        }

        // Iniciar descarga real de update
        startUpdateDownload();
    }

    // ================= CAPTURADOR DE ERRORES =================
    // Si la app truena por CUALQUIER motivo, guarda el error completo en
    // memoria interna. Se muestra en pantalla la próxima vez que se abra.
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
                        ClipboardManager cm = (ClipboardManager)
                                getSystemService(Context.CLIPBOARD_SERVICE);
                        cm.setPrimaryClip(ClipData.newPlainText("crash", log));
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

    // --- lógica de descarga real ---
    private void startUpdateDownload() {
        if (updateBarContainer != null) {
            updateBarContainer.setVisibility(View.VISIBLE);
        }

        // Borra el APK anterior para que DownloadManager no lo renombre a update-1.apk
        File oldApk = new File(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS), "update.apk");
        if (oldApk.exists()) {
            oldApk.delete();
        }

        // 👉 URL del APK en GitHub Releases (nombre real del asset subido por el workflow)
        String apkUrl = "https://github.com/JulioC9808-ops/Sistema-Updates/releases/latest/download/app-release-signed.apk";

        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
        request.setTitle("Descargando actualización");
        request.setDescription("Preparando nueva versión...");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "update.apk");

        DownloadManager manager = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        long downloadId = manager.enqueue(request);

        BroadcastReceiver receiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id == downloadId) {
                    // Sonido al terminar
                    MediaPlayer player = MediaPlayer.create(MainActivity.this, R.raw.update_finish);
                    player.start();

                    // Ocultar barra y mostrar botón
                    progressBar.setVisibility(View.GONE);
                    applyButton.setVisibility(View.VISIBLE);
                    applyButton.setOnClickListener(v -> applyUpdate());
                }
            }
        };

        // En Android 13+ hay que declarar si el receiver es EXPORTED o NOT_EXPORTED.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(receiver,
                    new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                    Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }
    }

    private void applyUpdate() {
        File apkFile = new File(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS), "update.apk");
        // La autoridad DEBE coincidir exactamente con la declarada en AndroidManifest.xml
        Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", apkFile);

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(intent);
    }
}
