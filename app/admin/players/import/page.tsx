import Link from "next/link";
import RosterEditor from "./roster-editor";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAddFixedPlayer } from "@/lib/billing/product-limits";

async function authorize() {
  const ctx = await getAuthContext();
  if (!ctx.user) redirect("/login");
  if (!ctx.activeClubId) redirect("/select-club");
  const member = ctx.memberships.find(m => m.club_id === ctx.activeClubId);
  if (!ctx.isPowerUser && member?.role !== "admin") redirect("/");
  return ctx.activeClubId;
}

function parseLine(line: string) {
  const parts = line.split(/[;\t]/).map(s => s.trim());
  const name = parts[0] ?? "";
  const email = (parts[1] ?? "").toLowerCase();
  if (!name || name.length > 120 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) return null;
  return { name, email };
}

export default async function ImportPlayersPage({ searchParams }: { searchParams?: Promise<{ message?: string }> }) {
  await authorize();
  const message = (await searchParams)?.message;
  async function importPlayers(formData: FormData) {
    "use server";
    const clubId = await authorize();
    const raw = String(formData.get("roster") ?? "");
    const lines = raw.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (!lines.length || lines.length > 25 || raw.length > 6000) redirect("/admin/players/import?message=limit");
    const parsed = lines.map(parseLine);
    if (parsed.some(x => !x)) redirect("/admin/players/import?message=format");
    const db = createAdminClient();
    const { data: existing, error } = await db.from("players").select("name,email")
      .eq("club_id", clubId).eq("is_guest", false);
    if (error) redirect("/admin/players/import?message=error");
    const seenNames = new Set((existing ?? []).map(p => p.name?.trim().toLowerCase()).filter(Boolean));
    const seenEmails = new Set((existing ?? []).map(p => p.email?.trim().toLowerCase()).filter(Boolean));
    let added = 0;
    let skipped = 0;
    for (const item of parsed) {
      if (!item) continue;
      const nameKey = item.name.toLowerCase();
      if (seenNames.has(nameKey) || (item.email && seenEmails.has(item.email))) { skipped++; continue; }
      if (!(await canAddFixedPlayer(db, clubId))) break;
      const { error: insertError } = await db.from("players").insert({
        club_id: clubId, name: item.name, email: item.email || null,
        is_active: true, is_guest: false, strength: null,
      });
      if (insertError) { skipped++; continue; }
      seenNames.add(nameKey);
      if (item.email) seenEmails.add(item.email);
      added++;
    }
    revalidatePath("/players");
    redirect("/admin/players/import?message=" + encodeURIComponent(added + " Spieler angelegt, " + skipped + " übersprungen. Free-/Pro-Limit beachten."));
  }
  const feedback = message === "limit" ? "Bitte maximal 25 Spieler pro Import eingeben." : message === "format" ? "Ungültige Zeile. Format: Name; E-Mail (optional)." : message === "error" ? "Import fehlgeschlagen." : message;
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
    <Link href="/admin/members" className="text-sm text-slate-600">← Mitglieder</Link>
    <h1 className="text-2xl font-bold">Kader aus Liste übernehmen</h1>
    <p className="text-sm text-slate-600">Kopiere Namen und optional E-Mail-Adressen aus Excel, einer Nachricht oder einer Liste. Ein Spieler pro Zeile, getrennt durch Semikolon oder Tab. Ohne E-Mail ist keine Registrierung nötig.</p>
    {feedback && <p className="rounded-xl bg-slate-100 p-3 text-sm">{feedback}</p>}
    <RosterEditor action={importPlayers} />
  </main>;
}
