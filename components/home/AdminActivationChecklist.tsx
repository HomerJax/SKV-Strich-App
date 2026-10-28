import Link from "next/link";
import { ArrowRight, Check, Circle, Sparkles } from "lucide-react";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";

type Props = {
  locale: AppLocale;
  teamInvited: boolean;
  trainingCreated: boolean;
  firstTrainingCompleted: boolean;
  hasTrainingLeader: boolean;
  trainingHref: string;
};

export default function AdminActivationChecklist({
  locale, teamInvited, trainingCreated, firstTrainingCompleted, hasTrainingLeader, trainingHref,
}: Props) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const steps = [
    { key: "club", title: t("activation.clubTitle"), hint: t("activation.clubHint"), done: true, href: "/admin", cta: t("activation.clubCta") },
    { key: "invite", title: t("activation.inviteTitle"), hint: t("activation.inviteHint"), done: teamInvited, href: "/admin/members", cta: t("activation.inviteCta") },
    { key: "training", title: t("activation.trainingTitle"), hint: t("activation.trainingHint"), done: trainingCreated, href: "/sessions/new", cta: t("activation.trainingCta") },
    { key: "finish", title: t("activation.finishTitle"), hint: t("activation.finishHint"), done: firstTrainingCompleted, href: trainingHref, cta: t("activation.finishCta") },
  ];
  const done = steps.filter(step => step.done).length;
  const nextStep = steps.find(step => !step.done);

  return (
    <section aria-labelledby="admin-activation-heading" className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[.17em] text-teal-700">
            <Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            {t("activation.eyebrow")}
          </div>
          <h2 id="admin-activation-heading" className="mt-1 text-lg font-black text-slate-950">
            {t("activation.heading")}
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("activation.subheading")}</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black tabular-nums text-slate-700">
          {done}/{steps.length}
        </span>
      </div>

      <div role="progressbar" aria-label={t("activation.heading")} aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 grid gap-2">
        {steps.map((step, index) => (
          <li key={step.key} className={`flex items-start gap-3 rounded-xl border p-3 ${step.done ? "border-slate-100 bg-slate-50/60" : nextStep?.key === step.key ? "border-teal-200 bg-teal-50/60" : "border-slate-100 bg-white"}`}>
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${step.done ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"}`}>
              {step.done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900">{index + 1}. {step.title}</div>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">{step.hint}</p>
              {!step.done && nextStep?.key === step.key ? (
                <Link href={step.href} className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white">
                  {step.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-900">{t("activation.leaderOptional")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{hasTrainingLeader ? t("activation.leaderDone") : t("activation.leaderHint")}</p>
          <Link href="/admin/members#training-leader-info" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-teal-800 underline underline-offset-2">
            {t("activation.leaderCta")} <ArrowRight className="h-3 w-3" aria-hidden="true"/>
          </Link>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-black text-slate-900">{t("activation.planTitle")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("activation.planHint")}</p>
          <Link href="/pro#feature-matrix" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-teal-800 underline underline-offset-2">
            {t("activation.planCta")} <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
