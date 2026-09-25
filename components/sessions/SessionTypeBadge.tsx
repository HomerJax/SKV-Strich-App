"use client";

import { useI18n } from "@/components/i18n/I18nProvider";

type SessionType = "training" | "event";

type SessionTypeBadgeProps = {
  type?: SessionType | null;
  className?: string;
};

export default function SessionTypeBadge({
  type = "training",
  className = "",
}: SessionTypeBadgeProps) {
  const isEvent = type === "event";
  const { t } = useI18n();

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-tight",
        isEvent
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "h-1.5 w-1.5 rounded-full",
          isEvent ? "bg-slate-400" : "bg-emerald-500",
        ].join(" ")}
      />
      <span>{isEvent ? t("session.typeEvent") : t("session.typeTraining")}</span>
    </span>
  );
}