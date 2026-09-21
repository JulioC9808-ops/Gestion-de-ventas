package com.gestion.ventas.updates.network

import com.gestion.ventas.updates.model.UpdateInfo
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

/**
 * Servicio de red basado en OkHttp para consultar versiones y descargar APKs.
 * La descarga soporta REANUDACIÓN (HTTP Range): si existe un archivo parcial
 * previo, continúa desde donde se quedó en vez de empezar desde cero.
 */
class UpdateApiService(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()
) {

    suspend fun fetchUpdateInfo(endpointUrl: String): Result<UpdateInfo> = withContext(Dispatchers.IO) {
        try {
            val urlWithTimestamp = if (endpointUrl.contains("?")) {
                "$endpointUrl&_t=${System.currentTimeMillis()}"
            } else {
                "$endpointUrl?_t=${System.currentTimeMillis()}"
            }

            val request = Request.Builder()
                .url(urlWithTimestamp)
                .header("Cache-Control", "no-cache")
                .header("Accept", "application/json")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return@withContext Result.failure(
                    IOException("Error de servidor HTTP ${response.code}: ${response.message}")
                )
            }

            val body = response.body?.string()
                ?: return@withContext Result.failure(IOException("Respuesta vacía del servidor"))

            val updateInfo = UpdateInfo.fromJson(body)
            Result.success(updateInfo)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun downloadApk(
        apkUrl: String,
        destinationFile: File,
        resumeFromBytes: Long = 0L,
        onProgress: (progress: Int, currentBytes: Long, totalBytes: Long) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        var tempFile: File? = null
        try {
            destinationFile.parentFile?.mkdirs()
            tempFile = File(destinationFile.parentFile, "${destinationFile.name}.tmp")

            var baseBytes = 0L
            val canTryResume = resumeFromBytes > 0 && tempFile.exists() && tempFile.length() > 0
            if (canTryResume) baseBytes = tempFile.length()

            val requestBuilder = Request.Builder()
                .url(apkUrl)
                .header("Accept-Encoding", "identity")
            if (canTryResume) requestBuilder.header("Range", "bytes=$baseBytes-")

            val response = client.newCall(requestBuilder.build()).execute()
            if (!response.isSuccessful) {
                return@withContext Result.failure(
                    IOException("Error al descargar APK: HTTP ${response.code}")
                )
            }

            // Solo se reanuda si el servidor respondió 206 Partial Content.
            // Si respondió 200, se descarta el parcial y se empieza de cero.
            var resuming = canTryResume && response.code == 206
            if (!resuming) {
                baseBytes = 0L
                if (tempFile.exists()) tempFile.delete()
            }

            val body = response.body
                ?: return@withContext Result.failure(IOException("El cuerpo del archivo descargado está vacío"))

            val contentLength = body.contentLength()
            val totalBytes = if (contentLength > 0) baseBytes + contentLength else -1L

            val inputStream = body.byteStream()
            val outputStream = FileOutputStream(tempFile, resuming)

            val buffer = ByteArray(8192)
            var bytesRead: Int
            var currentBytes: Long = baseBytes
            var lastProgress = -1

            inputStream.use { input ->
                outputStream.use { output ->
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        currentBytes += bytesRead
                        if (totalBytes > 0) {
                            val progress = ((currentBytes * 100) / totalBytes).toInt()
                            if (progress != lastProgress) {
                                lastProgress = progress
                                onProgress(progress, currentBytes, totalBytes)
                            }
                        } else {
                            onProgress(-1, currentBytes, totalBytes)
                        }
                    }
                    output.flush()
                }
            }

            if (destinationFile.exists()) {
                destinationFile.delete()
            }
            if (!tempFile.renameTo(destinationFile)) {
                return@withContext Result.failure(IOException("No se pudo renombrar el archivo descargado"))
            }

            Result.success(destinationFile)
        } catch (e: Exception) {
            // Importante: NO se borra el .tmp aquí — así el próximo intento
            // (incluso tras cerrar la app) reanuda la descarga.
            Result.failure(e)
        }
    }
}
