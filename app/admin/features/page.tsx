import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";
import { getServerI18n } from "@/lib/i18n/server";

export default async function AdminFeaturesPage() {
  const { t } = await getServerI18n();
  const standardFeatures = [t("adminFeatures.stats"), t("adminFeatures.teamImpact"), t("adminFeatures.pitch"), t("adminFeatures.rsvp"), t("adminFeatures.sessionTypes")];
  const { membership, isPowerUser } = await requireClub();

  const hasAdminAccess = canManageClub({
    isPowerUser,
    role: membership.role,
  });

  if (!hasAdminAccess) {
    redirect(AUTH_ROUTES.dashboard);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← {t("adminFeatures.back")}
        </Link>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Admin
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
          Features
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {t("adminFeatures.description")}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {standardFeatures.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-950"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          {t("adminFeatures.internalHint")}
        </div>
      </section>
    </main>
  );
}
