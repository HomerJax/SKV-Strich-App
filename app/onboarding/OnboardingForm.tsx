"use client";

import { useActionState, useMemo, useState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

type OnboardingFormProps = {
  initialNext?: string;
  inviteFlow?: boolean;
};

const INITIAL_STATE: OnboardingState = {
  error: "",
};

export default function OnboardingForm({
  initialNext = "",
  inviteFlow = false,
}: OnboardingFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [intention, setIntention] = useState<"create-team" | "wait-for-invite">(
    inviteFlow ? "wait-for-invite" : "create-team"
  );
  const [clubName, setClubName] = useState("");
  const [hasEditedSinceSubmit, setHasEditedSinceSubmit] = useState(false);

  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    INITIAL_STATE
  );

  const errorMessage = useMemo(() => {
    return hasEditedSinceSubmit ? "" : state.error;
  }, [hasEditedSinceSubmit, state.error]);

  const showClubName = !inviteFlow && intention === "create-team";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-3xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Profil vervollständigen
          </h1>

          {inviteFlow ? (
            <p className="mt-2 text-sm text-slate-600">
              Du bist fast fertig. Ergänze kurz dein Profil, dann trittst du dem
              Team direkt bei.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">
              Ergänze kurz dein Profil und entscheide, wie du mit STRIKR starten
              möchtest.
            </p>
          )}
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <form
          action={formAction}
          onSubmit={() => setHasEditedSinceSubmit(false)}
          className="space-y-5"
        >
          <input type="hidden" name="next" value={initialNext} />
          {inviteFlow ? (
            <input type="hidden" name="intention" value="wait-for-invite" />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Vorname
              </label>
              <input
                name="firstName"
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
                name="lastName"
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

          {!inviteFlow ? (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-800">
                Wie möchtest du starten?
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="intention"
                  value="create-team"
                  checked={intention === "create-team"}
                  onChange={() => {
                    setIntention("create-team");
                    setHasEditedSinceSubmit(true);
                  }}
                  disabled={isPending}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Ich erstelle einen neuen Club
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Du legst direkt dein eigenes Team an und startest als Admin.
                  </div>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50">
                <input
                  type="radio"
                  name="intention"
                  value="wait-for-invite"
                  checked={intention === "wait-for-invite"}
                  onChange={() => {
                    setIntention("wait-for-invite");
                    setHasEditedSinceSubmit(true);
                  }}
                  disabled={isPending}
                  className="mt-1"
                />
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Ich warte auf eine Einladung
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    Dein Profil wird angelegt, damit du später einem Team
                    beitreten kannst.
                  </div>
                </div>
              </label>
            </div>
          ) : null}

          {showClubName ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-800">
                Clubname
              </label>
              <input
                name="clubName"
                type="text"
                value={clubName}
                onChange={(event) => {
                  setClubName(event.target.value);
                  setHasEditedSinceSubmit(true);
                }}
                required
                disabled={isPending}
                placeholder="z. B. FC STRIKR Mittwoch"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-slate-400"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending
              ? "Wird gespeichert..."
              : inviteFlow
                ? "Profil speichern und Team beitreten"
                : intention === "create-team"
                  ? "Profil speichern und Club erstellen"
                  : "Profil speichern"}
          </button>
        </form>
      </div>
    </main>
  );
}