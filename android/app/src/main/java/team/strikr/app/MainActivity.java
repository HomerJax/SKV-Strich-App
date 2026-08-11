package team.strikr.app;

import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final long STARTUP_OVERLAY_TIMEOUT_MS = 8000L;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        installStartupOverlay();
    }

    private void installStartupOverlay() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        final WebView webView = getBridge().getWebView();
        final ViewGroup root = findViewById(android.R.id.content);

        if (root == null) {
            return;
        }

        webView.setBackgroundColor(Color.rgb(245, 245, 245));

        final FrameLayout overlay = new FrameLayout(this);
        overlay.setBackgroundColor(Color.rgb(245, 245, 245));
        overlay.setClickable(true);

        final LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER);

        final ImageView icon = new ImageView(this);
        icon.setImageResource(R.mipmap.ic_launcher);
        icon.setContentDescription("strikr");

        final LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(
            dp(88),
            dp(88)
        );
        iconParams.bottomMargin = dp(14);
        content.addView(icon, iconParams);

        final TextView title = new TextView(this);
        title.setText("strikr");
        title.setTextColor(Color.rgb(15, 23, 42));
        title.setTextSize(30);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);

        final LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        titleParams.bottomMargin = dp(18);
        content.addView(title, titleParams);

        final ProgressBar progress = new ProgressBar(this);
        progress.setIndeterminate(true);
        content.addView(
            progress,
            new LinearLayout.LayoutParams(dp(28), dp(28))
        );

        final FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        );
        overlay.addView(content, contentParams);

        root.addView(
            overlay,
            new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );

        final long startedAt = System.currentTimeMillis();
        final boolean launchTargetsJoin = isJoinLaunchIntent();

        final Runnable waitForWebApp = new Runnable() {
            @Override
            public void run() {
                final String currentUrl = webView.getUrl();
                final boolean onStrikr =
                    currentUrl != null
                        && currentUrl.startsWith("https://www.strikr.team")
                        && webView.getProgress() >= 100;
                final boolean correctLaunchTarget =
                    !launchTargetsJoin || (currentUrl != null && currentUrl.contains("/join"));
                final boolean timedOut =
                    System.currentTimeMillis() - startedAt >= STARTUP_OVERLAY_TIMEOUT_MS;

                if ((onStrikr && correctLaunchTarget) || timedOut) {
                    overlay.animate()
                        .alpha(0f)
                        .setDuration(160L)
                        .withEndAction(() -> {
                            if (overlay.getParent() == root) {
                                root.removeView(overlay);
                            }
                        })
                        .start();
                    return;
                }

                overlay.postDelayed(this, 50L);
            }
        };

        overlay.post(waitForWebApp);
    }

    private boolean isJoinLaunchIntent() {
        if (getIntent() == null || getIntent().getData() == null) {
            return false;
        }

        final Uri uri = getIntent().getData();
        final String host = uri.getHost();

        return "https".equalsIgnoreCase(uri.getScheme())
            && ("www.strikr.team".equalsIgnoreCase(host)
                || "strikr.team".equalsIgnoreCase(host))
            && "/join".equals(uri.getPath());
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }
}
