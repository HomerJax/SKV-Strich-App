import Link from "next/link";
import ClubSettingsCard from "@/components/admin/settings/ClubSettingsCard";
import { getServerI18n } from "@/lib/i18n/server";

type ClubAdminPageProps = {
  searchParams?: Promise<{
    saved?: string;
    error?: string;
    club_delete_error?: string;
  }>;
};

export default async function ClubAdminPage({
  searchParams,
}: ClubAdminPageProps) {
  const params = await searchParams;
  const { t } = await getServerI18n();

  const deleteError = params?.club_delete_error
    ? `delete_${params.club_delete_error}`
    : "";
  const error = params?.error || deleteError;

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
        <div className="flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← {t("settings.page.backAdmin")}
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <div className="text-sm font-semibold text-slate-500">
              {t("nav.admin")}
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
              {t("settings.section.club")}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {t("settings.section.clubHint")}
            </p>
          </div>

          <ClubSettingsCard
            saved={params?.saved === "1"}
            error={error}
            redirectTo="/admin/club"
            removeLogoRedirectTo="/admin/club"
          />
        </div>
      </section>
    </main>
  );
}
