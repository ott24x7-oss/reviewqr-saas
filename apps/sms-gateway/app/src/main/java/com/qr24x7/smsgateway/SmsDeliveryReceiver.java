package com.qr24x7.smsgateway;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class SmsDeliveryReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        // Delivery acknowledgements are intentionally not logged or tied to message content.
    }
}
