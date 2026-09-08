import Link from "next/link";
import { EyeOff, Layers3, Sparkles, Trophy } from "lucide-react";
import AchievementBadgeVisual from "@/components/badges/AchievementBadgeVisual";
import { requirePowerUser } from "@/lib/auth/power-user";
import { BADGE_DEFINITIONS } from "@/lib/badges/catalog";
import { getBadgeVisualMeta } from "@/lib/badges/visual-catalog";

export const dynamic = "force-dynamic";

type FamilyKey = ReturnType<typeof getBadgeVisualMeta>["family"];

const FAMILY_ORDER: Array<{
  key: FamilyKey;
  title: string;
  description: string;
}> = [
  {
    key: "career",
    title: "Karriere",
    description: "Saisonübergreifende Meilensteine wie Teilnahmen und Siege insgesamt.",
  },
  {
    key: "attendance",
    title: "Teilnahme & Disziplin",
    description: "Saisonauftakt und aufeinanderfolgende Trainings-Teilnahmen.",
  },
  {
    key: "wins",
    title: "Siege & Serien",
    description: "Saison-Siege und Siegesserien – vom ersten Dreier bis zum Seriensieger.",
  },
  {
    key: "losses",
    title: "Pech & Niederlagen",
    description: "Die charmant-dunkle Seite der Hall of Fame: Niederlagenserien.",
  },
  {
    key: "special",
    title: "Special / Secret",
    description: "Seltene Situationen und besondere Geschichten, die erst beim Freischalten sichtbar werden.",
  },
];

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
                Eine Quelle für Logik und Look: Hier siehst du jedes aktive Badge,
                seine Kategorie, Saison-/Karriere-Regel, Stufe und genau das Visual,
                das auch in der Hall of Fame verwendet wird.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-2xl font-black">{badges.length}</div>
                <div className="text-xs text-slate-400">Badges im Katalog</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-2xl font-black">
                  {badges.filter((badge) => badge.visual.secret).length}
                </div>
                <div className="text-xs text-slate-400">Special / Secret</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Trophy className="h-4 w-4" /> Material = Stufe
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Blech → Bronze → Silber → Gold → Legendär. Karriere-Badges zeigen
              diese Stufen direkt als 3D-Material.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Layers3 className="h-4 w-4" /> Motiv = Kategorie
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              Läufer für Disziplin, Feuer für Siegesserien, Sturm für Pech und
              eigene Motive für Specials – das 3D-strikr-Badge bleibt die Basis.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-slate-950">
              <Sparkles className="h-4 w-4" /> Daten-Regel A / B / C
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-600">
              A = rückwirkend, B = ab neuer Badge-Saison, C = erst ab Aktivierung.
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-amber-950">
              <EyeOff className="h-4 w-4" /> Secret
            </div>
            <p className="mt-2 text-sm leading-5 text-amber-800">
              Secret-Badges dürfen im Nutzer-Trophäenschrank bis zur Freischaltung
              später vollständig verborgen werden. Aktuell ist die Logik dafür markiert.
            </p>
          </div>
        </section>

        <nav className="flex gap-2 overflow-x-auto pb-1">
          {FAMILY_ORDER.map((family) => (
            <a
              key={family.key}
              href={`#${family.key}`}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm"
            >
              {family.title}
            </a>
          ))}
        </nav>

        {FAMILY_ORDER.map((family) => {
          const familyBadges = badges.filter(
            (badge) => badge.visual.family === family.key,
          );

          return (
            <section
              id={family.key}
              key={family.key}
              className="scroll-mt-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Kategorie
                  </div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    {family.title}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{family.description}</p>
                </div>
                <div className="text-sm font-semibold text-slate-500">
                  {familyBadges.length} Badges
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {familyBadges.map((badge) => (
                  <article
                    key={badge.key}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-950 shadow-inner">
                        <AchievementBadgeVisual badgeKey={badge.key} size="xl" />
                      </div>

                      <div className="min-w-0 flex-1">
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
                        <code className="mt-2 block break-all text-[11px] text-slate-400">
                          {badge.key}
                        </code>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          Visual
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {badge.visual.visualLabel}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          Daten-Regel
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {badge.visual.historyMode} · {badge.visual.historyLabel}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          Familie
                        </dt>
                        <dd className="mt-1 font-semibold text-slate-800">
                          {badge.visual.familyLabel}
                        </dd>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          Status
                        </dt>
                        <dd className="mt-1 font-semibold text-emerald-700">
                          Im Badge-Katalog aktiv
                        </dd>
                      </div>
                    </dl>

                    {badge.visual.implementationNote ? (
                      <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
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
