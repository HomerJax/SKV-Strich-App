import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WHEEL_SEGMENTS, parseWheelSegments } from "@/lib/cashbox/wheel-config";
import WheelSettingsEditor from "./WheelSettingsEditor";

export const dynamic = "force-dynamic";

export default async function WheelSettingsPage() {
  const { clubId, isPowerUser, membership } = await requireClub();
  if (!canManageClub({ isPowerUser, role: membership.role })) redirect("/mannschaftskasse");
  const { data, error } = await createAdminClient().from("penalty_wheel_settings")
    .select("segments").eq("club_id", clubId).maybeSingle();
  if (error) throw new Error("Die Rad-Einstellungen konnten nicht geladen werden.");
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 pb-28">
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/mannschaftskasse" className="text-sm font-semibold text-cyan-700">← Mannschaftskasse</Link>
        <header className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-black uppercase tracking-[0.17em] text-cyan-700">🎡 Vereins-Glücksrad</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Rad-Felder festlegen</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Dein Verein entscheidet selbst, welche Felder es gibt und wie groß ihre Chancen sind.
            Spieler sehen diese Felder direkt auf dem Schicksalsrad.
          </p>
        </header>
        <WheelSettingsEditor initialSegments={parseWheelSegments(data?.segments) ?? DEFAULT_WHEEL_SEGMENTS} />
      </div>
    </main>
  );
}
