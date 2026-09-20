package com.gestion.ventas.updates.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

/**
 * Utilidad para cálculo y verificación del hash SHA-256 de archivos APK.
 * Regla: solo se verifica si el servidor entrega un hash con formato válido
 * (64 caracteres hexadecimales). Si no, se omite la verificación.
 */
object HashVerifier {

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

    private fun isValidSha256(hash: String): Boolean {
        if (hash.length != 64) return false
        return hash.all { it.isDigit() || it in 'a'..'f' || it in 'A'..'F' }
    }

    suspend fun verify(file: File, expectedSha256: String): Boolean {
        val expected = expectedSha256.trim()
        // Sin hash válido en el servidor: se omite la verificación de integridad
        // (permite actualizar aunque el json no tenga el hash del APK actual)
        if (!isValidSha256(expected)) return true
        val computed = calculateSha256(file)
        return computed.equals(expected, ignoreCase = true)
    }
}
