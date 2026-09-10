package com.lynoralink.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	private boolean keepSplashVisible = false;

	@Override
	public void onCreate(Bundle savedInstanceState) {
		SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
		splashScreen.setKeepOnScreenCondition(() -> keepSplashVisible);

		super.onCreate(savedInstanceState);

		if (this.bridge != null && this.bridge.getWebView() != null) {
			this.bridge.getWebView().setWebViewClient(new OfflineAwareWebViewClient());
		}

		registerConnectivityMonitoring();

		if (!hasInternetConnection()) {
			keepSplashVisible = true;
			Toast.makeText(this, "Connexion Internet indisponible", Toast.LENGTH_LONG).show();
		} else {
			keepSplashVisible = false;
		}
	}

	private void registerConnectivityMonitoring() {
		ConnectivityManager connectivityManager =
			(ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
		if (connectivityManager == null) return;

		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
			connectivityManager.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
				@Override
				public void onAvailable(@NonNull Network network) {
					runOnUiThread(() -> {
						keepSplashVisible = false;
						if (thisBridgeHasOfflinePage()) {
							if (bridge != null && bridge.getWebView() != null) {
								bridge.getWebView().reload();
							}
						}
					});
				}

				@Override
				public void onLost(@NonNull Network network) {
					runOnUiThread(() -> keepSplashVisible = true);
				}
			});
		}
	}

	private boolean thisBridgeHasOfflinePage() {
		return bridge != null && bridge.getWebView() != null && "file:///android_asset/offline.html".equals(bridge.getWebView().getUrl());
	}

	private boolean hasInternetConnection() {
		ConnectivityManager connectivityManager =
			(ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);

		if (connectivityManager == null) return false;

		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
			android.net.Network activeNetwork = connectivityManager.getActiveNetwork();
			if (activeNetwork == null) return false;

			NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
			return capabilities != null
				&& capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
				&& capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED);
		}

		android.net.NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
		return activeNetworkInfo != null && activeNetworkInfo.isConnected();
	}

	private class OfflineAwareWebViewClient extends WebViewClient {
		@Override
		public void onPageStarted(WebView view, String url, Bitmap favicon) {
			super.onPageStarted(view, url, favicon);
			if (!hasInternetConnection()) {
				keepSplashVisible = true;
				if (!"file:///android_asset/offline.html".equals(url)) {
					view.stopLoading();
					view.loadUrl("file:///android_asset/offline.html");
				}
			} else {
				keepSplashVisible = false;
			}
		}

		@Override
		public void onPageFinished(WebView view, String url) {
			super.onPageFinished(view, url);
			if (!hasInternetConnection()) {
				keepSplashVisible = true;
				return;
			}

			if ("file:///android_asset/offline.html".equals(url)) {
				keepSplashVisible = false;
				return;
			}

			keepSplashVisible = false;
		}

		@Override
		public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
			super.onReceivedError(view, request, error);
			if (!hasInternetConnection()) {
				keepSplashVisible = true;
				if (!"file:///android_asset/offline.html".equals(view.getUrl())) {
					view.stopLoading();
					view.loadUrl("file:///android_asset/offline.html");
				}
			} else {
				keepSplashVisible = false;
			}
		}

		@Override
		public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
			super.onReceivedHttpError(view, request, errorResponse);
			if (!hasInternetConnection()) {
				keepSplashVisible = true;
				if (!"file:///android_asset/offline.html".equals(view.getUrl())) {
					view.stopLoading();
					view.loadUrl("file:///android_asset/offline.html");
				}
			} else {
				keepSplashVisible = false;
			}
		}
	}
}
