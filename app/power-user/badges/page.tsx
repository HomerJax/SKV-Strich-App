import Link from "next/link";
import { EyeOff, Layers3, Sparkles, Trophy } from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import { requirePowerUser } from "@/lib/auth/power-user";
import { BADGE_DEFINITIONS } from "@/lib/badges/catalog";
import { getBadgeVisualMeta } from "@/lib/badges/visual-catalog";

export const dynamic = "force-dynamic";

type BadgeSectionKey =
  | "career-appearances"
  | "career-wins"
  | "attendance"
  | "wins"
  | "losses"
  | "special";

const SECTION_ORDER: Array<{
  key: BadgeSectionKey;
  title: string;
  eyebrow: string;
  description: string;
}> = [
  {
    key: "career-appearances",
    title: "Karriere · Einsätze",
    eyebrow: "Karriere",
    description:
      "Die langfristige Teilnahme-Leiter von 10 bis 500 Einsätzen. Hier muss die optische Eskalation besonders klar erkennbar sein.",
  },
  {
    key: "career-wins",
    title: "Karriere · Siege",
    eyebrow: "Karriere",
    description:
      "Karrieresiege als eigene Sieger-Familie mit Pokal-, Stern- und Champion-Elementen – klar getrennt von Einsätzen.",
  },
  {
    key: "attendance",
    title: "Teilnahme & Disziplin",
    eyebrow: "Aktuelle Saison",
    description:
      "Saisonauftakt und Teilnahme-Serien. Je länger die Serie, desto stärker Bewegung, Energie und Auszeichnung.",
  },
  {
    key: "wins",
    title: "Siege & Serien",
    eyebrow: "Aktuelle Saison",
    description:
      "Vom ersten Dreier bis zum Seriensieger. Feuer, Dynamik und Sieger-Aura sollen mit der Schwierigkeit sichtbar zunehmen.",
  },
  {
    key: "losses",
    title: "Pech & Niederlagen",
    eyebrow: "Aktuelle Saison",
    description:
      "Die dunkle Badge-Familie: Niederlagenserien mit zunehmend dramatischer Pech-, Sturm- und Raben-Optik.",
  },
  {
    key: "special",
    title: "Specials & Secret",
    eyebrow: "Besondere Badges",
    description:
      "Seltene Geschichten und versteckte Achievements. Diese dürfen am individuellsten und überraschendsten aussehen.",
  },
];

function getBadgeSectionKey(badgeKey: string): BadgeSectionKey {
  if (badgeKey.startsWith("career_appearances_")) return "career-appearances";
  if (badgeKey.startsWith("career_wins_")) return "career-wins";
  if (badgeKey === "season_kickoff" || badgeKey.startsWith("attendance_streak_")) {
    return "attendance";
  }
  if (badgeKey.startsWith("win_streak_")) return "wins";
  if (badgeKey.startsWith("loss_streak_")) return "losses";
  return "special";
}

export default async function PowerUserBadgesPage() {
  await requirePowerUser();

  const badges = BADGE_DEFINITIONS.map((badge) => ({
    ...badge,
    sectionKey: getBadgeSectionKey(badge.key),
    visual: getBadgeVisualMeta(badge.key),
  }));

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/power-user"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Power User Dashboard
          </Link>
        </div>

        <section className="overflow-hidden rounded-[32px] bg-slate-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Power User · Hall of Fame
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Badge-Katalog
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Visuelle Abnahme nach denselben sechs Bereichen wie in der Hall of Fame.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4">
                <div className="text-2xl font-black">{badges.length}</div>
                <div className="text-[10px] text-slate-400 sm:text-xs">Badges</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4">
                <div className="text-2xl font-black">{SECTION_ORDER.length}</div>
                <div className="text-[10px] text-slate-400 sm:text-xs">Bereiche</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 sm:px-4">
                <div className="text-2xl font-black">
                  {badges.filter((badge) => badge.visual.secret).length}
                </div>
                <div className="text-[10px] text-slate-400 sm:text-xs">Secret</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Trophy className="h-4 w-4" /> Schwierigkeit = Eskalation
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Je exklusiver das Achievement, desto stärker Material, Rahmen, Aura und Zusatzmotive.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Layers3 className="h-4 w-4" /> Motiv = Kategorie
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Einsätze, Siege, Disziplin, Serien, Pech und Specials müssen auf den ersten Blick unterscheidbar sein.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Sparkles className="h-4 w-4" /> Zentrum bleibt strikr
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Das quadratische 3D-strikr-Badge bleibt immer das Zentrum.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <EyeOff className="h-4 w-4" /> Secret
            </div>
            <p className="mt-2 text-sm leading-5 text-amber-800">
              Secret-Badges sind intern vollständig sichtbar, beim Nutzer vor Freischaltung verborgen.
            </p>
          </div>
        </section>

        <nav className="sticky top-[calc(3.5rem+env(safe-area-inset-top)+8px)] z-20 -mx-1 flex gap-2 overflow-x-auto bg-neutral-100/95 px-1 py-2 backdrop-blur sm:top-[calc(4.5rem+env(safe-area-inset-top)+8px)]">
          {SECTION_ORDER.map((section) => {
            const count = badges.filter((badge) => badge.sectionKey === section.key).length;
            return (
              <a
                key={section.key}
                href={`#${section.key}`}
                className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              >
                {section.title} · {count}
              </a>
            );
          })}
        </nav>

        {SECTION_ORDER.map((section) => {
          const sectionBadges = badges.filter((badge) => badge.sectionKey === section.key);

          return (
            <section
              id={section.key}
              key={section.key}
              className="scroll-mt-28 overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
                      {section.eyebrow}
                    </div>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">{section.title}</h2>
                    <p className="mt-1 max-w-3xl text-sm leading-5 text-white/60">
                      {section.description}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white/70">
                    {sectionBadges.length} Badges
                  </div>
                </div>
              </div>

              <div className="grid gap-3 bg-slate-950 p-4 md:grid-cols-2 sm:p-5">
                {sectionBadges.map((badge) => (
                  <article
                    key={badge.key}
                    className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.055] p-4 text-white"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-[76px] w-[76px] shrink-0 items-center justify-center">
                        <div className="absolute inset-1 rounded-[24px] bg-white/[0.04] blur-lg" />
                        <AchievementBadgeVisual badgeKey={badge.key} size="xl" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black tracking-tight sm:text-base">
                            {badge.title}
                          </h3>
                          {badge.visual.secret ? (
                            <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-slate-950">
                              Secret
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 text-xs font-medium leading-5 text-white/60">
                          {badge.description}
                        </p>

                        <div className="mt-2 text-[9px] font-black uppercase tracking-[0.16em] text-white/35">
                          {badge.scope === "career" ? "Karriere" : "Saison / Serie"}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </section>
    </main>
  );
}
