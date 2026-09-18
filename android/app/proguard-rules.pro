# Project specific ProGuard rules
# These rules ensure that Capacitor and its bridge work correctly with minification.

# Preserve Capacitor core logic
-keep class com.getcapacitor.** { *; }

# Preserve Javascript interfaces for bridge communication
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# Preserve Capacitor plugins
-keep public class * extends com.getcapacitor.Plugin {
    *;
}

# Preserve Firebase classes used by the push notifications plugin
-keep class com.google.firebase.** { *; }
