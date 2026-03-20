"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Membership = {
  user_id: string;
  club_id: string;
  role: string;
};

type PreferredPosition = "defense" | "attack" | "goalkeeper" | null;
type AgeGroup = "AH" | "Ü32" | null;

function clean(value: string) {
  return value.trim();
}

function buildLegacyName({
  firstName,
  lastName,
  nickname,
}: {
  firstName: string;
  lastName: string;
  nickname: string;
}) {
  if (nickname) return nickname;

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) return fullName;

  return "";
}

export default function NewPlayerPage() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [position, setPosition] = useState<PreferredPosition>("attack");
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("AH");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const cleanFirstName = clean(firstName);
    const cleanLastName = clean(lastName);
    const cleanNickname = clean(nickname);

    if (!cleanNickname && !cleanFirstName && !cleanLastName) {
      setErrorMsg("Bitte mindestens Spitzname oder Vorname/Nachname eingeben.");
      return;
    }

    const legacyName = buildLegacyName({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      nickname: cleanNickname,
    });

    if (!legacyName) {
      setErrorMsg("Der Spielername konnte nicht erstellt werden.");
      return;
    }

    setLoading(true);

    const { data: membershipData, error: membershipError } = await supabase.rpc(
      "get_my_membership"
    );

    if (membershipError) {
      setLoading(false);
      setErrorMsg(
        "Membership konnte nicht geladen werden: " + membershipError.message
      );
      return;
    }

    const membership = (membershipData?.[0] as Membership | undefined) ?? null;
    const clubId = membership?.club_id ?? null;

    if (!clubId) {
      setLoading(false);
      setErrorMsg("Kein Club für den aktuellen User gefunden.");
      return;
    }

    const { error } = await supabase.from("players").insert({
      name: legacyName,
      first_name: cleanFirstName || null,
      last_name: cleanLastName || null,
      nickname: cleanNickname || null,
      age_group: ageGroup,
      preferred_position: position,
      club_id: clubId,
      is_active: true,
      strength: null,
    });

    setLoading(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    router.push("/players");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-6">
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => router.push("/players")}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          ← Zurück zur Übersicht
        </button>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Neuen Spieler anlegen
        </h1>
        <p className="text-sm text-slate-500">
          Anzeige in der App: Spitzname, sonst Vorname + Nachname.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Vorname
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Nachname
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Spitzname (optional)
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Altersgruppe
            </label>
            <select
              value={ageGroup ?? ""}
              onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="AH">AH</option>
              <option value="Ü32">Ü32</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">
              Position
            </label>
            <select
              value={position ?? ""}
              onChange={(e) =>
                setPosition(e.target.value as PreferredPosition)
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-400"
            >
              <option value="defense">Hinten (Abwehr)</option>
              <option value="attack">Vorne (Angriff)</option>
              <option value="goalkeeper">Torwart</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Vorschau:</span>{" "}
          {clean(nickname) ||
            [clean(firstName), clean(lastName)].filter(Boolean).join(" ") ||
            "Noch kein Anzeigename"}
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Speichere..." : "Spieler anlegen"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/players")}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}