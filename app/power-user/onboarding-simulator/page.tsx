import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import FirstRunQA from "./FirstRunQA";
import TeamGeneratorSettingsCard from "@/components/admin/settings/TeamGeneratorSettingsCard";
import { CategorySettingsSection } from "@/components/admin/settings/CategorySettingsSection";

export default async function PowerUserOnboardingSimulatorPage() {
  await requirePowerUser();

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link href="/power-user" className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">
            ← Power User
          </Link>
        </div>
        <div className="rounded-2xl border border-cyan-200 bg-white p-5">
          <h1 className="text-lg font-black">Echtes Vereins-Onboarding testen</h1>
          <p className="mt-2 text-sm text-slate-600">Öffnet die originale Club-Setup-Seite im abgesicherten Simulationsmodus. Keine Daten werden gespeichert.</p>
          <Link href="/club-setup?qa=1&created=1&step=club" className="mt-4 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Original-Onboarding durchspielen</Link>
        </div>
        <FirstRunQA teamSetup={<TeamGeneratorSettingsCard useStrength={true} useCategories={false} redirectTo="/club-setup?created=1&step=categories" variant="onboarding" />} categorySetup={<CategorySettingsSection categories={[]} useCategories={true} redirectTo="/club-setup?created=1&step=done" variant="onboarding" isPro={false} />} />
      </section>
    </main>
  );
}
