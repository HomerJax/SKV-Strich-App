"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCashboxPilotClub } from "@/lib/cashbox/pilot-structure";

type Team = { id: string; name: string; status: "linked" | "planned"; clubId: string | null };
type Organization = {
  owner_club_id: string;
  name: string;
  teams: Team[];
  admin_user_ids: string[];
};

const back = (query: Record<string, string>) => `/admin/organization?${new URLSearchParams(query)}`;
const refresh = () => {
  revalidatePath("/admin/organization");
  revalidatePath("/admin/settings");
  revalidatePath("/mannschaftskasse");
};

export async function managePilotOrganizationAction(form: FormData) {
  const ctx = await requireClub();
  if (!isCashboxPilotClub(ctx.clubId) || ctx.isSupportView) redirect("/home");
  const db = createAdminClient();
  const { data, error: loadError } = await db.from("pilot_parent_clubs")
    .select("owner_club_id,name,teams,admin_user_ids")
    .eq("owner_club_id", ctx.clubId).maybeSingle();
  if (loadError) redirect(back({ error: "load" }));
  const org = data as Organization | null;
  const isTeamAdmin = canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role });
  const isOrgAdmin = org?.admin_user_ids?.includes(ctx.user.id) === true;
  const action = String(form.get("intent") ?? "");
  if (!org && action !== "create") redirect(back({ error: "no_org" }));
  // After creation, club and organization administration are separate roles.
  if (org ? !isOrgAdmin : !isTeamAdmin) redirect("/home");

  const name = String(form.get("name") ?? "").trim().slice(0, 100);
  if (action === "create") {
    if (org) redirect(back({ error: "already" }));
    if (name.length < 2) redirect(back({ error: "name" }));
    const { data: club } = await db.from("clubs").select("display_name,name")
      .eq("id", ctx.clubId).maybeSingle();
    const initialTeams: Team[] = [{
      id: `club:${ctx.clubId}`, name: club?.display_name || club?.name || "1. FC Strikr 2026",
      status: "linked", clubId: ctx.clubId,
    }];
    const { error } = await db.from("pilot_parent_clubs").insert({
      owner_club_id: ctx.clubId, name,
      teams: initialTeams, admin_user_ids: [ctx.user.id],
      created_by: ctx.user.id, updated_by: ctx.user.id,
    });
    if (error) redirect(back({ error: "save" }));
    refresh();
    redirect(back({ saved: "1" }));
  }

  if (!org) redirect(back({ error: "no_org" }));
  const teams = Array.isArray(org.teams) ? org.teams : [];
  const changes: Record<string, unknown> = { updated_by: ctx.user.id, updated_at: new Date().toISOString() };

  if (action === "rename") {
    if (name.length < 2) redirect(back({ error: "name" }));
    changes.name = name;
  } else if (action === "add_team") {
    if (name.length < 2 || teams.length >= 25) redirect(back({ error: "team" }));
    if (teams.some(team => team.name.trim().toLowerCase() === name.toLowerCase()))
      redirect(back({ error: "duplicate" }));
    // Additional teams are planning entries; real clubs need explicit two-sided authorization later.
    changes.teams = [...teams, { id: `planned:${randomUUID()}`, name, status: "planned", clubId: null }];
  } else if (action === "remove_team") {
    const id = String(form.get("team_id") ?? "");
    const found = teams.find(team => team.id === id);
    if (!found || found.status !== "planned" || found.clubId) redirect(back({ error: "team" }));
    changes.teams = teams.filter(team => team.id !== id);
  } else if (action === "admins") {
    const requested = [...new Set(form.getAll("admin_user_ids").map(value => String(value)).filter(Boolean))];
    if (requested.length === 0 || requested.length > 25) redirect(back({ error: "admins" }));
    const { data: members, error } = await db.from("club_memberships")
      .select("user_id").eq("club_id", ctx.clubId).in("user_id", requested);
    if (error || (members ?? []).length !== requested.length) redirect(back({ error: "admins" }));
    changes.admin_user_ids = requested;
  } else {
    redirect(back({ error: "action" }));
  }

  const { error: updateError } = await db.from("pilot_parent_clubs")
    .update(changes).eq("owner_club_id", ctx.clubId);
  if (updateError) redirect(back({ error: "save" }));
  refresh();
  redirect(back({ saved: "1" }));
}
