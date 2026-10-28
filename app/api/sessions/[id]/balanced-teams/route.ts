import { NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";
import { generateBalancedTeamMap } from "@/lib/team-generator/server-balanced";
import { sumTeamScore } from "@/app/sessions/[id]/session-ui";
import type { Player } from "@/app/sessions/[id]/session-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });

/** The input deliberately contains NO player IDs, ratings or team memberships.
 * The authenticated club/session and actual attendance are loaded on the server.
 * This is available to an actual admin or formally appointed training leader. */
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("Ungültige Trainingseinheit.",400);
  const access = await requireSessionAccess(id);
  if ("error" in access) return fail(access.error ?? "Kein Zugriff.",access.status);
  if (!canManageClub({ isPowerUser: access.isPowerUser, role: access.membership.role })
      && !access.canLeadTraining) return fail("Keine Berechtigung zur Trainingsleitung.",403);
  if (access.session.type === "event" || access.session.session_mode === "tournament")
    return fail("Nur für ein normales Training verfügbar.",409);
  const db = access.adminSupabase;
  const [{ data: results, error: resultErr }, { data: attendance, error: attendanceErr },
    { data: settings, error: settingsErr }, { data: categories, error: categoriesErr }] = await Promise.all([
    db.from("results").select("id").eq("session_id",id).eq("club_id",access.clubId).limit(1),
    db.from("session_players").select("player_id").eq("session_id",id),
    db.from("club_settings").select("use_strength,use_categories,strength_default").eq("club_id",access.clubId).maybeSingle(),
    db.from("club_categories").select("key,label,is_strong").eq("club_id",access.clubId).eq("is_active",true),
  ]);
  if (resultErr || attendanceErr || settingsErr || categoriesErr)
    return fail("Teamdaten konnten nicht geladen werden.",500);
  if (results?.length) return fail("Ergebnis bereits gespeichert. Teams sind gesperrt.",409);
  const ids = [...new Set((attendance ?? []).map(x => x.player_id).filter(Number.isSafeInteger))];
  if (ids.length < 2) return fail("Mindestens zwei anwesende Spieler erforderlich.",400);
  const { data: rawPlayers, error: playerError } = await db.from("players")
    .select("id,name,age_group,category_key,balance_group,roster_role,preferred_position,strength,is_active")
    .eq("club_id",access.clubId).eq("is_active",true).in("id",ids);
  if (playerError) return fail("Spieler konnten nicht geladen werden.",500);
  if (rawPlayers?.length !== ids.length) return fail("Anwesenheit wurde geändert. Bitte neu laden.",409);
  const present = (rawPlayers ?? []).filter(p => p.roster_role !== "staff").map(p => ({
    ...p, strength: p.strength ?? settings?.strength_default ?? 3,
  })) as Player[];
  if (present.length < 2) return fail("Mindestens zwei spielende Teilnehmer erforderlich.",400);
  try {
    const categoryList = (categories ?? []).map(cat => ({
      key:cat.key, label:cat.label, isStrong:cat.is_strong,
    }));
    const generated = generateBalancedTeamMap(present, {
      useStrength: settings?.use_strength !== false, useCategories: settings?.use_categories !== false,
      balanceCategories: categoryList,
    });
    // Aggregate two team totals only. No individual strengths, source players or
    // per-player scores are ever emitted by this endpoint.
    const max = Math.max(1, generated.aggregate.a, generated.aggregate.b);
    return NextResponse.json({
      teams: generated.teams,
      aggregate: {
        a: Math.round(generated.aggregate.a / max * 100),
        b: Math.round(generated.aggregate.b / max * 100),
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail("Teams konnten nicht berechnet werden.",500);
  }
}


/** Read aggregate bar values for the *saved* team assignments. No caller-supplied
 * player lists or arbitrary team IDs; results are rounded to whole percent. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const id = Number((await context.params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return fail("Ungültige Trainingseinheit.",400);
  const access = await requireSessionAccess(id);
  if ("error" in access) return fail(access.error ?? "Kein Zugriff.", access.status);
  const db = access.adminSupabase;
  const [
    { data: teams, error: teamError },
    { data: settings, error: settingsError },
    { data: categories, error: categoryError },
  ] = await Promise.all([
    db.from("teams").select("id,name").eq("session_id",id).eq("club_id",access.clubId),
    db.from("club_settings").select("use_strength,use_categories,strength_default")
      .eq("club_id",access.clubId).maybeSingle(),
    db.from("club_categories").select("key,label,is_strong").eq("club_id",access.clubId).eq("is_active",true),
  ]);
  if (teamError || settingsError || categoryError) return fail("Team-Balance nicht verfügbar.",500);
  const aId = teams?.find(x => x.name === "Team 1")?.id;
  const bId = teams?.find(x => x.name === "Team 2")?.id;
  if (!aId || !bId) return NextResponse.json({ aggregate:null },{headers:{"Cache-Control":"private, no-store"}});
  const { data: assignments, error: assignmentError } = await db.from("team_players")
    .select("team_id,player_id").in("team_id",[aId,bId]);
  if (assignmentError) return fail("Team-Zuordnung nicht verfügbar.",500);
  const ids = [...new Set((assignments ?? []).map(x=>x.player_id))];
  if (!ids.length) return NextResponse.json({ aggregate:null },{headers:{"Cache-Control":"private, no-store"}});
  const { data: players, error: playersError } = await db.from("players")
    .select("id,strength,category_key,age_group,preferred_position,balance_group")
    .eq("club_id",access.clubId).in("id",ids);
  if (playersError) return fail("Spieler konnten nicht geladen werden.",500);
  const playersById = new Map((players ?? []).map(p=>[p.id,p]));
  const options = {
    useStrength: settings?.use_strength !== false, useCategories: settings?.use_categories !== false,
    balanceCategories: (categories ?? []).map(x=>({key:x.key,label:x.label,isStrong:x.is_strong})),
  };
  const a = (assignments ?? []).filter(x=>x.team_id === aId)
    .map(x=>playersById.get(x.player_id)).filter((x):x is NonNullable<typeof x>=>!!x)
    .map(x=>({ ...x,strength: x.strength ?? settings?.strength_default ?? 3 })) as Player[];
  const b = (assignments ?? []).filter(x=>x.team_id === bId)
    .map(x=>playersById.get(x.player_id)).filter((x):x is NonNullable<typeof x>=>!!x)
    .map(x=>({ ...x,strength: x.strength ?? settings?.strength_default ?? 3 })) as Player[];
  if (!a.length || !b.length) return NextResponse.json({aggregate:null},{headers:{"Cache-Control":"private, no-store"}});
  const totalA = options.useStrength || options.useCategories ? sumTeamScore(a,options) : a.length;
  const totalB = options.useStrength || options.useCategories ? sumTeamScore(b,options) : b.length;
  const max = Math.max(1,totalA,totalB);
  return NextResponse.json({ aggregate: {
    a: Math.round(totalA/max*100), b: Math.round(totalB/max*100),
  } }, { headers: { "Cache-Control":"private, no-store" } });
}
