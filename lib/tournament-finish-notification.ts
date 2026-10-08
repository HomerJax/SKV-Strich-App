import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const notificationId = 771204;

export async function scheduleTournamentFinish(at: number): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const permission = await LocalNotifications.checkPermissions();
    const granted = permission.display === "granted" ? permission : await LocalNotifications.requestPermissions();
    if (granted.display !== "granted") return false;
    await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
    await LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title: "strikr · Abpfiff! ⚽",
        body: "Spielzeit vorbei! Jetzt ist Schluss.",
        schedule: { at: new Date(at), allowWhileIdle: true },
        sound: "default",
        smallIcon: "ic_stat_icon_config_sample",
        extra: { type: "tournament_finish" },
      }],
    });
    return true;
  } catch (error) {
    console.warn("Tournament finish notification unavailable", error);
    return false;
  }
}

export async function cancelTournamentFinish(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: notificationId }] }); }
  catch (error) { console.warn("Could not cancel tournament notification", error); }
}
