"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type PlayerRow = {
  id: number;
  club_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  preferred_position: "attack" | "defense" | "goalkeeper" | null;
  category_key: string | null;
  strength: number | null;
  is_active: boolean | null;
  is_guest: boolean | null;
};

type ClubSettingsRow = {
  use_strength: boolean | null;
  strength_default: number | null;
  use_categories: boolean | null;
  position_label: string | null;
  attack_label: string | null;
  defense_label: string | null;
  goalkeeper_label: string | null;
};

type ClubCategoryRow = {
  key: string;
  label: string;
  sort_order: number | null;
  is_active: boolean | null;
};

function readCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function boolToYesNo(value: boolean | null | undefined) {
  return value ? "1" : "0";
}

function positionLabel(
  position: PlayerRow["preferred_position"],
  settings: ClubSettingsRow | null
) {
  if (position === "attack") return settings?.attack_label || "Angriff";
  if (position === "defense") return settings?.defense_label || "Abwehr";
  if (position === "goalkeeper") return settings?.goalkeeper_label || "Torwart";
  return "Offen";
}

function getSearchParam(name: string) {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get(name) ?? "";
}

export default function AdminPlayersPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flashError, setFlashError] = useState("");
  const [flashMessage, setFlashMessage] = useState("");

  const [settings, setSettings] = useState<ClubSettingsRow | null>(null);
  const [categories, setCategories] = useState<ClubCategoryRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setErrorMessage(null);
      setFlashError(getSearchParam("error"));
      setFlashMessage(getSearchParam("message"));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;

      if (!user) {
        router.replace("/login");
        router.refresh();
        return;
      }

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id);

      if (!isMounted) return;

      if (membershipsError) {
        setErrorMessage(membershipsError.message);
        setIsLoading(false);
        return;
      }

      const memberships = (membershipsData ?? []) as MembershipRow[];

      if (memberships.length === 0) {
        router.replace("/waiting-for-invite");
        router.refresh();
        return;
      }

      const activeClubIdFromCookie = readCookie("active_club_id");
      const validClubIds = new Set(memberships.map((membership) => membership.club_id));

      const activeClubId =
        memberships.length === 1
          ? memberships[0].club_id
          : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
            ? activeClubIdFromCookie
            : null;

      if (!activeClubId) {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      if (memberships.length === 1) {
        writeCookie("active_club_id", activeClubId);
      }

      const activeMembership =
        memberships.find((membership) => membership.club_id === activeClubId) ?? null;

      if (!activeMembership || activeMembership.role !== "admin") {
        router.replace("/admin");
        router.refresh();
        return;
      }

      const [
        { data: settingsData, error: settingsError },
        { data: categoriesData, error: categoriesError },
        { data: playersData, error: playersError },
      ] = await Promise.all([
        supabase
          .from("club_settings")
          .select(
            "use_strength, strength_default, use_categories, position_label, attack_label, defense_label, goalkeeper_label"
          )
          .eq("club_id", activeClubId)
          .maybeSingle(),
        supabase
          .from("club_categories")
          .select("key, label, sort_order, is_active")
          .eq("club_id", activeClubId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("players")
          .select(
            "id, club_id, name, first_name, last_name, nickname, email, preferred_position, category_key, strength, is_active, is_guest"
          )
          .eq("club_id", activeClubId)
          .order("is_guest", { ascending: true })
          .order("last_name", { ascending: true, nullsFirst: false })
          .order("first_name", { ascending: true, nullsFirst: false })
          .order("name", { ascending: true }),
      ]);

      if (!isMounted) return;

      if (settingsError || categoriesError || playersError) {
        setErrorMessage(
          settingsError?.message ||
            categoriesError?.message ||
            playersError?.message ||
            "Daten konnten nicht geladen werden."
        );
        setIsLoading(false);
        return;
      }

      setSettings((settingsData as ClubSettingsRow | null) ?? null);
      setCategories((categoriesData ?? []) as ClubCategoryRow[]);
      setPlayers((playersData ?? []) as PlayerRow[]);
      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Spieler werden geladen...
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {errorMessage}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
      <div className="mb-4 flex items-center">
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück zum Adminbereich
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
          Spieler verwalten
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Bearbeite Namen, E-Mail, Position, Kategorie und Status deiner Spieler.
        </p>
      </div>

      {flashMessage ? (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {flashMessage}
        </div>
      ) : null}

      {flashError ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {flashError}
        </div>
      ) : null}

      <div className="space-y-4">
        {players.map((player) => (
          <form
            key={player.id}
            method="post"
            action="/admin/players/update"
            className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"
          >
            <input type="hidden" name="player_id" value={String(player.id)} />

            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-neutral-900">
                  {player.nickname?.trim()
                    ? player.nickname
                    : [player.first_name, player.last_name].filter(Boolean).join(" ").trim() ||
                      player.name ||
                      `Spieler #${player.id}`}
                </div>
                <div className="mt-1 text-sm text-neutral-500">
                  {player.is_guest ? "Gastspieler" : "Normaler Spieler"} ·{" "}
                  {player.is_active ? "Aktiv" : "Inaktiv"} ·{" "}
                  {positionLabel(player.preferred_position, settings)}
                </div>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
              >
                Speichern
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor={`first_name_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Vorname
                </label>
                <input
                  id={`first_name_${player.id}`}
                  name="first_name"
                  defaultValue={player.first_name ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`last_name_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Nachname
                </label>
                <input
                  id={`last_name_${player.id}`}
                  name="last_name"
                  defaultValue={player.last_name ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`nickname_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Spitzname
                </label>
                <input
                  id={`nickname_${player.id}`}
                  name="nickname"
                  defaultValue={player.nickname ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`email_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  E-Mail
                </label>
                <input
                  id={`email_${player.id}`}
                  name="email"
                  type="email"
                  defaultValue={player.email ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                />
              </div>

              <div>
                <label
                  htmlFor={`preferred_position_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  {settings?.position_label || "Position"}
                </label>
                <select
                  id={`preferred_position_${player.id}`}
                  name="preferred_position"
                  defaultValue={player.preferred_position ?? ""}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                >
                  <option value="">Offen</option>
                  <option value="attack">
                    {settings?.attack_label || "Angriff"}
                  </option>
                  <option value="defense">
                    {settings?.defense_label || "Abwehr"}
                  </option>
                  <option value="goalkeeper">
                    {settings?.goalkeeper_label || "Torwart"}
                  </option>
                </select>
              </div>

              {settings?.use_categories ? (
                <div>
                  <label
                    htmlFor={`category_key_${player.id}`}
                    className="mb-1.5 block text-sm font-medium text-neutral-900"
                  >
                    Kategorie
                  </label>
                  <select
                    id={`category_key_${player.id}`}
                    name="category_key"
                    defaultValue={player.category_key ?? ""}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                  >
                    <option value="">Keine Kategorie</option>
                    {categories.map((category) => (
                      <option key={category.key} value={category.key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {settings?.use_strength ? (
                <div>
                  <label
                    htmlFor={`strength_${player.id}`}
                    className="mb-1.5 block text-sm font-medium text-neutral-900"
                  >
                    Stärke
                  </label>
                  <select
                    id={`strength_${player.id}`}
                    name="strength"
                    defaultValue={String(
                      player.strength ?? settings?.strength_default ?? 3
                    )}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor={`is_active_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Aktiv
                </label>
                <select
                  id={`is_active_${player.id}`}
                  name="is_active"
                  defaultValue={boolToYesNo(player.is_active)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                >
                  <option value="1">Ja</option>
                  <option value="0">Nein</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={`is_guest_${player.id}`}
                  className="mb-1.5 block text-sm font-medium text-neutral-900"
                >
                  Gastspieler
                </label>
                <select
                  id={`is_guest_${player.id}`}
                  name="is_guest"
                  defaultValue={boolToYesNo(player.is_guest)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none transition focus:border-neutral-900"
                >
                  <option value="0">Nein</option>
                  <option value="1">Ja</option>
                </select>
              </div>
            </div>
          </form>
        ))}
      </div>
    </main>
  );
}