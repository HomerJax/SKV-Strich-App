"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const createClient = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const RELEASE_KEY = "team-fairness-topspieler-unterzahl-2026-11";

export default function TeamFairnessAdminLaunchModal() {
  const [visible, setVisible] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data, error } = await supabase
        .from("admin_feature_announcement_receipts")
        .select("release_key")
        .eq("user_id", user.id)
        .eq("release_key", RELEASE_KEY)
        .maybeSingle();
      if (!cancelled && !error && !data) {
        setUserId(user.id);
        setVisible(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = old; };
  }, [visible]);

  async function dismiss() {
    if (!userId || saving) return;
    setSaving(true);
    const { error } = await createClient().from("admin_feature_announcement_receipts")
      .insert({ user_id: userId, release_key: RELEASE_KEY });
    if (!error) setVisible(false);
    setSaving(false);
  }

  if (!visible) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="fairness-launch-title" className="fixed inset-0 z-[1100] flex min-h-[100dvh] flex-col overflow-y-auto bg-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-7 text-sm font-black uppercase tracking-[0.2em] text-amber-300">Neu bei strikr · Teamgenerator</div>
        <h1 id="fairness-launch-title" className="text-4xl font-black leading-tight sm:text-5xl">Noch fairere Teams. Für alle.</h1>
        <section className="mt-9 rounded-3xl border border-white/15 bg-white/[0.06] p-6">
          <h2 className="text-xl font-black">Topspieler fair verteilen</h2>
          <p className="mt-3 leading-7 text-white/75">Mit den neuen Balance-Gruppen „Offensive Topspieler“ und „Defensive Topspieler“ kannst du besonders prägende Spieler gezielt kennzeichnen. Der Generator versucht, diese Spieler möglichst gleichmäßig auf beide Teams zu verteilen. Bestehende Gruppen bleiben für bisherige Vereine erhalten.</p>
        </section>
        <section className="mt-4 rounded-3xl border border-white/15 bg-white/[0.06] p-6">
          <h2 className="text-xl font-black">Gemeinsam kicken – auch wenn die Beine nicht mehr ganz so wollen</h2>
          <p className="mt-3 leading-7 text-white/75">Optional kannst du in den Vereinseinstellungen einen Spieler bestimmen, der bei ungerader Teilnehmerzahl automatisch im größeren Team spielt. So bleibt das Spiel für alle angenehm. Stärken, Kategorien und Positionen berücksichtigt der Generator weiterhin.</p>
        </section>
        <button type="button" disabled={saving} onClick={() => void dismiss()} className="mt-9 min-h-14 rounded-2xl bg-amber-300 px-8 text-base font-black text-slate-950 disabled:opacity-60">{saving ? "Wird gespeichert …" : "Verstanden"}</button>
      </div>
    </div>
  );
}
