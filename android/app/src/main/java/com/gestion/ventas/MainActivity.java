package com.gestion.ventas;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.media.MediaPlayer;
import android.content.Intent;
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

        // Simulación de descarga de update
        simulateUpdateDownload();
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

    // --- lógica de la barra ---
    private void simulateUpdateDownload() {
        if (updateBarContainer != null) {
            updateBarContainer.setVisibility(View.VISIBLE);
        }

        new Thread(() -> {
            for (int i = 1; i <= 100; i++) {
                try { Thread.sleep(100); } catch (InterruptedException ignored) {}
                int finalI = i;
                runOnUiThread(() -> {
                    progressBar.setProgress(finalI);
                    if (finalI == 100) {
                        // Sonido suave al terminar
                        MediaPlayer player = MediaPlayer.create(this, R.raw.update_finish);
                        player.start();

                        // Ocultar barra y mostrar botón
                        progressBar.setVisibility(View.GONE);
                        applyButton.setVisibility(View.VISIBLE);
                        applyButton.setOnClickListener(v -> applyUpdate());
                    }
                });
            }
        }).start();
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
