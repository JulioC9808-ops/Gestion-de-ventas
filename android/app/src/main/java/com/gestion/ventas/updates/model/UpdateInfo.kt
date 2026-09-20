package com.gestion.ventas.updates.model

import org.json.JSONObject

/**
 * Modelo de datos que representa la información de actualización remota.
 */
data class UpdateInfo(
    val versionCode: Long,
    val versionName: String,
    val apkUrl: String,
    val sha256: String,
    val changelog: String,
    val mandatory: Boolean
) {
    companion object {
        fun fromJson(jsonStr: String): UpdateInfo {
            val json = JSONObject(jsonStr)
            val vCode = if (json.has("versionCode")) {
                json.optLong("versionCode", 0L)
            } else if (json.has("version_code")) {
                json.optLong("version_code", 0L)
            } else if (json.has("version")) {
                json.optLong("version", 0L)
            } else 0L

            val vName = json.optString("versionName", 
                json.optString("version_name", json.optString("version", ""))
            )

            val downloadUrl = json.optString("apkUrl", 
                json.optString("downloadUrl", json.optString("url", json.optString("apk_url", "")))
            )

            val sha = json.optString("sha256", 
                json.optString("sha_256", json.optString("hash", ""))
            ).trim()

            val notes = json.optString("changelog", 
                json.optString("releaseNotes", json.optString("notes", "Mejoras de estabilidad y nuevas funciones."))
            )

            val isMandatory = json.optBoolean("mandatory", json.optBoolean("force", false))

            return UpdateInfo(
                versionCode = vCode,
                versionName = vName,
                apkUrl = downloadUrl,
                sha256 = sha,
                changelog = notes,
                mandatory = isMandatory
            )
        }
    }
}
