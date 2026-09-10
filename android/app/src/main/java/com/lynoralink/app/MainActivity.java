package com.lynoralink.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

import androidx.annotation.NonNull;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		registerConnectivityMonitoring();

		if (!hasInternetConnection()) {
			Toast.makeText(this, "Connexion Internet indisponible", Toast.LENGTH_LONG).show();
		}
	}

	@Override
	public void onResume() {
		super.onResume();
		if (!hasInternetConnection()) {
			if (bridge != null && bridge.getWebView() != null) {
				bridge.getWebView().loadUrl("file:///android_asset/offline.html");
			}
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
						if (bridge != null && bridge.getWebView() != null) {
							if ("file:///android_asset/offline.html".equals(bridge.getWebView().getUrl())) {
								bridge.getWebView().reload();
							}
						}
					});
				}

				@Override
				public void onLost(@NonNull Network network) {
					runOnUiThread(() -> {
						if (bridge != null && bridge.getWebView() != null) {
							bridge.getWebView().loadUrl("file:///android_asset/offline.html");
						}
					});
				}
			});
		}
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
}
