"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

export type ClubSwitcherClub = {
  id: string;
  name: string;
  logoSrc: string | null;
};

type ClubSwitcherProps = {
  isPowerUser: boolean;
  activeClubId: string | null;
  activeClubName: string | null;
  activeLogoSrc: string | null;
  primaryColor: string;
  clubs: ClubSwitcherClub[];
  canCreateClub?: boolean;
  createClubHref?: string;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function normalizeVisibleClubName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function ClubSwitcher({
  isPowerUser,
  activeClubId,
  activeClubName,
  activeLogoSrc,
  primaryColor,
  clubs,
  canCreateClub = false,
  createClubHref = "/create-club",
}: ClubSwitcherProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const normalizedClubs = useMemo(() => {
    const byId = new Map<string, ClubSwitcherClub>();

    for (const club of clubs) {
      const existing = byId.get(club.id);

      const isActiveClub = activeClubId !== null && club.id === activeClubId;
      const preferredName =
        isActiveClub && activeClubName ? activeClubName : club.name;
      const preferredLogo =
        isActiveClub && activeLogoSrc !== undefined ? activeLogoSrc : club.logoSrc;

      const nextValue: ClubSwitcherClub = {
        id: club.id,
        name: preferredName,
        logoSrc: preferredLogo ?? null,
      };

      if (!existing) {
        byId.set(club.id, nextValue);
        continue;
      }

      const existingLooksWorse =
        normalizeText(existing.name) !== normalizeText(preferredName) &&
        isActiveClub;

      if (existingLooksWorse) {
        byId.set(club.id, nextValue);
        continue;
      }

      const existingHasNoLogo = !existing.logoSrc && !!nextValue.logoSrc;
      if (existingHasNoLogo) {
        byId.set(club.id, {
          ...existing,
          logoSrc: nextValue.logoSrc,
        });
      }
    }

    const uniqueByVisibleName = new Map<string, ClubSwitcherClub>();

    for (const club of byId.values()) {
      const key = normalizeVisibleClubName(club.name);
      const existing = uniqueByVisibleName.get(key);
      const isActiveClub = activeClubId !== null && club.id === activeClubId;

      if (!existing) {
        uniqueByVisibleName.set(key, club);
        continue;
      }

      const existingIsActive =
        activeClubId !== null && existing.id === activeClubId;

      if (isActiveClub && !existingIsActive) {
        uniqueByVisibleName.set(key, club);
        continue;
      }

      if (!existing.logoSrc && club.logoSrc) {
        uniqueByVisibleName.set(key, {
          ...existing,
          logoSrc: club.logoSrc,
        });
      }
    }

    return Array.from(uniqueByVisibleName.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "de", { sensitivity: "base" })
    );
  }, [clubs, activeClubId, activeClubName, activeLogoSrc]);

  const visibleOtherClubs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const withoutActive = normalizedClubs.filter(
      (club) => club.id !== activeClubId
    );

    if (!normalizedQuery) {
      return withoutActive;
    }

    return withoutActive.filter((club) =>
      club.name.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedClubs, activeClubId, query]);

  function handleSelectClub(clubId: string) {
    if (!clubId) return;

    if (clubId === activeClubId) {
      setOpen(false);
      return;
    }

    startTransition(() => {
      setOpen(false);
      window.location.assign(
        `/api/select-club?clubId=${encodeURIComponent(clubId)}`
      );
    });
  }

  const shouldShowSearch = normalizedClubs.length > 1;
  const titleLabel =
    normalizedClubs.length > 1 ? "Verein wechseln" : "Aktiver Verein";

  const activeClub = normalizedClubs.find((club) => club.id === activeClubId) ?? null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Vereinsauswahl öffnen"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-md transition hover:scale-[1.02] active:scale-[0.98] ${
          pending ? "opacity-70" : ""
        }`}
        style={{ borderColor: `${primaryColor}33` }}
        disabled={pending}
      >
        {activeLogoSrc ? (
          <Image
            src={activeLogoSrc}
            alt={activeClubName ?? "Club Logo"}
            fill
            sizes="48px"
            className="object-contain p-1.5"
          />
        ) : (
          <Image
            src="/icon-dark.png"
            alt="strikr"
            width={28}
            height={28}
            className="opacity-70"
          />
        )}

        {isPowerUser ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white shadow">
            PU
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-14 z-[300] w-[min(320px,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="menu"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {normalizedClubs.length > 1 ? "Vereine" : "Verein"}
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {titleLabel}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Aktuell: {activeClubName ?? "Kein Verein gewählt"}
            </div>
            {isPowerUser ? (
              <div className="mt-2 text-[11px] text-violet-700">
                Power User: Du siehst alle Vereine.
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-slate-500">
                Du siehst nur Vereine, in denen du eine Rolle hast.
              </div>
            )}
          </div>

          {shouldShowSearch ? (
            <div className="border-b border-slate-100 p-3">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Verein suchen..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
              />
            </div>
          ) : null}

          <div className="max-h-[320px] overflow-y-auto p-2">
            {activeClub ? (
              <div className="mb-2">
                <button
                  type="button"
                  onClick={() => handleSelectClub(activeClub.id)}
                  disabled={pending}
                  className={`flex w-full items-center gap-3 rounded-xl bg-slate-100 px-3 py-2 text-left transition ${
                    pending ? "opacity-60" : ""
                  }`}
                  role="menuitem"
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {activeClub.logoSrc ? (
                      <Image
                        src={activeClub.logoSrc}
                        alt={activeClub.name}
                        fill
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <Image
                        src="/icon-dark.png"
                        alt="strikr"
                        width={20}
                        height={20}
                        className="opacity-60"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {activeClub.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Aktiver Verein
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                    aktiv
                  </span>
                </button>
              </div>
            ) : null}

            {visibleOtherClubs.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-slate-500">
                {normalizedClubs.length <= 1
                  ? "Kein weiterer Verein verfügbar."
                  : "Kein Verein gefunden."}
              </div>
            ) : (
              visibleOtherClubs.map((club) => (
                <button
                  key={club.id}
                  type="button"
                  onClick={() => handleSelectClub(club.id)}
                  disabled={pending}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 ${
                    pending ? "opacity-60" : ""
                  }`}
                  role="menuitem"
                >
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                    {club.logoSrc ? (
                      <Image
                        src={club.logoSrc}
                        alt={club.name}
                        fill
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    ) : (
                      <Image
                        src="/icon-dark.png"
                        alt="strikr"
                        width={20}
                        height={20}
                        className="opacity-60"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {club.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Als Verein öffnen
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {canCreateClub ? (
            <div className="border-t border-slate-100 p-2">
              <Link
                href={createClubHref}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-slate-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-lg font-semibold text-slate-700">
                  +
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    Club erstellen
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Neuen Verein anlegen und direkt öffnen
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}