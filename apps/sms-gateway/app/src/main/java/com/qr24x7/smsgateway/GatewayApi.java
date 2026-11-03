package com.qr24x7.smsgateway;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.telephony.SubscriptionInfo;
import android.telephony.SubscriptionManager;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

final class GatewayApi {
    static final String PAIR_PATH = "/api/v1/pollers/android/pair";
    static final String HEARTBEAT_PATH = "/api/v1/pollers/android/heartbeat";
    static final String OBSERVER_PATH = "/api/v1/observers/sms";
    static final String PULL_PATH = "/api/v1/sms/outbox/pull";
    static final String RESULT_PATH = "/api/v1/sms/outbox/result";

    private GatewayApi() {}

    static final class ApiException extends Exception {
        final int statusCode;
        ApiException(int code, String message) { super(message); statusCode = code; }
    }

    static String cleanServerUrl(String raw) throws Exception {
        String value = raw == null ? "" : raw.trim().replaceAll("/+\\s*$", "");
        URI uri = new URI(value);
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.US);
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.US);
        boolean loopback = "localhost".equals(host) || "127.0.0.1".equals(host);
        if (uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null || host.isEmpty()) {
            throw new IllegalArgumentException("Server URL is invalid.");
        }
        if (!"https".equals(scheme) && !("http".equals(scheme) && loopback)) {
            throw new IllegalArgumentException("The gateway server must use HTTPS.");
        }
        return value;
    }

    private static String endpoint(String base, String path) throws Exception {
        return cleanServerUrl(base) + path;
    }

    static JSONObject pair(String serverUrl, JSONObject request) throws Exception {
        return post(endpoint(serverUrl, PAIR_PATH), request.toString().getBytes(StandardCharsets.UTF_8), null);
    }

    static JSONObject heartbeat(Context context) throws Exception {
        JSONObject body = new JSONObject();
        body.put("deviceId", GatewayPrefs.deviceId(context));
        body.put("sims", getSims(context));
        return post(endpoint(GatewayPrefs.serverUrl(context), HEARTBEAT_PATH),
                body.toString().getBytes(StandardCharsets.UTF_8), null);
    }

    static JSONArray getSims(Context context) throws JSONException {
        JSONArray sims = new JSONArray();
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED) return sims;
        try {
            SubscriptionManager manager = context.getSystemService(SubscriptionManager.class);
            if (manager == null) return sims;
            List<SubscriptionInfo> found = manager.getActiveSubscriptionInfoList();
            if (found == null) return sims;
            List<SubscriptionInfo> active = new ArrayList<>(found);
            Collections.sort(active, Comparator.comparingInt(SubscriptionInfo::getSimSlotIndex));
            for (SubscriptionInfo info : active) {
                int slot = info.getSimSlotIndex() + 1;
                if (slot < 1 || slot > 2) continue;
                JSONObject sim = new JSONObject();
                sim.put("slot", slot);
                sim.put("subscriptionId", info.getSubscriptionId());
                CharSequence carrier = info.getCarrierName();
                sim.put("carrier", carrier == null ? "" : carrier.toString());
                String number = "";
                try { number = info.getNumber(); } catch (SecurityException ignored) {}
                String digits = number == null ? "" : number.replaceAll("\\D", "");
                sim.put("numberLast4", digits.length() > 4 ? digits.substring(digits.length() - 4) : digits);
                sims.put(sim);
            }
        } catch (SecurityException ignored) {
            // Some OEM builds restrict SIM metadata even after READ_PHONE_STATE was granted.
        }
        return sims;
    }

    static JSONObject observerSms(Context context, String sender, String message, long timestamp) throws Exception {
        JSONObject body = new JSONObject();
        body.put("deviceId", GatewayPrefs.deviceId(context));
        body.put("sender", sender == null ? "" : sender);
        body.put("body", message == null ? "" : message);
        body.put("timestamp", timestamp);
        return post(endpoint(GatewayPrefs.serverUrl(context), OBSERVER_PATH),
                body.toString().getBytes(StandardCharsets.UTF_8), new SignedAuth(context, timestamp));
    }

    static List<OutboxMessage> pull(Context context) throws Exception {
        JSONObject request = new JSONObject();
        request.put("deviceId", GatewayPrefs.deviceId(context));
        long now = System.currentTimeMillis();
        JSONObject response = post(endpoint(GatewayPrefs.serverUrl(context), PULL_PATH),
                request.toString().getBytes(StandardCharsets.UTF_8), new SignedAuth(context, now));
        JSONArray messages = response.optJSONArray("messages");
        List<OutboxMessage> result = new ArrayList<>();
        if (messages == null) return result;
        for (int i = 0; i < messages.length(); i++) {
            JSONObject item = messages.optJSONObject(i);
            if (item == null) continue;
            String to = item.optString("to_number", item.optString("to", ""));
            result.add(new OutboxMessage(item.optLong("id", -1), to,
                    item.optString("body", ""), item.optString("sim_slot", "")));
        }
        return result;
    }

    static void result(Context context, long id, String status, String error) throws Exception {
        JSONObject body = new JSONObject();
        body.put("id", id);
        body.put("status", status);
        body.put("error", error == null ? "" : error);
        long now = System.currentTimeMillis();
        post(endpoint(GatewayPrefs.serverUrl(context), RESULT_PATH),
                body.toString().getBytes(StandardCharsets.UTF_8), new SignedAuth(context, now));
    }

    private static final class SignedAuth {
        final String deviceId;
        final String signingKey;
        final long timestamp;
        SignedAuth(Context context, long ts) {
            deviceId = GatewayPrefs.deviceId(context);
            signingKey = GatewayPrefs.signingKey(context);
            timestamp = ts;
        }
    }

    private static JSONObject post(String endpoint, byte[] rawBody, SignedAuth auth) throws Exception {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(endpoint);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(12000);
            connection.setReadTimeout(15000);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");
            if (auth != null) {
                String ts = Long.toString(auth.timestamp);
                connection.setRequestProperty("X-Device-Id", auth.deviceId);
                connection.setRequestProperty("X-Timestamp", ts);
                connection.setRequestProperty("X-Signature", hmac(auth.signingKey, rawBody, ts));
            }
            try (OutputStream out = connection.getOutputStream()) { out.write(rawBody); }
            int code = connection.getResponseCode();
            InputStream stream = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
            byte[] bytes = stream == null ? new byte[0] : readAll(stream);
            String responseText = new String(bytes, StandardCharsets.UTF_8);
            JSONObject json;
            try { json = responseText.isEmpty() ? new JSONObject() : new JSONObject(responseText); }
            catch (JSONException e) { json = new JSONObject(); }
            if (code < 200 || code >= 300) {
                String message = json.optString("error", "Server returned HTTP " + code + ".");
                throw new ApiException(code, message);
            }
            return json;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static byte[] readAll(InputStream in) throws Exception {
        try (InputStream input = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int n;
            while ((n = input.read(buffer)) != -1) out.write(buffer, 0, n);
            return out.toByteArray();
        }
    }

    private static String hmac(String key, byte[] body, String timestamp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update(body);
        mac.update((":" + timestamp).getBytes(StandardCharsets.UTF_8));
        byte[] digest = mac.doFinal();
        StringBuilder hex = new StringBuilder(digest.length * 2);
        for (byte b : digest) hex.append(String.format(Locale.US, "%02x", b & 0xff));
        return hex.toString();
    }

    static final class OutboxMessage {
        final long id;
        final String to;
        final String body;
        final String simSlot;
        OutboxMessage(long id, String to, String body, String simSlot) {
            this.id = id; this.to = to; this.body = body; this.simSlot = simSlot;
        }
    }

    static int subscriptionForSlot(Context context, int slot) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED) return -1;
        try {
            SubscriptionManager manager = context.getSystemService(SubscriptionManager.class);
            List<SubscriptionInfo> active = manager == null ? null : manager.getActiveSubscriptionInfoList();
            if (active == null) return -1;
            for (SubscriptionInfo info : active) {
                if (info.getSimSlotIndex() + 1 == slot) return info.getSubscriptionId();
            }
        } catch (SecurityException ignored) {}
        return -1;
    }
}
