package com.gestion.ventas.updates.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

/**
 * Utilidad para cálculo y verificación del hash SHA-256 de archivos APK.
 */
object HashVerifier {

    /**
     * Calcula el hash SHA-256 del archivo en streaming para evitar uso excesivo de memoria.
     */
    suspend fun calculateSha256(file: File): String = withContext(Dispatchers.IO) {
        val digest = MessageDigest.getInstance("SHA-256")
        FileInputStream(file).use { fis ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (fis.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        val hashBytes = digest.digest()
        val sb = StringBuilder()
        for (b in hashBytes) {
            sb.append(String.format("%02x", b))
        }
        sb.toString()
    }

    /**
     * Compara el hash SHA-256 del archivo con el hash esperado.
     */
    suspend fun verify(file: File, expectedSha256: String): Boolean {
        if (expectedSha256.isBlank()) {
            // Si el servidor no proveyó hash, consideramos que no se pudo verificar la integridad
            return false
        }
        val computed = calculateSha256(file)
        return computed.equals(expectedSha256.trim(), ignoreCase = true)
    }
}
