"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export type PowerClubSwitcherClub = {
  id: string;
  name: string;
  logoSrc: string | null;
};

type PowerClubSwitcherProps = {
  isPowerUser: boolean;
  activeClubId: string | null;
  activeClubName: string | null;
  activeLogoSrc: string | null;
  primaryColor: string;
  clubs: PowerClubSwitcherClub[];
};

export default function PowerClubSwitcher({
  isPowerUser,
  activeClubId,
  activeClubName,
  activeLogoSrc,
  primaryColor,
  clubs,
}: PowerClubSwitcherProps) {
  const router = useRouter();
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

  const filteredClubs = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) return clubs;

    return clubs.filter((club) => club.name.toLowerCase().includes(normalized));
  }, [clubs, query]);

  async function handleSelectClub(clubId: string) {
    if (!isPowerUser) return;
    if (!clubId) return;
    if (clubId === activeClubId) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/power-user/switch-club", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clubId }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;

          throw new Error(body?.error || "Club-Wechsel fehlgeschlagen");
        }

        setOpen(false);
        router.push("/");
        router.refresh();
      } catch (error) {
        console.error(error);
        window.alert("Club-Wechsel fehlgeschlagen.");
      }
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={
          isPowerUser
            ? "Aktiven Verein wechseln"
            : activeClubName ?? "Aktiver Verein"
        }
        aria-haspopup={isPowerUser ? "menu" : undefined}
        aria-expanded={isPowerUser ? open : undefined}
        onClick={() => {
          if (!isPowerUser) return;
          setOpen((prev) => !prev);
        }}
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-white shadow-md transition ${
          isPowerUser ? "hover:scale-[1.02] active:scale-[0.98]" : ""
        }`}
        style={{ borderColor: `${primaryColor}33` }}
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

      {isPowerUser && open ? (
        <div
          className="absolute right-0 top-14 z-50 w-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          role="menu"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              PowerUser
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              Verein wechseln
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Aktuell: {activeClubName ?? "Kein Verein gewählt"}
            </div>
          </div>

          <div className="border-b border-slate-100 p-3">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Verein suchen..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {filteredClubs.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-slate-500">
                Kein Verein gefunden.
              </div>
            ) : (
              filteredClubs.map((club) => {
                const isActive = club.id === activeClubId;

                return (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => handleSelectClub(club.id)}
                    disabled={pending}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                      isActive
                        ? "bg-slate-100"
                        : "hover:bg-slate-50"
                    } ${pending ? "opacity-60" : ""}`}
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
                        {isActive ? "Aktiver Verein" : "Als Verein öffnen"}
                      </div>
                    </div>

                    {isActive ? (
                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        aktiv
                      </span>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}