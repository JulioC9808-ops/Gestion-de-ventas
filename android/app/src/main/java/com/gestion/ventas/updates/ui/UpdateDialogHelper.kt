package com.gestion.ventas.updates.ui

import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.gestion.ventas.R
import com.gestion.ventas.updates.model.UpdateInfo

/**
 * Gestiona el flujo de actualización mediante NOTIFICACIONES NATIVAS de Android
 * (antes: diálogos flotantes que se bugeaban con el WebView).
 *
 * Mantiene EXACTAMENTE la misma API pública que el antiguo UpdateDialogHelper,
 * por lo que UpdateManager.kt no requiere ningún cambio.
 *
 * - Update disponible → notificación con acciones "Sí" / "No"
 * - Descargando → notificación con barra de progreso (no molesta al usar la app)
 * - Permiso de instalación → notificación con "Abrir Ajustes"
 * - Error → notificación con "Reintentar" (si aplica)
 */
class UpdateDialogHelper(private val activity: Activity) {

    companion object {
        private const val CHANNEL_ID = "gv_updates_channel"
        private const val NOTIF_ID_AVAILABLE = 2001
        private const val NOTIF_ID_PROGRESS = 2002
        private const val NOTIF_ID_PERMISSION = 2003
        private const val NOTIF_ID_ERROR = 2004
        private const val ACTION_UPDATE_YES = "com.gestion.ventas.action.UPDATE_YES"
        private const val ACTION_UPDATE_NO = "com.gestion.ventas.action.UPDATE_NO"
        private const val ACTION_UPDATE_RETRY = "com.gestion.ventas.action.UPDATE_RETRY"
        private const val ACTION_UPDATE_GRANT_INSTALL = "com.gestion.ventas.action.UPDATE_GRANT_INSTALL"
    }

    // Callbacks del flujo; los disparan las acciones de la notificación
    private var onUpdateClicked: (() -> Unit)? = null
    private var onPostponeClicked: (() -> Unit)? = null
    private var onRetryClicked: (() -> Unit)? = null
    private var onGrantInstallClicked: (() -> Unit)? = null

    private var progressBuilder: NotificationCompat.Builder? = null
    private var receiverRegistered = false

    private val actionReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            if (activity.isFinishing || activity.isDestroyed) return
            when (intent.action) {
                ACTION_UPDATE_YES -> {
                    cancel(NOTIF_ID_AVAILABLE)
                    onUpdateClicked?.invoke()
                }
                ACTION_UPDATE_NO -> {
                    cancel(NOTIF_ID_AVAILABLE)
                    onPostponeClicked?.invoke()
                }
                ACTION_UPDATE_RETRY -> {
                    cancel(NOTIF_ID_ERROR)
                    onRetryClicked?.invoke()
                }
                ACTION_UPDATE_GRANT_INSTALL -> {
                    onGrantInstallClicked?.invoke()
                }
            }
        }
    }

    init {
        createChannel()
        registerActionsReceiver()
    }

    // ==================== API (mismos nombres que antes) ====================

    /**
     * Notificación "Hay una nueva versión disponible — ¿Deseas descargarla?"
     * con acciones Sí / No (solo Sí si es obligatoria).
     */
    fun showUpdateAvailableDialog(
        info: UpdateInfo,
        onUpdateClicked: () -> Unit,
        onPostponeClicked: () -> Unit
    ) {
        this.onUpdateClicked = onUpdateClicked
        this.onPostponeClicked = onPostponeClicked
        if (!canPostNotifications()) return

        val versionStr = if (info.versionName.isNotBlank()) " (v${info.versionName})" else ""
        val text = "¿Deseas descargarla?$versionStr"
        val builder = baseBuilder()
            .setContentTitle("Hay una nueva versión disponible")
            .setContentText(text)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(openAppIntent())
            .setAutoCancel(false)
            .setOngoing(false)
        builder.addAction(0, "Sí", actionPendingIntent(ACTION_UPDATE_YES))
        if (!info.mandatory) {
            builder.addAction(0, "No", actionPendingIntent(ACTION_UPDATE_NO))
        }
        notify(NOTIF_ID_AVAILABLE, builder.build())
    }

    /** Notificación persistente con barra de progreso de la descarga. */
    fun showDownloadingDialog() {
        if (!canPostNotifications()) return
        progressBuilder = baseBuilder()
            .setContentTitle("Descargando actualización…")
            .setContentText("Preparando descarga…")
            .setProgress(100, 0, true)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openAppIntent())
        notify(NOTIF_ID_PROGRESS, progressBuilder!!.build())
    }

    /** Actualiza % y MB en la notificación de progreso. */
    fun updateDownloadProgress(progress: Int, currentBytes: Long, totalBytes: Long) {
        if (progressBuilder == null) showDownloadingDialog()
        val builder = progressBuilder ?: return
        val currentMb = currentBytes / (1024.0 * 1024.0)
        val text = if (totalBytes > 0) {
            String.format(java.util.Locale.getDefault(), "%d%% · %.1f / %.1f MB", progress, currentMb, totalBytes / (1024.0 * 1024.0))
        } else {
            String.format(java.util.Locale.getDefault(), "%d%% · %.1f MB", progress, currentMb)
        }
        builder
            .setContentText(text)
            .setProgress(100, if (progress >= 0) progress else 0, progress < 0)
        notify(NOTIF_ID_PROGRESS, builder.build())
    }

    /** Cambia la notificación a estado de verificación de hash. */
    fun showVerifyingStatus() {
        val builder = progressBuilder ?: return
        builder
            .setContentText("Verificando archivo descargado…")
            .setProgress(100, 0, true)
        notify(NOTIF_ID_PROGRESS, builder.build())
    }

    /** Notificación de permiso para instalar APKs desconocidos, con acción "Abrir Ajustes". */
    fun showUnknownSourcesPermissionDialog(onAuthorize: () -> Unit, onCancel: () -> Unit) {
        this.onGrantInstallClicked = onAuthorize
        if (!canPostNotifications()) {
            // Sin notificaciones posibles, aviso en pantalla para no perder el flujo
            android.widget.Toast.makeText(
                activity,
                "Permite las notificaciones para recibir avisos de actualización",
                android.widget.Toast.LENGTH_LONG
            ).show()
            return
        }
        notify(
            NOTIF_ID_PERMISSION,
            baseBuilder()
                .setContentTitle("Permiso de instalación requerido")
                .setContentText("Toca «Abrir Ajustes» para permitir la instalación y completar la actualización.")
                .setStyle(
                    NotificationCompat.BigTextStyle().bigText(
                        "Toca «Abrir Ajustes» para permitir que la aplicación instale la actualización."
                    )
                )
                .setContentIntent(openAppIntent())
                .setAutoCancel(false)
                .addAction(0, "Abrir Ajustes", actionPendingIntent(ACTION_UPDATE_GRANT_INSTALL))
                .build()
        )
    }

    /** Notificación de error con acción "Reintentar" cuando aplica. */
    fun showErrorDialog(message: String, onRetry: (() -> Unit)? = null) {
        this.onRetryClicked = onRetry
        if (!canPostNotifications()) return
        val builder = baseBuilder()
            .setContentTitle("Aviso de actualización")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setContentIntent(openAppIntent())
            .setAutoCancel(true)
            .setOngoing(false)
        if (onRetry != null) {
            builder.addAction(0, "Reintentar", actionPendingIntent(ACTION_UPDATE_RETRY))
        }
        notify(NOTIF_ID_ERROR, builder.build())
    }

    /** Cancela todas las notificaciones del flujo de actualización. */
    fun dismissCurrent() {
        cancel(NOTIF_ID_AVAILABLE)
        cancel(NOTIF_ID_PROGRESS)
        cancel(NOTIF_ID_PERMISSION)
        cancel(NOTIF_ID_ERROR)
        progressBuilder = null
    }

    // ==================== Internos ====================

    private fun createChannel() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_ID,
                    "Actualizaciones de la aplicación",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Avisos de nuevas versiones y progreso de descarga"
                    setShowBadge(true)
                }
                val nm = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.createNotificationChannel(channel)
            }
        } catch (_: Exception) {
        }
    }

    private fun registerActionsReceiver() {
        if (receiverRegistered) return
        val filter = IntentFilter().apply {
            addAction(ACTION_UPDATE_YES)
            addAction(ACTION_UPDATE_NO)
            addAction(ACTION_UPDATE_RETRY)
            addAction(ACTION_UPDATE_GRANT_INSTALL)
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                activity.registerReceiver(actionReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                @Suppress("UnspecifiedRegisterReceiverFlag")
                activity.registerReceiver(actionReceiver, filter)
            }
            receiverRegistered = true
        } catch (_: Exception) {
        }
    }

    private fun baseBuilder(): NotificationCompat.Builder =
        NotificationCompat.Builder(activity, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setOnlyAlertOnce(false)

    /** PendingIntent de las acciones Sí / No / Reintentar / Abrir Ajustes */
    private fun actionPendingIntent(action: String): PendingIntent =
        PendingIntent.getBroadcast(
            activity,
            action.hashCode(),
            Intent(action).setPackage(activity.packageName),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

    /** Al tocar el cuerpo de la notificación, abre la app */
    private fun openAppIntent(): PendingIntent? {
        return try {
            val launch = activity.packageManager.getLaunchIntentForPackage(activity.packageName)
            launch?.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            PendingIntent.getActivity(
                activity,
                0,
                launch,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } catch (_: Exception) {
            null
        }
    }

    private fun canPostNotifications(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(activity, android.Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
    }

    private fun notify(id: Int, notification: android.app.Notification) {
        try {
            val nm = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.notify(id, notification)
        } catch (_: Exception) {
        }
    }

    private fun cancel(id: Int) {
        try {
            val nm = activity.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(id)
        } catch (_: Exception) {
        }
    }
}
