import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";
import { decidePilotTeamLinkAction } from "../../actions";
import { getServerI18n } from "@/lib/i18n/server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{saved?: string;error?: string}>;
};
export default async function TeamInvitationPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved, error } = await searchParams;
  const user = await requireUser();
  const { locale } = await getServerI18n();
  const en = locale === "en";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/home");
  const db = createAdminClient();
  const { data: invite } = await db.from("pilot_parent_club_team_links")
    .select("id,owner_club_id,target_club_id,status").eq("id",id).maybeSingle();
  if (!invite || !isCashboxPilotClub(invite.owner_club_id)) redirect("/home");
  // Read access is deliberately restricted to actual admins of the invited
  // team. The existence of the private invitation is not public.
  const { data: membership } = await db.from("club_memberships")
    .select("role").eq("club_id",invite.target_club_id).eq("user_id",user.id).eq("role","admin").maybeSingle();
  if (!membership) redirect("/home");
  const [{ data: team }, { data: parent }] = await Promise.all([
    db.from("clubs").select("display_name,name").eq("id",invite.target_club_id).maybeSingle(),
    db.from("pilot_parent_clubs").select("name").eq("owner_club_id",invite.owner_club_id).maybeSingle(),
  ]);
  if (!team || !parent) redirect("/home");
  const teamName=team.display_name || team.name || (en?"Team":"Mannschaft");
  const button="rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white";
  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8">
      <section className="mx-auto max-w-xl space-y-4">
        <Link href="/home" className="text-sm font-semibold text-slate-600">← Home</Link>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-teal-700">
            {en?"Parent club invitation":"Dachverein – Mannschaft verknüpfen"}
          </p>
          <h1 className="mt-2 text-2xl font-black text-slate-950">{parent.name}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{en
            ? "The organization requests to link your independent strikr team."
            : "Der Dachverein möchte deine eigenständige strikr-Mannschaft aufnehmen."}</p>
          <div className="mt-4 rounded-xl bg-slate-100 p-4 text-sm">
            <p className="text-xs font-bold text-slate-500">{en?"Invited team":"Eingeladene Mannschaft"}</p>
            <p className="mt-1 font-black">{teamName}</p>
            <p className="mt-2 text-xs font-semibold text-slate-500">
              {en?"Status":"Status"}: {invite.status === "pending" ? (en?"Waiting for approval":"Wartet auf Bestätigung")
                : invite.status === "linked" ? (en?"Linked":"Verknüpft")
                : invite.status === "declined" ? (en?"Declined":"Abgelehnt") : (en?"Link removed":"Verknüpfung beendet")}
            </p>
          </div>
          {saved ? <p className="mt-3 text-sm font-bold text-emerald-700">{en?"Saved.":"Entscheidung gespeichert."}</p> : null}
          {error ? <p className="mt-3 text-sm font-bold text-rose-700">{en?"Unable to process request.":"Anfrage konnte nicht verarbeitet werden."}</p> : null}
          <p className="mt-4 text-xs leading-5 text-slate-500">{en
            ? "Linking only establishes organizational membership. Team admins, players, finances, attendance and statistics remain separate. No shared bank accounts are activated."
            : "Die Verknüpfung stellt zunächst nur die Vereinszugehörigkeit her. Teamadmins, Spieler, Finanzen, Anwesenheiten und Statistiken bleiben getrennt. Es werden keine gemeinsamen Bankkonten aktiviert."}</p>
          {invite.status === "pending" ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <form action={decidePilotTeamLinkAction}>
                <input type="hidden" name="link_id" value={invite.id}/>
                <input type="hidden" name="decision" value="accept"/>
                <button className={button}>{en?"Approve team link":"Mannschaft verknüpfen"}</button>
              </form>
              <form action={decidePilotTeamLinkAction}>
                <input type="hidden" name="link_id" value={invite.id}/>
                <input type="hidden" name="decision" value="decline"/>
                <button className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-800">{en?"Decline":"Ablehnen"}</button>
              </form>
            </div>
          ) : invite.status === "linked" ? (
            <form action={decidePilotTeamLinkAction} className="mt-5">
              <input type="hidden" name="link_id" value={invite.id}/>
              <input type="hidden" name="decision" value="leave"/>
              <button className="rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm font-bold text-rose-800">{en?"Leave parent club":"Verknüpfung lösen"}</button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}
