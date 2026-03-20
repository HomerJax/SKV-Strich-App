"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type InviteSignupFormProps = {
  token: string;
  clubName: string;
};

export default function InviteSignupForm({
  token,
  clubName,
}: InviteSignupFormProps) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail || !password) {
      setErrorText("Bitte fülle Name, E-Mail und Passwort aus.");
      return;
    }

    if (password.length < 6) {
      setErrorText("Das Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");
    setSuccessText("");

    try {
      let isAuthenticated = false;

      const signUpResult = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            full_name: trimmedName,
          },
        },
      });

      if (signUpResult.error) {
        const message = signUpResult.error.message.toLowerCase();

        const looksLikeExistingUser =
          message.includes("already registered") ||
          message.includes("already been registered") ||
          message.includes("user already registered");

        if (!looksLikeExistingUser) {
          throw signUpResult.error;
        }

        const signInResult = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInResult.error) {
          throw new Error(
            "Diese E-Mail existiert bereits. Bitte nutze das richtige Passwort oder verwende eine andere E-Mail."
          );
        }

        isAuthenticated = true;
      } else {
        if (signUpResult.data.session) {
          isAuthenticated = true;
        } else {
          const signInResult = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });

          if (signInResult.error) {
            throw new Error(
              "Registrierung wurde angelegt, aber kein direkter Login war möglich. Bitte prüfe in Supabase, ob Email Confirmation deaktiviert ist."
            );
          }

          isAuthenticated = true;
        }
      }

      if (!isAuthenticated) {
        throw new Error("Login nach der Registrierung war nicht möglich.");
      }

      const { error: acceptError } = await supabase.rpc(
        "accept_invite_for_current_user",
        {
          p_token: token,
          p_player_name: trimmedName,
        }
      );

      if (acceptError) {
        const message = acceptError.message || "";

        if (message.includes("INVITE_ALREADY_ACCEPTED")) {
          throw new Error(
            "Diese Einladung wurde bereits verwendet. Bitte frage deinen Admin nach einem neuen Link."
          );
        }

        if (message.includes("INVITE_EXPIRED")) {
          throw new Error(
            "Diese Einladung ist abgelaufen. Bitte frage deinen Admin nach einem neuen Link."
          );
        }

        if (message.includes("INVITE_NOT_FOUND")) {
          throw new Error("Die Einladung wurde nicht gefunden.");
        }

        if (message.includes("USER_ALREADY_HAS_CLUB")) {
          throw new Error(
            "Dieser Account ist bereits einem Club zugeordnet und kann diese Einladung nicht mehr annehmen."
          );
        }

        if (message.includes("USER_ALREADY_HAS_PLAYER")) {
          throw new Error(
            "Zu diesem Account existiert bereits ein Spielerprofil."
          );
        }

        if (message.includes("PLAYER_NAME_REQUIRED")) {
          throw new Error("Bitte gib deinen Namen an.");
        }

        if (message.includes("NOT_AUTHENTICATED")) {
          throw new Error(
            "Du bist nach der Registrierung nicht eingeloggt. Bitte versuche es erneut."
          );
        }

        throw new Error("Die Einladung konnte nicht abgeschlossen werden.");
      }

      setSuccessText(
        `Willkommen bei ${clubName}. Dein Spielerprofil wurde angelegt.`
      );

      router.push("/sessions");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Die Registrierung konnte nicht abgeschlossen werden.";

      setErrorText(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Account erstellen
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Du wirst direkt als Spieler für <strong>{clubName}</strong> angelegt.
        </p>
      </div>

      {errorText ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorText}
        </div>
      ) : null}

      {successText ? (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successText}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Max Mustermann"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            E-Mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="max@mail.de"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Passwort
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mindestens 6 Zeichen"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Registrierung läuft..." : "Registrieren"}
        </button>
      </form>
    </div>
  );
}