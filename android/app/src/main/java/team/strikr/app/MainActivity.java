package team.strikr.app;

import android.webkit.CookieManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }
}
