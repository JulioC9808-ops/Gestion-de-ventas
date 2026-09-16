package com.gestion.ventas;

import android.Manifest;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
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
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Environment;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import java.io.File;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_REQUEST_CODE = 8021;

    // --- referencias a la barra ---
    private ProgressBar progressBar;
    private Button applyButton;
    private View updateBarContainer;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Inicializa el splash theme ANTES de todo
        SplashScreen.installSplashScreen(this);

        registerPlugin(LocalSyncPlugin.class);
        super.onCreate(savedInstanceState);

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

        // 👉 URL del APK en GitHub Releases
        String apkUrl = "https://github.com/JulioC9808-ops/Sistema-Updates/releases/latest/download/app-release.apk";

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

        registerReceiver(receiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
    }

    private void applyUpdate() {
        File apkFile = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "update.apk");
        Uri apkUri = FileProvider.getUriForFile(this, getPackageName() + ".provider", apkFile);

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(intent);
    }
}
