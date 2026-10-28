import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";
import { getServerI18n } from "@/lib/i18n/server";
import { managePilotOrganizationAction } from "./actions";

type Team = { id: string; name: string; status: "linked" | "planned"; clubId: string | null };
type Organization = {
  owner_club_id: string;
  name: string;
  teams: Team[];
  admin_user_ids: string[];
};
type Member = { userId: string; label: string; role: string };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };

export default async function OrganizationPage({ searchParams }: Props) {
  const q = await searchParams;
  const { locale } = await getServerI18n();
  const en = locale === "en";
  const ctx = await requireClub();
  if (!isCashboxPilotClub(ctx.clubId)) redirect("/admin/settings");
  const teamAdmin = canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role });
  const db = createAdminClient();
  const [orgResult, rosterResult, membersResult] = await Promise.all([
    db.from("pilot_parent_clubs").select("owner_club_id,name,teams,admin_user_ids").eq("owner_club_id", ctx.clubId).maybeSingle(),
    db.from("players").select("user_id,first_name,last_name,nickname,name").eq("club_id", ctx.clubId)
      .eq("is_guest", false).not("user_id", "is", null),
    db.from("club_memberships").select("user_id,role").eq("club_id", ctx.clubId),
  ]);
  if (orgResult.error || rosterResult.error || membersResult.error)
    throw new Error("Vereinsverwaltung konnte nicht geladen werden.");
  const org = orgResult.data as Organization | null;
  const orgAdmin = org?.admin_user_ids?.includes(ctx.user.id) === true;
  if (!teamAdmin && !orgAdmin) redirect("/home");
  const canEdit = org ? orgAdmin : teamAdmin;
  const names = new Map((rosterResult.data ?? []).map(row => [
    row.user_id, row.nickname?.trim() || [row.first_name,row.last_name].filter(Boolean).join(" ") || row.name || (en ? "Member" : "Mitglied"),
  ]));
  const members: Member[] = [...new Map((membersResult.data ?? []).map(row => [
    row.user_id,
    { userId: row.user_id, label: names.get(row.user_id) || (en ? "Member" : "Mitglied"), role: row.role ?? "member" },
  ])).values()].sort((a,b)=>a.label.localeCompare(b.label,en?"en":"de"));
  const teams = org?.teams ?? [];
  const input = "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950";
  const btn = "rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white";
  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-6 pb-24">
        <Link href={teamAdmin ? "/admin/settings" : "/home"} className="text-sm font-bold text-slate-600">← {teamAdmin ? (en ? "Club settings" : "Club-Einstellungen") : "Home"}</Link>
        <header className="rounded-[28px] bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[.18em] text-white/50">{en ? "Organization / parent club" : "Vereinsstruktur / Dachverein"}</p>
          <h1 className="mt-2 text-2xl font-black">{en ? "Manage your parent club" : "Dachverein verwalten"}</h1>
          <p className="mt-2 text-sm leading-6 text-white/70">{en
            ? "One organization can oversee several teams. Its administrators are assigned separately from team administrators."
            : "Ein Dachverein kann mehrere Mannschaften haben. Seine Vereinsadmins werden unabhängig von den jeweiligen Teamadmins ernannt."}</p>
        </header>
        {q.saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{en ? "Saved." : "Änderungen gespeichert."}</div> : null}
        {q.error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{en ? "Could not save. Please check names, members and permissions." : "Speichern fehlgeschlagen. Bitte Namen, Mitglieder und Berechtigungen prüfen."}</div> : null}

        {!org ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black">{en ? "No parent club" : "Nein – eigenständige Mannschaft"}</h2>
              <p className="mt-2 text-sm text-slate-600">{en
                ? "The team keeps its own settings and cashbox. A parent club is optional and can be added later."
                : "Die Mannschaft verwaltet sich bisher eigenständig. Ein Dachverein ist optional und kann später eingerichtet werden."}</p>
            </section>
            {canEdit ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="text-lg font-black">{en ? "Yes – create a parent club" : "Ja – Dachverein anlegen"}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{en
                  ? "Create the parent organization. You become its first organization admin. Additional team entries and admins can be added afterwards."
                  : "Lege den Dachverein an. Du wirst zunächst Vereinsadmin und kannst danach weitere Mannschaften und Vereinsadmins hinzufügen."}</p>
                <form action={managePilotOrganizationAction} className="mt-4 space-y-3">
                  <input type="hidden" name="intent" value="create" />
                  <label className="block text-sm font-bold">{en ? "Parent club name" : "Name des Dachvereins"}
                    <input required minLength={2} maxLength={100} name="name" className={input} placeholder="z. B. 1. FC Strikr e. V."/>
                  </label>
                  <button className={btn}>{en ? "Create parent club" : "Dachverein anlegen"}</button>
                </form>
              </section>
            ) : null}
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[.15em] text-slate-500">{en ? "Parent club" : "Dachverein"}</p>
              <h2 className="mt-1 text-xl font-black">{org.name}</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-100 p-3"><div className="text-2xl font-black">{teams.length}</div><div className="text-xs text-slate-600">{en ? "Teams listed" : "Mannschaften gelistet"}</div></div>
                <div className="rounded-xl bg-slate-100 p-3"><div className="text-2xl font-black">{org.admin_user_ids.length}</div><div className="text-xs text-slate-600">{en ? "Organization admins" : "Vereinsadmins"}</div></div>
              </div>
              {canEdit ? (
                <form action={managePilotOrganizationAction} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="intent" value="rename"/>
                  <label className="min-w-[170px] flex-1 text-sm font-bold">{en ? "Rename parent club" : "Dachverein umbenennen"}
                    <input name="name" required minLength={2} maxLength={100} defaultValue={org.name} className={input}/>
                  </label>
                  <button className={btn}>{en ? "Save name" : "Name speichern"}</button>
                </form>
              ) : null}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black">{en ? "Teams under this parent club" : "Mannschaften im Dachverein"}</h2>
              <div className="mt-3 space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950">{team.name}</p>
                      <p className="text-xs text-slate-500">{team.status === "linked" ? (en ? "Linked test team" : "Verknüpftes Testteam") : (en ? "Planned – not linked to an actual team" : "Vorgemerkt – noch nicht mit einem echten Team verknüpft")}</p>
                    </div>
                    {canEdit && team.status === "planned" ? (
                      <form action={managePilotOrganizationAction}>
                        <input type="hidden" name="intent" value="remove_team"/>
                        <input type="hidden" name="team_id" value={team.id}/>
                        <button className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700">{en ? "Remove" : "Entfernen"}</button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
              {canEdit ? (
                <form action={managePilotOrganizationAction} className="mt-4 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="intent" value="add_team"/>
                  <label className="min-w-[170px] flex-1 text-sm font-bold">{en ? "Add planned team" : "Weitere Mannschaft vormerken"}
                    <input required maxLength={100} minLength={2} name="name" className={input} placeholder={en ? "e.g. U32" : "z. B. Ü32"}/>
                  </label>
                  <button className={btn}>{en ? "Add" : "Hinzufügen"}</button>
                </form>
              ) : null}
              <p className="mt-3 text-xs leading-5 text-amber-800">{en
                ? "Pilot: adding a name does not yet connect an existing strikr team, its members or money. Linking requires approval by both teams later."
                : "Pilot: Ein Name verbindet noch kein anderes strikr-Team, keine Mitglieder und kein Geld. Die echte Verknüpfung braucht später die Freigabe beider Mannschaften."}</p>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black">{en ? "Organization administrators" : "Vereinsadmins"}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">{en
                ? "Organization admins manage this parent club, its roster and governance. They do not automatically gain team admin rights or access to team cashboxes."
                : "Vereinsadmins pflegen den Dachverein, seine Mannschaftsübersicht und Zuständigkeiten. Sie bekommen dadurch nicht automatisch Teamadmin-Rechte oder Zugriff auf jede Mannschaftskasse."}</p>
              <form action={managePilotOrganizationAction} className="mt-4">
                <input type="hidden" name="intent" value="admins"/>
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {members.map(member => {
                    const selected = org.admin_user_ids.includes(member.userId);
                    return (
                      <label key={member.userId} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <input type="checkbox" name="admin_user_ids" value={member.userId} defaultChecked={selected} disabled={!canEdit}/>
                        <span className="flex-1 text-sm font-bold text-slate-900">{member.label}</span>
                        <span className="text-[10px] font-bold text-slate-500">{selected ? (en ? "Organization admin" : "Vereinsadmin") : member.role === "admin" ? (en ? "Team admin" : "Teamadmin") : ""}</span>
                      </label>
                    );
                  })}
                </div>
                {canEdit ? <button className={btn+" mt-3"}>{en ? "Save organization admins" : "Vereinsadmins speichern"}</button> : null}
              </form>
              <p className="mt-3 text-xs text-slate-500">{en
                ? "For this test, only existing members of 1. FC Strikr 2026 can be organization admins."
                : "Für diesen Pilot können nur bestehende Mitglieder von 1. FC Strikr 2026 zu Vereinsadmins ernannt werden."}</p>
            </section>
          </>
        )}
        {!canEdit ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{en ? "Only designated organization admins can change this parent club." : "Nur ausdrücklich ernannte Vereinsadmins dürfen diesen Dachverein verändern. Teamadmins sind nicht automatisch Vereinsadmins."}</p> : null}
        <Link className="inline-flex text-sm font-bold text-slate-600 underline underline-offset-2" href="/mannschaftskasse/setup">{en ? "Continue with team cashbox setup" : "Zur Einrichtung der Mannschaftskasse"}</Link>
      </section>
    </main>
  );
}
