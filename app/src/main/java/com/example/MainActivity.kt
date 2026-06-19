package com.example

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewAssetLoader.AssetsPathHandler
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.ui.theme.MyApplicationTheme

class MainActivity : ComponentActivity() {
    private var webView: WebView? = null
    private var isActivityDestroyed = false
    private val webViewId = androidx.compose.runtime.mutableStateOf(0)

    private val assetLoader by lazy {
        WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", AssetsPathHandler(this))
            .build()
    }

    fun recreateWebView() {
        runOnUiThread {
            webViewId.value = webViewId.value + 1
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Setup modern edge-to-edge immersive view layout
        enableEdgeToEdge()

        // Pre-create the expected WebView Code Cache subdirectories with a persistent placeholder 
        // to silence Chromium's simple_file_enumerator E/chromium opendir failures during initialization
        preCreateWebViewDirectories()

        // Register a modern predictive-gesture compliant back pressed callback
        onBackPressedDispatcher.addCallback(this, object : androidx.activity.OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val wv = webView ?: run {
                    if (!isFinishing && !isDestroyed) {
                        finish()
                    }
                    return
                }

                if (isFinishing || isDestroyed || !wv.isAttachedToWindow) {
                    if (!isFinishing && !isDestroyed) {
                        finish()
                    }
                    return
                }

                // First try JS navigation history
                wv.evaluateJavascript(
                    "(function(){ if(typeof navigateBack==='function'){ return navigateBack(); } return false; })()"
                ) { result ->
                    if (result == "false" || result == "null" || result == null) {
                        // JS said we are at root screen — exit app
                        if (!isFinishing && !isDestroyed) {
                            finish()
                        }
                    }
                }
            }
        })

        setContent {
            MyApplicationTheme {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(androidx.compose.ui.graphics.Color(0xFF050A1A)) // Dark space background matching game
                        .statusBarsPadding()
                        .navigationBarsPadding()
                ) {
                    androidx.compose.runtime.key(webViewId.value) {
                        LudoWebView()
                    }
                }
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Composable
    fun LudoWebView() {
        androidx.compose.ui.viewinterop.AndroidView(
            modifier = Modifier.fillMaxSize(),
            factory = { context ->
                WebView(context).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    
                    // Match visual theme immediately
                    setBackgroundColor(Color.parseColor("#050a1a"))

                    // Expose vibration haptics interface to JavaScript context using true MainActivity context
                    addJavascriptInterface(WebAppInterface(this@MainActivity), "AndroidVibrator")
                    addJavascriptInterface(AndroidBridge(), "AndroidBridge")

                    webViewClient = object : WebViewClient() {
                        override fun shouldInterceptRequest(
                            view: WebView?,
                            request: WebResourceRequest?
                        ): WebResourceResponse? {
                            return request?.url?.let { uri ->
                                assetLoader.shouldInterceptRequest(uri)
                            }
                        }

                        override fun onPageFinished(view: WebView?, url: String?) {
                            super.onPageFinished(view, url)
                            // Inject standard navigator.vibrate polyfill mapped to custom device bridge
                            view?.evaluateJavascript(
                                """
                                (function() {
                                    if (window.AndroidVibrator && (!navigator.vibrate || navigator.vibrate.toString().indexOf('AndroidVibrator') === -1)) {
                                        navigator.vibrate = function(pattern) {
                                            if (Array.isArray(pattern)) {
                                                window.AndroidVibrator.vibrate(JSON.stringify(pattern));
                                            } else {
                                                window.AndroidVibrator.vibrate(pattern.toString());
                                            }
                                            return true;
                                        };
                                    }
                                })();
                                """.trimIndent(),
                                null
                            )
                        }

                        override fun onReceivedError(
                            view: WebView?,
                            request: android.webkit.WebResourceRequest?,
                            error: android.webkit.WebResourceError?
                        ) {
                            val msg = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                "${error?.errorCode}: ${error?.description}"
                            } else {
                                "${error?.toString()}"
                            }
                            android.util.Log.e("WebViewError", "Resource Error: $msg at ${request?.url}")
                            super.onReceivedError(view, request, error)
                        }

                        override fun onRenderProcessGone(
                            view: WebView?,
                            detail: android.webkit.RenderProcessGoneDetail?
                        ): Boolean {
                            val didCrash = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                detail?.didCrash() == true
                            } else {
                                true
                            }
                            android.util.Log.e("WebViewError", "WebView Render Process Gone! Did crash: $didCrash. Safely cleaning up and recovering...")
                            
                            view?.let { wv ->
                                try {
                                    (wv.parent as? ViewGroup)?.removeView(wv)
                                    wv.stopLoading()
                                    wv.webViewClient = WebViewClient()
                                    wv.webChromeClient = WebChromeClient()
                                    wv.removeAllViews()
                                    wv.destroy()
                                } catch (e: Exception) {
                                    android.util.Log.e("MainActivity", "Error cleaning up dead WebView: ${e.message}")
                                }
                            }
                            if (webView == view) {
                                webView = null
                            }
                            recreateWebView()
                            return true // Prevent app crashing if WebView rendering process crashes
                        }
                    }
                    webChromeClient = object : WebChromeClient() {
                        override fun onConsoleMessage(consoleMessage: android.webkit.ConsoleMessage?): Boolean {
                            if (consoleMessage != null) {
                                val level = consoleMessage.messageLevel()?.name ?: "LOG"
                                val msg = "${consoleMessage.message()} -- From line ${consoleMessage.lineNumber()} of ${consoleMessage.sourceId()}"
                                android.util.Log.d("WebViewConsole", "[$level] $msg")
                            }
                            return super.onConsoleMessage(consoleMessage)
                        }
                    }

                    settings.apply {
                        javaScriptEnabled = true
                        domStorageEnabled = true
                        databaseEnabled = true
                        allowFileAccess = false
                        allowContentAccess = false
                        @Suppress("DEPRECATION")
                        allowFileAccessFromFileURLs = false
                        @Suppress("DEPRECATION")
                        allowUniversalAccessFromFileURLs = false
                        loadWithOverviewMode = false
                        useWideViewPort = false
                        builtInZoomControls = false
                        displayZoomControls = false
                        mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                        
                        // Critical for playing synthesizers automatically with user consent (mute button init)
                        mediaPlaybackRequiresUserGesture = false
                    }

                    // Always load secure asset domain
                    loadUrl("https://appassets.androidplatform.net/assets/space_ludo.html")
                    webView = this
                }
            },
            update = {
                // Keep UI updated if needed
            },
            onRelease = { _ ->
                // Do NOT destroy the WebView synchronously in Compose's release callback,
                // as this runs during transition layout cycles and can cause in-flight InputDispatcher crashes.
                // Complete clean cleanup is safely handled in MainActivity's onDestroy.
            }
        )
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
    }

    override fun onPause() {
        webView?.let { wv ->
            try {
                wv.onPause()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        webView?.let { wv ->
            try {
                wv.onResume()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    override fun onDestroy() {
        if (!isActivityDestroyed) {
            isActivityDestroyed = true
            webView?.let { wv ->
                try {
                    // Detach from parent view immediately on the UI thread to stop receiving touch inputs
                    (wv.parent as? ViewGroup)?.removeView(wv)
                    wv.stopLoading()
                    wv.webViewClient = WebViewClient()
                    wv.webChromeClient = WebChromeClient()
                    wv.removeAllViews()
                    wv.destroy()
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
        webView = null
        super.onDestroy()
    }

    /**
     * Pre-creates directory structures used internally by system Chromium WebViews
     * and seeds a hidden placeholder file to silence persistent 'opendir No such file' errors.
     */
    private fun preCreateWebViewDirectories() {
        try {
            val rootCache = this.cacheDir
            val webViewDir = java.io.File(rootCache, "WebView")
            val defaultClientDir = java.io.File(webViewDir, "Default")
            val httpCacheDir = java.io.File(defaultClientDir, "HTTP Cache")
            val codeCacheDir = java.io.File(httpCacheDir, "Code Cache")
            
            val jsDir = java.io.File(codeCacheDir, "js")
            val wasmDir = java.io.File(codeCacheDir, "wasm")

            if (!jsDir.exists()) {
                val created = jsDir.mkdirs()
                android.util.Log.d("MainActivity", "Precreate WebView Cache js folder: $created")
            }
            if (!wasmDir.exists()) {
                val created = wasmDir.mkdirs()
                android.util.Log.d("MainActivity", "Precreate WebView Cache wasm folder: $created")
            }

            val placeholderJs = java.io.File(jsDir, ".placeholder")
            if (!placeholderJs.exists()) {
                val fileCreated = placeholderJs.createNewFile()
                if (fileCreated) {
                    placeholderJs.writeBytes(byteArrayOf(0))
                }
            }
            
            val placeholderWasm = java.io.File(wasmDir, ".placeholder")
            if (!placeholderWasm.exists()) {
                val fileCreated = placeholderWasm.createNewFile()
                if (fileCreated) {
                    placeholderWasm.writeBytes(byteArrayOf(0))
                }
            }
        } catch (e: Exception) {
            android.util.Log.e("MainActivity", "Error during directory precreation: ${e.message}", e)
        }
    }

    /**
     * Inner Javascript bridge class for device navigation
     */
    inner class AndroidBridge {
        @JavascriptInterface
        fun exitApp() {
            runOnUiThread {
                if (!isFinishing && !isDestroyed) {
                    finish()
                }
            }
        }
    }

    /**
     * Inner Javascript haptic vibration bridge class
     */
    class WebAppInterface(private val context: Context) {
        @JavascriptInterface
        fun vibrate(patternJson: String) {
            try {
                val vibrator = context.applicationContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator ?: return
                if (!vibrator.hasVibrator()) return
                
                val trimmed = patternJson.trim()
                if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                    val numbers = trimmed.substring(1, trimmed.length - 1)
                        .split(",")
                        .filter { it.trim().isNotEmpty() }
                        .map { it.trim().toLong() }
                        .toLongArray()
                    if (numbers.isNotEmpty()) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            vibrator.vibrate(VibrationEffect.createWaveform(numbers, -1))
                        } else {
                            @Suppress("DEPRECATION")
                            vibrator.vibrate(numbers, -1)
                        }
                    }
                } else {
                    val ms = trimmed.toLongOrNull() ?: return
                    if (ms > 0) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
                        } else {
                            @Suppress("DEPRECATION")
                            vibrator.vibrate(ms)
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("WebAppInterface", "Vibration failed: ${e.message}", e)
            }
        }
    }
}
