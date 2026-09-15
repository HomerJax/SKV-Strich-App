import Link from "next/link";
import type { ReactNode } from "react";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("club_settings")
    .select("beerkasse_enabled,beerkasse_home_enabled,beerkasse_paypal_url")
    .eq("club_id", clubId)
    .maybeSingle();

  const paypalUrl =
    settings?.beerkasse_enabled &&
    settings?.beerkasse_home_enabled &&
    settings?.beerkasse_paypal_url
      ? settings.beerkasse_paypal_url
      : null;

  return (
    <>
      <div className="home-page-content">{children}</div>
      <style>{`.home-page-content a[href="/about"]{display:none}`}</style>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pb-24 sm:px-6 lg:px-8">
        {paypalUrl ? (
          <a
            href={paypalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
          >
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.16em] text-amber-700">
                🍺 Bierkasse
              </div>
              <div className="text-sm font-black text-slate-950">Bier zahlen</div>
            </div>
            <span className="rounded-full bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">
              PayPal →
            </span>
          </a>
        ) : null}

        <Link
          href="/about"
          className="rounded-[24px] border border-black/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-sm font-black text-slate-500">Über strikr</div>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            Vom Bierdeckel zur App 🍻⚽
          </h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
            Angefangen mit Strichen auf Papier, dann Excel und irgendwann die Frage:
            Warum sind Teams eigentlich immer unfair?
          </p>
          <div className="mt-3 text-sm font-black text-slate-900">
            Geschichte lesen →
          </div>
        </Link>
      </div>
    </>
  );
}
