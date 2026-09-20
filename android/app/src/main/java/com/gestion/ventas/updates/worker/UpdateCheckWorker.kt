package com.gestion.ventas.updates.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.pm.PackageInfoCompat
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.gestion.ventas.MainActivity
import com.gestion.ventas.R
import com.gestion.ventas.updates.network.UpdateApiService
import java.util.concurrent.TimeUnit

/**
 * Worker periódico en segundo plano que consulta si existen nuevas versiones del sistema.
 */
class UpdateCheckWorker(
    private val context: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(context, workerParams) {

    companion object {
        const val UNIQUE_WORK_NAME = "periodic_update_checker"
        const val KEY_ENDPOINT_URL = "key_endpoint_url"
        const val CHANNEL_ID = "app_updates_channel"
        const val NOTIFICATION_ID = 9021

        /**
         * Programa el chequeo periódico en segundo plano con WorkManager (por defecto cada 12 horas).
         */
        fun schedule(
            context: Context,
            endpointUrl: String,
            repeatIntervalHours: Long = 12
        ) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<UpdateCheckWorker>(
                repeatIntervalHours, TimeUnit.HOURS
            )
                .setConstraints(constraints)
                .setInputData(workDataOf(KEY_ENDPOINT_URL to endpointUrl))
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                UNIQUE_WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )
        }
    }

    override suspend fun doWork(): Result {
        val endpointUrl = inputData.getString(KEY_ENDPOINT_URL) ?: return Result.failure()

        val apiService = UpdateApiService()
        val updateResult = apiService.fetchUpdateInfo(endpointUrl)

        return updateResult.fold(
            onSuccess = { info ->
                try {
                    val pInfo = context.packageManager.getPackageInfo(context.packageName, 0)
                    val currentVersionCode = PackageInfoCompat.getLongVersionCode(pInfo)

                    if (info.versionCode > currentVersionCode) {
                        showUpdateNotification(info.versionName, info.changelog)
                    }
                    Result.success()
                } catch (e: Exception) {
                    Result.retry()
                }
            },
            onFailure = {
                Result.retry()
            }
        )
    }

    private fun showUpdateNotification(versionName: String, changelog: String) {
        val notificationManager =
            context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Actualizaciones del Sistema",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notificaciones sobre nuevas versiones y mejoras disponibles"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val launchIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_TRIGGER_UPDATE_CHECK", true)
        }

        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("🚀 Nueva versión disponible: v$versionName")
            .setContentText("Hay una actualización lista con mejoras de rendimiento y estabilidad.")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("Versión $versionName disponible:\n$changelog")
            )
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (ignored: Throwable) {
        }
    }
}
