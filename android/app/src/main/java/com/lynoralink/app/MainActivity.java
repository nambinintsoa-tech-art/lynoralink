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
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
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

public class MainActivity extends BridgeActivity {

    private static final long SPLASH_MIN_VISIBLE_MS = 1500L;
    private static final long LOAD_TIMEOUT_MS = 15000L; // 15 seconds fail-safe

    private boolean isOffline = false;
    private FrameLayout splashOverlay;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean contentLoaded = false;

    private final ActivityResultLauncher<String> requestPermissionLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), isGranted -> {
                // Permission handled
            });

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // 1. Install Splash Screen API
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        
        super.onCreate(savedInstanceState);
        
        // 2. Notifications Permission (Android 13+)
        askNotificationPermission();
        
        // 3. Modern Layout
        setupEdgeToEdge();
        applyContentInsets();
        
        // 4. Create Custom Splash Overlay
        createSplashOverlay();
        
        // 5. Connectivity
        isOffline = isNetworkDisconnected();
        if (isOffline) {
            showOverlayInternal();
            Toast.makeText(this, "Mode hors-ligne", Toast.LENGTH_SHORT).show();
        }
        
        // Let the system splash fade; our custom overlay handles the rest.
        splashScreen.setKeepOnScreenCondition(() -> false);

        registerConnectivityMonitoring();
        
        // 6. Fail-safe: hide overlay after timeout
        mainHandler.postDelayed(() -> {
            if (!isOffline && !contentLoaded) {
                hideOverlayInternal();
            }
        }, LOAD_TIMEOUT_MS);
        
        // 7. WebView
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

    private void setupEdgeToEdge() {
        android.view.Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }
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

        splashOverlay.setVisibility(View.VISIBLE);

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
            settings.setJavaScriptEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
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
        if (controller != null) {
            controller.setAppearanceLightStatusBars(light);
            controller.setAppearanceLightNavigationBars(light);
        }
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
