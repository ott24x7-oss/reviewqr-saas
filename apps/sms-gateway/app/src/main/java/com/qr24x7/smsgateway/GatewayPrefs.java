package com.qr24x7.smsgateway;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

final class GatewayPrefs {
    private static final String SECRET_FILE = "gateway_secrets";
    private static final String STATE_FILE = "gateway_state";
    private static final Object SEND_LOCK = new Object();

    private GatewayPrefs() {}

    private static SharedPreferences secrets(Context context) {
        try {
            MasterKey masterKey = new MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            return EncryptedSharedPreferences.create(
                    context, SECRET_FILE, masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM);
        } catch (Exception e) {
            throw new IllegalStateException("Secure storage is unavailable on this device.", e);
        }
    }

    static SharedPreferences state(Context context) {
        return context.getSharedPreferences(STATE_FILE, Context.MODE_PRIVATE);
    }

    static boolean isPaired(Context context) {
        return !deviceId(context).isEmpty() && !signingKey(context).isEmpty() && !serverUrl(context).isEmpty();
    }

    static String deviceId(Context context) { return secrets(context).getString("deviceId", ""); }
    static String signingKey(Context context) { return secrets(context).getString("signingKey", ""); }
    static String serverUrl(Context context) { return secrets(context).getString("serverUrl", ""); }
    static String merchantId(Context context) { return secrets(context).getString("merchantId", ""); }

    static void savePairing(Context context, String deviceId, String signingKey,
                            String serverUrl, String merchantId) {
        secrets(context).edit()
                .putString("deviceId", deviceId)
                .putString("signingKey", signingKey)
                .putString("serverUrl", serverUrl)
                .putString("merchantId", merchantId == null ? "" : merchantId)
                .apply();
        state(context).edit().putBoolean("online", false).putString("lastError", "").apply();
    }

    static void clearPairing(Context context) {
        secrets(context).edit().clear().apply();
        state(context).edit().putBoolean("online", false).putString("lastError", "").apply();
    }

    static void setOnline(Context context, boolean online) {
        state(context).edit().putBoolean("online", online)
                .putLong("lastHeartbeat", online ? System.currentTimeMillis() : 0L).apply();
    }

    static boolean isOnline(Context context) {
        SharedPreferences prefs = state(context);
        long last = prefs.getLong("lastHeartbeat", 0L);
        return prefs.getBoolean("online", false) && last > 0
                && System.currentTimeMillis() - last < 70_000L;
    }
    static void setLastError(Context context, String error) {
        state(context).edit().putString("lastError", error == null ? "" : error).apply();
    }
    static String lastError(Context context) { return state(context).getString("lastError", ""); }

    private static String dayKey() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        return format.format(new Date());
    }

    private static void rollDay(SharedPreferences.Editor editor, SharedPreferences prefs) {
        String today = dayKey();
        if (!today.equals(prefs.getString("sendDay", ""))) {
            editor.putString("sendDay", today).putInt("sendAttempts", 0).putInt("sentCount", 0);
        }
    }

    // Reserve attempts before handing a message to SmsManager so overlapping batches
    // cannot exceed the local daily ceiling. Successful sends are counted separately.
    static boolean reserveSend(Context context) {
        synchronized (SEND_LOCK) {
            SharedPreferences prefs = state(context);
            SharedPreferences.Editor editor = prefs.edit();
            rollDay(editor, prefs);
            int attempts = prefs.getString("sendDay", "").equals(dayKey())
                    ? prefs.getInt("sendAttempts", 0) : 0;
            if (attempts >= 100) {
                editor.apply();
                return false;
            }
            editor.putInt("sendAttempts", attempts + 1).apply();
            return true;
        }
    }

    static int sentToday(Context context) {
        SharedPreferences prefs = state(context);
        if (!dayKey().equals(prefs.getString("sendDay", ""))) return 0;
        return prefs.getInt("sentCount", 0);
    }

    static void incrementSent(Context context) {
        synchronized (SEND_LOCK) {
            SharedPreferences prefs = state(context);
            SharedPreferences.Editor editor = prefs.edit();
            rollDay(editor, prefs);
            int count = prefs.getString("sendDay", "").equals(dayKey())
                    ? prefs.getInt("sentCount", 0) : 0;
            editor.putInt("sentCount", count + 1).apply();
        }
    }

    static int fallbackSimSlot(Context context) {
        return state(context).getInt("fallbackSimSlot", 1);
    }
    static void setFallbackSimSlot(Context context, int slot) {
        state(context).edit().putInt("fallbackSimSlot", slot).apply();
    }
}
