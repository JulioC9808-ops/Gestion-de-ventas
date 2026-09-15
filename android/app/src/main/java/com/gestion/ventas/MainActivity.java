package com.gestion.ventas;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int CAMERA_REQUEST_CODE = 8021;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Inicializa el splash theme ANTES de todo
        SplashScreen.installSplashScreen(this);
        
        registerPlugin(LocalSyncPlugin.class);
        super.onCreate(savedInstanceState);

        // Pide el permiso de cámara al iniciar, para que el escáner de QR
        // (getUserMedia dentro del WebView) pueda abrirse sin bloqueos.
        requestCameraPermissionIfNeeded();

        // Habilita el zoom con pellizco y mejora la legibilidad en pantallas pequeñas.
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
    }
