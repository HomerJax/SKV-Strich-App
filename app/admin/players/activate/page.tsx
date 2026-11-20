import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ActivatePlayersPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.activeClubId) redirect("/select-club");
  const member = ctx.memberships.find(m => m.club_id === ctx.activeClubId);
  if (!ctx.isPowerUser && member?.role !== "admin") redirect("/");
  const db = createAdminClient();
  const { data: players, error } = await db.from("players")
    .select("id, name, first_name, last_name, email, user_id")
    .eq("club_id", ctx.activeClubId).eq("is_guest", false)
    .order("name");
  if (error) throw new Error("Spieler konnten nicht geladen werden.");
  const pending = (players ?? []).filter(p => !p.user_id);
  const status = (await searchParams)?.status;
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
    <Link href="/admin/members" className="text-sm text-slate-600">← Mitglieder</Link>
    <h1 className="text-2xl font-bold">Spielerzugänge aktivieren</h1>
    <p className="text-sm text-slate-600">Deine Spieler bleiben auch ohne Anmeldung vollwertige Kaderspieler. Mit einer Einladung können sie später ihr bestehendes Profil und alle Statistiken übernehmen.</p>
    {status && <p className="rounded-xl bg-slate-100 p-3 text-sm">{status === "sent" ? "Einladung verschickt." : status === "missing" ? "Bitte zuerst eine E-Mail-Adresse beim Spieler hinterlegen." : "Einladung konnte nicht verschickt werden. Bitte Adresse und bestehenden Zugang prüfen."}</p>}
    <div className="space-y-2">
      {pending.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div><div className="font-semibold">{p.name || [p.first_name,p.last_name].filter(Boolean).join(" ")}</div><div className="text-xs text-slate-500">{p.email || "Noch keine E-Mail hinterlegt"}</div></div>
        <form action="/api/admin/players/activate" method="post">
          <input type="hidden" name="player_id" value={p.id} />
          <button disabled={!p.email} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Einladung senden</button>
        </form>
      </div>)}
      {!pending.length && <p className="text-sm text-slate-500">Alle Spieler haben bereits einen Zugang.</p>}
    </div>
  </main>;
}
