import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { isAdminRole } from "@/lib/auth/access";
import { hasGuidedTrainingAssistant } from "@/lib/training-wizard-pilots";

const STEPS = new Set(["settings", "attendance", "mode", "teams", "timer", "live", "finish", "recheck", "photo", "result", "winner", "check"]);
const BOOLS = ["settingsReviewed", "normalModeReviewed", "attendanceReviewed", "trainingStarted", "clockStarted", "useGameClock", "trainingEnded", "photoSkipped", "finished", "closeCheckReviewed", "winnerReviewed"] as const;
const ANSWERS = ["presentOk", "lateCancel", "punctualOk", "specialEvents"] as const;
type Access = Exclude<Awaited<ReturnType<typeof requireSessionAccess>>, { error: string }>;

function response(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

async function getAccess(params: Promise<{ id: string }>) {
  const sessionId = Number((await params).id);
  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return { error: "Ungültiges Training.", status: 400 };
  const access = await requireSessionAccess(sessionId);
  if ("error" in access) return access;
  if (!hasGuidedTrainingAssistant(access.clubId) || access.session.type !== "training") {
    return { error: "Trainingsassistent ist hier nicht aktiv.", status: 404 };
  }
  if (!(access.isPowerUser || isAdminRole(access.membership.role) || access.canLeadTraining)) {
    return { error: "Nur Admins und Trainingsleiter dürfen den Fortschritt bearbeiten.", status: 403 };
  }
  return { access, sessionId };
}

function normalizeState(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  if (typeof value.step === "string" && STEPS.has(value.step)) next.step = value.step;
  for (const key of BOOLS) if (typeof value[key] === "boolean") next[key] = value[key];
  if (typeof value.attendanceRosterSignature === "string" && value.attendanceRosterSignature.length <= 3000
    && /^[0-9,]*$/.test(value.attendanceRosterSignature)) next.attendanceRosterSignature = value.attendanceRosterSignature;
  if (value.teamChangedChoice === "yes" || value.teamChangedChoice === "no" || value.teamChangedChoice === null) {
    next.teamChangedChoice = value.teamChangedChoice;
  }
  const closing = value.closingAnswers;
  if (closing && typeof closing === "object" && !Array.isArray(closing)) {
    const src = closing as Record<string, unknown>;
    const clean: Record<string, unknown> = {};
    for (const key of ANSWERS) if (src[key] === "yes" || src[key] === "no" || src[key] === null) clean[key] = src[key];
    if (typeof src.exceptionsConfirmed === "boolean") clean.exceptionsConfirmed = src.exceptionsConfirmed;
    next.closingAnswers = clean;
  }
  return next;
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await getAccess(context.params);
  if ("error" in result) return response({ error: result.error }, result.status);
  const { access, sessionId } = result;
  const { data, error } = await access.adminSupabase.from("training_wizard_progress")
    .select("state,version,updated_at")
    .eq("session_id", sessionId).eq("club_id", access.clubId).maybeSingle();
  if (error) return response({ error: "Trainingsfortschritt konnte nicht geladen werden." }, 500);
  return response({ state: data?.state ?? null, version: data?.version ?? 0, updatedAt: data?.updated_at ?? null });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const result = await getAccess(context.params);
  if ("error" in result) return response({ error: result.error }, result.status);
  const { access, sessionId } = result;
  const raw = await request.text();
  if (raw.length > 10000) return response({ error: "Zu viele Fortschrittsdaten." }, 413);
  let parsed: { expectedVersion?: unknown; state?: unknown };
  try { parsed = JSON.parse(raw) as { expectedVersion?: unknown; state?: unknown }; }
  catch { return response({ error: "Ungültige Fortschrittsdaten." }, 400); }
  const version = parsed.expectedVersion;
  const state = normalizeState(parsed.state);
  if (!Number.isSafeInteger(version) || (version as number) < 0 || !state) {
    return response({ error: "Ungültige Versions- oder Fortschrittsdaten." }, 400);
  }
  const next = {
    club_id: access.clubId, session_id: sessionId, state,
    updated_by: access.currentUserId, updated_at: new Date().toISOString(),
    version: (version as number) + 1,
  };
  if (version === 0) {
    const { error } = await access.adminSupabase.from("training_wizard_progress").insert(next);
    if (error) {
      if (error.code === "23505") return response({ error: "Ein anderer Trainingsleiter hat inzwischen gespeichert. Bitte neu laden." }, 409);
      return response({ error: "Fortschritt konnte nicht gespeichert werden." }, 500);
    }
  } else {
    const { data, error } = await access.adminSupabase.from("training_wizard_progress")
      .update(next).eq("session_id", sessionId).eq("club_id", access.clubId).eq("version", version)
      .select("version").maybeSingle();
    if (error) return response({ error: "Fortschritt konnte nicht gespeichert werden." }, 500);
    if (!data) return response({ error: "Ein anderer Trainingsleiter hat inzwischen gespeichert. Bitte neu laden." }, 409);
  }
  return response({ ok: true, version: next.version });
}
