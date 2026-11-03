package com.qr24x7.smsgateway;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.app.Activity;
import android.telephony.SmsManager;

public class SmsSentReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        long id = intent == null ? -1 : intent.getLongExtra("outboxId", -1);
        if (id < 0) return;
        int result = getResultCode();
        String error = result == Activity.RESULT_OK ? "" : describe(result, intent.getIntExtra("errorCode", -1));
        GatewayService.handlePartResult(context.getApplicationContext(), id, result == Activity.RESULT_OK, error);
    }

    /** A short reason the shop owner can act on. Never contains the message or the number. */
    static String describe(int result, int networkCode) {
        switch (result) {
            case SmsManager.RESULT_ERROR_GENERIC_FAILURE:
                return "Carrier rejected the SMS" + (networkCode >= 0 ? " (code " + networkCode + ")" : "")
                        + ". Check this SIM's SMS pack or balance.";
            case SmsManager.RESULT_ERROR_RADIO_OFF:
                return "SIM radio is off. Turn off airplane mode.";
            case SmsManager.RESULT_ERROR_NO_SERVICE:
                return "No mobile network on this SIM.";
            case SmsManager.RESULT_ERROR_LIMIT_EXCEEDED:
                return "Android's SMS sending limit was reached.";
            default:
                return "SMS failed (code " + result + ").";
        }
    }
}
