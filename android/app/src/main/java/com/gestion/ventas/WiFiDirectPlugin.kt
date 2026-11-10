package com.gestion.ventas

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.wifi.WpsInfo
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.ServerSocket
import java.nio.charset.StandardCharsets
import java.util.concurrent.TimeUnit

/**
 * Transferencia directa estilo Smart Switch:
 * - Admin: crea grupo WiFi Direct (nombre GV-<token>) + servidor HTTP local.
 * - Empleado: descubre el peer GV-<token>, conecta y descarga el payload nativamente.
 */
@CapacitorPlugin(name = "WiFiDirect")
class WiFiDirectPlugin : Plugin() {

    private var manager: WifiP2pManager? = null
    private var channel: WifiP2pManager.Channel? = null
    private var server: ServerSocket? = null
    private var serverThread: Thread? = null
    private var payload = ""
    private var token = ""

    // estado del lado empleado
    private var pendingCall: PluginCall? = null
    private var pendingToken = ""
    private var pendingPort = 0
    private var busy = false

    private fun ensurePermissions(call: PluginCall): Boolean {
        val activity = activity ?: return false
        val needed = if (Build.VERSION.SDK_INT >= 33) {
            arrayOf(Manifest.permission.NEARBY_WIFI_DEVICES)
        } else {
            arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        }
        val missing = needed.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isEmpty()) return true
        ActivityCompat.requestPermissions(activity, missing.toTypedArray(), 9911)
        call.reject("Acepta el permiso de dispositivos cercanos e intenta de nuevo.")
        return false
    }

    /** Enciende el Wi-Fi solo si está apagado (Android 9 directo; 10+ abre el panel rápido). */
    private fun ensureWifiOn(call: PluginCall): Boolean {
        val ctx = activity ?: return false
        val wm = ctx.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager ?: return true
        if (wm.isWifiEnabled) return true
        if (Build.VERSION.SDK_INT < 29) {
            @Suppress("DEPRECATION")
            if (wm.setWifiEnabled(true)) return true
        } else {
            try { ctx.startActivity(Intent(Settings.Panel.ACTION_WIFI)) } catch (ignored: Exception) {}
        }
        call.reject("WIFI_OFF: Activa el Wi-Fi en el panel y vuelve a intentarlo.")
        return false
    }

    private val main = Handler(Looper.getMainLooper())

    private fun p2p(): WifiP2pManager? {
        if (manager == null) {
            manager = activity?.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
            channel = manager?.initialize(activity, activity.mainLooper, null)
        }
        return manager
    }

    // ================= LADO ADMIN =================

    @PluginMethod
    fun startShare(call: PluginCall) {
        if (!ensurePermissions(call)) return
        if (!ensureWifiOn(call)) return
        val t = call.getString("token") ?: ""
        val p = call.getString("payload") ?: ""
        if (t.isEmpty() || p.isEmpty()) { call.reject("Faltan datos para compartir"); return }
        val mgr = p2p() ?: run { call.reject("WiFi Direct no disponible"); return }

        token = t
        payload = p

        // 1) Nombre visible del grupo = GV-<token> (así el empleado lo identifica).
        //    setDeviceName() es una API oculta del framework; se invoca por reflexión.
        try {
            val method = WifiP2pManager::class.java.getMethod(
                "setDeviceName",
                WifiP2pManager.Channel::class.java,
                String::class.java,
                WifiP2pManager.ActionListener::class.java
            )
            method.invoke(mgr, channel, "GV-$token", null)
        } catch (ignored: Exception) {
            // Algunos fabricantes no exponen setDeviceName; se ignora.
        }

        // 2) Quitar grupo previo y crear uno nuevo (el teléfono actúa como punto de acceso directo)
        val create = {
            mgr.createGroup(channel, object : WifiP2pManager.ActionListener {
                override fun onSuccess() { openServerAndResolve(call, 0) }
                override fun onFailure(reason: Int) {
                    call.reject("No se pudo crear el grupo WiFi Direct (código $reason)")
                }
            })
        }
        try {
            mgr.removeGroup(channel, object : WifiP2pManager.ActionListener {
                override fun onSuccess() { main.postDelayed({ create() }, 300) }
                override fun onFailure(reason: Int) { create() }
            })
        } catch (ignored: Exception) { create() }
    }

    /** Abre el servidor y devuelve puerto + nombre/clave del grupo para meterlos en el QR. */
    private fun openServerAndResolve(call: PluginCall, attempt: Int) {
        manager?.requestGroupInfo(channel) { group ->
            if ((group == null || group.networkName.isNullOrEmpty()) && attempt < 10) {
                main.postDelayed({ openServerAndResolve(call, attempt + 1) }, 400)
                return@requestGroupInfo
            }
            try {
                stopServer()
                server = ServerSocket(0)
                val res = JSObject()
                res.put("port", server?.localPort ?: 0)
                res.put("ssid", group?.networkName ?: "")
                res.put("pass", group?.passphrase ?: "")
                call.resolve(res)
                serverThread = Thread({ serveLoop() }, "wd-server")
                serverThread?.start()
            } catch (e: Exception) {
                call.reject("No se pudo abrir la transferencia directa", e)
            }
        }
    }

    @PluginMethod
    fun stopShare(call: PluginCall) {
        stopServer()
        try { manager?.removeGroup(channel, null) } catch (ignored: Exception) {}
        call.resolve()
    }

    private fun stopServer() {
        try { server?.close() } catch (ignored: Exception) {}
        server = null
        serverThread = null
    }

    private fun serveLoop() {
        val srv = server ?: return
        while (srv != server || server == null) break
        while (true) {
            val s = server ?: return
            if (s.isClosed) return
            try {
                val socket = s.accept()
                val reader = BufferedReader(InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8))
                val request = reader.readLine()
                val valid = request != null && request.startsWith("GET /sync/$token ")
                val body = (if (valid) payload else "Not found").toByteArray(StandardCharsets.UTF_8)
                val headers = ("HTTP/1.1 " + (if (valid) "200 OK" else "404 Not Found") + "\r\n"
                        + "Content-Type: text/plain; charset=utf-8\r\n"
                        + "Access-Control-Allow-Origin: *\r\n"
                        + "Cache-Control: no-store\r\n"
                        + "Content-Length: " + body.size + "\r\nConnection: close\r\n\r\n")
                val out: OutputStream = socket.getOutputStream()
                out.write(headers.toByteArray(StandardCharsets.UTF_8))
                out.write(body)
                out.flush()
                socket.close()
            } catch (ignored: Exception) {
                if (server == null || server!!.isClosed) return
            }
        }
    }

    // ================= LADO EMPLEADO =================

    private val p2pReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION -> {
                    if (ActivityCompat.checkSelfPermission(activity, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED &&
                        Build.VERSION.SDK_INT < 33) return
                    manager?.requestPeers(channel) { peers ->
                        val target = peers.deviceList.firstOrNull { it.deviceName == "GV-$pendingToken" }
                        if (target != null && !busy) {
                            busy = true
                            val config = WifiP2pConfig().apply {
                                deviceAddress = target.deviceAddress
                                wps.setup = WpsInfo.PBC
                            }
                            manager?.connect(channel, config, object : WifiP2pManager.ActionListener {
                                override fun onSuccess() { /* espera CONNECTION_CHANGED */ }
                                override fun onFailure(reason: Int) {
                                    fail("No se pudo conectar al admin (código $reason)")
                                }
                            })
                        }
                    }
                }
                WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION -> {
                    manager?.requestConnectionInfo(channel) { info: WifiP2pInfo ->
                        if (info.groupFormed && pendingCall != null) {
                            val host = info.groupOwnerAddress?.hostAddress ?: "192.168.49.1"
                            Thread({
                                try {
                                    val client = OkHttpClient.Builder()
                                        .connectTimeout(15, TimeUnit.SECONDS)
                                        .readTimeout(60, TimeUnit.SECONDS)
                                        .build()
                                    val resp = client.newCall(
                                        Request.Builder()
                                            .url("http://$host:$pendingPort/sync/$pendingToken")
                                            .build()
                                    ).execute()
                                    val body = resp.body?.string()
                                        ?: throw Exception("Respuesta vacía")
                                    val res = JSObject(); res.put("payload", body)
                                    resolvePending(res)
                                } catch (e: Exception) {
                                    fail("No se pudo recibir los datos: ${e.message}")
                                }
                            }, "wd-fetch").start()
                        }
                    }
                }
            }
        }
    }

    @PluginMethod
    fun receiveShare(call: PluginCall) {
        if (!ensurePermissions(call)) return
        if (pendingCall != null) { call.reject("Ya hay una recepción en curso"); return }
        val mgr = p2p() ?: run { call.reject("WiFi Direct no disponible"); return }
        pendingToken = call.getString("token") ?: ""
        pendingPort = (call.getInt("port") ?: 0)
        if (pendingToken.isEmpty() || pendingPort <= 0) { call.reject("QR inválido"); return }
        if (!ensureWifiOn(call)) return
        val ssid = call.getString("ssid") ?: ""
        val pass = call.getString("pass") ?: ""
        pendingCall = call
        // Tiempo máximo de espera
        main.postDelayed({ if (pendingCall === call) fail("No se encontró el dispositivo emisor. Acércalos e intenta de nuevo.") }, 45000)

        val filter = IntentFilter().apply {
            addAction(WifiP2pManager.WIFI_P2P_PEERS_CHANGED_ACTION)
            addAction(WifiP2pManager.WIFI_P2P_CONNECTION_CHANGED_ACTION)
        }
        activity.registerReceiver(p2pReceiver, filter)

        // Android 10+: conexión directa con nombre y clave del QR (sin buscar ni confirmar).
        if (Build.VERSION.SDK_INT >= 29 && ssid.isNotEmpty() && pass.length >= 8) {
            busy = true
            val cfg = WifiP2pConfig.Builder()
                .setNetworkName(ssid)
                .setPassphrase(pass)
                .enablePersistentMode(false)
                .build()
            mgr.connect(channel, cfg, object : WifiP2pManager.ActionListener {
                override fun onSuccess() { /* espera CONNECTION_CHANGED */ }
                override fun onFailure(reason: Int) {
                    busy = false
                    mgr.discoverPeers(channel, null)
                }
            })
            return
        }

        mgr.discoverPeers(channel, object : WifiP2pManager.ActionListener {
            override fun onSuccess() { /* llega PEERS_CHANGED */ }
            override fun onFailure(reason: Int) {
                fail("No se pudo buscar el admin (código $reason)")
            }
        })
    }

    private fun resolvePending(res: JSObject) {
        try { activity.unregisterReceiver(p2pReceiver) } catch (ignored: Exception) {}
        try { manager?.removeGroup(channel, null) } catch (ignored: Exception) {}
        pendingCall?.resolve(res)
        pendingCall = null
        busy = false
    }

    private fun fail(msg: String) {
        try { activity.unregisterReceiver(p2pReceiver) } catch (ignored: Exception) {}
        try { manager?.removeGroup(channel, null) } catch (ignored: Exception) {}
        pendingCall?.reject(msg)
        pendingCall = null
        busy = false
    }

    @PluginMethod
    fun cancelReceive(call: PluginCall) {
        try { manager?.stopPeerDiscovery(channel, null) } catch (ignored: Exception) {}
        try { manager?.removeGroup(channel, null) } catch (ignored: Exception) {}
        if (pendingCall != null) {
            try { activity.unregisterReceiver(p2pReceiver) } catch (ignored: Exception) {}
            pendingCall?.reject("Cancelado")
            pendingCall = null
            busy = false
        }
        call.resolve()
    }

    override fun handleOnDestroy() {
        stopServer()
        try { manager?.removeGroup(channel, null) } catch (ignored: Exception) {}
        super.handleOnDestroy()
    }
}
