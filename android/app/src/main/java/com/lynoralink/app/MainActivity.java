package com.lynoralink.app;

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
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.widget.FrameLayout;
import android.widget.ImageView;

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

public class MainActivity extends BridgeActivity {

    private static final long SPLASH_MIN_VISIBLE_MS = 1800L;
    private static final long SPLASH_FALLBACK_MS = 7000L;

    private boolean isOffline = false;
    private FrameLayout splashOverlay;
    private final Handler splashHandler = new Handler(Looper.getMainLooper());
    private Runnable hideSplashRunnable;

    private ActivityResultLauncher<String> requestPermissionLauncher;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Splash Screen API
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // Initialize permission launcher (register after Activity is created)
        requestPermissionLauncher = registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
            // FCM Permission handled
        });
        
        // 2. Permissions
        askNotificationPermission();
        
        // 3. Configure Immersive Layout
        setupEdgeToEdge();
        applyContentInsets();
        
        // 4. Create Custom Splash Overlay
        createSplashOverlay();
        
        // 5. Initial Connectivity Check
        isOffline = isNetworkDisconnected();
        if (isOffline) {
            showOverlayInternal();
        }
        
        // System splash fades out; our overlay is already VISIBLE to prevent white screen
        splashScreen.setKeepOnScreenCondition(() -> false);

        registerConnectivityMonitoring();
        scheduleSplashHide();
        
        // 6. Configure WebView Handling for stability
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
        android.view.Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        try {
            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
            if (controller != null) {
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }
        } catch (Throwable t) {
            // Ignore OEM/platform issues with insets controller to avoid startup crash.
        }
    }

    @SuppressLint("NewApi")
    private void applyContentInsets() {
        View contentView = findViewById(android.R.id.content);
        if (contentView == null) return;
        ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, insets) -> {
            if (insets == null) return WindowInsetsCompat.CONSUMED;
            int top = insets.getInsets(WindowInsetsCompat.Type.systemBars()).top;
            int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
            v.setPadding(0, top, 0, bottom);
            return WindowInsetsCompat.CONSUMED;
        });
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

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash); 
        
        int logoSize = (int) (120 * getResources().getDisplayMetrics().density);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(
                logoSize,
                logoSize,
                Gravity.CENTER
        );
        logo.setLayoutParams(logoParams);
        splashOverlay.addView(logo);

        // Visible by default to mask WebView loading process
        splashOverlay.setVisibility(View.VISIBLE);

        ViewGroup decor = (ViewGroup) getWindow().getDecorView();
        if (decor != null && splashOverlay.getParent() == null) {
            decor.addView(splashOverlay);
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();
            webView.setBackgroundColor(Color.parseColor("#152A4D"));
            
            settings.setDomStorageEnabled(true);
            // setJavaScriptEnabled is required for Capacitor functionality
            //noinspection all
            settings.setJavaScriptEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            
            webView.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                    if (!isOffline) {
                        scheduleSplashHide();
                    }
                }

                @Override
                public void onPageFinished(WebView view, String url) {
                    super.onPageFinished(view, url);
                    
                    // Prevent hiding overlay for blank or internal error pages
                    if (url == null || url.equals("about:blank") || url.startsWith("chrome-error://")) {
                        return;
                    }

                    // Older Android WebViews are slower to render the first frame; keep the splash visible
                    // for a safe minimum before we reveal the app.
                    scheduleSplashHide();
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
    public void onResume() {
        super.onResume();
        if (!isOffline) {
            scheduleSplashHide();
        }
    }

    @Override
    public void onDestroy() {
        if (hideSplashRunnable != null) {
            splashHandler.removeCallbacks(hideSplashRunnable);
        }
        splashHandler.removeCallbacksAndMessages(null);
        super.onDestroy();
    }

    @Override
    public void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
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

    private void scheduleSplashHide() {
        if (hideSplashRunnable != null) {
            splashHandler.removeCallbacks(hideSplashRunnable);
        }

        hideSplashRunnable = () -> {
            if (!isOffline) {
                hideOverlayInternal();
            }
        };

        splashHandler.postDelayed(hideSplashRunnable, SPLASH_MIN_VISIBLE_MS);
        splashHandler.postDelayed(() -> {
            if (!isOffline && splashOverlay != null && splashOverlay.getVisibility() == View.VISIBLE) {
                hideOverlayInternal();
            }
        }, SPLASH_FALLBACK_MS);
    }

    private void hideOverlayInternal() {
        runOnUiThread(() -> {
            if (splashOverlay != null && !isOffline) {
                splashOverlay.setVisibility(View.GONE);
                setSystemBarsLight(true);
            }
        });
    }

    private void initiateReload() {
        runOnUiThread(() -> {
            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().reload();
            }
        });
    }

    private void setSystemBarsLight(boolean light) {
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(light);
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
                    initiateReload();
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
