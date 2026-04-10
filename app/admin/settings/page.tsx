import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";

import ClubSettingsCard from "@/components/admin/settings/ClubSettingsCard";
import SeasonSettingsCard from "@/components/admin/settings/SeasonSettingsCard";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";

function isAdminRole(role: string | null | undefined) {
  return role === "admin";
}

export default async function Page() {
  const { membership } = await requireClub();

  if (!isAdminRole(membership.role)) {
    redirect("/admin");
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-4xl px-4 py-6 space-y-4">

        <div className="rounded-[24px] border border-black/10 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold">
            Einstellungen
          </h1>
        </div>

        <ClubSettingsCard />
        <SeasonSettingsCard />
        <TeamGeneratorSettingsCard />

      </section>
    </main>
  );
}