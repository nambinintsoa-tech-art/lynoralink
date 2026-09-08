package com.lynoralink.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.os.Bundle;
import android.widget.Toast;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
		splashScreen.setKeepOnScreenCondition(() -> !hasInternetConnection());

		super.onCreate(savedInstanceState);

		if (!hasInternetConnection()) {
			Toast.makeText(this, "Connexion Internet indisponible", Toast.LENGTH_LONG).show();
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
