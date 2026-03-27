"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type ProfilePasswordFormProps = {
  email: string;
};

type FormState = "idle" | "saving" | "success" | "error";

function getSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase Browser-Konfiguration fehlt.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function validatePassword(password: string) {
  if (password.length < 8) {
    return "Das neue Passwort muss mindestens 8 Zeichen lang sein.";
  }

  const hasUppercase = /[A-ZÄÖÜ]/.test(password);
  const hasLowercase = /[a-zäöüß]/.test(password);
  const hasNumber = /\d/.test(password);

  if (!hasUppercase || !hasLowercase || !hasNumber) {
    return "Bitte nutze mindestens einen Großbuchstaben, einen Kleinbuchstaben und eine Zahl.";
  }

  return null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unbekannter Fehler.";
}

export default function ProfilePasswordForm({
  email,
}: ProfilePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const isSaving = state === "saving";

  const passwordHint = useMemo(() => {
    return "Mindestens 8 Zeichen, mit Groß-/Kleinbuchstaben und Zahl.";
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setState("idle");
    setMessage("");

    try {
      if (!email) {
        throw new Error("Keine E-Mail-Adresse gefunden.");
      }

      if (!currentPassword.trim()) {
        throw new Error("Bitte aktuelles Passwort eingeben.");
      }

      if (!newPassword.trim()) {
        throw new Error("Bitte neues Passwort eingeben.");
      }

      const passwordValidationError = validatePassword(newPassword);
      if (passwordValidationError) {
        throw new Error(passwordValidationError);
      }

      if (newPassword !== newPasswordRepeat) {
        throw new Error("Die neuen Passwörter stimmen nicht überein.");
      }

      if (currentPassword === newPassword) {
        throw new Error("Das neue Passwort muss sich vom aktuellen unterscheiden.");
      }

      setState("saving");

      const supabase = getSupabaseBrowserClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Das aktuelle Passwort ist nicht korrekt.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordRepeat("");
      setState("success");
      setMessage("Passwort erfolgreich geändert.");
    } catch (error) {
      setState("error");
      setMessage(getErrorMessage(error));
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Passwort ändern
      </h2>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        Ändere hier dein Passwort. Danach kannst du das temporäre Vereins-Passwort
        nicht mehr verwenden.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Aktuelles Passwort
          </label>
          <input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div>
          <label
            htmlFor="newPassword"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Neues Passwort
          </label>
          <input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
          <p className="mt-1 text-xs text-slate-500">{passwordHint}</p>
        </div>

        <div>
          <label
            htmlFor="newPasswordRepeat"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Neues Passwort wiederholen
          </label>
          <input
            id="newPasswordRepeat"
            type="password"
            autoComplete="new-password"
            value={newPasswordRepeat}
            onChange={(event) => setNewPasswordRepeat(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        {message ? (
          <div
            className={
              state === "success"
                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                : "rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            }
          >
            {message}
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Speichert..." : "Passwort ändern"}
          </button>
        </div>
      </form>
    </section>
  );
}