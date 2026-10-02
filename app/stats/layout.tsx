import Link from "next/link";
import { Award, Trophy } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import ExtendedPersonalStats from "@/components/stats/ExtendedPersonalStats";
import { createClient } from "@/lib/supabase/server";
import { getClubBillingAccess } from "@/lib/billing/club-billing";

export default async function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const [flags, billingAccess] = await Promise.all([
    getFeatureFlagsForClub(clubId),
    getClubBillingAccess(supabase, clubId),
  ]);

  return (
    <>
      {children}
      {billingAccess.isPro ? (
        <ExtendedPersonalStats />
      ) : (
        <section className="bg-neutral-100 px-4 pb-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">PRO · Persönliche Insights</div>
            <h2 className="mt-1 text-xl font-black text-slate-950">🔒 Wer passt am besten zu deinem Spiel?</h2>
            <p className="mt-2 text-sm text-slate-600">Mit PRO siehst du unter anderem deinen besten Monat, häufigste Mitspieler und mit wem du am häufigsten gewinnst.</p>
          </div>
        </section>
      )}

      {flags.hall_of_fame_badges ? (
        <Link
          href="/badges"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-[320] inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950 px-4 py-3 text-sm font-extrabold text-white shadow-[0_18px_44px_rgba(15,23,42,0.28)] transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
            <Trophy className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <span>Hall of Fame</span>
          <Award className="h-4 w-4 text-amber-300" strokeWidth={2.2} />
        </Link>
      ) : null}
    </>
  );
}
