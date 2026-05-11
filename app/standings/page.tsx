import ProFeatureLock from "@/components/billing/ProFeatureLock";
import { requireClub } from "@/lib/auth/guards";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { createClient } from "@/lib/supabase/server";
import StandingsClient from "./StandingsClient";

type ClubRow = {
  id: string;
  display_name: string | null;
  primary_color: string | null;
};

export default async function StandingsPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const { data: clubData } = await supabase
    .from("clubs")
    .select("id, display_name, primary_color")
    .eq("id", clubId)
    .maybeSingle<ClubRow>();

  const primaryColorKey = clubData?.primary_color ?? "black";
  const clubName = clubData?.display_name?.trim() || "dein Team";
  const billingAccess = await getClubBillingAccess(supabase, clubId);

  if (!billingAccess.isPro) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[28px]">
            <div className="pointer-events-none select-none opacity-35 blur-[1px] grayscale">
              <StandingsClient
                initialClubId={clubId}
                initialPrimaryColor={primaryColorKey}
              />
            </div>

            <div className="absolute inset-x-0 top-8 z-10 mx-auto w-[calc(100%-2rem)] max-w-2xl">
              <ProFeatureLock
                clubName={clubName}
                title="Tabelle mit strikr Pro freischalten"
                description="In Free bleibt die Tabelle sichtbar, aber gesperrt. Mit Pro sehen Teams Ranglisten, Saisonwertung, MVP-Entwicklung und den sportlichen Vergleich im Club."
                featureList={[
                  "Club-Rangliste",
                  "Saisonwertung",
                  "MVP- und Badge-Vergleich",
                  "Mehr Motivation im Team",
                ]}
              />
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <StandingsClient
      initialClubId={clubId}
      initialPrimaryColor={primaryColorKey}
    />
  );
}
