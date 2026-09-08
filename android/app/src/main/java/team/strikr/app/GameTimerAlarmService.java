package team.strikr.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class GameTimerAlarmService extends Service {
    public static final String ACTION_START = "team.strikr.app.GAME_TIMER_ALARM_START";
    public static final String ACTION_STOP = "team.strikr.app.GAME_TIMER_ALARM_STOP";
    public static final String EXTRA_ALARM_KEY = "alarm_key";
    public static final String EXTRA_KIND = "alarm_kind";
    public static final String EXTRA_SOUND = "alarm_sound";
    public static final String EXTRA_PERSISTENT = "alarm_persistent";

    private static final String CHANNEL_ID = "strikr_game_timer_alarm";
    private static final int NOTIFICATION_ID = 0x537452;
    private static final int SAMPLE_RATE = 22_050;
    private static final long SIGNAL_DURATION_MS = 10_000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private AudioTrack audioTrack;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private String activeKey;
    private Runnable autoStopRunnable;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            String requestedKey = intent.getStringExtra(EXTRA_ALARM_KEY);
            if (requestedKey == null || activeKey == null || requestedKey.equals(activeKey)) {
                stopAlarmAndSelf();
            }
            return START_NOT_STICKY;
        }

        String key = intent != null ? intent.getStringExtra(EXTRA_ALARM_KEY) : null;
        String kind = intent != null ? intent.getStringExtra(EXTRA_KIND) : null;
        String sound = intent != null ? intent.getStringExtra(EXTRA_SOUND) : null;
        boolean persistent = intent == null || intent.getBooleanExtra(EXTRA_PERSISTENT, true);

        if (key == null || key.trim().isEmpty()) {
            stopSelf();
            return START_NOT_STICKY;
        }

        activeKey = key;
        cancelAutoStop();
        stopAlarmOutput();
        acquireWakeLock();
        startForeground(NOTIFICATION_ID, buildNotification(key, kind, persistent));
        startVibration();
        startAudio(sound);

        if (!persistent) {
            autoStopRunnable = this::stopAlarmAndSelf;
            handler.postDelayed(autoStopRunnable, SIGNAL_DURATION_MS);
        }

        return START_NOT_STICKY;
    }

    private Notification buildNotification(String key, String kind, boolean persistent) {
        String title = "halftime".equals(kind) ? "HALBZEIT" : "ABPFIFF";
        String body;
        if ("halftime".equals(kind) && !persistent) {
            body = "Halbzeit-Signal. Die Spieluhr läuft weiter.";
        } else if ("halftime".equals(kind)) {
            body = "Die erste Halbzeit ist vorbei. Alarm stoppen und 2. Halbzeit starten.";
        } else {
            body = "Die Spielzeit ist beendet. Alarm stoppen.";
        }

        Intent stopIntent = new Intent(this, GameTimerAlarmService.class);
        stopIntent.setAction(ACTION_STOP);
        stopIntent.putExtra(EXTRA_ALARM_KEY, key);
        PendingIntent stopPendingIntent = PendingIntent.getService(
            this,
            0x1100 ^ key.hashCode(),
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this,
            0x2200 ^ key.hashCode(),
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(openPendingIntent)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(persistent)
            .setAutoCancel(!persistent)
            .addAction(0, "Alarm stoppen", stopPendingIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Spieluhr-Alarm",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Halbzeit und Abpfiff der lokal gestarteten strikr Spieluhr");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.enableVibration(true);
        channel.setSound(null, null);
        manager.createNotificationChannel(channel);
    }

    private void acquireWakeLock() {
        releaseWakeLock();
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager == null) return;

        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "strikr:GameTimerAlarm"
        );
        wakeLock.acquire(30 * 60 * 1000L);
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        wakeLock = null;
    }

    private void startVibration() {
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) return;

        long[] pattern = new long[] { 0, 350, 150, 350, 180, 650 };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
            vibrator.vibrate(pattern, 0);
        }
    }

    private void startAudio(String rawSound) {
        String sound = normalizeSound(rawSound);
        short[] samples = buildAlarmSamples(sound);

        try {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            AudioFormat format = new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(SAMPLE_RATE)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build();

            audioTrack = new AudioTrack.Builder()
                .setAudioAttributes(attributes)
                .setAudioFormat(format)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .setBufferSizeInBytes(samples.length * 2)
                .build();

            audioTrack.write(samples, 0, samples.length);
            audioTrack.setLoopPoints(0, samples.length, -1);
            audioTrack.play();
        } catch (Exception error) {
            if (audioTrack != null) {
                audioTrack.release();
                audioTrack = null;
            }
        }
    }

    private short[] buildAlarmSamples(String sound) {
        double durationSeconds = 4.0;
        int sampleCount = (int) (SAMPLE_RATE * durationSeconds);
        short[] samples = new short[sampleCount];

        for (int index = 0; index < sampleCount; index++) {
            double t = (double) index / (double) SAMPLE_RATE;
            double value = sampleValue(sound, t);
            value = Math.max(-1.0, Math.min(1.0, value));
            samples[index] = (short) Math.round(value * Short.MAX_VALUE);
        }

        return samples;
    }

    private double sampleValue(String sound, double time) {
        double twoPi = Math.PI * 2.0;

        if ("horn".equals(sound)) {
            double cycle = time % 1.4;
            if (cycle >= 0.9) return 0.0;
            double attack = Math.min(1.0, cycle / 0.04);
            double release = Math.min(1.0, (0.9 - cycle) / 0.08);
            return Math.sin(twoPi * 390.0 * time) * 0.72 * attack * release;
        }

        if ("buzzer".equals(sound)) {
            double cycle = time % 0.55;
            if (cycle >= 0.32) return 0.0;
            return Math.sin(twoPi * 235.0 * time) >= 0 ? 0.62 : -0.62;
        }

        double cycle = time % 1.25;
        double pulse = cycle % 0.36;
        if (cycle >= 1.05 || pulse >= 0.25) return 0.0;
        double progress = pulse / 0.25;
        double frequency = 1700.0 + (900.0 * progress);
        return Math.sin(twoPi * frequency * time) * 0.68;
    }

    private String normalizeSound(String raw) {
        if ("horn".equals(raw)) return "horn";
        if ("buzzer".equals(raw)) return "buzzer";
        return "whistle";
    }

    private void cancelAutoStop() {
        if (autoStopRunnable != null) {
            handler.removeCallbacks(autoStopRunnable);
            autoStopRunnable = null;
        }
    }

    private void stopAlarmOutput() {
        if (audioTrack != null) {
            try {
                audioTrack.stop();
            } catch (Exception ignored) {}
            audioTrack.release();
            audioTrack = null;
        }

        if (vibrator != null) {
            vibrator.cancel();
            vibrator = null;
        }
    }

    private void stopAlarmAndSelf() {
        cancelAutoStop();
        stopAlarmOutput();
        releaseWakeLock();
        activeKey = null;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        cancelAutoStop();
        stopAlarmOutput();
        releaseWakeLock();
        activeKey = null;
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
