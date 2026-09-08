package team.strikr.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "GameTimerAlarm",
    permissions = {
        @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class GameTimerAlarmPlugin extends Plugin {

    @PluginMethod
    public void requestAuthorization(PluginCall call) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }

        finishAuthorization(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        finishAuthorization(call);
    }

    private void finishAuthorization(PluginCall call) {
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            JSObject result = new JSObject();
            result.put("granted", false);
            result.put("mode", "android_exact_alarm");
            result.put("needsSettings", false);
            call.resolve(result);
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            alarmManager != null &&
            !alarmManager.canScheduleExactAlarms()
        ) {
            try {
                Intent settingsIntent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(settingsIntent);
            } catch (Exception ignored) {
                Intent settingsIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                settingsIntent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(settingsIntent);
            }

            JSObject result = new JSObject();
            result.put("granted", false);
            result.put("mode", "android_exact_alarm");
            result.put("needsSettings", true);
            call.resolve(result);
            return;
        }

        JSObject result = new JSObject();
        result.put("granted", true);
        result.put("mode", "android_exact_alarm");
        result.put("needsSettings", false);
        call.resolve(result);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        String key = call.getString("key", "").trim();
        Double atEpochMs = call.getDouble("atEpochMs");
        String kind = "halftime".equals(call.getString("kind")) ? "halftime" : "final";
        String sound = normalizeSound(call.getString("sound"));

        if (key.isEmpty() || atEpochMs == null) {
            call.reject("Alarm-Daten fehlen.");
            return;
        }

        long triggerAt = atEpochMs.longValue();
        if (triggerAt <= System.currentTimeMillis() + 500L) {
            call.reject("Alarm-Zeit liegt bereits zurück.");
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("AlarmManager ist nicht verfügbar.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !alarmManager.canScheduleExactAlarms()) {
            call.reject("Exakte Alarme sind nicht erlaubt.");
            return;
        }

        PendingIntent pendingIntent = alarmPendingIntent(key, kind, sound);
        alarmManager.cancel(pendingIntent);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        } else {
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
        }

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String key = call.getString("key", "").trim();
        if (key.isEmpty()) {
            call.reject("Alarm-Key fehlt.");
            return;
        }

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.cancel(alarmPendingIntent(key, "final", "whistle"));
        }

        Intent stopIntent = new Intent(getContext(), GameTimerAlarmService.class);
        stopIntent.setAction(GameTimerAlarmService.ACTION_STOP);
        stopIntent.putExtra(GameTimerAlarmService.EXTRA_ALARM_KEY, key);
        try {
            getContext().startService(stopIntent);
        } catch (Exception ignored) {
            getContext().stopService(new Intent(getContext(), GameTimerAlarmService.class));
        }

        JSObject result = new JSObject();
        result.put("ok", true);
        call.resolve(result);
    }

    private PendingIntent alarmPendingIntent(String key, String kind, String sound) {
        Intent intent = new Intent(getContext(), GameTimerAlarmReceiver.class);
        intent.setAction("team.strikr.app.GAME_TIMER_ALARM");
        intent.putExtra(GameTimerAlarmService.EXTRA_ALARM_KEY, key);
        intent.putExtra(GameTimerAlarmService.EXTRA_KIND, kind);
        intent.putExtra(GameTimerAlarmService.EXTRA_SOUND, sound);

        return PendingIntent.getBroadcast(
            getContext(),
            requestCodeForKey(key),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private int requestCodeForKey(String key) {
        return 0x4A000000 ^ key.hashCode();
    }

    private String normalizeSound(String raw) {
        if ("horn".equals(raw)) return "horn";
        if ("buzzer".equals(raw)) return "buzzer";
        return "whistle";
    }
}
