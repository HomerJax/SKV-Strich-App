import Link from "next/link";
import { requirePowerUser } from "@/lib/auth/power-user";
import OnboardingSimulator from "./OnboardingSimulator";

export default async function PowerUserOnboardingSimulatorPage() {
  await requirePowerUser();

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link
            href="/power-user"
            className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900"
          >
            ← Power User
          </Link>
        </div>
        <OnboardingSimulator />
      </section>
    </main>
  );
}
