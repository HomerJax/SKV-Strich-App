import Link from "next/link";
import { Award, Trophy } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

export default async function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { clubId } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);

  return (
    <>
      {children}

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
