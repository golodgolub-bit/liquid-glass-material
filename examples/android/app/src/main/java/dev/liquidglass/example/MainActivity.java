package dev.liquidglass.example;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.*;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private WebView web;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        web = new WebView(this); setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = loader.shouldInterceptRequest(request.getUrl());
                if (local != null) return local;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                return !"https".equals(uri.getScheme()) || !"appassets.androidplatform.net".equals(uri.getHost());
            }
            @Override public void onPageFinished(WebView view, String url) {
                view.evaluateJavascript("window.glassHost?.setPlatform('Android · WebView');", null);
                applyPreferences();
            }
        });
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface public void postMessage(String payload) {
                try {
                    JSONObject json = new JSONObject(payload);
                    if (!"glass-action".equals(json.optString("type"))) return;
                    String action = json.optString("action");
                    if (!action.equals("regular") && !action.equals("clear")) return;
                    runOnUiThread(() -> Toast.makeText(MainActivity.this, "Selected: " + action, Toast.LENGTH_SHORT).show());
                } catch (Exception ignored) { }
            }
        }, "GlassNative");
        web.loadUrl("https://appassets.androidplatform.net/assets/glass/index.html");
    }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
    private void applyPreferences() {
        float scale = android.provider.Settings.Global.getFloat(getContentResolver(), android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
        web.evaluateJavascript("window.glassHost?.setAccessibility({reducedMotion:" + (scale == 0f) + "});", null);
    }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); applyPreferences(); } }
    @Override protected void onDestroy() { web.removeJavascriptInterface("GlassNative"); web.destroy(); super.onDestroy(); }
}
