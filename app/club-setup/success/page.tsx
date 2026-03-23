"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClubSetupSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
            ✅
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950">
            Team wird vorbereitet
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-600">
            Dein Team wurde angelegt. Du wirst jetzt automatisch weitergeleitet.
          </p>
        </div>
      </section>
    </main>
  );
}