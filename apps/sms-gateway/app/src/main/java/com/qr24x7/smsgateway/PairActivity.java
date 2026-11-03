package com.qr24x7.smsgateway;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.Image;
import android.media.ImageReader;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.text.InputType;
import android.view.Gravity;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import android.net.Uri;

import androidx.core.content.ContextCompat;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.LuminanceSource;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.common.HybridBinarizer;

import org.json.JSONObject;

import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PairActivity extends Activity implements TextureView.SurfaceTextureListener {
    private static final int CAMERA_PERMISSION = 50;
    private static final int CAMERA_WIDTH = 640;
    private static final int CAMERA_HEIGHT = 480;
    private static final ExecutorService PAIR_EXECUTOR = Executors.newSingleThreadExecutor();

    private TextureView preview;
    private EditText qrText;
    private TextView status;
    private Button pairButton;
    private HandlerThread cameraThread;
    private Handler cameraHandler;
    private CameraDevice camera;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private long lastFrameAt;
    private volatile boolean pairing;
    private int ink = 0xff14211b, muted = 0xff5e7067, surfaceColor = 0xfff2f6f4, accent = 0xff16a34a;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        boolean night = (getResources().getConfiguration().uiMode
                & android.content.res.Configuration.UI_MODE_NIGHT_MASK)
                == android.content.res.Configuration.UI_MODE_NIGHT_YES;
        if (night) { ink = 0xfff2f7f4; muted = 0xffb0c0b8; surfaceColor = 0xff101715; accent = 0xff78d6b7; }
        getWindow().setStatusBarColor(surfaceColor);
        getWindow().setNavigationBarColor(surfaceColor);
        buildUi();
        startCameraThread();
    }

    private void buildUi() {
        ScrollView scroll = new ScrollView(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(dp(20), dp(16), dp(20), dp(28));
        root.setBackgroundColor(surfaceColor);
        scroll.addView(root);
        setContentView(scroll);

        TextView title = text("Pair this phone", 25, ink, true);
        root.addView(title, lp(0, 0, 0, 4));
        root.addView(text("Scan the admin QR, or paste its JSON below.", 14, muted, false), lp(0, 0, 0, 14));
        // TextureView can't take a background, so the rounded frame goes on a wrapper.
        android.widget.FrameLayout previewFrame = new android.widget.FrameLayout(this);
        previewFrame.setBackground(round(0xff18211d, 18));
        previewFrame.setClipToOutline(true);
        preview = new TextureView(this);
        preview.setSurfaceTextureListener(this);
        previewFrame.addView(preview, new android.widget.FrameLayout.LayoutParams(-1, -1));
        root.addView(previewFrame, lp(0, 0, 0, 10, -1, dp(230)));
        status = text("Camera is ready when permission is granted. Manual paste is always available.", 13, muted, false);
        root.addView(status, lp(2, 2, 2, 12));
        TextView label = text("QR JSON", 14, ink, true);
        root.addView(label, lp(0, 0, 0, 6));
        qrText = new EditText(this);
        qrText.setHint("{\"type\":\"YOUPI_SMS_GATEWAY_PAIR\", ...}");
        qrText.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        qrText.setGravity(Gravity.TOP | Gravity.START);
        qrText.setMinLines(5);
        qrText.setTextSize(13);
        qrText.setPadding(dp(12), dp(10), dp(12), dp(10));
        qrText.setBackground(round(0xffffffff, 12));
        root.addView(qrText, lp(0, 0, 0, 12));
        pairButton = button("Pair from QR text");
        pairButton.setOnClickListener(v -> pairFromText(qrText.getText().toString()));
        root.addView(pairButton, lp(0, 0, 0, 10, -1, dp(52)));
        Button cameraButton = button("Allow camera access");
        cameraButton.setOnClickListener(v -> requestCamera());
        root.addView(cameraButton, lp(0, 0, 0, 0, -1, dp(48)));
    }

    private void requestCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            status.setText("Point the camera at the pairing QR.");
            if (preview.isAvailable()) openCamera(preview.getWidth(), preview.getHeight());
        } else if (Build.VERSION.SDK_INT >= 23) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION);
        }
    }

    private void pairFromText(String text) {
        if (pairing) return;
        if (text == null || text.trim().isEmpty()) {
            status.setText("Paste the complete pairing QR JSON first.");
            return;
        }
        pairing = true;
        pairButton.setEnabled(false);
        status.setText("Pairing with the server…");
        closeCamera();
        final String payload = text.trim();
        PAIR_EXECUTOR.execute(() -> {
            try {
                JSONObject qr = new JSONObject(payload);
                if (!"YOUPI_SMS_GATEWAY_PAIR".equals(qr.optString("type"))
                        || !"v1".equals(qr.optString("version"))) {
                    throw new IllegalArgumentException("This is not a supported SMS gateway pairing QR.");
                }
                long expiresAt = qr.optLong("expiresAt", 0);
                if (expiresAt <= 0) throw new IllegalArgumentException("The pairing QR has no expiry time.");
                if (expiresAt < System.currentTimeMillis())
                    throw new IllegalArgumentException("This pairing QR has expired. Create a new QR on the admin page.");
                String serverUrl = GatewayApi.cleanServerUrl(qr.optString("serverUrl", ""));
                String enrollmentToken = qr.optString("enrollmentToken", "");
                if (enrollmentToken.isEmpty()) throw new IllegalArgumentException("The pairing QR has no enrollment token.");
                String model = Build.MODEL == null ? "Android" : Build.MODEL;
                JSONObject request = new JSONObject();
                request.put("enrollmentToken", enrollmentToken);
                request.put("deviceName", model);
                request.put("deviceModel", model);
                request.put("version", appVersion());
                request.put("merchantId", qr.optString("merchantId", ""));
                JSONObject response = GatewayApi.pair(serverUrl, request);
                String deviceId = response.optString("deviceId", "");
                String signingKey = response.optString("signingKey", "");
                if (deviceId.isEmpty() || signingKey.isEmpty())
                    throw new IllegalStateException("The server response did not contain device credentials.");
                GatewayPrefs.savePairing(this, deviceId, signingKey, serverUrl,
                        response.optString("merchantId", qr.optString("merchantId", "")));
                String host = Uri.parse(serverUrl).getHost();
                String done = "Paired with " + (host == null ? "your website" : host) + ". This phone will now send its login codes.";
                runOnUiThread(() -> {
                    status.setText(done);
                    startGatewayService();
                    setResult(RESULT_OK);
                    // The toast stays on screen after this activity closes, so the user sees the result.
                    Toast.makeText(getApplicationContext(), done, Toast.LENGTH_LONG).show();
                    status.postDelayed(this::finish, 1500);
                });
            } catch (Exception e) {
                String message = e.getMessage() == null ? "Pairing failed. Check the QR and network." : e.getMessage();
                runOnUiThread(() -> {
                    pairing = false;
                    pairButton.setEnabled(true);
                    status.setText(message);
                });
            }
        });
    }

    private void startGatewayService() {
        Intent service = new Intent(this, GatewayService.class);
        ContextCompat.startForegroundService(this, service);
    }

    private void startCameraThread() {
        cameraThread = new HandlerThread("gateway-camera");
        cameraThread.start();
        cameraHandler = new Handler(cameraThread.getLooper());
    }

    @Override public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED)
            openCamera(width, height);
    }
    @Override public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {}
    @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) { closeCamera(); return true; }
    @Override public void onSurfaceTextureUpdated(SurfaceTexture surface) {}

    private void openCamera(int width, int height) {
        if (pairing || camera != null || ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) return;
        try {
            CameraManager manager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
            String cameraId = null;
            for (String id : manager.getCameraIdList()) {
                CameraCharacteristics c = manager.getCameraCharacteristics(id);
                Integer facing = c.get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK) { cameraId = id; break; }
            }
            if (cameraId == null) {
                status.setText("No rear camera found. Paste the QR JSON below.");
                return;
            }
            imageReader = ImageReader.newInstance(CAMERA_WIDTH, CAMERA_HEIGHT, ImageFormat.YUV_420_888, 2);
            imageReader.setOnImageAvailableListener(reader -> decodeFrame(reader.acquireLatestImage()), cameraHandler);
            manager.openCamera(cameraId, new CameraDevice.StateCallback() {
                @Override public void onOpened(CameraDevice opened) {
                    camera = opened;
                    createPreviewSession(width, height);
                }
                @Override public void onDisconnected(CameraDevice disconnected) { disconnected.close(); camera = null; }
                @Override public void onError(CameraDevice failed, int error) {
                    failed.close(); camera = null;
                    runOnUiThread(() -> status.setText("Camera unavailable. Paste the QR JSON below."));
                }
            }, cameraHandler);
            status.setText("Point the camera at the pairing QR.");
        } catch (Exception e) {
            status.setText("Camera unavailable. Paste the QR JSON below.");
        }
    }

    private void createPreviewSession(int width, int height) {
        try {
            SurfaceTexture texture = preview.getSurfaceTexture();
            if (texture == null || camera == null || imageReader == null) return;
            texture.setDefaultBufferSize(CAMERA_WIDTH, CAMERA_HEIGHT);
            Surface previewSurface = new Surface(texture);
            Surface imageSurface = imageReader.getSurface();
            CaptureRequest.Builder request = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
            request.addTarget(previewSurface);
            request.addTarget(imageSurface);
            request.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
            camera.createCaptureSession(Arrays.asList(previewSurface, imageSurface),
                    new CameraCaptureSession.StateCallback() {
                        @Override public void onConfigured(CameraCaptureSession session) {
                            if (camera == null) { session.close(); return; }
                            captureSession = session;
                            try { session.setRepeatingRequest(request.build(), null, cameraHandler); }
                            catch (CameraAccessException ignored) {}
                        }
                        @Override public void onConfigureFailed(CameraCaptureSession session) {
                            runOnUiThread(() -> status.setText("Camera preview failed. Paste the QR JSON below."));
                        }
                    }, cameraHandler);
        } catch (Exception e) {
            runOnUiThread(() -> status.setText("Camera preview failed. Paste the QR JSON below."));
        }
    }

    private void decodeFrame(Image image) {
        if (image == null) return;
        long now = System.currentTimeMillis();
        if (pairing || now - lastFrameAt < 350) { image.close(); return; }
        lastFrameAt = now;
        try {
            int width = image.getWidth(), height = image.getHeight();
            Image.Plane plane = image.getPlanes()[0];
            ByteBuffer buffer = plane.getBuffer();
            int rowStride = plane.getRowStride(), pixelStride = plane.getPixelStride();
            byte[] luminance = new byte[width * height];
            for (int y = 0; y < height; y++) {
                int rowStart = y * rowStride;
                for (int x = 0; x < width; x++) luminance[y * width + x] = buffer.get(rowStart + x * pixelStride);
            }
            LuminanceSource source = new com.google.zxing.PlanarYUVLuminanceSource(
                    luminance, width, height, 0, 0, width, height, false);
            Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
            hints.put(DecodeHintType.POSSIBLE_FORMATS, Collections.singletonList(com.google.zxing.BarcodeFormat.QR_CODE));
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
            MultiFormatReader reader = new MultiFormatReader();
            reader.setHints(hints);
            for (int turns = 0; turns < 4; turns++) {
                try {
                    Result result = reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(source)));
                    reader.reset();
                    String text = result.getText();
                    runOnUiThread(() -> {
                        qrText.setText(text);
                        status.setText("QR scanned. Pairing now…");
                        pairFromText(text);
                    });
                    return;
                } catch (Exception ignored) {
                    reader.reset();
                    source = source.rotateCounterClockwise();
                }
            }
        } catch (Exception ignored) {
            // Camera frames are discarded silently; QR content is never written to logs.
        } finally {
            image.close();
        }
    }

    private void closeCamera() {
        try { if (captureSession != null) captureSession.close(); } catch (Exception ignored) {}
        captureSession = null;
        try { if (camera != null) camera.close(); } catch (Exception ignored) {}
        camera = null;
        try { if (imageReader != null) imageReader.close(); } catch (Exception ignored) {}
        imageReader = null;
    }

    @Override protected void onPause() {
        closeCamera();
        super.onPause();
    }

    @Override protected void onDestroy() {
        closeCamera();
        if (cameraThread != null) cameraThread.quitSafely();
        super.onDestroy();
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION && grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED && preview.isAvailable()) {
            openCamera(preview.getWidth(), preview.getHeight());
        } else if (requestCode == CAMERA_PERMISSION) {
            status.setText("Camera permission denied. Paste the QR JSON below to pair.");
        }
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(value); t.setTextSize(size); t.setTextColor(color);
        if (bold) t.setTypeface(t.getTypeface(), android.graphics.Typeface.BOLD);
        return t;
    }
    private Button button(String value) {
        Button b = new Button(this); b.setText(value); b.setAllCaps(false); b.setTextColor(0xffffffff);
        b.setBackground(new android.graphics.drawable.RippleDrawable(
                android.content.res.ColorStateList.valueOf(0x33777777), round(accent, 14), null)); return b;
    }
    private android.graphics.drawable.GradientDrawable round(int color, int radius) {
        android.graphics.drawable.GradientDrawable bg = new android.graphics.drawable.GradientDrawable();
        bg.setColor(color); bg.setCornerRadius(dp(radius)); return bg;
    }
    private LinearLayout.LayoutParams lp(int l, int t, int r, int b) {
        return lp(l, t, r, b, -1, -2);
    }
    private LinearLayout.LayoutParams lp(int l, int t, int r, int b, int width, int height) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(width, height);
        params.setMargins(dp(l), dp(t), dp(r), dp(b)); return params;
    }
    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }

    private String appVersion() {
        try {
            return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
        } catch (Exception e) {
            return "";
        }
    }
}
