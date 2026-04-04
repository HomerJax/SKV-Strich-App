import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import {
  getFeatureFlagsForClub,
  setFeatureFlagForClub,
  type FeatureFlagKey,
} from "@/lib/feature-flags";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export default async function AdminFeaturesPage() {
  const { clubId, membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const flags = await getFeatureFlagsForClub(clubId);
  const useNicknames = flags.use_nicknames;

  async function toggleNicknameFlag(formData: FormData) {
    "use server";

    const { clubId, membership } = await requireClub();

    if (!isAdminRole(membership.role)) {
      redirect(AUTH_ROUTES.dashboard);
    }

    const nextEnabled = formData.get("enabled") === "1";

    await setFeatureFlagForClub(
      clubId,
      "use_nicknames" as FeatureFlagKey,
      nextEnabled
    );

    revalidatePath("/admin/features");
    revalidatePath("/admin/players");
    revalidatePath("/stats");
    revalidatePath("/sessions");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück zum Adminbereich
        </Link>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Admin
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Anzeige & Feature Flags
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Hier steuerst du clubweit, wie Spielernamen angezeigt werden.
        </p>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold text-slate-950">
                Spitznamen anzeigen
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Wenn aktiv, werden im Club bevorzugt Spitznamen angezeigt.
                Wenn deaktiviert, werden Vor- und Nachname verwendet.
              </p>
            </div>

            <span
              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                useNicknames
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {useNicknames ? "Aktiv" : "Aus"}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <form action={toggleNicknameFlag}>
              <input type="hidden" name="enabled" value="1" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Spitznamen aktivieren
              </button>
            </form>

            <form action={toggleNicknameFlag}>
              <input type="hidden" name="enabled" value="0" />
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Spitznamen deaktivieren
              </button>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}