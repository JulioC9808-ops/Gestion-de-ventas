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
 */
class UpdateApiService(
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()
) {

    /**
     * Consulta el endpoint remoto de actualización y parsea el JSON a UpdateInfo.
     */
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

    /**
     * Descarga el APK con reporte de progreso en tiempo real.
     */
    suspend fun downloadApk(
        apkUrl: String,
        destinationFile: File,
        onProgress: (progress: Int, currentBytes: Long, totalBytes: Long) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        var tempFile: File? = null
        try {
            // Asegurar directorio contenedor
            destinationFile.parentFile?.mkdirs()
            tempFile = File(destinationFile.parentFile, "${destinationFile.name}.tmp")
            if (tempFile.exists()) {
                tempFile.delete()
            }

            val request = Request.Builder()
                .url(apkUrl)
                .header("Accept-Encoding", "identity")
                .build()

            val response = client.newCall(request).execute()
            if (!response.isSuccessful) {
                return@withContext Result.failure(
                    IOException("Error al descargar APK: HTTP ${response.code}")
                )
            }

            val body = response.body
                ?: return@withContext Result.failure(IOException("El cuerpo del archivo descargado está vacío"))

            val totalBytes = body.contentLength()
            val inputStream = body.byteStream()
            val outputStream = FileOutputStream(tempFile)

            val buffer = ByteArray(8192)
            var bytesRead: Int
            var currentBytes: Long = 0
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

            // Renombrar archivo temporal al definitivo
            if (destinationFile.exists()) {
                destinationFile.delete()
            }
            if (!tempFile.renameTo(destinationFile)) {
                return@withContext Result.failure(IOException("No se pudo renombrar el archivo descargado"))
            }

            Result.success(destinationFile)
        } catch (e: Exception) {
            tempFile?.delete()
            Result.failure(e)
        }
    }
}
