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
            return UpdateInfo(
                versionCode = json.optLong("versionCode", 0L),
                versionName = json.optString("versionName", ""),
                apkUrl = json.optString("apkUrl", ""),
                sha256 = json.optString("sha256", "").trim(),
                changelog = json.optString("changelog", "Mejoras de estabilidad y nuevas funciones."),
                mandatory = json.optBoolean("mandatory", false)
            )
        }
    }
}
