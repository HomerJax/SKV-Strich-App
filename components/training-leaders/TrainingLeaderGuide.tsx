import Link from "next/link";
import { ArrowRight, ClipboardCheck, ShieldCheck, UsersRound } from "lucide-react";
import type { AppLocale } from "@/lib/i18n/config";
import { translate } from "@/lib/i18n/messages";

type Props = {
  locale: AppLocale;
  placement: "onboarding" | "members";
};

/**
 * Reused in the admin setup and in member management, so newly onboarded
 * and existing admins see the same scope of the Training Leader role.
 */
export default function TrainingLeaderGuide({ locale, placement }: Props) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const isOnboarding = placement === "onboarding";

  return (
    <section
      id="training-leader-info"
      aria-labelledby="training-leader-guide-heading"
      className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-800">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-teal-700">
            {isOnboarding ? t("trainingLeaderGuide.optional") : t("trainingLeaderGuide.manageEyebrow")}
          </p>
          <h2 id="training-leader-guide-heading" className="mt-1 text-base font-black text-slate-950">
            {t("trainingLeaderGuide.title")}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {isOnboarding ? t("trainingLeaderGuide.onboardingIntro") : t("trainingLeaderGuide.membersIntro")}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex gap-2.5 rounded-xl bg-slate-50 p-3">
          <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-black text-slate-950">{t("trainingLeaderGuide.canTitle")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{t("trainingLeaderGuide.canText")}</p>
          </div>
        </div>
        <div className="flex gap-2.5 rounded-xl bg-slate-50 p-3">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-black text-slate-950">{t("trainingLeaderGuide.cannotTitle")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">{t("trainingLeaderGuide.cannotText")}</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {isOnboarding ? t("trainingLeaderGuide.onboardingHint") : t("trainingLeaderGuide.membersHint")}
      </p>
      {isOnboarding ? (
        <Link
          href="/admin/members#training-leader-info"
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
        >
          {t("trainingLeaderGuide.goToMembers")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <a
          href="#club-member-list"
          className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-teal-800 underline underline-offset-4"
        >
          {t("trainingLeaderGuide.findMembers")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
