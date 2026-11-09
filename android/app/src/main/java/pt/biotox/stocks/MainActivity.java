package pt.biotox.stocks;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Message;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

/** Stocks BIOTOX: abre a app web do laboratório numa janela própria. */
public class MainActivity extends Activity {

    static final String ENDERECO = "https://rcruzdecarvalho.github.io/biotox-app/";

    private WebView web;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        web = new WebView(this);
        web.setBackgroundColor(0xFF0F161B);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setUserAgentString(s.getUserAgentString() + " StocksBIOTOX/" + BuildConfig.VERSION_NAME);

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web, true);

        // Disponível em todas as molduras da página, incluindo a do Apps Script
        web.addJavascriptInterface(new Ponte(), "BiotoxAndroid");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                Uri u = req.getUrl();
                String h = u.getHost();
                if (h != null && h.endsWith("rcruzdecarvalho.github.io")) return false;
                abrirFora(u);
                return true;
            }
        });

        // Links "abrir noutra janela" (FDS, Drive) vão para o browser ou para a app do Drive
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onCreateWindow(WebView v, boolean dialogo, boolean gesto, Message msg) {
                WebView temp = new WebView(MainActivity.this);
                temp.setWebViewClient(new WebViewClient() {
                    boolean feito = false;
                    private void abrir(WebView t, Uri u) {
                        if (feito || u == null || "about".equals(u.getScheme())) return;
                        feito = true;
                        abrirFora(u);
                        t.post(t::destroy);
                    }
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView t, WebResourceRequest req) {
                        abrir(t, req.getUrl());
                        return true;
                    }
                    @Override
                    public void onPageStarted(WebView t, String url, android.graphics.Bitmap f) {
                        abrir(t, Uri.parse(url));
                    }
                });
                ((WebView.WebViewTransport) msg.obj).setWebView(temp);
                msg.sendToTarget();
                return true;
            }
        });

        web.setDownloadListener((url, ua, cd, mime, len) -> {
            if (url != null && url.startsWith("http")) abrirFora(Uri.parse(url));
        });

        if (estado != null) web.restoreState(estado);
        else web.loadUrl(ENDERECO);
    }

    private void abrirFora(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (Exception e) {
            Toast.makeText(this, "Não há nenhuma app para abrir este link.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    private static String limparNome(String nome) {
        String n = (nome == null || nome.trim().isEmpty()) ? "encomenda.png" : nome.trim();
        n = n.replaceAll("[^A-Za-z0-9._ -]", "_");
        if (!n.toLowerCase().endsWith(".png")) n += ".png";
        return n;
    }

    private static byte[] bytesDe(String dataUrl) {
        int i = dataUrl.indexOf("base64,");
        return Base64.decode(i >= 0 ? dataUrl.substring(i + 7) : dataUrl, Base64.DEFAULT);
    }

    /** Funções chamadas pela página (window.BiotoxAndroid). */
    class Ponte {
        @JavascriptInterface
        public String versao() {
            return BuildConfig.VERSION_NAME;
        }

        @JavascriptInterface
        public boolean partilhar(String dataUrl, String nome) {
            try {
                File pasta = new File(getCacheDir(), "partilha");
                pasta.mkdirs();
                File f = new File(pasta, limparNome(nome));
                try (FileOutputStream o = new FileOutputStream(f)) { o.write(bytesDe(dataUrl)); }
                Uri u = Uri.parse("content://" + getPackageName() + ".ficheiros/" + Uri.encode(f.getName()));
                Intent i = new Intent(Intent.ACTION_SEND)
                        .setType("image/png")
                        .putExtra(Intent.EXTRA_STREAM, u)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                i.setClipData(ClipData.newRawUri(f.getName(), u));
                runOnUiThread(() -> startActivity(Intent.createChooser(i, "Partilhar encomenda")));
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean guardar(String dataUrl, String nome) {
            if (Build.VERSION.SDK_INT < 29) return false;
            try {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.MediaColumns.DISPLAY_NAME, limparNome(nome));
                cv.put(MediaStore.MediaColumns.MIME_TYPE, "image/png");
                cv.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/BIOTOX");
                Uri u = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (u == null) return false;
                try (OutputStream o = getContentResolver().openOutputStream(u)) { o.write(bytesDe(dataUrl)); }
                return true;
            } catch (Exception e) {
                return false;
            }
        }
    }
}
