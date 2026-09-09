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

function ScopePill({ scope }: { scope: "season" | "career" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${
        scope === "career"
          ? "bg-slate-950 text-white"
          : "bg-blue-50 text-blue-700"
      }`}
    >
      {scope === "career" ? "Karriere" : "Aktuelle Saison"}
    </span>
  );
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
                So kannst du jede Badge-Familie direkt von leicht bis exklusiv durchprüfen.
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
              Einsätze, Siege, Disziplin, Serien, Pech und Specials müssen schon auf den ersten Blick unterscheidbar sein.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Sparkles className="h-4 w-4" /> Zentrum bleibt strikr
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Das quadratische 3D-strikr-Badge bleibt immer das Zentrum. Kategorie und Seltenheit passieren außen herum.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <EyeOff className="h-4 w-4" /> Secret
            </div>
            <p className="mt-2 text-sm leading-5 text-amber-800">
              Secret-Badges sind intern vollständig sichtbar, im Nutzer-Trophäenschrank vor Freischaltung aber verborgen.
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
          const sectionBadges = badges.filter(
            (badge) => badge.sectionKey === section.key,
          );

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
                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                      {section.title}
                    </h2>
                    <p className="mt-1 max-w-3xl text-sm leading-5 text-white/60">
                      {section.description}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-white/70">
                    {sectionBadges.length} Badges
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-4 lg:grid-cols-2 sm:p-5">
                {sectionBadges.map((badge, index) => (
                  <article
                    key={badge.key}
                    className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50/70"
                  >
                    <div className="flex items-stretch">
                      <div className="relative flex w-[116px] shrink-0 items-center justify-center border-r border-slate-800 bg-[radial-gradient(circle_at_50%_42%,#273244_0%,#111827_50%,#020617_100%)] p-3 sm:w-[138px]">
                        <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/45">
                          {index + 1}/{sectionBadges.length}
                        </div>
                        <AchievementBadgeVisual badgeKey={badge.key} size="xl" />
                      </div>

                      <div className="min-w-0 flex-1 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <ScopePill scope={badge.scope} />
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">
                            {badge.visual.tierLabel}
                          </span>
                          {badge.visual.secret ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-800">
                              Secret
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-2 text-xl font-black leading-tight text-slate-950">
                          {badge.title}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                          {badge.description}
                        </p>

                        <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                            Visual
                          </div>
                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {badge.visual.visualLabel}
                          </div>
                        </div>

                        <code className="mt-2 block break-all text-[10px] text-slate-400">
                          {badge.key}
                        </code>
                      </div>
                    </div>

                    <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-3">
                      <div className="bg-white px-3 py-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Daten-Regel
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-700">
                          {badge.visual.historyMode} · {badge.visual.historyLabel}
                        </div>
                      </div>
                      <div className="bg-white px-3 py-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Familie
                        </div>
                        <div className="mt-1 text-xs font-semibold text-slate-700">
                          {badge.visual.familyLabel}
                        </div>
                      </div>
                      <div className="bg-white px-3 py-2.5">
                        <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Status
                        </div>
                        <div className="mt-1 text-xs font-semibold text-emerald-700">
                          Aktiv im Katalog
                        </div>
                      </div>
                    </div>

                    {badge.visual.implementationNote ? (
                      <div className="border-t border-orange-200 bg-orange-50 px-4 py-2.5 text-xs leading-5 text-orange-800">
                        Entwickler-Hinweis: {badge.visual.implementationNote}
                      </div>
                    ) : null}
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
