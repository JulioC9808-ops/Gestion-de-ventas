package com.gestion.ventas;

import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;
import java.util.UUID;

@CapacitorPlugin(name = "LocalSync")
public class LocalSyncPlugin extends Plugin {

    private ServerSocket server;
    private Thread worker;
    private volatile String payload = "";
    private volatile String token = "";

    @PluginMethod
    public void start(PluginCall call) {
        String nextPayload = call.getString("payload");
        if (nextPayload == null || nextPayload.isEmpty()) {
            call.reject("No hay datos para compartir");
            return;
        }
        stopServer();
        payload = nextPayload;
        token = UUID.randomUUID().toString();
        try {
            server = new ServerSocket(0);
            worker = new Thread(this::serve, "local-sync-server");
            worker.start();
            String ip = localIpv4();
            if (ip == null) {
                stopServer();
                call.reject("Conecta este dispositivo a una red Wi-Fi");
                return;
            }
            JSObject result = new JSObject();
            result.put("url", "http://" + ip + ":" + server.getLocalPort() + "/sync/" + token);
            call.resolve(result);
        } catch (Exception error) {
            stopServer();
            call.reject("No se pudo preparar el respaldo por Wi-Fi", error);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopServer();
        call.resolve();
    }

    /**
     * Identificador de licencia de Android: SHA-256 de Settings.Secure.ANDROID_ID.
     * Nunca devolvemos el ID en claro, solo su hash (el receptor guarda/compara hashes).
     * Nota honesta: ANDROID_ID cambia con factory reset — en ese caso hay que reactivar.
     */
    @PluginMethod
    public void getAndroidId(PluginCall call) {
        try {
            String androidId = Settings.Secure.getString(
                    getContext().getContentResolver(),
                    Settings.Secure.ANDROID_ID);
            JSObject result = new JSObject();
            if (androidId == null || androidId.isEmpty()) {
                result.put("idHash", "");
            } else {
                MessageDigest md = MessageDigest.getInstance("SHA-256");
                byte[] digest = md.digest(androidId.getBytes(StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                for (byte b : digest) {
                    sb.append(String.format("%02x", b));
                }
                result.put("idHash", sb.toString());
            }
            call.resolve(result);
        } catch (Exception e) {
            call.reject("No se pudo leer el identificador del dispositivo", e);
        }
    }

    private void serve() {
        while (server != null && !server.isClosed()) {
            try (Socket socket = server.accept()) {
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                String request = reader.readLine();
                boolean valid = request != null && request.startsWith("GET /sync/" + token + " ");
                byte[] body = (valid ? payload : "Not found").getBytes(StandardCharsets.UTF_8);
                String headers = "HTTP/1.1 " + (valid ? "200 OK" : "404 Not Found") + "\r\n"
                        + "Content-Type: text/plain; charset=utf-8\r\n"
                        + "Access-Control-Allow-Origin: *\r\n"
                        + "Cache-Control: no-store\r\n"
                        + "Content-Length: " + body.length + "\r\n"
                        + "Connection: close\r\n\r\n";
                OutputStream output = socket.getOutputStream();
                output.write(headers.getBytes(StandardCharsets.UTF_8));
                output.write(body);
                output.flush();
            } catch (Exception ignored) {
                if (server == null || server.isClosed()) return;
            }
        }
    }

    private String localIpv4() throws Exception {
        for (NetworkInterface network : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (!network.isUp() || network.isLoopback()) continue;
            for (InetAddress address : Collections.list(network.getInetAddresses())) {
                if (address instanceof Inet4Address && address.isSiteLocalAddress()) {
                    return address.getHostAddress();
                }
            }
        }
        return null;
    }

    private void stopServer() {
        try {
            if (server != null) server.close();
        } catch (Exception ignored) {}
        server = null;
        worker = null;
        payload = "";
        token = "";
    }

    @Override
    protected void handleOnDestroy() {
        stopServer();
        super.handleOnDestroy();
    }
}
