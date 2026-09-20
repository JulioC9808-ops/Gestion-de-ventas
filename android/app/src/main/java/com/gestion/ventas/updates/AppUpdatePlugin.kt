package com.gestion.ventas.updates

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Plugin de Capacitor para exponer la comprobación manual de actualizaciones desde el frontend web.
 */
@CapacitorPlugin(name = "AppUpdate")
class AppUpdatePlugin : Plugin() {

    @PluginMethod
    fun checkForUpdate(call: PluginCall) {
        val manager = UpdateManager.getInstance()
        if (manager != null) {
            activity.runOnUiThread {
                manager.check(isManual = true)
            }
            val res = JSObject()
            res.put("status", "checking")
            call.resolve(res)
        } else {
            call.reject("UpdateManager no inicializado en la actividad nativa")
        }
    }
}
