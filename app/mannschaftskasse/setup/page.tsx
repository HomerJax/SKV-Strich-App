import Link from "next/link";
import { redirect } from "next/navigation";
import { canManageClub } from "@/lib/auth/access";
import { requireClub } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveCashboxSetupAction } from "./actions";

type Props = {
  searchParams?: Promise<{ error?: string; edit?: string; wizard?: string }>;
};

type PlayerRow = {
  id: number;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  name: string | null;
};

function playerName(player: PlayerRow) {
  return (
    player.nickname?.trim() ||
    [player.first_name, player.last_name].filter(Boolean).join(" ") ||
    player.name ||
    `Spieler ${player.id}`
  );
}

function errorText(value?: string) {
  if (value === "module") return "Bitte mindestens einen Bereich aktivieren.";
  if (value === "price") return "Bitte einen gültigen Preis pro Bier eintragen.";
  if (value === "paypal") return "Bitte einen gültigen https-PayPal-Link eintragen.";
  if (value === "manager") return "Der Kassenwart konnte nicht gespeichert werden.";
  if (value) return "Das Setup konnte nicht gespeichert werden.";
  return "";
}

export default async function Page({ searchParams }: Props) {
  const q = await searchParams;
  const ctx = await requireClub();

  if (!canManageClub({ isPowerUser: ctx.isPowerUser, role: ctx.membership.role })) {
    redirect("/mannschaftskasse");
  }

  const admin = createAdminClient();
  const [{ data: settings }, { data: playersData }, { data: managersData }] =
    await Promise.all([
      admin
        .from("club_settings")
        .select(
          "cashbox_setup_completed,cashbox_penalties_enabled,cashbox_contributions_enabled,beerkasse_premium_enabled,beerkasse_enabled,beerkasse_home_enabled,beerkasse_paypal_url,beerkasse_price_cents",
        )
        .eq("club_id", ctx.clubId)
        .maybeSingle(),
      admin
        .from("players")
        .select("id,user_id,first_name,last_name,nickname,name")
        .eq("club_id", ctx.clubId)
        .eq("is_guest", false)
        .eq("is_active", true)
        .not("user_id", "is", null)
        .order("first_name"),
      admin
        .from("cashbox_managers")
        .select("user_id")
        .eq("club_id", ctx.clubId),
    ]);

  const players = (playersData ?? []) as PlayerRow[];
  const managers = new Set(
    (managersData ?? []).map((row) => String(row.user_id)),
  );
  const premiumBeer = settings?.beerkasse_premium_enabled === true;
  const wizardMode = q?.wizard === "1";
  const editing = !wizardMode && (settings?.cashbox_setup_completed === true || q?.edit === "1");
  const error = errorText(q?.error);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-5 pb-24">
        <div className="flex items-center justify-between gap-3">
          <Link href="/mannschaftskasse" className="text-sm font-semibold text-slate-600">
            ← Mannschaftskasse
          </Link>
          {editing ? (
            <Link
              href="/mannschaftskasse/setup?wizard=1"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-slate-700"
            >
              Wizard erneut starten
            </Link>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-emerald-800">
              Setup-Wizard
            </span>
          )}
        </div>

        <div className="overflow-hidden rounded-[30px] bg-slate-950 p-6 text-white shadow-lg">
          <div className="text-[10px] font-black uppercase tracking-[.22em] text-emerald-300">
            Mannschaftskasse
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {editing ? "Was wollt ihr nutzen?" : "Einmal kurz einrichten."}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-white/60">
            {wizardMode
              ? "Der Wizard ist wieder aktiv. Eure bisherigen Einstellungen bleiben vorausgewählt – du kannst sie einfach prüfen und neu speichern."
              : "Aktiviert nur die Bereiche, die zu eurem Team passen. Das könnt ihr später jederzeit wieder ändern."}
          </p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
            {error}
          </div>
        ) : null}

        <form action={saveCashboxSetupAction} className="space-y-4">
          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
              1 · Bereiche
            </div>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Was soll in eure Mannschaftskasse?
            </h2>

            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  name="penalties_enabled"
                  defaultChecked={settings?.cashbox_penalties_enabled === true}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-black text-slate-950">⚠️ Posten & Strafen</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                    Kiste, Kuchen, Geldstrafe oder eigene Regeln. Spieler dürfen Vorfälle melden.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  name="contributions_enabled"
                  defaultChecked={settings?.cashbox_contributions_enabled === true}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-black text-slate-950">💶 Beiträge</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                    Teambeiträge anlegen und pro Spieler als offen, bezahlt oder befreit führen.
                  </span>
                </span>
              </label>

              <label className={[
                "flex items-start gap-3 rounded-2xl border p-4",
                premiumBeer
                  ? "cursor-pointer border-amber-200 bg-amber-50"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60",
              ].join(" ")}>
                <input
                  type="checkbox"
                  name="beer_enabled"
                  disabled={!premiumBeer}
                  defaultChecked={premiumBeer && settings?.beerkasse_enabled === true}
                  className="mt-1 h-5 w-5"
                />
                <span>
                  <span className="block font-black text-slate-950">🍺 Bierkasse</span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-slate-500">
                    {premiumBeer
                      ? "Bier eintragen, Barzahlung bestätigen und optional direkt zu PayPal springen."
                      : "Für diesen Club ist Bierkasse+ aktuell noch nicht freigeschaltet."}
                  </span>
                </span>
              </label>
            </div>
          </section>

          {premiumBeer ? (
            <section className="rounded-[26px] border border-amber-200 bg-white p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[.18em] text-amber-600">
                2 · Bierkasse
              </div>
              <h2 className="mt-1 text-lg font-black text-slate-950">
                Preis & Zahlung
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Barzahlung ist immer möglich. PayPal ist optional.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-xs font-black text-slate-600">Preis pro Bier</span>
                  <div className="relative">
                    <input
                      name="beer_price"
                      inputMode="decimal"
                      defaultValue={((settings?.beerkasse_price_cents ?? 200) / 100)
                        .toFixed(2)
                        .replace(".", ",")}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 pr-10 text-sm font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-sm font-black text-slate-400">€</span>
                  </div>
                </label>

                <label>
                  <span className="mb-1 block text-xs font-black text-slate-600">PayPal-Link</span>
                  <input
                    name="paypal_url"
                    defaultValue={settings?.beerkasse_paypal_url ?? ""}
                    placeholder="https://paypal.me/..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                  />
                </label>
              </div>

              <label className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-amber-50 px-3 py-3 text-sm font-bold">
                <span>🍺 „Bier eintragen“ direkt auf Home</span>
                <input
                  type="checkbox"
                  name="beer_home_enabled"
                  defaultChecked={settings?.beerkasse_home_enabled === true}
                  className="h-5 w-5"
                />
              </label>
            </section>
          ) : null}

          <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">
              {premiumBeer ? "3" : "2"} · Rechte
            </div>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Wer darf die Kasse verwalten?
            </h2>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              Club-Admins dürfen das immer. Optional kannst du weitere Kassenwarte festlegen.
            </p>

            <div className="mt-4 space-y-2">
              {players.map((player) => (
                <label
                  key={player.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
                >
                  <span className="text-sm font-bold text-slate-800">
                    {playerName(player)}
                  </span>
                  <input
                    type="checkbox"
                    name="manager_user_ids"
                    value={player.user_id ?? ""}
                    defaultChecked={
                      Boolean(player.user_id) && managers.has(player.user_id as string)
                    }
                    className="h-5 w-5"
                  />
                </label>
              ))}
              {players.length === 0 ? (
                <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  Noch keine verknüpften Mitglieder vorhanden. Admins können die Kasse trotzdem verwalten.
                </div>
              ) : null}
            </div>
          </section>

          <button className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-lg">
            {editing ? "Setup speichern" : "Mannschaftskasse starten"}
          </button>
        </form>
      </section>
    </main>
  );
}
