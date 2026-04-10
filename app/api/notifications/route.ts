async function ensureResultNotifications(params: {
  clubId: string;
  sessionId: number;
  winners: Array<{ playerId: number; name: string; votes: number }>;
  participants: Participant[];
}) {
  const { clubId, sessionId, winners, participants } = params;

  const admin = createAdminClient();

  // ✅ CHECK: wurde schon einmal getriggert?
  const { data: existing, error: existingError } = await admin
    .from("user_notifications")
    .select("id")
    .like("dedupe_key", `mvp_result:${sessionId}:%`)
    .limit(1);

  if (existingError) {
    console.error("Notification check failed:", existingError.message);
    return;
  }

  if (existing && existing.length > 0) {
    return; // 👉 schon vorhanden → nichts tun
  }

  // 🏆 Gewinner bestimmen
  const winnerIds = new Set(winners.map((winner) => winner.playerId));

  const winnerUserIds = participants
    .filter(
      (participant) =>
        winnerIds.has(participant.id) && participant.userId
    )
    .map((participant) => participant.userId as string);

  // 👥 Alle Teilnehmer
  const participantUserIds = participants
    .map((participant) => participant.userId)
    .filter(Boolean) as string[];

  const uniqueParticipants = [...new Set(participantUserIds)];
  const uniqueWinners = [...new Set(winnerUserIds)];

  // 📢 Ergebnis-Notifications
  const resultNotifications = uniqueParticipants.map((userId) => ({
    user_id: userId,
    club_id: clubId,
    type: "mvp_result",
    title: "MVP Voting beendet",
    body:
      winners.length === 0
        ? "Das MVP Voting ist beendet."
        : winners.length === 1
        ? `${winners[0].name} ist MVP dieser Session.`
        : "Das MVP Voting ist beendet. Es gibt mehrere Gewinner.",
    cta_href: `/sessions/${sessionId}`,
    dedupe_key: `mvp_result:${sessionId}:${userId}`,
  }));

  // 🏆 Gewinner-Notification
  const winnerNotifications = uniqueWinners.map((userId) => ({
    user_id: userId,
    club_id: clubId,
    type: "mvp_winner",
    title: "Glückwunsch! Du bist MVP 🏆",
    body: "Du wurdest zum MVP gewählt!",
    cta_href: `/sessions/${sessionId}`,
    dedupe_key: `mvp_winner:${sessionId}:${userId}`,
  }));

  const inserts = [...resultNotifications, ...winnerNotifications];

  if (inserts.length === 0) return;

  const { error } = await admin
    .from("user_notifications")
    .upsert(inserts, {
      onConflict: "dedupe_key",
    });

  if (error) {
    console.error("MVP notifications failed:", error.message);
  }
}