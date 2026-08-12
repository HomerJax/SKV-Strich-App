"use client";

import { useEffect } from "react";

export default function StandingsSortAccent() {
  useEffect(() => {
    const root = document.getElementById("export-standings");
    if (!root) return;
    const standingsRoot = root;

    standingsRoot.dataset.sortAccent = "rank";

    function handleClick(event: Event) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button");
      if (!button || !standingsRoot.contains(button)) return;

      const label = button.textContent?.trim() ?? "";
      if (label.startsWith("Platz")) standingsRoot.dataset.sortAccent = "rank";
      if (label.startsWith("Teiln.")) standingsRoot.dataset.sortAccent = "sessions";
      if (label.startsWith("Siegquote")) standingsRoot.dataset.sortAccent = "winRate";
    }

    standingsRoot.addEventListener("click", handleClick);
    return () => standingsRoot.removeEventListener("click", handleClick);
  }, []);

  return null;
}
