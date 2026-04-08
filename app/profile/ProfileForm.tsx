"use client";

import { useActionState, useMemo, useState } from "react";
import type { AuthPlayer } from "@/lib/auth/context";
import { updateProfileAction, type ProfileState } from "./actions";

type ProfileFormProps = {
  player: AuthPlayer | null;
  email: string;
  activeClubName: string | null;
  activeClubId: string | null;
};

const INITIAL_STATE: ProfileState = {
  error: "",
  success: "",
};

export default function ProfileForm({
  player,
  email,
  activeClubName,
  activeClubId,
}: ProfileFormProps) {
  const [firstName, setFirstName] = useState(player?.first_name ?? "");
  const [lastName, setLastName] = useState(player?.last_name ?? "");
  const [nickname, setNickname] = useState(player?.nickname ?? "");
  const [userEmail, setUserEmail] = useState(email);
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    INITIAL_STATE
  );

  const activeError = hasEditedSinceSubmit ? "" : state.error;
  const activeSuccess = hasEditedSinceSubmit ? "" : state.success;

  const clubLabel = useMemo(() => {
    if (!activeClubName && !activeClubId) {
      return "Kein aktiver Club";
    }

    if (activeClubName && activeClubId) {
      return `${activeClubName}`;
    }

    return activeClubName || activeClubId || "Kein aktiver Club";
  }, [activeClubName, activeClubId]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 md:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Profil
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Verwalte deine persönlichen Daten.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <div className="text-sm text-slate-500">Aktiver Club</div>
          <div className="mt-1 text-base font-semibold text-slate-900">
            {clubLabel}
          </div>
          {activeClubId ? (
            <div className="mt-1 text-xs text-slate-500">
              Club-ID: {activeClubId}
            </div>
          ) : null}
        </div>

        {activeError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {activeError}
          </div>
        ) : null}

        {activeSuccess ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {activeSuccess}
          </div>
        ) : null}

        <form
          action={formAction}
          onSubmit={() => setHasEditedSinceSubmit(false)}
          className="grid gap-4"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Vorname
              </label>
              <input
                name="first_name"
                type="text"
                value={firstName}
                onChange={(event) => {
                  setFirstName(event.target.value);
                  setHasEditedSinceSubmit(true);
                }}
                required
                disabled={isPending}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Nachname
              </label>
              <input
                name="last_name"
                type="text"
                value={lastName}
                onChange={(event) => {
                  setLastName(event.target.value);
                  setHasEditedSinceSubmit(true);
                }}
                required
                disabled={isPending}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Spitzname
            </label>
            <input
              name="nickname"
              type="text"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setHasEditedSinceSubmit(true);
              }}
              disabled={isPending}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              E-Mail
            </label>
            <input
              name="email"
              type="email"
              value={userEmail}
              onChange={(event) => {
                setUserEmail(event.target.value);
                setHasEditedSinceSubmit(true);
              }}
              required
              disabled={isPending}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? "Speichern..." : "Profil speichern"}
          </button>
        </form>
      </section>
    </div>
  );
}