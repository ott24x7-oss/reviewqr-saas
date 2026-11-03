package com.qr24x7.smsgateway;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.ArrayAdapter;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends Activity {
    private static final int PERMISSION_RECEIVE_SMS = 11;
    private static final int PERMISSION_SEND_SMS = 12;
    private static final int PERMISSION_PHONE = 13;
    private static final int PERMISSION_NOTIFICATIONS = 14;
    private LinearLayout content;
    private int ink, muted, surface, canvas, border, accent, errorColor;
    private BroadcastReceiver stateReceiver;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setColors();
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(20), dp(20), dp(20), dp(32));
        content.setBackgroundColor(canvas);
        scroll.addView(content);
        setContentView(scroll);
        stateReceiver = new BroadcastReceiver() {
            @Override public void onReceive(Context context, Intent intent) { render(); }
        };
        ContextCompat.registerReceiver(this, stateReceiver,
                new IntentFilter(GatewayService.ACTION_STATE_UPDATE), ContextCompat.RECEIVER_NOT_EXPORTED);
        render();
    }

    @Override protected void onResume() {
        super.onResume();
        if (GatewayPrefs.isPaired(this)) startGatewayService();
        render();
    }

    @Override protected void onDestroy() {
        if (stateReceiver != null) unregisterReceiver(stateReceiver);
        super.onDestroy();
    }

    private void setColors() {
        boolean night = (getResources().getConfiguration().uiMode
                & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                == android.content.res.Configuration.UI_MODE_NIGHT_YES;
        canvas = night ? 0xff101715 : 0xfff2f6f4;
        surface = night ? 0xff1a2420 : 0xffffffff;
        ink = night ? 0xfff2f7f4 : 0xff14211b;
        muted = night ? 0xffb0c0b8 : 0xff5e7067;
        border = night ? 0xff34443c : 0xffdce6e0;
        accent = night ? 0xff78d6b7 : 0xff16a34a;
        errorColor = night ? 0xffffb4ab : 0xffb3261e;
        getWindow().setStatusBarColor(canvas);
        getWindow().setNavigationBarColor(canvas);
        if (Build.VERSION.SDK_INT >= 26) {
            getWindow().getDecorView().setSystemUiVisibility(night ? 0
                    : View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }
    }

    private void render() {
        if (content == null) return;
        content.removeAllViews();
        TextView eyebrow = text("QR24x7", 13, accent, true);
        eyebrow.setLetterSpacing(0.08f);
        content.addView(eyebrow, params(0, 0, 0, 4));
        content.addView(text("SMS Gateway", 28, ink, true), params(0, 0, 0, 4));
        content.addView(text("A dedicated phone for secure SMS delivery.", 15, muted, false), params(0, 0, 0, 20));

        addStatusCard();
        addPairActions();
        addSimCard();
        addPermissionsCard();
        addBatteryGuidanceCard();
        content.addView(text("Message contents are sent securely to the paired QR24x7 server and are never written to app logs.",
                12, muted, false), params(2, 18, 2, 0));
    }

    private void addStatusCard() {
        LinearLayout card = card();
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        TextView title = text("Gateway status", 17, ink, true);
        row.addView(title, new LinearLayout.LayoutParams(0, -2, 1f));
        boolean paired = GatewayPrefs.isPaired(this);
        boolean online = paired && GatewayPrefs.isOnline(this);
        TextView chip = text(online ? "ONLINE" : (paired ? "OFFLINE" : "NOT PAIRED"), 11,
                online ? accent : muted, true);
        chip.setPadding(dp(10), dp(6), dp(10), dp(6));
        chip.setBackground(round(online ? 0x2032b68a : border, 50));
        row.addView(chip);
        card.addView(row);
        card.addView(text(paired ? "Device paired with " + safeHost(GatewayPrefs.serverUrl(this))
                        : "Pair this phone with the enrollment QR from the admin page.",
                13, muted, false), params(0, 12, 0, 12));
        LinearLayout stats = new LinearLayout(this);
        stats.setOrientation(LinearLayout.HORIZONTAL);
        stats.addView(statBlock("TODAY SENT", Integer.toString(GatewayPrefs.sentToday(this))),
                new LinearLayout.LayoutParams(0, -2, 1f));
        String lastError = GatewayPrefs.lastError(this);
        LinearLayout errorBlock = statBlock("LAST ERROR", lastError.isEmpty() ? "None" : lastError);
        stats.addView(errorBlock, new LinearLayout.LayoutParams(0, -2, 1.4f));
        card.addView(stats);
        content.addView(card, params(0, 0, 0, 12));
    }

    private void addPairActions() {
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        Button pair = button(GatewayPrefs.isPaired(this) ? "Pair another server" : "Pair with QR", true);
        pair.setOnClickListener(v -> startActivity(new Intent(this, PairActivity.class)));
        row.addView(pair, new LinearLayout.LayoutParams(0, dp(52), 1f));
        if (GatewayPrefs.isPaired(this)) {
            Button unpair = button("Unpair", false);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(104), dp(52));
            lp.leftMargin = dp(10);
            row.addView(unpair, lp);
            unpair.setOnClickListener(v -> new AlertDialog.Builder(this)
                    .setTitle("Unpair this phone?")
                    .setMessage("The phone will stop sending and receiving SMS for this gateway.")
                    .setNegativeButton("Cancel", null)
                    .setPositiveButton("Unpair", (dialog, which) -> {
                        stopService(new Intent(this, GatewayService.class));
                        GatewayPrefs.clearPairing(this);
                        render();
                    }).show());
        }
        content.addView(row, params(0, 0, 0, 18));
    }

    private void addSimCard() {
        LinearLayout card = card();
        sectionHeading(card, "SIM cards", "SIM inventory is reported on every heartbeat. The server chooses the slot for each message.");
        List<SimLine> sims = currentSims();
        if (sims.isEmpty()) {
            card.addView(text(hasPermission(Manifest.permission.READ_PHONE_STATE)
                            ? "No active SIMs found." : "Grant phone-state access to list active SIMs.",
                    14, muted, false), params(0, 12, 0, 4));
        } else {
            for (SimLine sim : sims) {
                LinearLayout line = new LinearLayout(this);
                line.setGravity(Gravity.CENTER_VERTICAL);
                line.setOrientation(LinearLayout.HORIZONTAL);
                line.addView(text("SIM " + sim.slot, 15, ink, true), new LinearLayout.LayoutParams(dp(62), -2));
                line.addView(text(sim.carrier.isEmpty() ? "Carrier not reported" : sim.carrier,
                        14, muted, false), new LinearLayout.LayoutParams(0, -2, 1f));
                line.addView(text(sim.last4.isEmpty() ? "" : "••" + sim.last4, 13, muted, true));
                card.addView(line, params(0, 12, 0, 0));
            }
        }
        card.addView(text("Fallback SIM", 13, ink, true), params(0, 18, 0, 4));
        Spinner picker = new Spinner(this);
        String[] slots = {"SIM 1 (server ‘ask’ only)", "SIM 2 (server ‘ask’ only)"};
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, slots);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        picker.setAdapter(adapter);
        picker.setSelection(GatewayPrefs.fallbackSimSlot(this) == 2 ? 1 : 0);
        picker.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                GatewayPrefs.setFallbackSimSlot(MainActivity.this, position + 1);
            }
            @Override public void onNothingSelected(android.widget.AdapterView<?> parent) {}
        });
        card.addView(picker);
        content.addView(card, params(0, 0, 0, 12));
    }

    private void addPermissionsCard() {
        LinearLayout card = card();
        sectionHeading(card, "Permissions", "Required access is used only for gateway functions.");
        addPermissionRow(card, "Receive SMS", Manifest.permission.RECEIVE_SMS, PERMISSION_RECEIVE_SMS);
        addPermissionRow(card, "Send SMS", Manifest.permission.SEND_SMS, PERMISSION_SEND_SMS);
        addPermissionRow(card, "Read SIM state", Manifest.permission.READ_PHONE_STATE, PERMISSION_PHONE);
        if (Build.VERSION.SDK_INT >= 33)
            addPermissionRow(card, "Notifications", Manifest.permission.POST_NOTIFICATIONS, PERMISSION_NOTIFICATIONS);
        boolean batteryOkay = ignoresBatteryOptimizations();
        addAccessRow(card, "Battery optimization",
                batteryOkay ? "Allowed" : "Set", batteryOkay ? "This phone may pause the gateway less often." : "Allow background activity for reliable heartbeats.",
                () -> requestBatteryOptimization());
        content.addView(card, params(0, 0, 0, 12));
    }

    private void addBatteryGuidanceCard() {
        LinearLayout card = card();
        sectionHeading(card, "Keep the gateway running", "Some Android brands pause apps aggressively in the background.");
        card.addView(text("OnePlus: set battery use to Unrestricted, enable Auto launch, and lock this app in Recents.\n\nXiaomi / Redmi: allow Autostart, set Battery saver to No restrictions, and lock this app in Recents.",
                14, muted, false));
        content.addView(card, params(0, 0, 0, 12));
    }

    private void addPermissionRow(LinearLayout parent, String label, String permission, int requestCode) {
        boolean granted = hasPermission(permission);
        addAccessRow(parent, label, granted ? "Granted" : "Grant", granted ? "Permission is active." : "Tap to allow this permission.",
                granted ? null : () -> requestPermissions(new String[]{permission}, requestCode));
    }

    private void addAccessRow(LinearLayout parent, String label, String action, String hint, Runnable onClick) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setOrientation(LinearLayout.HORIZONTAL);
        LinearLayout copy = new LinearLayout(this);
        copy.setOrientation(LinearLayout.VERTICAL);
        copy.addView(text(label, 15, ink, true));
        copy.addView(text(hint, 12, muted, false), params(0, 3, 0, 0));
        row.addView(copy, new LinearLayout.LayoutParams(0, -2, 1f));
        Button button = button(action, onClick != null);
        button.setEnabled(onClick != null);
        button.setMinWidth(dp(82));
        row.addView(button, new LinearLayout.LayoutParams(-2, dp(44)));
        if (onClick != null) button.setOnClickListener(v -> onClick.run());
        parent.addView(row, params(0, 14, 0, 0));
    }

    private LinearLayout statBlock(String title, String value) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.addView(text(title, 10, muted, true));
        TextView v = text(value, 15, value.equals("None") ? accent : (title.equals("LAST ERROR") ? errorColor : ink), true);
        v.setMaxLines(3);
        box.addView(v, params(0, 4, 8, 0));
        return box;
    }

    private LinearLayout card() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dp(16), dp(16), dp(16), dp(16));
        layout.setBackground(round(surface, 18));
        layout.setElevation(dp(1));
        return layout;
    }

    private void sectionHeading(LinearLayout parent, String title, String subtitle) {
        parent.addView(text(title, 17, ink, true));
        parent.addView(text(subtitle, 13, muted, false), params(0, 5, 0, 0));
    }

    private Button button(String label, boolean primary) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(14);
        button.setAllCaps(false);
        button.setTextColor(primary ? 0xffffffff : ink);
        button.setBackground(new android.graphics.drawable.RippleDrawable(
                android.content.res.ColorStateList.valueOf(0x33777777),
                round(primary ? accent : border, 14), null));
        button.setPadding(dp(12), 0, dp(12), 0);
        return button;
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView text = new TextView(this);
        text.setText(value);
        text.setTextSize(size);
        text.setTextColor(color);
        text.setGravity(Gravity.CENTER_VERTICAL);
        if (bold) text.setTypeface(text.getTypeface(), android.graphics.Typeface.BOLD);
        return text;
    }

    private android.graphics.drawable.GradientDrawable round(int color, int radius) {
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setColor(color);
        bg.setCornerRadius(dp(radius));
        return bg;
    }

    private LinearLayout.LayoutParams params(int left, int top, int right, int bottom) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
        lp.setMargins(dp(left), dp(top), dp(right), dp(bottom));
        return lp;
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean ignoresBatteryOptimizations() {
        if (Build.VERSION.SDK_INT < 23) return true;
        PowerManager manager = getSystemService(PowerManager.class);
        return manager != null && manager.isIgnoringBatteryOptimizations(getPackageName());
    }

    private void requestBatteryOptimization() {
        if (Build.VERSION.SDK_INT < 23 || ignoresBatteryOptimizations()) return;
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                    Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
        }
    }

    private String safeHost(String value) {
        try { return new java.net.URI(value).getHost(); }
        catch (Exception e) { return value; }
    }

    private List<SimLine> currentSims() {
        List<SimLine> result = new ArrayList<>();
        try {
            JSONArray sims = GatewayApi.getSims(this);
            for (int i = 0; i < sims.length(); i++) {
                JSONObject sim = sims.getJSONObject(i);
                result.add(new SimLine(sim.optInt("slot"), sim.optString("carrier"), sim.optString("numberLast4")));
            }
        } catch (Exception ignored) {}
        return result;
    }

    private void startGatewayService() {
        Intent service = new Intent(this, GatewayService.class);
        if (Build.VERSION.SDK_INT >= 26) ContextCompat.startForegroundService(this, service);
        else startService(service);
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        render();
    }

    private static final class SimLine {
        final int slot;
        final String carrier;
        final String last4;
        SimLine(int slot, String carrier, String last4) { this.slot = slot; this.carrier = carrier; this.last4 = last4; }
    }
}
