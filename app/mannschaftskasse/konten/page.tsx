import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { canManageClub } from "@/lib/auth/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerI18n } from "@/lib/i18n/server";
import {
  EMPTY_PILOT_CASHBOX, isCashboxPilotClub, parsePilotCashboxStructure,
} from "@/lib/cashbox/pilot-structure";
import CashboxAccountsEditor from "./CashboxAccountsEditor";

type Props = { searchParams?: Promise<{ saved?: string; error?: string }> };

export default async function CashboxAccountsPage({ searchParams }: Props) {
  const ctx = await requireClub();
  if (ctx.isSupportView || !isCashboxPilotClub(ctx.clubId) ||
      !canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/mannschaftskasse");
  }
  const { locale } = await getServerI18n();
  const en = locale === "en";
  const q = await searchParams;
  const db = createAdminClient();
  const { data, error } = await db.from("cashbox_pilot_structures")
    .select("config").eq("club_id", ctx.clubId).maybeSingle();
  if (error) throw new Error("Konteneinstellungen konnten nicht geladen werden.");
  return (
    <main className="min-h-screen bg-[#f5f6f8] px-4 py-6 pb-24">
      <section className="mx-auto max-w-3xl space-y-4">
        <Link href="/mannschaftskasse" className="text-sm font-bold text-slate-600">
          ← {en ? "Team cashbox" : "Mannschaftskasse"}
        </Link>
        <header className="rounded-2xl bg-slate-950 p-5 text-white">
          <p className="text-xs font-black uppercase tracking-widest text-teal-300">
            {en ? "Cashbox settings" : "Einstellungen Mannschaftskasse"}
          </p>
          <h1 className="mt-2 text-2xl font-black">
            {en ? "Set up or edit accounts" : "Konten hinterlegen oder bearbeiten"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/70">{en
            ? "You may configure accounts now or later. You do not need to repeat the whole cashbox wizard."
            : "Du kannst Konten jederzeit nachtragen. Dafür musst du den Mannschaftskassen-Wizard nicht erneut durchlaufen."}</p>
        </header>
        {q?.saved ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          {en ? "Accounts saved." : "Konten gespeichert."}
        </p> : null}
        {q?.error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {en ? "Unable to save accounts. Check all account names and assignments." : "Konten konnten nicht gespeichert werden. Bitte Kontonamen und Zuordnungen prüfen."}
        </p> : null}
        <CashboxAccountsEditor initialStructure={
          data?.config ? parsePilotCashboxStructure(data.config) : EMPTY_PILOT_CASHBOX
        } />
      </section>
    </main>
  );
}
