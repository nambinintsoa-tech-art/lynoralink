package com.lynoralink.app;

import android.animation.ObjectAnimator;
import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

import java.util.Objects;

public class MainActivity extends BridgeActivity {

    private static final long SPLASH_MIN_VISIBLE_MS = 1500L;
    private static final long LOAD_TIMEOUT_MS = 10000L; 

    private boolean isOffline = false;
    private FrameLayout splashOverlay;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean contentLoaded = false;

    private final ActivityResultLauncher<String> requestPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                // FCM Permission handled
            });

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Install Splash Screen API
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // 2. Permissions (Android 13+)
        askNotificationPermission();
        
        // 3. Setup Layout
        setupEdgeToEdge();
        applyContentInsets();
        
        // 4. Create Custom Splash Overlay
        createSplashOverlay();
        
        // 5. Connectivity
        isOffline = isNetworkDisconnected();
        if (isOffline) {
            showOverlayInternal();
            Toast.makeText(this, "Mode hors-ligne", Toast.LENGTH_SHORT).show();
        } else {
            // Mask loading even if online
            showOverlayInternal();
        }
        
        // Let the system splash fade; our custom overlay handles the rest.
        splashScreen.setKeepOnScreenCondition(() -> false);

        registerConnectivityMonitoring();
        
        // Fail-safe: hide overlay after timeout
        mainHandler.postDelayed(() -> {
            if (!isOffline && !contentLoaded) {
                hideOverlayInternal();
            }
        }, LOAD_TIMEOUT_MS);
        
        // 6. WebView Setup
        setupWebView();
    }

    private void askNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                    PackageManager.PERMISSION_GRANTED) {
                requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    @SuppressWarnings("deprecation")
    private void setupEdgeToEdge() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        
        // Set bars to transparent
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setStatusBarContrastEnforced(false);
            window.setNavigationBarContrastEnforced(false);
        }

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        Objects.requireNonNull(controller).setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);
    }

    private void applyContentInsets() {
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, insets) -> {
                int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
                int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
                v.setPadding(0, top, 0, bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }
    }

    private void createSplashOverlay() {
        splashOverlay = new FrameLayout(this);
        splashOverlay.setBackgroundColor(Color.parseColor("#152A4D"));
        splashOverlay.setClickable(true);
        splashOverlay.setFocusable(true);
        
        FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        );
        splashOverlay.setLayoutParams(layoutParams);

        LinearLayout splashContent = new LinearLayout(this);
        splashContent.setOrientation(LinearLayout.VERTICAL);
        splashContent.setGravity(Gravity.CENTER_HORIZONTAL);
        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        );
        splashContent.setLayoutParams(contentParams);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash); 
        
        int logoSize = (int) (120 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(
                logoSize,
                logoSize,
                Gravity.CENTER
        );
        logo.setLayoutParams(logoParams);
        splashContent.addView(logo);

        LinearLayout dots = new LinearLayout(this);
        dots.setOrientation(LinearLayout.HORIZONTAL);
        dots.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams dotsParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        dotsParams.topMargin = (int) (24 * getResources().getDisplayMetrics().density);
        dots.setLayoutParams(dotsParams);

        int dotSize = (int) (8 * getResources().getDisplayMetrics().density);
        int dotGap = (int) (8 * getResources().getDisplayMetrics().density);
        for (int index = 0; index < 6; index++) {
            View dot = new View(this);
            dot.setBackgroundColor(index == 1 ? Color.parseColor("#D9A441") : Color.WHITE);
            LinearLayout.LayoutParams dotParams = new LinearLayout.LayoutParams(dotSize, dotSize);
            dotParams.leftMargin = index == 0 ? 0 : dotGap;
            dots.addView(dot, dotParams);

            ObjectAnimator animation = ObjectAnimator.ofFloat(dot, View.ALPHA, 0.28f, 1f, 0.28f);
            animation.setDuration(1200L);
            animation.setStartDelay(index * 120L);
            animation.setRepeatCount(ObjectAnimator.INFINITE);
            animation.start();
        }
        splashContent.addView(dots);
        splashOverlay.addView(splashContent);

        splashOverlay.setVisibility(View.GONE);

        ViewGroup decor = (ViewGroup) getWindow().getDecorView();
        if (splashOverlay.getParent() == null) {
            decor.addView(splashOverlay);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();
            
            settings.setDomStorageEnabled(true);
            // setJavaScriptEnabled is required for Capacitor functionality
            settings.setJavaScriptEnabled(true);
            settings.setAllowFileAccess(true);
            
            webView.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    if (url == null || url.equals("about:blank")) return;

                    mainHandler.postDelayed(() -> {
                        if (!isOffline) {
                            contentLoaded = true;
                            hideOverlayInternal();
                        }
                    }, SPLASH_MIN_VISIBLE_MS);
                }

                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                    if (request.isForMainFrame()) {
                        isOffline = true;
                        showOverlayInternal();
                    }
                }
                
                @SuppressWarnings("deprecation")
                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    super.onReceivedError(view, errorCode, description, failingUrl);
                    isOffline = true;
                    showOverlayInternal();
                }
            });
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    @Override
    public void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    private void showOverlayInternal() {
        runOnUiThread(() -> {
            if (splashOverlay != null) {
                splashOverlay.setVisibility(View.VISIBLE);
                splashOverlay.bringToFront();
                setSystemBarsLight(false); 
            }
        });
    }

    private void hideOverlayInternal() {
        runOnUiThread(() -> {
            if (splashOverlay != null) {
                splashOverlay.setVisibility(View.GONE);
                setSystemBarsLight(true); 
            }
        });
    }

    private void setSystemBarsLight(boolean light) {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        Objects.requireNonNull(controller).setAppearanceLightStatusBars(light);
        controller.setAppearanceLightNavigationBars(light);
    }

    private void registerConnectivityMonitoring() {
        ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivityManager == null) return;

        connectivityManager.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) {
                if (isOffline) {
                    isOffline = false;
                    runOnUiThread(() -> {
                        if (bridge != null && bridge.getWebView() != null) {
                            bridge.getWebView().reload();
                        }
                    });
                }
            }

            @Override
            public void onLost(@NonNull Network network) {
                if (isNetworkDisconnected()) {
                    isOffline = true;
                    showOverlayInternal();
                }
            }
        });
    }

    private boolean isNetworkDisconnected() {
        ConnectivityManager connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        if (connectivityManager == null) return true;

        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) return true;
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        return capabilities == null || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }
}
