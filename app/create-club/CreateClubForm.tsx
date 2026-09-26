"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createClubAction, type CreateClubState } from "./actions";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

const INITIAL_STATE: CreateClubState = {
  error: "",
};

function getErrorMessage(error: string, t: (key: MessageKey) => string) {
  switch (error) {
    case "missing-name": return t("clubCreate.errorName");
    case "name-too-short": return t("clubCreate.errorShort");
    case "not-authenticated": return t("clubCreate.errorAuth");
    case "club-create-failed": return t("clubCreate.errorCreate");
    case "membership-create-failed": return t("clubCreate.errorOwner");
    default: return "";
  }
}

export default function CreateClubForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const [state, formAction, isPending] = useActionState(
    createClubAction,
    INITIAL_STATE
  );

  const activeErrorCode = hasEditedSinceSubmit ? "" : state.error;
  const errorMessage = useMemo(
    () => getErrorMessage(activeErrorCode, t),
    [activeErrorCode, t]
  );

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {t("clubCreate.title")}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("clubCreate.description")}
        </p>
      </div>

      {errorMessage ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <form
        action={formAction}
        onSubmit={() => setHasEditedSinceSubmit(false)}
        className="space-y-4"
      >
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">
            {t("clubCreate.name")}
          </label>
          <input
            name="name"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setHasEditedSinceSubmit(true);
            }}
            required
            maxLength={80}
            placeholder={t("clubCreate.placeholder")}
            disabled={isPending}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? t("clubCreate.creating") : t("clubCreate.create")}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-600">
        <Link href="/" className="font-medium text-slate-900 hover:underline">
          {t("clubCreate.back")}
        </Link>
      </div>
    </div>
  );
}