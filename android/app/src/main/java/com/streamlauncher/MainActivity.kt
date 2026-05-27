package com.streamlauncher

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.webkit.*
import android.widget.FrameLayout
import android.widget.ProgressBar
import java.io.ByteArrayInputStream
import android.graphics.Color
import android.view.WindowInsets
import android.view.WindowInsetsController

class MainActivity : Activity() {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private var customView: View? = null
    private var customViewCallback: WebChromeClient.CustomViewCallback? = null
    private lateinit var container: FrameLayout

    // Ad/tracker domains to block
    private val adDomains = setOf(
        "googlesyndication.com", "doubleclick.net", "googleadservices.com",
        "google-analytics.com", "googletagmanager.com", "adnxs.com",
        "amazon-adsystem.com", "advertising.com", "taboola.com", "outbrain.com",
        "propellerads.com", "popads.net", "popcash.net", "exoclick.com",
        "trafficjunky.net", "juicyads.com", "hilltopads.net", "hilltopads.com",
        "mgid.com", "revcontent.com", "criteo.com", "openx.net",
        "appnexus.com", "rubiconproject.com", "pubmatic.com",
        "casalemedia.com", "adsterra.com", "atdmt.com",
        "scorecardresearch.com", "comscore.com", "hotjar.com",
        "coinhive.com", "coin-hive.com", "webminepool.com",
        "adfly.io", "adf.ly", "ouo.io", "adsprimary.com",
        "monetag.com", "propush.me", "onclickads.net",
        "bidvertiser.com", "adcash.com"
    )

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        makeFullscreen()

        // Root container
        container = FrameLayout(this)
        container.setBackgroundColor(Color.parseColor("#0a0a0f"))

        // Progress bar
        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal)
        progressBar.isIndeterminate = false
        progressBar.max = 100
        val pbParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, 8
        )
        container.addView(progressBar, pbParams)

        // WebView
        webView = WebView(this)
        val wvParams = FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        )
        container.addView(webView, 0, wvParams)
        container.addView(progressBar)

        setContentView(container)

        setupWebView()

        // Load the built-in launcher HTML
        webView.loadUrl("file:///android_asset/index.html")
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled          = true
        settings.domStorageEnabled          = true
        settings.databaseEnabled            = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccessFromFileURLs = true
        settings.allowUniversalAccessFromFileURLs = true
        settings.mixedContentMode           = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.useWideViewPort            = true
        settings.loadWithOverviewMode       = true
        settings.setSupportZoom(false)
        settings.userAgentString = "Mozilla/5.0 (Linux; Android 12; GoogleTV) " +
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

        // ── Ad Blocking via WebViewClient ──────────────────────────────────
        webView.webViewClient = object : WebViewClient() {

            override fun shouldInterceptRequest(
                view: WebView,
                request: WebResourceRequest
            ): WebResourceResponse? {
                val url = request.url.toString()
                if (isAdUrl(url)) {
                    return emptyResponse()
                }
                return super.shouldInterceptRequest(view, request)
            }

            // Block navigation to non-streaming external URLs
            override fun shouldOverrideUrlLoading(
                view: WebView,
                request: WebResourceRequest
            ): Boolean {
                val url = request.url.toString()
                // Allow file:// and http(s)
                if (url.startsWith("file://") || url.startsWith("http://") || url.startsWith("https://")) {
                    return false
                }
                // Block other schemes (intent://, etc.)
                return true
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                progressBar.visibility = View.VISIBLE
                progressBar.progress   = 0
            }

            override fun onPageFinished(view: WebView, url: String) {
                progressBar.visibility = View.GONE
                injectTVStyles(view)
                injectDomAdRemover(view)
                injectBackNavFix(view)
            }
        }

        // ── Chrome Client for fullscreen video ─────────────────────────────
        webView.webChromeClient = object : WebChromeClient() {

            override fun onProgressChanged(view: WebView, newProgress: Int) {
                progressBar.progress = newProgress
                if (newProgress == 100) progressBar.visibility = View.GONE
            }

            override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                // Enter fullscreen video
                customView = view
                customViewCallback = callback
                container.addView(view, FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                ))
                webView.visibility = View.INVISIBLE
                makeFullscreen()
            }

            override fun onHideCustomView() {
                // Exit fullscreen video
                container.removeView(customView)
                webView.visibility = View.VISIBLE
                customView = null
                customViewCallback?.onCustomViewHidden()
                customViewCallback = null
            }

            override fun onPermissionRequest(request: PermissionRequest) {
                // Allow autoplay and fullscreen from streaming sites
                request.grant(request.resources)
            }
        }

        // Enable cookies
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        // Add JavaScript bridge for native features
        webView.addJavascriptInterface(TVBridge(), "AndroidTV")
    }

    private fun isAdUrl(url: String): Boolean {
        return try {
            val uri  = Uri.parse(url)
            val host = uri.host?.lowercase()?.removePrefix("www.") ?: return false

            // Check domain blocklist
            if (adDomains.any { domain -> host == domain || host.endsWith(".$domain") }) {
                return true
            }

            // Check URL patterns
            val adPatterns = listOf(
                "/ads/", "/ad/", "adserver", "adtag", "/popup",
                "popunder", "/banner", "clickthrough", "/interstitial"
            )
            adPatterns.any { url.contains(it, ignoreCase = true) }

        } catch (e: Exception) {
            false
        }
    }

    private fun emptyResponse(): WebResourceResponse {
        return WebResourceResponse(
            "text/plain", "utf-8",
            ByteArrayInputStream("".toByteArray())
        )
    }

    private fun injectTVStyles(view: WebView) {
        val css = """
            * { -webkit-tap-highlight-color: transparent !important; }
            :focus {
                outline: 3px solid #e50914 !important;
                outline-offset: 2px !important;
            }
            body { cursor: none !important; }
        """.trimIndent()
        val js = "var s=document.createElement('style');s.textContent=${
            escapeJs(css)
        };document.head.appendChild(s);"
        view.evaluateJavascript(js, null)
    }

    private fun injectDomAdRemover(view: WebView) {
        val js = """
(function(){
  if(window.__slAdRemoverActive)return;
  window.__slAdRemoverActive=true;

  var TEXT_KILL=[/adblock/i,/ad.?block/i,/install.*browser/i,/browser.*install/i,
    /recommended.*install/i,/opera/i,/brave.*browser/i,/download.*app/i,
    /install.*app/i,/push.*notif/i,/allow.*notif/i,/enable.*notif/i,
    /you.*won/i,/congratulation/i,/survey.*required/i,/vpn.*recommended/i,
    /click.*allow/i,/click.*accept/i];

  var CLASS_KILL=[/^ad[_-]/i,/[_-]ad${'$'}/i,/advert/i,/pop.?up/i,
    /interstitial/i,/install.?prompt/i,/push.?prompt/i];

  var BTN_KILL=/^(allow|install|accept|enable|continue|proceed|ok|yes|get it)${'$'}/i;

  function shouldKill(el){
    if(!el||!el.tagName)return false;
    if(el.tagName==='VIDEO'||el.tagName==='IFRAME')return false;
    if((el.id||'').startsWith('__sl'))return false;
    var cls=typeof el.className==='string'?el.className:'';
    var id=el.id||'';
    if(CLASS_KILL.some(function(p){return p.test(cls)||p.test(id)}))return true;
    var text=(el.innerText||'').trim();
    if(text.length>0&&text.length<400&&TEXT_KILL.some(function(p){return p.test(text)}))return true;
    try{
      var st=window.getComputedStyle(el);
      var z=parseInt(st.zIndex)||0;
      var w=el.offsetWidth,h=el.offsetHeight;
      var vw=window.innerWidth,vh=window.innerHeight;
      if((st.position==='fixed'||st.position==='absolute')&&z>50&&!el.querySelector('video')&&w>vw*0.2&&h>vh*0.1){
        var btns=Array.from(el.querySelectorAll('button,a,[role="button"]'));
        if(btns.some(function(b){return BTN_KILL.test((b.innerText||'').trim())}))return true;
        if(TEXT_KILL.some(function(p){return p.test(text)}))return true;
        if(z>9999&&w>vw*0.4&&h>vh*0.3)return true;
      }
    }catch(e){}
    return false;
  }

  function sweep(){
    document.querySelectorAll('div,section,aside,article,span,figure').forEach(function(el){
      try{if(shouldKill(el))el.remove();}catch(e){}
    });
    if(document.body){document.body.style.overflow='';document.body.style.position='';}
  }

  sweep();
  [300,700,1200,2000,3500,6000,10000].forEach(function(d){setTimeout(sweep,d);});

  new MutationObserver(function(muts){
    muts.forEach(function(m){
      m.addedNodes.forEach(function(n){
        if(n.nodeType!==1)return;
        try{
          if(shouldKill(n)){n.remove();return;}
          n.querySelectorAll&&n.querySelectorAll('div,section,aside').forEach(function(c){
            try{if(shouldKill(c))c.remove();}catch(e){}
          });
        }catch(e){}
      });
    });
  }).observe(document.body||document.documentElement,{childList:true,subtree:true});

  window.open=function(){return null;};
  window.showAd=window.displayAd=window.openPopup=window.showPopup=function(){};
})();
        """.trimIndent()
        view.evaluateJavascript(js, null)
    }

    private fun injectBackNavFix(view: WebView) {
        // Prevent streaming sites' own back buttons from navigating to homepage
        val js = """
(function(){
  if(window.__slNavFixActive)return;
  window.__slNavFixActive=true;
  history.back=function(){};
  history.forward=function(){};
  history.go=function(n){if(n>0)window.history.go(n);};
  window.addEventListener('popstate',function(e){e.stopImmediatePropagation();},true);
})();
        """.trimIndent()
        view.evaluateJavascript(js, null)
    }

    private fun escapeJs(s: String): String =
        "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\""

    // ── D-pad / Remote Key Handling ─────────────────────────────────────────
    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        // Handle back button
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (customView != null) {
                webView.webChromeClient?.onHideCustomView()
                return true
            }
            if (webView.canGoBack()) {
                webView.goBack()
                return true
            }
        }
        // D-pad navigation
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_ENTER) {
            webView.evaluateJavascript(
                "document.activeElement && document.activeElement.click();", null
            )
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    // ── Fullscreen ──────────────────────────────────────────────────────────
    private fun makeFullscreen() {
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                it.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            )
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) makeFullscreen()
    }

    // ── JavaScript Bridge ───────────────────────────────────────────────────
    inner class TVBridge {
        @JavascriptInterface
        fun openExternalUrl(url: String) {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }

        @JavascriptInterface
        fun getDeviceInfo(): String = "Android TV"
    }

    override fun onPause()  { super.onPause();  webView.onPause() }
    override fun onResume() { super.onResume(); webView.onResume(); makeFullscreen() }
    override fun onDestroy(){ super.onDestroy(); webView.destroy() }
}
