import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/session-detail/response";

type SessionDetailSupabase = Awaited<ReturnType<typeof createClient>>;

type DeleteResultInput = {
  supabase: SessionDetailSupabase;
  sessionId: number;
};

export async function handleDeleteResult({
  supabase,
  sessionId,
}: DeleteResultInput) {
  const { error } = await supabase
    .from("results")
    .delete()
    .eq("session_id", sessionId);

  if (error) {
    return fail(error.message, 500);
  }

  return ok({
    message:
      "Ergebnis gelöscht. Aufstellungen & Anwesenheit sind wieder bearbeitbar.",
    hasResult: false,
    goalsA: "",
    goalsB: "",
  });
}