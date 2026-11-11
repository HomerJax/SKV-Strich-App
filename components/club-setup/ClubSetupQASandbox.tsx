"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { MouseEvent, FormEvent, ReactNode } from "react";

export default function ClubSetupQASandbox({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  function navigate(step: string, extra?: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    next.set("qa", "1");
    next.set("created", "1");
    next.set("step", step);
    Object.entries(extra ?? {}).forEach(([key, value]) => next.set(key, value));
    router.push("/club-setup?" + next.toString());
  }
  function onSubmit(event: FormEvent<HTMLDivElement>) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    event.stopPropagation();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const step = params.get("step") || "club";
    if (step === "team") {
      navigate(data.has("use_categories") ? "categories" : "done", {
        qa_strength: data.has("use_strength") ? "1" : "0",
        qa_categories: data.has("use_categories") ? "1" : "0",
      });
    } else if (step === "categories") {
      const label = String(data.get("label") || "").trim();
      const current = (params.get("qa_labels") || "").split("|").filter(Boolean);
      const existingId = data.get("id");
      if (existingId !== null) {
        const index = -Number(existingId) - 1;
        if (index >= 0 && index < current.length && label) {
          current[index] = label.replaceAll("|", " ");
          const active = (params.get("qa_active") || "").split(",");
          while (active.length < current.length) active.push("1");
          active[index] = data.has("is_active") ? "1" : "0";
          const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const strong = submitter?.name === "make_strong" ? String(index) : (params.get("qa_strong") || "");
          navigate("categories", { qa_labels: current.join("|"), qa_active: active.join(","), qa_strong: strong });
        }
      } else if (label && current.length < 2) {
        navigate("categories", { qa_labels: [...current, label.replaceAll("|", " ")].join("|"), qa_active: (params.get("qa_active") || current.map(() => "1").join(",")) + (current.length ? "," : "") + "1" });
      }
    } else if (step === "done") {
      navigate("done", { qa_invite: "1" });
    } else {
      navigate("team", { qa_name: String(data.get("display_name") || data.get("name") || params.get("qa_name") || "Testverein") });
    }
  }
  function onClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest("a[href]");
    if (!anchor) return;
    const href = anchor.getAttribute("href") || "";
    event.preventDefault();
    event.stopPropagation();
    if (href.startsWith("/club-setup")) {
      const url = new URL(href, "https://strikr.team");
      navigate(url.searchParams.get("step") || "club");
    } else if (href === "/home" || href === "/sessions/new" || href === "/") {
      router.push("/power-user/onboarding-simulator");
    }
  }
  return (
    <div onSubmitCapture={onSubmit} onClickCapture={onClick}>
      <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-xs font-bold text-amber-950">
        <span>SIMULATION · Echte Onboarding-Seite · Keine Speicherung</span>
        <button type="button" onClick={() => router.push("/power-user/onboarding-simulator")} className="rounded-lg bg-amber-950 px-3 py-1.5 text-white">Simulator verlassen</button>
      </div>
      {children}
    </div>
  );
}
