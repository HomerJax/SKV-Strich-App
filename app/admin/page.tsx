import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  UserRound,
  Settings,
  Shield,
  ToggleLeft,
} from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth/context";
import { AUTH_ROUTES } from "@/lib/auth/routes";

type ClubRow = {
  id: string;
  display_name: string | null;
  primary_color: string | null;
};

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

function getRoleLabel(params: {
  role: string | null | undefined;
  isPowerUser: boolean;
}) {
  if (params.isPowerUser) return "Power User";
  if (params.role === "admin") return "Admin";
  return "Mitglied";
}

type AdminCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
};

function AdminCard({
  href,
  eyebrow,
  title,
  description,
  icon,
}: AdminCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            {eyebrow}
          </div>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </div>
      </div>

      <div className="mt-5 flex items-center text-sm font-medium text-slate-900">
        Öffnen
        <span className="ml-2 transition group-hover:translate-x-1">→</span>
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const ctx = await getAuthContext();

  if (!ctx.user) {
    redirect(AUTH_ROUTES.login);
  }

  if (!ctx.activeClubId) {
    redirect(AUTH_ROUTES.selectClub);
  }

  const membership =
    ctx.memberships.find((item) => item.club_id === ctx.activeClubId) ?? null;

  const hasAdminAccess = ctx.isPowerUser || isAdminRole(membership?.role);

  if (!hasAdminAccess) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const supabase = await createClient();

  const { data: clubData, error: clubError } = await supabase
    .from("clubs")
    .select("id, display_name, primary_color")
    .eq("id", ctx.activeClubId)
    .maybeSingle<ClubRow>();

  if (clubError) {
    throw new Error(
      `Der aktive Club konnte nicht geladen werden: ${clubError.message}`
    );
  }

  if (!clubData) {
    redirect(AUTH_ROUTES.dashboard);
  }

  const club = clubData as ClubRow;
  const clubName = club.display_name?.trim() || "Dein Team";
  const roleLabel = getRoleLabel({
    role: membership?.role,
    isPowerUser: ctx.isPowerUser,
  });

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <PageHero
          primaryColorKey={club.primary_color}
          eyebrow="Adminbereich"
          title={clubName}
          description="Hier verwaltest du die wichtigsten Bereiche für dein Team: Mitglieder, Spieler und zentrale Einstellungen für Club, Kategorien, Teamgenerator und Saisonlogik."
          backLabel="Zurück"
          backHref="/"
          topRightSlot={
            <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-white/88">
              {roleLabel}
            </div>
          }
          actionsSlot={
            ctx.isPowerUser ? (
              <div className="inline-flex min-h-7 items-center justify-center rounded-full border border-sky-200/30 bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold text-sky-100">
                Power User Modus aktiv
              </div>
            ) : null
          }
          compact
        />

        <div className="grid gap-4 md:grid-cols-2">
          <AdminCard
            href="/admin/members"
            eyebrow="Mitglieder"
            title="Mitgliederverwaltung"
            description="Sieh bestehende Mitglieder, aktuelle Rollen, Spieler-Verknüpfungen und offene Einladungen. Hier lädst du auch neue Mitglieder oder Admins ein."
            icon={<Users className="h-6 w-6" strokeWidth={2.1} />}
          />

          <AdminCard
            href="/admin/players"
            eyebrow="Spielbetrieb"
            title="Spieler"
            description="Pflege Spielerprofile, Positionen, Stärken und weitere Grundlagen für euren Trainings- und Teamgenerator-Workflow."
            icon={<UserRound className="h-6 w-6" strokeWidth={2.1} />}
          />

          <AdminCard
            href="/admin/settings"
            eyebrow="Einstellungen"
            title="Einstellungen"
            description="Verwalte Club-Auftritt, Kategorien, Teamgenerator und Saisonlogik zentral an einem Ort."
            icon={<Settings className="h-6 w-6" strokeWidth={2.1} />}
          />

          {ctx.isPowerUser ? (
            <>
              <AdminCard
                href="/power-user"
                eyebrow="Power User"
                title="Power User Dashboard"
                description="Globale KPIs über Clubs, User, Registrierungen und Trainings. Zentrale Sicht auf die Entwicklung von strikr."
                icon={<Shield className="h-6 w-6" strokeWidth={2.1} />}
              />

              <AdminCard
                href="/power-user/flags"
                eyebrow="Power User"
                title="Feature Flags"
                description="Steuere neue Features gezielt pro Club oder schalte sie gesammelt für alle Clubs frei."
                icon={<ToggleLeft className="h-6 w-6" strokeWidth={2.1} />}
              />
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}