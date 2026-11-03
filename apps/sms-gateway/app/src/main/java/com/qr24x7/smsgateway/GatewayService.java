package com.qr24x7.smsgateway;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.PowerManager;
import android.telephony.SmsManager;
import android.text.TextUtils;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class GatewayService extends Service {
    public static final String ACTION_STATE_UPDATE = "com.qr24x7.smsgateway.STATE_UPDATE";
    private static final String CHANNEL_ID = "qr24x7_sms_gateway_service";
    private static final int NOTIFICATION_ID = 72407;
    private static final long HEARTBEAT_MS = 30_000L;
    private static final long POLL_MS = 5_000L;

    private HandlerThread workerThread;
    private Handler worker;
    private volatile boolean screenOn = true;
    private BroadcastReceiver screenReceiver;
    private final AtomicInteger requestCode = new AtomicInteger(10000);

    @Override public void onCreate() {
        super.onCreate();
        workerThread = new HandlerThread("sms-gateway-worker");
        workerThread.start();
        worker = new Handler(workerThread.getLooper());
        createNotificationChannel();
        startForeground(NOTIFICATION_ID, notification());
        PowerManager power = getSystemService(PowerManager.class);
        screenOn = power == null || power.isInteractive();
        screenReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) {
                String action = intent == null ? "" : intent.getAction();
                screenOn = Intent.ACTION_SCREEN_ON.equals(action);
                if (screenOn) worker.post(pullOutbox);
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        androidx.core.content.ContextCompat.registerReceiver(this, screenReceiver, filter,
                androidx.core.content.ContextCompat.RECEIVER_NOT_EXPORTED);
        worker.post(heartbeat);
        worker.postDelayed(poll, POLL_MS);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (!GatewayPrefs.isPaired(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onDestroy() {
        if (screenReceiver != null) {
            try { unregisterReceiver(screenReceiver); } catch (IllegalArgumentException ignored) {}
        }
        if (worker != null) worker.removeCallbacksAndMessages(null);
        if (workerThread != null) workerThread.quitSafely();
        super.onDestroy();
    }

    private final Runnable heartbeat = new Runnable() {
        @Override public void run() {
            if (!GatewayPrefs.isPaired(GatewayService.this)) return;
            try {
                org.json.JSONObject response = GatewayApi.heartbeat(GatewayService.this);
                GatewayPrefs.setOnline(GatewayService.this,
                        "HEARTBEAT_ACK".equals(response.optString("status")));
                GatewayPrefs.setLastError(GatewayService.this, "");
                notifyUi();
                worker.post(pullOutbox); // The server may report outbox > 0; pulling each heartbeat also refreshes it.
            } catch (Exception e) {
                GatewayPrefs.setOnline(GatewayService.this, false);
                GatewayPrefs.setLastError(GatewayService.this, safeError(e));
                notifyUi();
            }
            worker.postDelayed(this, HEARTBEAT_MS);
        }
    };

    private final Runnable poll = new Runnable() {
        @Override public void run() {
            if (screenOn) worker.post(pullOutbox);
            worker.postDelayed(this, POLL_MS);
        }
    };

    private final Runnable pullOutbox = new Runnable() {
        @Override public void run() {
            if (!GatewayPrefs.isPaired(GatewayService.this)) return;
            try {
                List<GatewayApi.OutboxMessage> messages = GatewayApi.pull(GatewayService.this);
                for (GatewayApi.OutboxMessage message : messages) sendMessage(message);
            } catch (Exception e) {
                GatewayPrefs.setLastError(GatewayService.this, safeError(e));
                notifyUi();
            }
        }
    };

    private void sendMessage(GatewayApi.OutboxMessage message) {
        if (message.id < 0 || TextUtils.isEmpty(message.to) || TextUtils.isEmpty(message.body)) {
            reportFailure(message.id, "invalid_outbox_message");
            return;
        }
        if (!message.to.matches("[0-9]{8,15}")) {
            reportFailure(message.id, "invalid_recipient");
            return;
        }
        int slot;
        if ("ask".equalsIgnoreCase(message.simSlot) || TextUtils.isEmpty(message.simSlot)) {
            slot = GatewayPrefs.fallbackSimSlot(this);
        } else {
            try { slot = Integer.parseInt(message.simSlot); }
            catch (NumberFormatException e) { reportFailure(message.id, "sim_missing"); return; }
        }
        if (slot < 1 || slot > 2) { reportFailure(message.id, "sim_missing"); return; }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE)
                != PackageManager.PERMISSION_GRANTED) {
            reportFailure(message.id, "read_phone_state_missing");
            return;
        }
        int subscriptionId = GatewayApi.subscriptionForSlot(this, slot);
        if (subscriptionId < 0) {
            reportFailure(message.id, "sim_missing");
            return;
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS)
                != PackageManager.PERMISSION_GRANTED) {
            reportFailure(message.id, "send_sms_permission_missing");
            return;
        }
        if (!GatewayPrefs.reserveSend(this)) {
            reportFailure(message.id, "device_daily_cap");
            return;
        }
        try {
            SmsManager sms = SmsManager.getSmsManagerForSubscriptionId(subscriptionId);
            ArrayList<String> parts = sms.divideMessage(message.body);
            if (parts == null || parts.isEmpty()) parts = new ArrayList<>();
            if (parts.isEmpty()) { reportFailure(message.id, "empty_message"); return; }
            initializePendingResult(message.id, parts.size());
            ArrayList<PendingIntent> sent = new ArrayList<>();
            ArrayList<PendingIntent> delivered = new ArrayList<>();
            for (int i = 0; i < parts.size(); i++) {
                int code = requestCode.incrementAndGet();
                Intent sentIntent = new Intent(this, SmsSentReceiver.class)
                        .setAction("com.qr24x7.smsgateway.SMS_SENT." + message.id + "." + i)
                        .putExtra("outboxId", message.id);
                PendingIntent sentPending = PendingIntent.getBroadcast(this, code, sentIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                Intent deliveryIntent = new Intent(this, SmsDeliveryReceiver.class)
                        .setAction("com.qr24x7.smsgateway.SMS_DELIVERED." + message.id + "." + i);
                PendingIntent deliveryPending = PendingIntent.getBroadcast(this, code + 1, deliveryIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                sent.add(sentPending);
                delivered.add(deliveryPending);
            }
            if (parts.size() == 1) {
                sms.sendTextMessage(message.to, null, parts.get(0), sent.get(0), delivered.get(0));
            } else {
                sms.sendMultipartTextMessage(message.to, null, parts, sent, delivered);
            }
        } catch (Exception e) {
            clearPendingResult(message.id);
            reportFailure(message.id, e instanceof SecurityException ? "Android blocked sending (permission)." : "Could not hand the SMS to Android.");
        }
    }

    private void clearPendingResult(long id) {
        GatewayPrefs.state(this).edit().remove("sms_pending_" + id).remove("sms_failed_" + id).remove("sms_error_" + id).apply();
    }

    private void initializePendingResult(long id, int parts) {
        GatewayPrefs.state(this).edit().putInt("sms_pending_" + id, parts)
                .putBoolean("sms_failed_" + id, false).apply();
    }

    static void handlePartResult(Context context, long id, boolean success, String error) {
        String remainingKey = "sms_pending_" + id;
        String failedKey = "sms_failed_" + id;
        String errorKey = "sms_error_" + id;
        android.content.SharedPreferences prefs = GatewayPrefs.state(context);
        int remaining = prefs.getInt(remainingKey, 0);
        if (remaining <= 0) return;
        boolean failed = prefs.getBoolean(failedKey, false) || !success;
        remaining--;
        // Keep the first part's error; later parts usually fail for the same reason.
        String firstError = prefs.getString(errorKey, "");
        if (firstError.isEmpty() && !success) firstError = error == null || error.isEmpty() ? "SMS failed." : error;
        android.content.SharedPreferences.Editor editor = prefs.edit()
                .putInt(remainingKey, remaining).putBoolean(failedKey, failed).putString(errorKey, firstError);
        if (remaining == 0) editor.remove(remainingKey).remove(failedKey).remove(errorKey);
        editor.apply();
        if (remaining == 0) {
            if (failed) {
                GatewayPrefs.setLastError(context, firstError);
                reportResultAsync(context, id, "failed", firstError);
            }
            else {
                GatewayPrefs.incrementSent(context);
                GatewayPrefs.setLastError(context, "");
                reportResultAsync(context, id, "sent", "");
            }
            context.sendBroadcast(new Intent(ACTION_STATE_UPDATE).setPackage(context.getPackageName()));
        }
    }

    private static void reportResultAsync(Context context, long id, String status, String error) {
        new Thread(() -> {
            // A failed send keeps its reason on screen; only a successful report clears an old network error.
            try { GatewayApi.result(context, id, status, error); if ("sent".equals(status)) GatewayPrefs.setLastError(context, ""); }
            catch (Exception e) { GatewayPrefs.setLastError(context, safeError(e)); }
            context.sendBroadcast(new Intent(ACTION_STATE_UPDATE).setPackage(context.getPackageName()));
        }, "sms-result-report").start();
    }

    private void reportFailure(long id, String error) {
        GatewayPrefs.setLastError(this, error);
        notifyUi();
        if (id >= 0) reportResultAsync(this, id, "failed", error);
    }

    private static String safeError(Exception e) {
        if (e instanceof GatewayApi.ApiException) return e.getMessage();
        if (e instanceof java.net.SocketTimeoutException) return "Network timeout. Retrying.";
        if (e instanceof java.net.UnknownHostException) return "Server unavailable. Check internet.";
        return "Network request failed. Retrying.";
    }

    private void notifyUi() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification());
        sendBroadcast(new Intent(ACTION_STATE_UPDATE).setPackage(getPackageName()));
    }

    private Notification notification() {
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(this, 1, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String state = GatewayPrefs.isOnline(this) ? "Online" : "Waiting for network";
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_sync_noanim)
                .setContentTitle("QR24x7 SMS Gateway")
                .setContentText(state + " · " + GatewayPrefs.sentToday(this) + " sent today")
                .setContentIntent(pending)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                    "SMS Gateway service", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Keeps the paired SMS gateway connected.");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
}
