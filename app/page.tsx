import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import WhatsNewModal from "@/components/WhatsNewModal";

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
  primary_color: string | null;
};

type SetupState = {
  playersCount: number;
  invitesCount: number;
  sessionsCount: number;
  seasonsCount: number;
};

const COLOR_MAP: Record<string, string> = {
  black: "#020617",
  blue: "#1d4ed8",
  red: "#dc2626",
  green: "#16a34a",
};

function StepCard({
  done,
  title,
  text,
  href,
  cta,
}: {
  done: boolean;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-950">{title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
        </div>

        <div
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold ${
            done
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {done ? "Erledigt" : "Offen"}
        </div>
      </div>

      <div className="mt-4">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { clubId, memberships } = await requireClub();
  const supabase = await createClient();

  const [
    { data: clubData },
    { count: playersCount },
    { count: invitesCount },
    { count: sessionsCount },
    { count: seasonsCount },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, logo_path, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_guest", false),
    supabase
      .from("club_invites")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true),
    supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("seasons")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId),
  ]);

  const club = (clubData ?? null) as ClubRow | null;
  const clubName = club?.display_name?.trim() || "Dein Team";
  const hasMultipleClubs = memberships.length > 1;

  const selectedColor = club?.primary_color ?? "black";
  const primaryColor = COLOR_MAP[selectedColor] ?? COLOR_MAP.black;

  const heroGradient =
    selectedColor === "black"
      ? "linear-gradient(135deg, #020617 0%, #111827 55%, #374151 100%)"
      : `linear-gradient(135deg, ${primaryColor} 0%, #0f172a 78%)`;

  const showGettingStarted =
    (playersCount ?? 0) === 0 ||
    (sessionsCount ?? 0) === 0 ||
    (seasonsCount ?? 0) === 0;

  let clubLogoUrl: string | null = null;

  if (club?.logo_path) {
    const { data } = supabase.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path);

    clubLogoUrl = data?.publicUrl ?? null;
  }

  const feedbackHref = "mailto:mb1607@gmx.de?subject=strikr%20Feedback";

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <WhatsNewModal version="v0.2" />

      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div
          className="rounded-[24px] border text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]"
          style={{
            borderColor: `${primaryColor}22`,
            background: heroGradient,
          }}
        >
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-5 py-7 text-center">
            <div className="flex items-center gap-3 rounded-full bg-white/10 px-4 py-2">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white p-1.5">
                {clubLogoUrl ? (
                  <Image
                    src={clubLogoUrl}
                    alt={`${clubName} Logo`}
                    width={48}
                    height={48}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <Image
                    src="/icon-dark.png"
                    alt="strikr"
                    width={40}
                    height={40}
                  />
                )}
              </div>

              <span className="text-sm font-semibold">{clubName}</span>
            </div>

            <h1 className="text-xl font-extrabold">
              strikr – Das System für euer Training.
            </h1>

            <p className="text-sm text-white/80">
              faire Teams – effektives Training – echte Stats
            </p>
          </div>
        </div>

        <Link
          href="/about"
          className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="text-sm font-semibold text-slate-500">
            Über Strikr
          </div>

          <h2 className="mt-1 text-xl font-bold text-slate-950">
            Vom Bierdeckel zur Web-App 🍻⚽
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Angefangen mit Strichen auf Papier, dann Excel und irgendwann die
            Frage: Warum sind Teams eigentlich immer unfair?
            <br />
            Daraus entstand Strikr – mit dem Ziel, Training besser, fairer und
            spannender zu machen.
          </p>

          <div className="mt-3 text-sm font-semibold text-slate-900">
            Geschichte lesen →
          </div>
        </Link>

        {showGettingStarted ? (
          <section className="flex flex-col gap-3">
            <StepCard
              done={(playersCount ?? 0) > 0}
              title="Spieler anlegen"
              text="Grundlage für alles"
              href="/admin/players"
              cta="Spieler verwalten"
            />

            <StepCard
              done={(sessionsCount ?? 0) > 0}
              title="Training starten"
              text="Erstes Training erstellen"
              href="/sessions/new"
              cta="Training starten"
            />

            <StepCard
              done={(invitesCount ?? 0) > 0}
              title="Mitglieder einladen"
              text="Team reinholen"
              href="/admin/invites"
              cta="Einladen"
            />

            <div className="rounded-[24px] border bg-white p-5">
              <a href={feedbackHref}>Feedback senden</a>
              <br />
              <Link href="/about">Über Strikr ansehen</Link>
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}