# ===== Gestion de Ventas: reglas de protección (R8/ProGuard) =====

# --- Capacitor: no romper el puente JS/nativo ---
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin { public <init>(); }
-keep class com.gestion.ventas.LocalSyncPlugin { *; }
-keep class com.gestion.ventas.WiFiDirectPlugin { *; }
-keep class com.gestion.ventas.updates.** { *; }

# --- Retrofit/OkHttp (sistema de updates) ---
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**

# --- WebView JS interface ---
-keepclassmembers class * { @android.webkit.JavascriptInterface <methods>; }
