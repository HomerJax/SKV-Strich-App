import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { AUTH_ROUTES } from "@/lib/auth/routes";
import { canManageClub } from "@/lib/auth/access";
import { getServerI18n } from "@/lib/i18n/server";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";

type PageProps = {
  searchParams?: Promise<{ error?: string; message?: string }>;
};

export default async function SeasonsAdminPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const { t } = await getServerI18n();
  const { membership, isPowerUser } = await requireClub();

  if (!canManageClub({ isPowerUser, role: membership.role })) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const flashError = resolvedSearchParams?.error ?? "";
  const flashMessage = resolvedSearchParams?.message ?? "";

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            ← {t("settings.page.backAdmin")}
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            {t("settings.season.title")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("settings.section.seasonsHint")}
          </p>

          {isPowerUser ? (
            <div className="mt-4 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-medium text-sky-900">
              {t("settings.page.powerUser")}
            </div>
          ) : null}

          <div className="mt-6">
            <SeasonSettingsCard
              message={flashMessage}
              error={flashError}
              redirectTo="/admin/seasons"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
