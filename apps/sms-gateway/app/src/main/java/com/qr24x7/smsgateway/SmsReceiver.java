package com.qr24x7.smsgateway;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.SmsMessage;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class SmsReceiver extends BroadcastReceiver {
    private static final ExecutorService EXECUTOR = Executors.newSingleThreadExecutor();

    @Override public void onReceive(Context context, Intent intent) {
        if (intent == null || !"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())
                || !GatewayPrefs.isPaired(context)) return;
        SmsMessage[] parts = android.provider.Telephony.Sms.Intents.getMessagesFromIntent(intent);
        if (parts == null || parts.length == 0) return;
        String sender = parts[0].getOriginatingAddress();
        StringBuilder body = new StringBuilder();
        long timestamp = parts[0].getTimestampMillis();
        for (SmsMessage part : parts) {
            if (part != null) {
                if (part.getMessageBody() != null) body.append(part.getMessageBody());
                timestamp = Math.min(timestamp, part.getTimestampMillis());
            }
        }
        String content = body.toString();
        final long smsTimestamp = timestamp;
        PendingResult pending = goAsync();
        Context app = context.getApplicationContext();
        EXECUTOR.execute(() -> {
            try {
                GatewayApi.observerSms(app, sender, content, smsTimestamp);
            } catch (Exception e) {
                GatewayPrefs.setLastError(app, "SMS observer upload failed.");
                app.sendBroadcast(new Intent(GatewayService.ACTION_STATE_UPDATE).setPackage(app.getPackageName()));
            } finally {
                pending.finish();
            }
        });
    }
}
