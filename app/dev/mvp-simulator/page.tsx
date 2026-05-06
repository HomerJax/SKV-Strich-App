import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default function DevMvpSimulatorPage() {
  async function simulateMvp() {
    "use server";

    const { clubId } = await requireClub();
    const supabase = await createClient();

    const today = new Date().toISOString().slice(0, 10);

    // 1. Neue Session erstellen (heute)
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        club_id: clubId,
        date: today,
        notes: "Simuliertes MVP Training",
      })
      .select("id, date")
      .single();

    if (sessionError || !session) {
      throw new Error("Session konnte nicht erstellt werden");
    }

    const sessionId = session.id;

    // 2. Spieler holen
    const { data: players } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", clubId)
      .limit(6);

    if (!players || players.length === 0) {
      throw new Error("Keine Spieler vorhanden");
    }

    // 3. Spieler zur Session hinzufügen
    await supabase.from("session_players").insert(
      players.map((p) => ({
        session_id: sessionId,
        player_id: p.id,
      }))
    );

    // 4. Ergebnis eintragen (wichtig für MVP!)
    await supabase.from("results").insert({
      session_id: sessionId,
      goals_a: 5,
      goals_b: 3,
    });

    // 5. MVP Votes simulieren
    const winner = players[0]; // egal wer gewinnt

    const votes = players.map((p) => ({
      session_id: sessionId,
      voter_user_id: `sim-${p.id}-${Date.now()}`,
      voted_player_id: winner.id,
    }));

    await supabase.from("session_mvp_votes").insert(votes);

    // 6. Voting künstlich beenden (damit Ergebnis sichtbar wird)
    await supabase
      .from("sessions")
      .update({
        mvp_voting_finalized_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // 7. Zur Session springen
    redirect(`/sessions/${sessionId}`);
  }

  return (
    <main className="min-h-screen bg-white p-10">
      <h1 className="mb-6 text-3xl font-black">MVP Simulator</h1>

      <form action={simulateMvp}>
        <button
          type="submit"
          className="rounded-xl bg-black px-6 py-3 text-white font-semibold"
        >
          🚀 MVP komplett simulieren
        </button>
      </form>

      <p className="mt-4 text-sm text-zinc-500">
        Erstellt Session + Ergebnis + Votes + beendet Voting sofort.
      </p>
    </main>
  );
}