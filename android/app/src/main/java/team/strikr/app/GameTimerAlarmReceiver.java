package team.strikr.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class GameTimerAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Intent serviceIntent = new Intent(context, GameTimerAlarmService.class);
        serviceIntent.setAction(GameTimerAlarmService.ACTION_START);
        serviceIntent.putExtra(
            GameTimerAlarmService.EXTRA_ALARM_KEY,
            intent.getStringExtra(GameTimerAlarmService.EXTRA_ALARM_KEY)
        );
        serviceIntent.putExtra(
            GameTimerAlarmService.EXTRA_KIND,
            intent.getStringExtra(GameTimerAlarmService.EXTRA_KIND)
        );
        serviceIntent.putExtra(
            GameTimerAlarmService.EXTRA_SOUND,
            intent.getStringExtra(GameTimerAlarmService.EXTRA_SOUND)
        );
        ContextCompat.startForegroundService(context, serviceIntent);
    }
}
