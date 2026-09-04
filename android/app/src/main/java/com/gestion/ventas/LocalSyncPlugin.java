package com.gestion.ventas;

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

    private void serve() {
        while (server != null && !server.isClosed()) {
            try (Socket socket = server.accept()) {
                BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                String request = reader.readLine();
                boolean valid = request != null && request.startsWith("GET /sync/" + token + " ");
                byte[] body = (valid ? payload : "Not found").getBytes(StandardCharsets.UTF_8);
                String headers = "HTTP/1.1 " + (valid ? "200 OK" : "404 Not Found") + "\r\n"
                        + "Content-Type: text/plain; charset=utf-8\r\n"
                        + "Access-Control-Allow-Origin: *\r\n"
                        + "Cache-Control: no-store\r\n"
                        + "Content-Length: " + body.length + "\r\nConnection: close\r\n\r\n";
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
                if (address instanceof Inet4Address && address.isSiteLocalAddress()) return address.getHostAddress();
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